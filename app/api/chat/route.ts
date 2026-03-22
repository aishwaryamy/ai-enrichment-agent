import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationState } = await req.json();

    const systemPrompt = `You are a friendly AI sales assistant built into a Contact Enrichment Agent platform. Your job is to conversationally collect information from the user to enrich a contact record.

You collect information in this exact order — do not skip any step:
1. First name of the contact
2. Last name of the contact
3. Company name
4. Job title — ask "What is their job title? You can say skip if unknown."
5. Product being sold — ask "What product are you selling? You can say skip to use the default."

Current conversation state: ${JSON.stringify(conversationState)}

RULES:
- Be warm, brief, and conversational — max 2 sentences per response
- Never use markdown formatting like **bold** or *italic* — plain text only
- Ask only ONE question at a time
- You MUST go through all 5 steps in order — never jump from company directly to outputting JSON
- Only output the JSON after you have asked about title AND product (even if user skipped both)
- If user says "skip", "s", "none", or "default" for title use empty string for title
- If user says "skip", "s", "none", or "default" for product use "AI SaaS Platform" for product
- Once you have all 5 responses, output ONLY this raw JSON with no markdown, no backticks, no explanation:
{"intent": "enrich", "firstName": "...", "lastName": "...", "company": "...", "title": "...", "product": "..."}
- If the user asks a question mid-flow, answer briefly in 1 sentence then continue where you left off
- If the user wants to start over, reset and ask for first name again
- After enrichment is complete (when conversation state step is "done"), do NOT immediately ask to enrich another contact. Instead act as a knowledgeable assistant who can answer follow-up questions about the enriched contact — their industry, ICP score reasoning, tech stack, buying signals, email draft, or anything related. Only ask if they want to enrich another contact AFTER the user explicitly says something like "looks good", "got it", "I'm done", "yes", "clear", "happy with this", or any signal that they are satisfied. Until then, stay in assistant mode and answer their questions.
- When the user signals satisfaction, say something warm like "Glad that helps! Ready to enrich another contact whenever you are." — do not immediately ask for a first name again
- Never use markdown formatting in any response — plain text only`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.2,
      max_tokens: 200,
    });

    const content = response.choices[0].message.content || "";

    // Check if it's an enrichment trigger (handle markdown-wrapped JSON too)
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.intent === "enrich") {
          return NextResponse.json({ type: "enrich", data: parsed });
        }
      }
    } catch {
      // Not JSON, regular message
    }

    return NextResponse.json({ type: "message", content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}