"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

interface ContactData {
  name: string;
  title: string;
  company: string;
  industry: string;
  company_size: string;
  company_hq: string;
  linkedin_signal: string;
}

interface CompanyIntel {
  recent_news: string[];
  funding_stage: string;
  tech_stack: string[];
  current_crm: string;
  pain_signals: string[];
}

interface BuyingSignal {
  signal: string;
  strength: "high" | "medium" | "low";
  source: string;
}

interface IcpScore {
  score: number;
  label: string;
  reasoning: string;
  objections: string[];
}

interface OutreachEmail {
  subject: string;
  body: string;
}

interface AgentLog {
  step: string;
  action: string;
  result: string;
}

interface EnrichmentData {
  contact: ContactData;
  company_intel: CompanyIntel;
  buying_signals: BuyingSignal[];
  icp_score: IcpScore;
  outreach_email: OutreachEmail;
  agent_log: AgentLog[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ConversationState {
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  product?: string;
  step: "firstName" | "lastName" | "company" | "title" | "product" | "done";
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"enrich" | "apollo" | "history">("enrich");

  // History state
  interface HistoryRecord {
    id: string;
    created_at: string;
    first_name: string;
    last_name: string;
    company: string;
    icp_score: number;
    icp_label: string;
    current_crm: string;
    full_result: EnrichmentData;
  }
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [data, setData] = useState<EnrichmentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeTaken, setTimeTaken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCrmModal, setShowCrmModal] = useState(false);

  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi there! 👋 I'm your AI enrichment assistant.\n\nI'll research any B2B contact for you — pulling live company intel, buying signals, ICP score, and a personalized outreach email.\n\nLet's start — what's the first name of the contact you'd like to enrich?",
    },
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>({ step: "firstName" });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [chatLoading]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from("enrichments")
      .select("id, created_at, first_name, last_name, company, icp_score, icp_label, current_crm, full_result")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setHistory(data);
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab, fetchHistory]);

  async function runEnrichment(
    firstName: string,
    lastName: string,
    company: string,
    title: string,
    product: string
  ) {
    setLoading(true);
    setData(null);
    setError(null);
    setTimeTaken(null);
    setContactFirstName(firstName);
    setContactLastName(lastName);
    const start = Date.now();
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, company, title, product }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      setData(json.data);
      setTimeTaken(((Date.now() - start) / 1000).toFixed(1));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || chatLoading) return;
    const userText = input.trim();
    setInput("");

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userText },
    ];
    setMessages(newMessages);
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, conversationState }),
      });
      const json = await res.json();

      if (json.type === "enrich") {
        const { firstName, lastName, company, title, product } = json.data;

        setConversationState({ step: "done", firstName, lastName, company, title, product });

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Perfect! Running enrichment on ${firstName} ${lastName} at ${company} now... 🚀\n\nCheck the right panel for results as they come in.`,
          },
        ]);

        await runEnrichment(
          firstName,
          lastName,
          company,
          title || "",
          product || "AI SaaS Platform"
        );

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Enrichment complete! Take a look at the results on the right.\n\nDo you have any questions about what I found — the ICP score, tech stack, buying signals, or the email draft? I'm happy to explain anything.",
          },
        ]);

        setConversationState({ step: "firstName" });

      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.content },
        ]);

        setConversationState((prev) => {
          const updated = { ...prev };
          if (prev.step === "firstName") { updated.firstName = userText; updated.step = "lastName"; }
          else if (prev.step === "lastName") { updated.lastName = userText; updated.step = "company"; }
          else if (prev.step === "company") { updated.company = userText; updated.step = "title"; }
          else if (prev.step === "title") { updated.title = userText; updated.step = "product"; }
          else if (prev.step === "product") { updated.product = userText; }
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function copyEmail() {
    if (!data) return;
    navigator.clipboard.writeText(
      `Subject: ${data.outreach_email.subject}\n\n${data.outreach_email.body}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const scoreColor =
    (data?.icp_score.score || 0) >= 80 ? "#34d399" :
    (data?.icp_score.score || 0) >= 60 ? "#f59e0b" : "#f87171";

  const strengthColor = (s: string) =>
    s === "high" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" :
    s === "medium" ? "text-amber-400 bg-amber-400/10 border-amber-400/25" :
    "text-slate-400 bg-slate-400/10 border-slate-400/25";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 font-sans">

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0a0a0f]/90 backdrop-blur-md px-8 h-14 flex items-center justify-between">
        <div className="font-bold text-lg tracking-tight">
          AI <span className="text-violet-400">Contact Enrichment</span> Agent
        </div>
        <div className="text-[11px] uppercase tracking-widest border border-violet-400/20 text-violet-400/70 px-3 py-1 rounded-full">
          GPT-4o
        </div>
        <div className="text-[11px] font-mono text-slate-600">v2.0</div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">

        {/* LEFT PANEL */}
        <aside className="w-80 border-r border-white/[0.07] bg-[#111118] flex flex-col shrink-0">

          <div className="p-4 border-b border-white/[0.07] shrink-0">
            <div className="flex gap-1 bg-[#18181f] rounded-lg p-1">
              <button
                onClick={() => setActiveTab("enrich")}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                  activeTab === "enrich"
                    ? "bg-[#1e1e28] text-slate-200 border border-white/10"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                AI Assistant
            </button>
            <button
              onClick={() => setActiveTab("apollo")}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                activeTab === "apollo"
                  ? "bg-[#1e1e28] text-slate-200 border border-white/10"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              vs Legacy
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                activeTab === "history"
                  ? "bg-[#1e1e28] text-slate-200 border border-white/10"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              History
              </button>
            </div>
          </div>

          {activeTab === "enrich" && (
            <div className="flex flex-col flex-1 overflow-hidden">

              {/* Progress indicators */}
              <div className="px-4 py-3 border-b border-white/[0.07] shrink-0">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">Collecting</div>
                <div className="flex gap-2">
                  {[
                    { label: "First", key: "firstName" },
                    { label: "Last", key: "lastName" },
                    { label: "Company", key: "company" },
                    { label: "Title", key: "title" },
                  ].map((f) => (
                    <div
                      key={f.key}
                      className={`flex-1 text-center text-[10px] py-1 rounded font-mono transition-all ${
                        conversationState[f.key as keyof ConversationState]
                          ? "bg-violet-500/20 border border-violet-500/30 text-violet-300"
                          : conversationState.step === f.key
                          ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse"
                          : "bg-[#18181f] border border-white/[0.05] text-slate-600"
                      }`}
                    >
                      {conversationState[f.key as keyof ConversationState]
                        ? conversationState[f.key as keyof ConversationState] as string
                        : f.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs shrink-0 mt-0.5 mr-2">
                        🤖
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
                        msg.role === "user"
                          ? "bg-violet-600 text-white rounded-br-sm"
                          : "bg-[#18181f] border border-white/[0.07] text-slate-300 rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs shrink-0 mt-0.5 mr-2">
                      🤖
                    </div>
                    <div className="bg-[#18181f] border border-white/[0.07] rounded-xl px-3 py-2.5">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-white/[0.07] shrink-0">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder={
                      conversationState.step === "firstName" ? "Type a first name..." :
                      conversationState.step === "lastName" ? "Type a last name..." :
                      conversationState.step === "company" ? "Type a company name..." :
                      conversationState.step === "title" ? "Type a title or 'skip'..." :
                      conversationState.step === "product" ? "Type your product or 'skip'..." :
                      "Ask me anything..."
                    }
                    disabled={chatLoading}
                    className="flex-1 bg-[#18181f] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={chatLoading || !input.trim()}
                    className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-[#1e1e28] disabled:text-slate-600 text-white flex items-center justify-center transition-colors text-sm shrink-0"
                  >
                    ↑
                  </button>
                </div>
                <div className="text-[10px] text-slate-600 mt-2 text-center font-mono">
                  press enter to send
                </div>
              </div>
            </div>
          )}

          {activeTab === "apollo" && (
            <div className="p-4 flex flex-col gap-3 overflow-y-auto">
              <p className="text-xs text-slate-500 leading-relaxed">
                How a rep does this manually in legacy tools — and where the pain lives.
              </p>
              {[
                { n: "01", title: "Search contact in tool", time: "~2 min", pain: "Data often stale 6–12mo" },
                { n: "02", title: "Export to spreadsheet", time: "~3 min", pain: "Manual copy-paste errors" },
                { n: "03", title: "Google contact manually", time: "~10 min", pain: "Reps skip this 80% of time" },
                { n: "04", title: "LinkedIn profile review", time: "~5 min", pain: "No buying signals extracted" },
                { n: "05", title: "Write email from scratch", time: "~15 min", pain: "Generic, low response rate" },
              ].map((s) => (
                <div key={s.n} className="bg-[#18181f] border border-white/[0.07] rounded-lg p-3">
                  <div className="text-[10px] font-mono text-slate-600">STEP {s.n}</div>
                  <div className="text-xs font-medium text-slate-300 mt-0.5">{s.title}</div>
                  <div className="text-[11px] font-mono text-amber-400 mt-1">⏱ {s.time}</div>
                  <div className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded bg-red-400/10 border border-red-400/20 text-red-400">
                    {s.pain}
                  </div>
                </div>
              ))}
              <div className="text-center text-[10px] font-mono text-slate-600 py-1">─── Total ───</div>
              <div className="bg-red-400/[0.06] border border-red-400/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-400">~35 min</div>
                <div className="text-[11px] text-slate-500 mt-1">per contact · no AI insight · siloed</div>
              </div>
              <div className="bg-teal-400/[0.06] border border-teal-400/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-teal-400">~45 sec</div>
                <div className="text-[11px] text-slate-500 mt-1">this agent · live signals · auto-draft</div>
              </div>
            </div>
          )}

          {/* Tab: History */}
          {activeTab === "history" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.07] shrink-0 flex items-center justify-between">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Past enrichments</div>
                <button
                  onClick={fetchHistory}
                  className="text-[10px] text-violet-400 hover:text-violet-300 font-mono"
                >
                  refresh
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {historyLoading && (
                  <div className="text-xs text-slate-600 text-center py-8">Loading...</div>
                )}
                {!historyLoading && history.length === 0 && (
                  <div className="text-xs text-slate-600 text-center py-8">No enrichments yet.</div>
                )}
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="bg-[#18181f] border border-white/[0.07] rounded-lg p-3 hover:border-violet-500/30 transition-all group relative"
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        setData(h.full_result);
                        setContactFirstName(h.first_name);
                        setContactLastName(h.last_name);
                        setTimeTaken(null);
                        setActiveTab("enrich");
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-semibold text-slate-200">
                          {h.first_name} {h.last_name}
                        </div>
                        <div
                          className="text-[11px] font-bold font-mono"
                          style={{
                            color: h.icp_score >= 80 ? "#34d399" : h.icp_score >= 60 ? "#f59e0b" : "#f87171"
                          }}
                        >
                          {h.icp_score}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500">{h.company}</div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-amber-400/80">{h.current_crm}</span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {new Date(h.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await supabase.from("enrichments").delete().eq("id", h.id);
                        setHistory((prev) => prev.filter((r) => r.id !== h.id));
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-red-400/10 hover:bg-red-400/20 text-red-400 text-xs"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT PANEL */}
        <main className="flex-1 flex flex-col overflow-hidden">

          <div className="grid grid-cols-[180px_1fr] border-b border-white/[0.07] bg-[#111118] shrink-0">
            <div className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-slate-600 border-r border-white/[0.07]">Step</div>
            <div className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-violet-400/70">AI Agent Output</div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">

            {!loading && !data && !error && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-20">
                <div className="w-16 h-16 rounded-full bg-[#18181f] border border-white/10 flex items-center justify-center text-3xl">🔍</div>
                <div className="text-lg font-semibold text-slate-400">Waiting for input</div>
                <div className="text-sm text-slate-600 max-w-sm">
                  Chat with the AI assistant on the left to enrich a contact. Results will appear here automatically.
                </div>
              </div>
            )}

            {loading && (
              <div className="flex flex-col gap-3">
                {[
                  "Initializing enrichment agent...",
                  "Researching company signals and news...",
                  "Analyzing tech stack and CRM tools...",
                  "Scoring ICP fit and extracting buying signals...",
                  "Drafting personalized outreach email...",
                ].map((msg, i) => (
                  <div key={i} className="bg-[#111118] border border-white/[0.07] rounded-xl p-4 flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-sm">
                      {["🤖", "🔎", "🛠️", "🎯", "✉️"][i]}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-300">Step {String(i + 1).padStart(2, "0")}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{msg}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-400/[0.06] border border-red-400/20 rounded-xl p-4 text-red-400 text-sm">
                ⚠ {error}
              </div>
            )}

            {data && (
              <div className="flex flex-col gap-4">

                {/* Step 1: Research */}
                <div className="bg-[#111118] border border-white/[0.07] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.07]">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-sm">🔎</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">Research Complete</div>
                      <div className="text-xs text-slate-500">Company intel · firmographics · tech stack</div>
                    </div>
                    {timeTaken && (
                      <div className="text-xs font-mono text-teal-400 bg-teal-400/10 border border-teal-400/20 px-2 py-1 rounded">
                        {timeTaken}s
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        { k: "Industry", v: data.contact.industry },
                        { k: "Company size", v: data.contact.company_size },
                        { k: "HQ", v: data.contact.company_hq },
                        { k: "Funding stage", v: data.company_intel.funding_stage, highlight: true },
                        { k: "Current CRM", v: data.company_intel.current_crm, warn: true },
                        { k: "LinkedIn signal", v: data.contact.linkedin_signal },
                      ].map((cell) => (
                        <div key={cell.k} className="bg-[#18181f] border border-white/[0.05] rounded-lg p-3">
                          <div className="text-[10px] font-mono uppercase tracking-wide text-slate-600 mb-1">{cell.k}</div>
                          <div className={`text-xs font-medium ${cell.highlight ? "text-teal-400" : cell.warn ? "text-amber-400" : "text-slate-200"}`}>
                            {cell.v || "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mb-3">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">Recent news</div>
                      {data.company_intel.recent_news.map((n, i) => (
                        <div key={i} className="text-xs text-slate-400 py-1.5 border-b border-white/[0.05] last:border-0">→ {n}</div>
                      ))}
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">Tech stack detected</div>
                      <div className="flex flex-wrap gap-1.5">
                        {data.company_intel.tech_stack.map((t) => (
                          <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-400/10 border border-slate-400/20 text-slate-400">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Buying Signals */}
                <div className="bg-[#111118] border border-white/[0.07] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.07]">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-sm">📡</div>
                    <div>
                      <div className="text-sm font-semibold">Buying Signals Extracted</div>
                      <div className="text-xs text-slate-500">Intent signals that indicate purchase readiness</div>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col gap-2">
                    {data.buying_signals.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 bg-[#18181f] border border-white/[0.05] rounded-lg p-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 mt-0.5 ${strengthColor(s.strength)}`}>
                          {s.strength}
                        </span>
                        <div>
                          <div className="text-xs text-slate-200 font-medium">{s.signal}</div>
                          <div className="text-[11px] text-slate-600 mt-0.5">via {s.source}</div>
                        </div>
                      </div>
                    ))}
                    <div className="mt-1">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">Pain signals</div>
                      {data.company_intel.pain_signals.map((p, i) => (
                        <div key={i} className="text-xs text-red-400/80 py-1">⚠ {p}</div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 3: ICP Score */}
                <div className="bg-[#111118] border border-white/[0.07] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.07]">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm">🎯</div>
                    <div>
                      <div className="text-sm font-semibold">ICP Fit Score</div>
                      <div className="text-xs text-slate-500">Ideal Customer Profile match analysis</div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-5 mb-4">
                      <div className="relative w-20 h-20 shrink-0">
                        <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#1e1e28" strokeWidth="7" />
                          <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor} strokeWidth="7"
                            strokeDasharray={`${2 * Math.PI * 32}`}
                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - data.icp_score.score / 100)}`}
                            strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-xl" style={{ color: scoreColor }}>
                          {data.icp_score.score}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: scoreColor }}>{data.icp_score.label}</div>
                        <div className="text-xs text-slate-400 mt-1 leading-relaxed">{data.icp_score.reasoning}</div>
                      </div>
                    </div>
                    {data.icp_score.objections.length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">Likely objections to prepare for</div>
                        {data.icp_score.objections.map((o, i) => (
                          <div key={i} className="text-xs text-amber-400/80 py-1">→ {o}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 4: Email */}
                <div className="bg-[#111118] border border-white/[0.07] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.07]">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-sm">✉️</div>
                    <div>
                      <div className="text-sm font-semibold">Personalized Email Drafted</div>
                      <div className="text-xs text-slate-500">References live signals · ready to send</div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="bg-[#18181f] border border-white/[0.07] rounded-lg overflow-hidden mb-3">
                      <div className="px-4 py-2.5 border-b border-white/[0.05]">
                        <div className="text-[11px] text-slate-500">To: <span className="text-slate-300">{contactFirstName} {contactLastName}</span></div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Subject: <span className="text-slate-300">{data.outreach_email.subject}</span></div>
                      </div>
                      <div className="px-4 py-3 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                        {data.outreach_email.body}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={copyEmail} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors">
                        {copied ? "✓ Copied!" : "Copy Email"}
                      </button>
                      <button
                        onClick={() => setShowCrmModal(true)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold border border-white/10 text-slate-400 hover:border-violet-400/50 hover:text-violet-400 transition-colors"
                      >
                        Push to CRM
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 5: Agent Log */}
                <div className="bg-[#111118] border border-white/[0.07] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.07]">
                    <div className="w-8 h-8 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-sm">📋</div>
                    <div>
                      <div className="text-sm font-semibold">Agent Execution Log</div>
                      <div className="text-xs text-slate-500">Full reasoning trace</div>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col gap-1">
                    {data.agent_log.map((l, i) => (
                      <div key={i} className="flex gap-3 font-mono text-[11px] py-1">
                        <span className="text-violet-400/60">[{l.step}]</span>
                        <span className="text-slate-500">{l.action}:</span>
                        <span className="text-emerald-400/80">{l.result}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {data && timeTaken && (
            <div className="border-t border-white/[0.07] bg-[#111118] px-6 py-2.5 flex items-center gap-6 text-xs shrink-0">
              <div className="flex items-center gap-1.5 text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Completed <span className="text-slate-300 font-medium ml-1">{data.agent_log.length} steps</span>
              </div>
              <div className="text-slate-500">Time: <span className="text-slate-300 font-medium">{timeTaken}s</span></div>
              <div className="text-slate-500">ICP Score: <span className="font-medium" style={{ color: scoreColor }}>{data.icp_score.score}/100</span></div>
              <div className="flex-1" />
              <div className="text-slate-600">vs manual: <span className="text-teal-400 font-semibold">~46× faster</span></div>
            </div>
          )}
        </main>
      </div>

      {/* CRM MODAL */}
      {showCrmModal && data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowCrmModal(false)}
        >
          <div
            className="bg-[#111118] border border-white/10 rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl"
            style={{ animation: "slideUp 0.25s ease" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">Contact created in CRM</span>
              </div>
              <button onClick={() => setShowCrmModal(false)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">✕</button>
            </div>
            <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold text-lg">
                {contactFirstName[0]}{contactLastName[0]}
              </div>
              <div>
                <div className="font-semibold text-slate-100">{data.contact.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{data.contact.title} · {data.contact.company}</div>
                <div className="text-xs text-slate-600 mt-0.5">{data.contact.company_hq}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-2xl font-bold" style={{ color: scoreColor }}>{data.icp_score.score}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">ICP Score</div>
              </div>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-2 border-b border-white/[0.07]">
              {[
                { label: "Industry", value: data.contact.industry },
                { label: "Company size", value: data.contact.company_size },
                { label: "Funding stage", value: data.company_intel.funding_stage },
                { label: "Current CRM", value: data.company_intel.current_crm },
              ].map((f) => (
                <div key={f.label} className="bg-[#18181f] rounded-lg p-2.5">
                  <div className="text-[10px] font-mono uppercase tracking-wide text-slate-600 mb-1">{f.label}</div>
                  <div className="text-xs text-slate-200 font-medium">{f.value || "—"}</div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-b border-white/[0.07]">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">Top buying signals</div>
              <div className="flex flex-col gap-1.5">
                {data.buying_signals.slice(0, 2).map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${
                      s.strength === "high"
                        ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
                        : "text-amber-400 bg-amber-400/10 border-amber-400/25"
                    }`}>{s.strength}</span>
                    <span className="text-xs text-slate-400">{s.signal}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-4 border-b border-white/[0.07]">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">Outreach email queued</div>
              <div className="bg-[#18181f] rounded-lg px-3 py-2.5">
                <div className="text-[11px] text-slate-500 mb-1">Subject: <span className="text-slate-300">{data.outreach_email.subject}</span></div>
                <div className="text-xs text-slate-500 leading-relaxed line-clamp-2">{data.outreach_email.body.split("\n")[0]}</div>
              </div>
            </div>
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="text-[11px] text-slate-600 font-mono">synced · just now</div>
              <button onClick={() => setShowCrmModal(false)} className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
