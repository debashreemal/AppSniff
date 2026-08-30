/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState } from 'react';
import { SearchCode, CheckCircle, ShieldCheck, ShieldAlert, AlertTriangle, XCircle, Globe, Lock, LockOpen } from 'lucide-react';

type InputType = 'app' | 'website';

interface ParsedInput {
  type: InputType;
  appId?: string;
  platform?: 'android' | 'ios';
  url?: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanSteps, setScanSteps] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const parseInput = (input: string): ParsedInput | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    try {
      // Apple App Store URL
      if (trimmed.includes('apps.apple.com')) {
        const match = trimmed.match(/\/id(\d+)/);
        if (match) return { type: 'app', appId: match[1], platform: 'ios' };
      }

      // Google Play Store URL
      if (trimmed.includes('play.google.com') || trimmed.includes('id=')) {
        let appId: string | null = trimmed;
        if (trimmed.includes('id=')) {
          const urlParams = new URLSearchParams(trimmed.split('?')[1]);
          appId = urlParams.get('id');
        }
        if (appId) return { type: 'app', appId, platform: 'android' };
      }

      // Any other URL → website analysis
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return { type: 'website', url: trimmed };
      }

      // Bare domain (e.g. "example.com") → treat as website
      if (trimmed.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/)) {
        return { type: 'website', url: `https://${trimmed}` };
      }

      // Fallback: treat as app ID
      return { type: 'app', appId: trimmed, platform: 'android' };
    } catch {
      return { type: 'app', appId: trimmed, platform: 'android' };
    }
  };

  const simulateScanSteps = async (inputType: InputType) => {
    const appSteps = [
      "Fetching App Store Metadata...",
      "Cross-checking Developer with RBI NBFC Registry...",
      "Scraping User Reviews...",
      "Analyzing Permissions with AI...",
      "Generating Final Safety Score..."
    ];
    const websiteSteps = [
      "Fetching Website Content...",
      "Extracting Metadata & Links...",
      "Cross-checking Company with RBI NBFC Registry...",
      "Analyzing Content for Scam Signals...",
      "Generating Final Safety Score..."
    ];
    const steps = inputType === 'website' ? websiteSteps : appSteps;
    setScanSteps([]);
    for (let i = 0; i < steps.length; i++) {
      await new Promise(res => setTimeout(res, 800));
      setScanSteps(prev => [...prev, steps[i]]);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setError('');
    setResult(null);
    setLoading(true);

    const parsed = parseInput(query);
    if (!parsed) {
      setError("Invalid input. Please paste a Play Store, App Store, or website URL.");
      setLoading(false);
      return;
    }

    const scanAnimPromise = simulateScanSteps(parsed.type);

    try {
      const body = parsed.type === 'website'
        ? { type: 'website', url: parsed.url }
        : { type: 'app', appId: parsed.appId, platform: parsed.platform };

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      await scanAnimPromise;
      if (!res.ok) throw new Error(data.error || 'Failed to analyze');
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isWebsite = result?.type === 'website';

  return (
    <>


      <nav className="navbar">
        <div className="logo">
          App<span>Sniff</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      <main className="container">
        <section className="hero">

          <h1>
            Don&apos;t fall for <span className="highlight">fake</span> loan apps.
          </h1>
          <p>
            Verify if a lending app or website is registered with the RBI, check for 
            suspicious permissions and scam signals, and read AI-summarized warnings 
            before you download or share your details.
          </p>
          
          <form onSubmit={handleScan} className="search-wrapper">
            <div className="search-container">
              <div className="search-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-input"
                placeholder="Paste Play Store, App Store, or website URL..." 
                disabled={loading}
              />
              <button type="submit" className="search-btn" disabled={loading || !query}>
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </form>

          {/* Error State */}
          {error && (
            <div className="mt-8 bg-[var(--bg-surface)] shadow-[0_20px_40px_rgba(0,0,0,0.06)] p-6 rounded-[24px] flex items-start gap-4 animate-fade-in text-left max-w-2xl w-full mx-auto border-l-[6px] border-[#F89C74]">
              <XCircle className="w-6 h-6 mt-0.5 flex-shrink-0 text-[#F89C74]" />
              <div>
                <h3 className="text-lg font-bold text-[#4A4A4A]">Analysis Failed</h3>
                <p className="text-[1.05rem] font-medium text-[#777] mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Loading Animation */}
          {loading && (
            <div className="mt-14 bg-[var(--bg-surface)] rounded-[36px] p-10 w-full max-w-2xl mx-auto text-left overflow-hidden relative shadow-[0_20px_40px_rgba(0,0,0,0.06)]">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#45C498] via-[#F6CF71] to-[#F89C74] animate-pulse" />
              <div className="flex items-center gap-4 mb-8">
                <SearchCode className="w-10 h-10 text-[#45C498] animate-bounce" />
                <h2 className="text-2xl font-bold text-[#4A4A4A]">Deep Scanning...</h2>
              </div>
              <div className="space-y-5">
                {scanSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-4 text-[#555] animate-fade-in-right">
                    <CheckCircle className="w-6 h-6 text-[#45C498]" />
                    <span className="font-semibold text-lg">{step}</span>
                  </div>
                ))}
                <div className="flex items-center gap-4 text-[#888] animate-pulse mt-6">
                  <div className="w-6 h-6 rounded-full border-[3px] border-[#f0f0f0] border-t-[#45C498] animate-spin" />
                  <span className="font-semibold text-lg">Processing...</span>
                </div>
              </div>
            </div>
          )}

          {/* Results Dashboard */}
          {result && !loading && (
            <div className="mt-14 w-full mx-auto animate-fade-in-up space-y-8 text-left">
              {/* Main Score Card */}
              <div className="bg-[var(--bg-surface)] rounded-[36px] p-10 flex flex-col md:flex-row gap-10 items-center shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
                <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-lg flex-shrink-0 bg-[var(--bg-base)]">
                  {result.app.icon ? (
                    <img src={result.app.icon} alt="Icon" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#999]">
                      {isWebsite ? <Globe className="w-16 h-16" /> : <span className="font-semibold">No Icon</span>}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl font-extrabold text-[#4A4A4A] mb-2">{result.app.title}</h2>
                  <p className="text-[#777] font-semibold text-lg mb-4">
                    {isWebsite ? result.app.developer || 'Unknown Organization' : result.app.developer}
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-[0.95rem] font-bold">
                    {isWebsite ? (
                      <>
                        <span className="px-4 py-1.5 bg-[var(--bg-base)] text-[#555] rounded-full flex items-center gap-2">
                          <Globe className="w-4 h-4" /> {result.website?.domain}
                        </span>
                        <span className={`px-4 py-1.5 rounded-full flex items-center gap-2 ${
                          result.website?.isHttps 
                            ? 'bg-[#45C498]/15 text-[#2d8a6a]' 
                            : 'bg-[#F89C74]/15 text-[#d96738]'
                        }`}>
                          {result.website?.isHttps ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
                          {result.website?.isHttps ? 'HTTPS Secure' : 'Not Secure'}
                        </span>
                        {result.analysis?.isLendingWebsite && (
                          <span className="px-4 py-1.5 bg-[#F6CF71]/20 text-[#d4a017] rounded-full">
                            Lending Platform
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="px-4 py-1.5 bg-[var(--bg-base)] text-[#555] rounded-full">{result.app.installs} Installs</span>
                        <span className="px-4 py-1.5 bg-[#F6CF71]/20 text-[#d4a017] rounded-full">{Number(result.app.score).toFixed(1)} ★</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className={`relative w-32 h-32 flex items-center justify-center ${result.analysis.safetyScore >= 80 ? 'text-[#45C498]' : result.analysis.safetyScore > 50 ? 'text-[#e0b020]' : 'text-[#F89C74]'}`}>
                    <svg viewBox="0 0 128 128" className="absolute top-0 left-0 w-full h-full transform -rotate-90 drop-shadow-sm">
                      <circle cx="64" cy="64" r="54" fill="none" stroke="#E8E8E8" strokeWidth="8" />
                      <circle cx="64" cy="64" r="54" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="339" strokeDashoffset={339 - (339 * result.analysis.safetyScore) / 100} className="transition-all duration-1000 ease-out" strokeLinecap="round" />
                    </svg>
                    <span className="text-4xl font-black z-10">{Math.round(Number(result.analysis.safetyScore))}</span>
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest mt-3 text-[#999]">Safety Score</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-stretch gap-8 w-full">
                {/* RBI Status */}
                <div className="bg-[var(--bg-surface)] rounded-[32px] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.04)] relative overflow-hidden flex-1 w-full flex flex-col">
                  <div className={`absolute top-0 left-0 w-2 h-full ${result.rbiRegistered ? 'bg-[#45C498]' : 'bg-[#F89C74]'}`}></div>
                  <div className="flex items-center gap-3 mb-4">
                    {result.rbiRegistered ? <ShieldCheck className="w-8 h-8 text-[#45C498]" /> : <ShieldAlert className="w-8 h-8 text-[#F89C74]" />}
                    <h3 className="font-bold text-xl text-[#4A4A4A]">RBI Registry Status</h3>
                  </div>
                  <ul className="space-y-3 mt-2">
                    {result.rbiRegistered ? (
                      <>
                        <li className="flex items-start gap-3 text-[1.1rem] font-medium text-[#555]">
                          <span className="text-[#45C498] font-black mt-0.5">•</span> Verified {isWebsite ? 'company' : 'developer'} match
                        </li>
                        <li className="flex items-start gap-3 text-[1.1rem] font-medium text-[#555]">
                          <span className="text-[#45C498] font-black mt-0.5">•</span> Official RBI-registered NBFC
                        </li>
                        <li className="flex items-start gap-3 text-[1.1rem] font-medium text-[#555]">
                          <span className="text-[#45C498] font-black mt-0.5">•</span> Legitimate lending institution
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-start gap-3 text-[1.1rem] font-medium text-[#555]">
                          <span className="text-[#F89C74] font-black mt-0.5">•</span> {isWebsite ? 'Company' : 'Developer'} not found in registry
                        </li>
                        <li className="flex items-start gap-3 text-[1.1rem] font-medium text-[#555]">
                          <span className="text-[#F89C74] font-black mt-0.5">•</span> Unverified lending institution
                        </li>
                        <li className="flex items-start gap-3 text-[1.1rem] font-medium text-[#555]">
                          <span className="text-[#F89C74] font-black mt-0.5">•</span> High risk of illegal operation
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                {/* AI Summary */}
                <div className="bg-[var(--bg-surface)] rounded-[32px] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.04)] relative overflow-hidden flex-1 w-full flex flex-col">
                  <div className="absolute top-0 left-0 w-2 h-full bg-[#F6CF71]"></div>
                  <div className="flex items-center gap-3 mb-4">
                    <SearchCode className="w-8 h-8 text-[#e0b020]" />
                    <h3 className="font-bold text-xl text-[#4A4A4A]">AI Risk Analysis</h3>
                  </div>
                  <ul className="space-y-3 mt-2">
                    {result.analysis.summary.split('. ').filter((s: string) => s.trim().length > 0).map((sentence: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-[1.1rem] font-medium text-[#555]">
                        <span className="text-[#F6CF71] font-black mt-0.5">•</span>
                        {sentence.trim()}{!sentence.endsWith('.') ? '.' : ''}
                      </li>
                    ))}
                  </ul>
                  {!isWebsite && result.analysis.fakeReviewSuspected && (
                    <div className="mt-5 inline-flex items-center gap-2 bg-[#F89C74]/15 text-[#d96738] px-4 py-2 rounded-xl text-sm font-bold">
                      <AlertTriangle className="w-5 h-5" /> Fake Reviews Detected
                    </div>
                  )}
                </div>

              {/* Suspicious Permissions / Red Flags */}
              {result.analysis.suspiciousPermissions?.length > 0 && (
                <div className="bg-[var(--bg-surface)] rounded-[32px] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.04)] relative overflow-hidden flex-1 w-full flex flex-col">
                   <div className="absolute top-0 left-0 w-2 h-full bg-[#F89C74]"></div>
                   <h3 className="font-bold text-xl text-[#4A4A4A] mb-5 flex items-center gap-3">
                    <AlertTriangle className="w-7 h-7 text-[#F89C74]" /> {isWebsite ? 'Red Flags Found' : 'Suspicious Permissions'}
                  </h3>
                  <ul className="space-y-3">
                    {result.analysis.suspiciousPermissions.map((perm: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-[1.1rem] font-medium text-[#555]">
                        <span className="text-[#F89C74] font-black mt-0.5">•</span> {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              </div>

              {/* Website-specific: External Links count */}
              {isWebsite && result.website && (
                <div className="bg-[var(--bg-surface)] rounded-[24px] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.04)] flex items-center gap-4">
                  <Globe className="w-6 h-6 text-[#999] flex-shrink-0" />
                  <p className="text-[1rem] font-medium text-[#777]">
                    <span className="font-bold text-[#4A4A4A]">{result.website.externalLinks}</span> external links found on this page
                    {!result.website.isHttps && (
                      <span className="ml-3 inline-flex items-center gap-1 text-[#d96738] font-bold">
                        <LockOpen className="w-4 h-4" /> This site does not use HTTPS
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {!result && !loading && (
          <>
            <section className="trust-banner">
              <div className="trust-content text-left">
                <h2>Powered by Official Data</h2>
                <p>Our database is synchronized directly with the latest RBI NBFC circulars.</p>
              </div>
              <div className="trust-badge">
                <div className="badge-pill">
                  <span className="pulse-dot"></span>
                  Database Active
                </div>
                <span className="badge-text">Updated today</span>
              </div>
            </section>

            <section id="features">
              <div className="features-header">
                <h2>Comprehensive Security</h2>
                <p>We analyze every aspect of the app or website to keep you safe.</p>
              </div>

              <div className="features-grid text-left">
                <div className="feature-card">
                  <div className="feature-icon-wrapper icon-safe">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      <polyline points="9 12 11 14 15 10"></polyline>
                    </svg>
                  </div>
                  <h3>RBI Registry Check</h3>
                  <p>
                    We instantly cross-reference the app&apos;s developer or website&apos;s company with 
                    the official Reserve Bank of India registry to ensure they are legal.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-wrapper icon-warn">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <h3>Permission &amp; Scam Analysis</h3>
                  <p>
                    For apps, we flag dangerous permissions. For websites, we detect scam signals 
                    like fake RBI claims, urgency tactics, and missing security certificates.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon-wrapper icon-ai">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                  </div>
                  <h3>AI Review &amp; Content Insights</h3>
                  <p>
                    Our AI scans app reviews for harassment keywords and website content 
                    for predatory lending red flags — uncovering hidden dangers.
                  </p>
                </div>
              </div>
            </section>

            <section id="about" className="about-section">
              <div className="about-content">
                <div className="features-header">
                  <h2>About <span className="highlight">AppSniff</span></h2>
                  <p>Built to protect Indian consumers from the surge of predatory lending apps and websites.</p>
                </div>

                <div className="features-grid text-left">
                  <div className="feature-card">
                    <div className="feature-icon-wrapper icon-safe">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      </svg>
                    </div>
                    <h3>Our Mission</h3>
                    <p>
                      India has seen a surge in predatory lending apps and websites that harass users, steal personal 
                      data, and operate without any regulatory license. AppSniff was built to fight back.
                    </p>
                  </div>

                  <div className="feature-card">
                    <div className="feature-icon-wrapper icon-warn">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M16 8l-8 8"></path>
                        <path d="M8 8l8 8"></path>
                      </svg>
                    </div>
                    <h3>The Problem</h3>
                    <p>
                      Thousands of unregistered loan apps and websites operate illegally, using 
                      harassment, data theft, and hidden fees to exploit vulnerable borrowers.
                    </p>
                  </div>

                  <div className="feature-card">
                    <div className="feature-icon-wrapper icon-ai">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                      </svg>
                    </div>
                    <h3>Our Approach</h3>
                    <p>
                      We combine real-time app store metadata, website content analysis, the official RBI NBFC registry, and 
                      advanced AI to give you a safety report — before you install or share your details.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section id="contact" className="contact-section">
              <div className="contact-content">
                <div className="features-header">
                  <h2>Get in <span className="highlight">Touch</span></h2>
                  <p>Have questions, feedback, or want to report a suspicious app or website?</p>
                </div>

                <div className="features-grid text-left">
                  <div className="feature-card">
                    <div className="feature-icon-wrapper icon-safe">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                      </svg>
                    </div>
                    <h3>GitHub</h3>
                    <p>
                      AppSniff is open source. Explore the code, contribute features, or 
                      open an issue on our GitHub repository.
                    </p>
                  </div>

                  <div className="feature-card">
                    <div className="feature-icon-wrapper icon-warn">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                    <h3>Report an App or Website</h3>
                    <p>
                      Spotted a suspicious lending app or website? Flag it through our platform and help 
                      protect others from falling victim to scams.
                    </p>
                  </div>

                  <div className="feature-card">
                    <div className="feature-icon-wrapper icon-ai">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    <h3>Community</h3>
                    <p>
                      Join our growing community of users who are fighting back against 
                      predatory lending apps and websites across India.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="w-full text-center py-10 text-[#888] font-medium text-sm mt-auto border-t border-[rgba(0,0,0,0.05)] bg-[var(--bg-base)]">
        <div className="max-w-4xl mx-auto px-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="logo text-xl" style={{ fontSize: '1.25rem' }}>App<span>Sniff</span></div>
          <p>© {new Date().getFullYear()} AppSniff. Not affiliated with the RBI.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[#333] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#333] transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </>
  );
}
