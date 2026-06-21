import React, { useState } from "react";
import { Search, Loader2, Sparkles, BookOpen, AlertCircle, Calendar, Download, RefreshCw, Layers } from "lucide-react";
import Markdown from "react-markdown";

interface SearchAttemptLog {
  timestamp: string;
  query: string;
  status: string;
}

interface DeepResearchProps {
  language?: string;
}

export function DeepResearch({ language }: DeepResearchProps) {
  const [query, setQuery] = useState("");
  const [depth, setDepth] = useState<"quick" | "balanced" | "deep">("balanced");
  const [loading, setLoading] = useState(false);
  const [statusSteps, setStatusSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [logs, setLogs] = useState<SearchAttemptLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isHu = language === "hu";

  const t = {
    title: isHu ? "Deep Research Mérnöki Kutatómodul" : "Deep Research Analytical Module",
    desc: isHu 
      ? "Indíts mélyreható kutatást bármilyen globális témában. A modul valós idejű internetes keresésekből gyűjt információt, majd több dimenziós strukturált tanulmányt szintézisel forrásmegjelölésekkel."
      : "Initiate deeply grounded research on any global topic. Leverages real-time Google Search Grounding to aggregate live data and compile multi-dimensional reports with sources.",
    secModule: isHu ? "RENDSZER MODUL" : "SYSTEM MODULE",
    placeholder: isHu 
      ? "Írd be a kutatási témát vagy kérdést (pl: 'Legújabb AI trendek 2026-ban és a chipgyártás helyzete')..."
      : "Enter your research topic or query (e.g. 'Key AI trends in 2026 and global semiconductor fabrication advancements')...",
    quickOption: isHu ? "⚡ Gyorsletapogatás (1 kör)" : "⚡ Quick Scan (1 depth)",
    balancedOption: isHu ? "⚖️ Kiegyensúlyozott (2 kör)" : "⚖️ Balanced Drill (2 depth)",
    deepOption: isHu ? "🔬 Mélyfúrás (Multi-szintézis)" : "🔬 Deep Synthesis (Multi-pass)",
    triggerBtn: isHu ? "Kutatás..." : "Analyzing...",
    startBtn: isHu ? "Indítás" : "Analyze",
    step1: isHu ? "Keresési stratégia előkészítése..." : "Preparing search strategy and parameters...",
    step2: isHu ? "Webes index lekérdezése..." : "Querying search index & crawling target sites...",
    stepLive: isHu ? "Élő web-keresés indítása a Gemini Search Grounding hálózaton..." : "Launching live Gemini Search Grounding and web crawler context retrieval...",
    step3: isHu ? "Források kigyűjtése és ellenőrzése..." : "Compiling reliable references and grounding details...",
    step4: isHu ? "Kohéziós elemzés és szintézis folyamatban..." : "Synthesizing cross-domain concepts and structured insights...",
    stepFinal: isHu ? "Végső, strukturált Deep Research tanulmány generálása..." : "Generating authoritative Deep Research manuscript via Gemini model...",
    stepSuccess: isHu ? "Kutatási riport sikeresen elkészült!" : "Research paper compiled successfully!",
    downloadBtn: isHu ? "Letöltés (.md)" : "Download (.md)",
    sourcesTitle: isHu ? "Keresési Források" : "Aggregated Citations",
    logsTitle: isHu ? "Kutató hálózat naplója" : "Research Crawler Logs",
    reportTitle: isHu ? "Szerkesztett Elemzési Jelentés" : "Synthesized Analysis Manuscript",
    activeLoading: isHu ? "Deep Research folyamatban" : "Deep Research in progress",
    activeLoadingDesc: isHu ? "Valós idejű weblapok letapogatása és intelligens strukturálás..." : "Crawling relevant live pages and structuring deep knowledge...",
    errorTitle: isHu ? "Biztonsági vagy Kiszolgáló hiba" : "Grounding or Server Exception",
    genericError: isHu ? "Hiba történt a kutatás során." : "An error occurred during search synthesis.",
    unknownError: isHu ? "Ismeretlen hiba történt a keresés során." : "An unknown error has occurred."
  };

  const triggerResearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setReport(null);
    setCitations([]);
    setError(null);
    setStatusSteps([t.step1, t.step2]);
    setCurrentStep(t.stepLive);

    try {
      const res = await fetch("/api/deep-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, depth }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || t.genericError);
      }

      setStatusSteps(prev => [...prev, t.step3, t.step4]);
      setCurrentStep(t.stepFinal);

      const data = await res.json();
      setReport(data.report);
      setCitations(data.citations || []);
      setLogs(data.logs || []);
      setStatusSteps(prev => [...prev, t.stepSuccess]);
      setCurrentStep("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || t.unknownError);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Deep_Research_${query.replace(/\s+/g, "_")}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="panel-deep-research">
      {/* Search Header Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-805/60 text-[10px] font-bold px-2.5 py-1 rounded inline-flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Gemini Google Search Grounding Enabled
            </span>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {t.title}
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              {t.desc}
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-mono">{t.secModule}</span>
            <span className="text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 px-2 py-1 rounded mt-1 font-mono">v1.2.0-STABLE</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {/* Query input panel */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
              <input
                id="input-research-query"
                type="text"
                placeholder={t.placeholder}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && triggerResearch()}
                disabled={loading}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                id="select-research-depth"
                value={depth}
                onChange={e => setDepth(e.target.value as any)}
                disabled={loading}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-white text-sm font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="quick">{t.quickOption}</option>
                <option value="balanced">{t.balancedOption}</option>
                <option value="deep">{t.deepOption}</option>
              </select>

              <button
                id="btn-trigger-research"
                onClick={triggerResearch}
                disabled={loading || !query.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-sm px-6 py-3 rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-[0.98] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    {t.triggerBtn}
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-white" />
                    {t.startBtn}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress or active loader screen */}
      {loading && (
        <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            <div>
              <h3 className="text-sm font-semibold text-white">{t.activeLoading}</h3>
              <p className="text-xs text-slate-400">{t.activeLoadingDesc}</p>
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/60 font-mono text-xs text-indigo-300 space-y-1.5 max-h-48 overflow-y-auto">
            {statusSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 text-slate-455">
                <span className="text-emerald-500">✓</span>
                <span>{step}</span>
              </div>
            ))}
            {currentStep && (
              <div className="flex items-center gap-2 animate-pulse text-indigo-400 font-bold">
                <span className="text-indigo-400 animate-spin">⚡</span>
                <span>{currentStep}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-950/40 border border-red-800/80 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-red-300">{t.errorTitle}</h4>
            <p className="text-xs text-red-400/90 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Result Report Panel */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-900/60 flex items-center justify-center border border-indigo-700/40">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{t.reportTitle}</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">Gemini Grounded Synthesis Paper</p>
                  </div>
                </div>

                <button
                  id="btn-download-report"
                  onClick={handleDownload}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-slate-755 px-3.5 py-1.5 rounded-lg text-xs text-slate-200 font-semibold transition flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t.downloadBtn}
                </button>
              </div>

              {/* Rendered report markdown */}
              <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed space-y-4 markdown-body">
                <Markdown>{report}</Markdown>
              </div>
            </div>
          </div>

          {/* Sidebar with sources & search history */}
          <div className="space-y-6">
            {/* Citations Card */}
            {citations.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <span>📰</span> {t.sourcesTitle} ({citations.length})
                </h4>
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {citations.map((cite, i) => (
                    <a
                      key={i}
                      href={cite}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="block p-2.5 bg-slate-900/80 border border-slate-800/60 rounded-xl hover:border-indigo-800/80 hover:bg-slate-900 transition text-[11px] font-medium text-slate-350 truncate flex items-center gap-2"
                    >
                      <span className="w-5 h-5 rounded bg-slate-800 text-slate-400 flex items-center justify-center font-mono text-[10px] flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="truncate flex-1 hover:text-indigo-400 font-mono select-all">
                        {cite}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Logs Card */}
            {logs.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <span>🛠️</span> {t.logsTitle}
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto text-[10px] font-mono text-slate-450 border border-slate-850 bg-slate-900/30 p-2.5 rounded-xl">
                  {logs.map((log, idx) => (
                    <div key={idx} className="pb-1.5 border-b border-slate-850/60 last:border-b-0">
                      <span className="text-slate-500">[{log.timestamp}]</span>{" "}
                      <span className="text-indigo-400 font-semibold">{log.query}</span>:{" "}
                      <span className="text-emerald-400">{log.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
