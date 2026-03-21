import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, company, title, product } = await req.json();

    if (!firstName || !company) {
      return NextResponse.json(
        { error: "First name and company are required." },
        { status: 400 }
      );
    }

    const prompt = `You are an elite B2B sales intelligence agent. Your job is to enrich a contact record and return structured JSON.

Contact: ${firstName} ${lastName}
Company: ${company}
Title: ${title || "unknown"}
Product being sold: ${product || "AI SaaS platform"}

Your task:
1. Search the web to find real, current information about ${company}
2. Identify their likely current CRM and GTM tech stack
3. List 2-3 recent news items or signals about ${company}
4. Extract 3 buying signals that suggest ${company} would be interested in ${product || "an AI SaaS platform"}
5. Score their ICP fit from 0-100 with reasoning
6. Draft a short personalized outreach email referencing specific signals

Return ONLY a valid JSON object, no markdown, no preamble, no backticks. Exactly this structure:
{
  "contact": {
    "name": "full name",
    "title": "inferred or confirmed title",
    "company": "company name",
    "industry": "industry vertical",
    "company_size": "employee count estimate",
    "company_hq": "city, country",
    "linkedin_signal": "any notable public activity or role signal"
  },
  "company_intel": {
    "recent_news": ["news item 1", "news item 2", "news item 3"],
    "funding_stage": "series stage or public or unknown",
    "tech_stack": ["tool1", "tool2", "tool3", "tool4"],
    "current_crm": "their most likely CRM tool",
    "pain_signals": ["pain signal 1", "pain signal 2", "pain signal 3"]
  },
  "buying_signals": [
    {"signal": "signal description", "strength": "high", "source": "where inferred from"},
    {"signal": "signal description", "strength": "medium", "source": "where inferred from"},
    {"signal": "signal description", "strength": "low", "source": "where inferred from"}
  ],
  "icp_score": {
    "score": 78,
    "label": "Strong Fit",
    "reasoning": "2-3 sentence explanation of why this contact fits the ICP",
    "objections": ["potential objection 1", "potential objection 2"]
  },
  "outreach_email": {
    "subject": "compelling subject line",
    "body": "full personalized email body. Reference specific signals. 5-7 sentences. Ready to send. Use actual newlines between paragraphs."
  },
  "agent_log": [
    {"step": "01", "action": "Company research", "result": "what was found"},
    {"step": "02", "action": "Contact profiling", "result": "what was inferred"},
    {"step": "03", "action": "Tech stack analysis", "result": "what was identified"},
    {"step": "04", "action": "ICP scoring", "result": "score and reasoning"},
    {"step": "05", "action": "Email drafting", "result": "personalized email generated"}
  ]
}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client as any).responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" }],
      input: [
        {
          role: "system",
          content:
            "You are a B2B sales intelligence agent. Search the web to find real current information about the company before enriching. Always respond with valid JSON only. No markdown. No explanation. Just the JSON object.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_output_tokens: 2000,
    });

    // Extract text from response output blocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw =
      (response.output as any[])
        .filter((b) => b.type === "message")
        .flatMap((b) => b.content ?? [])
        .filter((c: { type: string }) => c.type === "output_text")
        .map((c: { text: string }) => c.text)
        .join("") || "";

    // Extract just the JSON object from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }

    // Fix unescaped control characters inside JSON string values only
    const clean = jsonMatch[0].replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (_match, inner) => {
        const fixed = inner
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r")
          .replace(/\t/g, "\\t");
        return `"${fixed}"`;
      }
    );

    const data = JSON.parse(clean);

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}