/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import gplay from 'google-play-scraper';
// @ts-expect-error missing typings for app-store-scraper
import appStore from 'app-store-scraper';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import * as cheerio from 'cheerio';

// Initialize clients with fallbacks to prevent build crashes on Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Fuzzy-match a developer/company name against the RBI NBFC registry */
async function checkRBIRegistry(name: string): Promise<boolean> {
  if (!name) return false;

  const { data: nbfcData, error: nbfcError } = await supabase
    .rpc('search_nbfc', { search_term: name });

  if (nbfcError) {
    console.error("Supabase RPC error:", nbfcError);
    return false;
  }

  if (!nbfcData || nbfcData.length === 0) return false;

  const normalize = (s: string) =>
    (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter(w => !['private', 'pvt', 'limited', 'ltd', 'services', 'technologies', 'india', 'finance', 'financial', 'loan', 'loans'].includes(w) && w.length > 2);

  const devWords = normalize(name);
  const devSet = new Set(devWords);

  for (const nbfc of nbfcData) {
    const nbfcWords = normalize(nbfc.company_name);
    const nbfcSet = new Set(nbfcWords);

    if (devSet.size === 0 || nbfcSet.size === 0) continue;

    let intersection = 0;
    for (const w of devSet) {
      if (nbfcSet.has(w)) intersection++;
    }

    if (intersection > 0 && (intersection / Math.max(devSet.size, nbfcSet.size) >= 0.5)) {
      return true;
    }
  }

  return false;
}

// ── Website scraping ─────────────────────────────────────────────────────────

interface WebsiteData {
  url: string;
  isHttps: boolean;
  title: string;
  description: string;
  ogImage: string;
  favicon: string;
  companyName: string;
  bodyText: string;
  externalLinks: string[];
  domain: string;
}

async function scrapeWebsite(url: string): Promise<WebsiteData> {
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname;
  const isHttps = parsedUrl.protocol === 'https:';

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch website: HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract metadata
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="title"]').attr('content') ||
    $('title').text().trim() ||
    domain;

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    '';

  const ogImage =
    $('meta[property="og:image"]').attr('content') || '';

  // Favicon
  let favicon =
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    '';
  if (favicon && !favicon.startsWith('http')) {
    favicon = new URL(favicon, url).href;
  }

  // Company name extraction: try structured data, og:site_name, or fall back to title
  let companyName =
    $('meta[property="og:site_name"]').attr('content') ||
    '';

  // Try JSON-LD for organization name
  if (!companyName) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const ld = JSON.parse($(el).text());
        const items = Array.isArray(ld) ? ld : [ld];
        for (const item of items) {
          if (item['@type'] === 'Organization' || item['@type'] === 'Corporation') {
            companyName = item.name || item.legalName || '';
            if (companyName) return false; // break
          }
          // Check publisher
          if (item.publisher?.name) {
            companyName = item.publisher.name;
            return false;
          }
        }
      } catch { /* ignore parse errors */ }
    });
  }

  if (!companyName) {
    companyName = title.split(/[-|–—]/)[0].trim();
  }

  // Extract visible body text (truncated)
  $('script, style, noscript, iframe, svg, nav, footer, header').remove();
  const bodyText = $('body').text()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 5000);

  // External links
  const externalLinks: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && (href.startsWith('http://') || href.startsWith('https://')) && !href.includes(domain)) {
      externalLinks.push(href);
    }
  });

  return {
    url,
    isHttps,
    title,
    description,
    ogImage,
    favicon,
    companyName,
    bodyText,
    externalLinks: [...new Set(externalLinks)].slice(0, 30),
    domain,
  };
}

// ── App analysis (existing logic) ────────────────────────────────────────────

