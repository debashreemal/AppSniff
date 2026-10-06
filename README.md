# 🐾 AppSniff: Sniff Out Fake Loan Apps or Websites Before They Bite

## The Problem

India is flooded with **predatory loan apps and Websites** that masquerade as legitimate lending platforms. They lure users with instant approvals, then steal contacts, photos, and personal data — weaponizing it for **blackmail, harassment, and extortion**. Millions of victims have no way to tell a real RBI-registered lender from a scam before it's too late.

## The Solution

**AppSniff** is your personal app detective. Paste any Play Store or App Store link, and it instantly runs a multi-layered security scan — cross-referencing the app against the **official RBI NBFC registry**, analyzing its permissions for red flags, and using **AI to decode hundreds of user reviews** — all in seconds.

## How It Works

1. **Paste a Link:** Drop any Google Play Store or Apple App Store URL or websites into the search bar.
2. **Deep Scan Begins:** AppSniff kicks off an automated 5-step analysis pipeline:
   - 📦 **Metadata Scraping** — Fetches the app's title, developer, icon, installs, and ratings.
   - 🏦 **RBI Registry Cross-Check** — Uses fuzzy matching (`pg_trgm`) against the official RBI NBFC database stored in Supabase.
   - 🔍 **Review Scraping** — Pulls the most helpful user reviews and feeds them to AI.
   - 🤖 **AI Risk Analysis** — Groq-powered LLM scores the app (0–100), flags suspicious permissions, and detects fake reviews.
   - 📊 **Safety Report** — A beautiful, interactive dashboard presents the verdict.

3. **Get the Verdict:** In under 10 seconds, you see:
   - ✅ or ❌ **RBI Registration Status**
   - 🔢 **Safety Score** (0–100) with a visual progress ring
   - ⚠️ **Suspicious Permissions** flagged
   - 🧠 **AI-generated risk summary**
   - 🤖 **Fake review detection**

## Architecture Flow

```
User Pastes URL
       │
       ▼
┌─────────────────┐
│  Next.js Client  │  (React + Tailwind CSS)
│   page.tsx       │
└────────┬────────┘
         │  POST /api/analyze
         ▼
┌─────────────────────────────────────────────┐
│           Next.js API Route                  │
│          /api/analyze/route.ts               │
│                                              │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │ Play Store│  │ App Store │  │ Supabase │ │
│  │ Scraper   │  │ Scraper   │  │ (RBI DB) │ │
│  └─────┬─────┘  └─────┬─────┘  └────┬─────┘ │
│        │              │              │       │
│        └──────┬───────┘              │       │
│               ▼                      ▼       │
│        App Metadata          Fuzzy NBFC      │
│        + Reviews             Match Result    │
│               │                      │       │
│               └──────────┬───────────┘       │
│                          ▼                   │
│                  ┌──────────────┐             │
│                  │  Groq LLM   │             │
│                  │  (AI Score)  │             │
│                  └──────┬──────┘             │
│                         │                    │
│                         ▼                    │
│                  JSON Response               │
└──────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Results Dashboard │
│  (Score Ring,      │
│   RBI Badge,       │
│   AI Summary)      │
└─────────────────┘
```

## Tech Stack

| Layer            | Technology                                      |
| ---------------- | ----------------------------------------------- |
| **Framework**    | Next.js 16 (App Router)                         |
| **Frontend**     | React 19, TypeScript                            |
| **Styling**      | Tailwind CSS 4                                  |
| **Database**     | Supabase (PostgreSQL + `pg_trgm` fuzzy search)  |
| **AI Engine**    | Groq SDK (LLM-powered risk analysis)            |
| **Play Store**   | `google-play-scraper`                           |
| **App Store**    | `app-store-scraper`                             |
| **Icons**        | Lucide React                                    |

## Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/AppSniff.git
cd AppSniff

# Install dependencies
npm install

# Start the app locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env` file in the root with the following keys:

```env
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
GROQ_API_KEY="your-groq-api-key"
```

> [!NOTE]
> You **must** add your Supabase and Groq API keys in a `.env` file for the analysis features to work. Without them, the AI scoring and RBI registry checks will fail.

## Database Setup

Run the SQL script in your Supabase SQL editor to set up the RBI NBFC registry table and the fuzzy search function:

```bash
# The schema is in:
setup_database.sql
```

This creates:
- `rbi_nbfc_registry` table with company details
- `pg_trgm` extension for fuzzy text matching
- `search_nbfc()` RPC function for similarity-based lookups


## Key Features

- 🏦 **RBI NBFC Verification** — Fuzzy-matches app developers against the official RBI registry using PostgreSQL trigram similarity
- 🤖 **AI-Powered Risk Scoring** — LLM analyzes permissions + reviews to generate a 0–100 safety score with strict scoring rules
- 📱 **Cross-Platform** — Supports both Google Play Store and Apple App Store URLs
- ⚡ **Real-time Scan Animation** — Step-by-step visual feedback during the analysis pipeline
- 🎨 **Beautiful Dashboard** — Animated score ring, color-coded risk cards, and responsive layout
- 🔍 **Fake Review Detection** — AI flags bot-generated reviews to expose manipulation

