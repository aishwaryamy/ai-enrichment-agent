"use client";
import { useState } from "react";

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

export default function Home() {
  const [firstName, setFirstName] = useState("Sarah");
  const [lastName, setLastName] = useState("Chen");
  const [company, setCompany] = useState("Snowflake");
  const [title, setTitle] = useState("VP of Revenue Operations");
  const [product, setProduct] = useState("AI-Native CRM Platform");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EnrichmentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"enrich" | "apollo">("enrich");
  const [copied, setCopied] = useState(false);
  const [timeTaken, setTimeTaken] = useState<string | null>(null);
  const [showCrmModal, setShowCrmModal] = useState(false);

  async function runEnrichment() {
    if (!firstName || !company) return;
    setLoading(true);
    setData(null);
    setError(null);
    setTimeTaken(null);
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

  function copyEmail() {
    if (!data) return;
    navigator.clipboard.writeText(
      `Subject: ${data.outreach_email.subject}\n\n${data.outreach_email.body}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function pushToCrm() {
    setShowCrmModal(true);
  }

  const scoreColor =
    (data?.icp_score.score || 0) >= 80
      ? "#34d399"
      : (data?.icp_score.score || 0) >= 60
      ? "#f59e0b"
      : "#f87171";

  const strengthColor = (s: string) =>
    s === "high"
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
      : s === "medium"
      ? "text-amber-400 bg-amber-400/10 border-amber-400/25"
      : "text-slate-400 bg-slate-400/10 border-slate-400/25";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 font-sans">

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0a0a0f]/90 backdrop-blur-md px-8 h-14 flex items-center justify-between">
        <div className="font-bold text-lg tracking-tight">
          AI <span className="text-violet-400">Contact Enrichment</span> Agent
        </div>
        <div className="text-[11px] uppercase tracking-widest text-slate-500 border border-violet-400/20 text-violet-400/70 px-3 py-1 rounded-full">
          FDE Demo · GPT-4o
        </div>
        <div className="text-[11px] font-mono text-slate-600">v1.0</div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">

        {/* LEFT PANEL */}
        <aside className="w-80 border-r border-white/[0.07] bg-[#111118] flex flex-col overflow-y-auto shrink-0">

          {/* Tabs */}
          <div className="p-4 border-b border-white/[0.07]">
            <div className="flex gap-1 bg-[#18181f] rounded-lg p-1">
              <button
                onClick={() => setActiveTab("enrich")}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                  activeTab === "enrich"
                    ? "bg-[#1e1e28] text-slate-200 border border-white/10"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Enrich Contact
              </button>
              <button
                onClick={() => setActiveTab("apollo")}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                  activeTab === "apollo"
                    ? "bg-[#1e1e28] text-slate-200 border border-white/10"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                vs Legacy Tools
              </button>
            </div>
          </div>

          {/* Tab: Enrich */}
          {activeTab === "enrich" && (
            <div className="p-4 flex flex-col gap-3">
              {[
                { label: "First Name", val: firstName, set: setFirstName, ph: "e.g. Sarah" },
                { label: "Last Name", val: lastName, set: setLastName, ph: "e.g. Chen" },
                { label: "Company", val: company, set: setCompany, ph: "e.g. Snowflake" },
                { label: "Title (optional)", val: title, set: setTitle, ph: "e.g. VP of Sales" },
                { label: "Your Product", val: product, set: setProduct, ph: "What are you selling?" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-[11px] text-slate-500 mb-1.5 uppercase tracking-wide font-mono">
                    {f.label}
                  </label>
                  <input
                    value={f.val}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.ph}
                    className="w-full bg-[#18181f] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              ))}
              <button
                onClick={runEnrichment}
                disabled={loading || !firstName || !company}
                className="mt-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-all bg-violet-600 hover:bg-violet-500 text-white disabled:bg-[#1e1e28] disabled:text-slate-600 disabled:cursor-not-allowed"
              >
                {loading ? "⏳ Agent running..." : "⚡ Run Enrichment Agent"}
              </button>

              {/* Architecture pills */}
              <div className="mt-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">Agent Steps</div>
                <div className="flex flex-col gap-1.5">
                  {[
                    { color: "bg-violet-400", label: "Company research" },
                    { color: "bg-teal-400", label: "Tech stack inference" },
                    { color: "bg-amber-400", label: "Buying signal extraction" },
                    { color: "bg-emerald-400", label: "ICP fit scoring (0–100)" },
                    { color: "bg-pink-400", label: "Personalized email draft" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2 text-xs text-slate-400">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.color} shrink-0`} />
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: vs Legacy */}
          {activeTab === "apollo" && (
            <div className="p-4 flex flex-col gap-3">
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
        </aside>

        {/* RIGHT PANEL */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Column headers */}
          <div className="grid grid-cols-[180px_1fr] border-b border-white/[0.07] bg-[#111118] shrink-0">
            <div className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-slate-600 border-r border-white/[0.07]">Step</div>
            <div className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-violet-400/70">AI Agent Output</div>
          </div>

          {/* Output area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">

            {/* Idle */}
            {!loading && !data && !error && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-20">
                <div className="w-16 h-16 rounded-full bg-[#18181f] border border-white/10 flex items-center justify-center text-3xl">🔍</div>
                <div className="text-lg font-semibold text-slate-400">Agent standing by</div>
                <div className="text-sm text-slate-600 max-w-sm">
                  Enter a contact name and company, then hit Run. The agent will research, enrich, score, and draft outreach — autonomously.
                </div>
              </div>
            )}

            {/* Loading */}
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

            {/* Error */}
            {error && (
              <div className="bg-red-400/[0.06] border border-red-400/20 rounded-xl p-4 text-red-400 text-sm">
                ⚠ {error}
              </div>
            )}

            {/* Results */}
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
                        <div className="text-[11px] text-slate-500">To: <span className="text-slate-300">{firstName} {lastName}</span></div>
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
                        onClick={pushToCrm}
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

          {/* Stats bar */}
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
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">Contact created in CRM</span>
              </div>
              <button
                onClick={() => setShowCrmModal(false)}
                className="text-slate-500 hover:text-slate-300 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Contact header */}
            <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold text-lg">
                {firstName[0]}{lastName[0]}
              </div>
              <div>
                <div className="font-semibold text-slate-100">{data.contact.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{data.contact.title} · {data.contact.company}</div>
                <div className="text-xs text-slate-600 mt-0.5">{data.contact.company_hq}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-2xl font-bold" style={{ color: scoreColor }}>
                  {data.icp_score.score}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">ICP Score</div>
              </div>
            </div>

            {/* CRM fields */}
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

            {/* Buying signals */}
            <div className="px-5 py-4 border-b border-white/[0.07]">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">Top buying signals</div>
              <div className="flex flex-col gap-1.5">
                {data.buying_signals.slice(0, 2).map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${
                      s.strength === "high"
                        ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
                        : "text-amber-400 bg-amber-400/10 border-amber-400/25"
                    }`}>
                      {s.strength}
                    </span>
                    <span className="text-xs text-slate-400">{s.signal}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Email preview */}
            <div className="px-5 py-4 border-b border-white/[0.07]">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">Outreach email queued</div>
              <div className="bg-[#18181f] rounded-lg px-3 py-2.5">
                <div className="text-[11px] text-slate-500 mb-1">
                  Subject: <span className="text-slate-300">{data.outreach_email.subject}</span>
                </div>
                <div className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {data.outreach_email.body.split("\n")[0]}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="text-[11px] text-slate-600 font-mono">
                synced · {new Date().toLocaleTimeString()}
              </div>
              <button
                onClick={() => setShowCrmModal(false)}
                className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              >
                Done
              </button>
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