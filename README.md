# AI Contact Enrichment Agent

A conversational AI agent that researches any B2B contact in under 45 seconds 
and hands you a complete sales-ready profile — company intel, buying signals, 
ICP fit score, and a personalized cold email — all from a single chat interface.

**Live Demo:** https://ai-enrichment-agent.vercel.app

---

## The problem it solves

SDRs and AEs spend 15–20 minutes manually researching each prospect before 
outreach — checking LinkedIn, company websites, funding news, and trying to 
personalize a message. This tool does all of that automatically.

You type a name, company, and title. The agent does the rest.

---

## What it gives you

For every contact you enrich, the agent returns:

- **Company intel** — what the company does, their stage, recent news
- **Buying signals** — indicators that they might be in-market right now
- **ICP score** — how well this contact matches your ideal customer profile
- **Personalized outreach email** — a ready-to-send cold email based on the 
  research, not a generic template

Results are saved to Supabase so if you search the same company again, 
it pulls from history instantly instead of re-running the research.

---

## How it works

1. You start a conversation in the chat panel on the left
2. The agent collects: first name, last name, company, and title
3. GPT-4o runs live web research on the contact and company
4. Results stream into the output panel on the right in real time
5. Enrichment data is stored in Supabase for reuse across sessions

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript |
| AI | GPT-4o (OpenAI API) |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |

---

## Running locally

```bash
git clone https://github.com/aishwaryamy/ai-enrichment-agent
cd ai-enrichment-agent
npm install
```

Create a `.env.local` file:
OPENAI_API_KEY=your_key_here

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url

NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

Then run:

```bash
npm run dev
```

Open http://localhost:3000

---

## Built by

[Aishwarya Mandya Yogananda](https://aishwaryamy.github.io) — 
MLE at Manifoldz, MS CS Binghamton University