async function analyzeApp(appId: string, platform: string, groq: Groq) {
  let appData: any = {};
  let permissions: any[] = [];
  let reviews: any[] = [];

  if (platform === 'ios') {
    try {
      const iosData = await appStore.app({ id: appId, country: 'in' });
      appData = {
        title: iosData.title,
        developer: iosData.developer,
        genre: iosData.primaryGenre,
        icon: iosData.icon,
        installs: 'N/A (iOS)',
        score: iosData.score
      };
    } catch (e: any) {
      console.error("iOS Scraper error:", e.message);
      throw new Error('App not found on Apple App Store or invalid ID');
    }
    try {
      const iosReviews = await appStore.reviews({ id: appId, country: 'in', sort: appStore.sort.RECENT, page: 1 });
      reviews = iosReviews;
    } catch (e) {
      console.warn("Could not fetch iOS reviews:", e);
    }
  } else {
    try {
      appData = await gplay.app({ appId, country: 'in' });
    } catch (e: any) {
      console.error("Scraper error:", e.message);
      throw new Error('App not found on Play Store or invalid ID');
    }

    try {
      // @ts-expect-error country doesn't exist in TS interface but works in runtime
      permissions = await gplay.permissions({ appId, country: 'in' });
    } catch (e) {
      console.warn("Could not fetch permissions:", e);
    }

    try {
      // @ts-expect-error HELPFULNESS is missing from TS enum
      const reviewsData = await gplay.reviews({ appId, country: 'in', sort: gplay.sort.HELPFULNESS, num: 50 });
      reviews = reviewsData.data;
    } catch (e) {
      console.warn("Could not fetch reviews:", e);
    }
  }

  // RBI Registry check
  const isRBIRegistered = await checkRBIRegistry(appData.developer);

  // AI Analysis with Groq
  const permissionsList = permissions.map(p => p.permission).join(', ') || 'No permissions found';
  const reviewsList = reviews.map(r => r.text).join('\n').substring(0, 3000) || 'No reviews found';

  const prompt = `
    You are an elite cybersecurity AI specialized in detecting predatory loan apps and protecting consumers.
    Analyze the following app data and score its safety on a scale of 0 to 100.
    
    App Name: ${appData.title}
    Developer: ${appData.developer}
    Category/Genre: ${appData.genre || 'Unknown'}
    Platform: ${platform.toUpperCase()}
    RBI Registered NBFC: ${isRBIRegistered ? 'YES (Verified)' : 'NO (Unverified/Warning)'}
    
    Permissions Requested (if Android):
    ${permissionsList}
    
    Recent User Reviews:
    ${reviewsList}
    
    SCORING RULES (STRICTLY FOLLOW THESE EXACT NUMBERS):
    1. If the app is RBI Registered (YES) and there is NO mention of blackmail, score it EXACTLY 85. Permissions like SMS (for OTP), Contacts (for UPI/Sharing), Camera (for KYC), and Location are STANDARD and JUSTIFIED.
    2. If an RBI Registered app has bad reviews about "loan rejected" or "high interest", it is normal customer service friction. The score remains EXACTLY 85.
    3. If the app is NOT RBI Registered AND asks for SMS, Contacts, or Gallery, it is highly likely a predatory blackmail app. Score it EXACTLY 15.
    4. If user reviews explicitly mention "blackmail", "calling my contacts", or "fake loan", score it EXACTLY 5.
    5. If none of the above apply, score it EXACTLY 50 (Moderate Risk).
    
    Output your analysis in strict JSON format with the following keys:
    - safetyScore: number (0 to 100)
    - riskLevel: "Safe", "Warning", or "Danger"
    - summary: A 2-sentence summary explaining the score. If it's an RBI verified app, explicitly state that standard banking permissions were forgiven.
    - suspiciousPermissions: An array of strings highlighting truly dangerous/unjustified permissions based on the rules. (Can be empty for verified apps).
    - fakeReviewSuspected: boolean, true if reviews look bot-generated.
  `;

  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'openai/gpt-oss-20b',
    temperature: 0.0,
    seed: 42,
    response_format: { type: "json_object" }
  });

  const aiAnalysis = JSON.parse(chatCompletion.choices[0]?.message?.content || '{}');

  return {
    type: 'app' as const,
    app: {
      title: appData.title,
      icon: appData.icon,
      developer: appData.developer,
      installs: appData.installs,
      score: appData.score,
    },
    rbiRegistered: isRBIRegistered,
    analysis: aiAnalysis,
  };
}

// ── Website analysis (new) ───────────────────────────────────────────────────

async function analyzeWebsite(url: string, groq: Groq) {
  let siteData: WebsiteData;

  try {
    siteData = await scrapeWebsite(url);
  } catch (e: any) {
    console.error("Website scrape error:", e.message);
    throw new Error(`Could not access website: ${e.message}`);
  }

  // RBI Registry check using extracted company name
  const isRBIRegistered = await checkRBIRegistry(siteData.companyName);

  // Build the AI prompt for website analysis
  const externalLinksText = siteData.externalLinks.length > 0
    ? siteData.externalLinks.slice(0, 15).join('\n')
    : 'None found';

  const prompt = `
    You are an elite cybersecurity AI specialized in detecting predatory lending websites and scam portals targeting Indian consumers.
    Analyze the following website data and score its safety on a scale of 0 to 100.

    STEP 1: First, determine if this is a LENDING website or a NON-LENDING website.
    A website is a lending website ONLY if its PRIMARY purpose is to offer personal loans, credit, or borrowing services directly to consumers.
    Examples of NON-lending websites: news sites, e-commerce, social media, blogs, corporate websites, SaaS products, banks offering general banking services, payment apps, investment platforms, insurance companies, educational sites, government sites, entertainment, etc.
    Be strict: just mentioning "EMI" or "finance" does NOT make it a lending website. It must be primarily a loan/credit provider.

    Website URL: ${siteData.url}
    Domain: ${siteData.domain}
    Uses HTTPS: ${siteData.isHttps ? 'YES' : 'NO (Warning!)'}
    Page Title: ${siteData.title}
    Meta Description: ${siteData.description || 'None'}
    Company/Organization Name: ${siteData.companyName || 'Unknown'}
    RBI Registered NBFC: ${isRBIRegistered ? 'YES (Verified)' : 'NO (Not found in our database — this does NOT necessarily mean they are illegal. Large banks, payment companies, and non-lending businesses will not appear in the NBFC registry.)'}
    
    Page Content (truncated):
    ${siteData.bodyText.substring(0, 3000)}
    
    External Links Found:
    ${externalLinksText}
    
    SCORING GUIDELINES:

    FOR NON-LENDING WEBSITES (news, e-commerce, social media, corporate sites, banks, etc.):
    - Score 75-85: Well-known, professional website with HTTPS, proper metadata, and clear company info.
    - Score 60-74: Legitimate-looking but less well-known, or minor issues (e.g., no meta description).
    - Score 40-59: Suspicious elements but not clearly a scam (poor design, vague purpose).
    - Note: Non-lending websites should NOT be penalized for not being RBI registered — that is expected and normal.

    FOR LENDING WEBSITES (sites that directly offer personal loans/credit):
    - Score 80-90: RBI Registered NBFC with professional website, proper disclosures, physical address, and NBFC license number displayed.
    - Score 50-70: Claims to be a lender, not confirmed RBI registered, but looks professional with a physical address, proper terms, and no major red flags.
    - Score 20-40: Claims to offer loans, not RBI registered, AND has some red flags (urgency language, no address, suspicious claims).
    - Score 5-19: Clear predatory signals — fake RBI claims, "guaranteed approval", "no documents needed", "no CIBIL check", targeting desperate borrowers, no physical address, poor grammar, and/or links to shady app downloads.

    RED FLAGS TO CHECK (for lending websites):
    - Unrealistic promises ("guaranteed approval", "0% interest", "no CIBIL check", "instant disbursement")
    - Urgency tactics ("limited time", "apply now before offer expires")
    - No physical address or verifiable contact information
    - Poor grammar or machine-translated content
    - Requesting sensitive documents (Aadhaar, PAN) directly through an insecure website
    - Missing RBI/NBFC license number despite claiming to be a registered lender
    - Redirects to suspicious app downloads
    - No HTTPS on a site collecting personal/financial data
    
    Output your analysis in strict JSON format with the following keys:
    - safetyScore: number (0 to 100)
    - riskLevel: "Safe" (score >= 70), "Warning" (score 40-69), or "Danger" (score < 40)
    - summary: A 2-3 sentence summary explaining the score and key findings. If it is a non-lending website, mention that it is not a lending platform and is not expected to be RBI registered.
    - redFlags: An array of strings listing specific red flags found. For non-lending websites this should be empty or contain only genuine security concerns (like no HTTPS). Do NOT list "not RBI registered" as a red flag for non-lending websites.
    - isLendingWebsite: boolean, true ONLY if the website's primary purpose is offering personal loans or credit.
  `;

  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'openai/gpt-oss-20b',
    temperature: 0.0,
    seed: 42,
    response_format: { type: "json_object" }
  });

  const aiAnalysis = JSON.parse(chatCompletion.choices[0]?.message?.content || '{}');

  return {
    type: 'website' as const,
    app: {
      title: siteData.title,
      icon: siteData.favicon || siteData.ogImage || '',
      developer: siteData.companyName,
      installs: siteData.domain,
      score: null,
    },
    rbiRegistered: isRBIRegistered,
    analysis: {
      safetyScore: aiAnalysis.safetyScore,
      riskLevel: aiAnalysis.riskLevel,
      summary: aiAnalysis.summary,
      // Map website-specific fields to match app response shape where possible
      suspiciousPermissions: aiAnalysis.redFlags || [],
      fakeReviewSuspected: false,
      // Website-specific extras
      isLendingWebsite: aiAnalysis.isLendingWebsite,
      isHttps: siteData.isHttps,
    },
    website: {
      url: siteData.url,
      domain: siteData.domain,
      isHttps: siteData.isHttps,
      externalLinks: siteData.externalLinks.length,
    },
  };
}

// ── Main route handler ───────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // Validate GROQ_API_KEY is actually set at runtime
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error('GROQ_API_KEY is not set in environment variables!');
      return NextResponse.json(
        { error: 'Server configuration error: AI API key is missing. Please set GROQ_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }
    const groq = new Groq({ apiKey: groqApiKey });

    const body = await req.json();
    const { type = 'app', appId, platform = 'android', url } = body;

    if (type === 'website') {
      // ── Website analysis pipeline ──
      if (!url) {
        return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
      }

      try {
        const result = await analyzeWebsite(url, groq);
        return NextResponse.json(result);
      } catch (error: any) {
        console.error('Error analyzing website:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to analyze website' },
          { status: error.message?.includes('Could not access') ? 404 : 500 }
        );
      }
    } else {
      // ── App analysis pipeline (existing) ──
      if (!appId) {
        return NextResponse.json({ error: 'App ID is required' }, { status: 400 });
      }

      try {
        const result = await analyzeApp(appId, platform, groq);
        return NextResponse.json(result);
      } catch (error: any) {
        console.error('Error analyzing app:', error);
        const status = error.message?.includes('not found') ? 404 : 500;
        return NextResponse.json(
          { error: error.message || 'Failed to analyze app' },
          { status }
        );
      }
    }

  } catch (error: any) {
    console.error('Error in analyze route:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze' }, { status: 500 });
  }
}
