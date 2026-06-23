import React, { useState, useRef, useEffect } from "react";
import { Terminal, Play, Trash2, ArrowRight, ShieldAlert, Cpu } from "lucide-react";

interface CommandRun {
  command: string;
  output: string;
  error?: string;
  timestamp: string;
}

export function TerminalTab() {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<CommandRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom whenever history increases
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const runCommand = async (cmdToRun: string) => {
    if (!cmdToRun.trim() || isLoading) return;

    setIsLoading(true);
    const activeCmd = cmdToRun.trim();
    
    // Add temporary optimistic command execution
    const newRunIndex = history.length;
    setHistory(prev => [
      ...prev,
      {
        command: activeCmd,
        output: "Végrehajtás folyamatban...",
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    try {
      const res = await fetch("/api/terminal/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: activeCmd })
      });

      const data = await res.json();
      
      setHistory(prev => {
        const updated = [...prev];
        if (updated[newRunIndex]) {
          updated[newRunIndex] = {
            command: activeCmd,
            output: data.output || "(Nincs szöveges kimenet)",
            error: data.success ? undefined : (data.error || "Hiba történt"),
            timestamp: new Date().toLocaleTimeString()
          };
        }
        return updated;
      });
    } catch (err: any) {
      setHistory(prev => {
        const updated = [...prev];
        if (updated[newRunIndex]) {
          updated[newRunIndex] = {
            command: activeCmd,
            output: "",
            error: err.message || "Hálózati kommunikációs hiba.",
            timestamp: new Date().toLocaleTimeString()
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    runCommand(command);
    setCommand("");
  };

  const clearConsole = () => {
    setHistory([]);
  };

  const quickCommands = [
    { label: "Rendszerinfó", cmd: "uname -a" },
    { label: "Memória", cmd: "free -m" },
    { label: "Lemezterület", cmd: "df -h" },
    { label: "Fájlok listája", cmd: "ls -la" },
    { label: "Node.js verzió", cmd: "node -v" },
    { label: "Hálózati státusz", cmd: "ip addr || ifconfig" }
  ];

  return (
    <div id="terminal-tab-container" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            Rendszer Terminál
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Futtass valós fizikai terminal parancsokat közvetlenül a Linux Mint / Cloud Run gazdagépen.
          </p>
        </div>
        
        <button
          onClick={clearConsole}
          disabled={history.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-red-500 hover:text-red-500 transition text-xs text-slate-350 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Konzol Törlése
        </button>
      </div>

      {/* Quick Action Commands Row */}
      <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl space-y-2.5">
        <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          Ajánlott gyorsparancsok (Kattints az azonnali futtatáshoz)
        </h3>
        <div className="flex flex-wrap gap-2">
          {quickCommands.map((qc, i) => (
            <button
              key={i}
              onClick={() => runCommand(qc.cmd)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300 font-mono text-xs text-left cursor-pointer transition select-none disabled:opacity-50"
            >
              <span className="text-emerald-500 mr-1">$</span> {qc.cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="bg-black border border-slate-850 rounded-xl p-4 md:p-6 font-mono text-xs overflow-hidden flex flex-col min-h-[400px] shadow-inner relative">
        {/* Terminal Watermark / Header decoration */}
        <div className="absolute top-2 right-4 text-[10px] text-slate-700 select-none">
          novaswarm@mint-host
        </div>

        {/* Dynamic history rows */}
        <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2">
          {history.length === 0 ? (
            <div className="text-slate-500 italic py-8 text-center select-none">
              <Terminal className="w-10 h-10 mx-auto mb-3 opacity-30" />
              A terminál készen áll a parancsok fogadására...
              <p className="text-[10px] text-slate-600 mt-2">Próbáld ki a fenti gyors gombok egyikét vagy gépelj be egy egyedi parancsot!</p>
            </div>
          ) : (
            history.map((run, i) => (
              <div key={i} className="space-y-1.5">
                {/* Input line representation */}
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-900 pb-1 font-mono">
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-500 font-bold">$</span>
                    <span className="text-white font-medium">{run.command}</span>
                  </div>
                  <span className="text-[10px] text-slate-650 font-mono">{run.timestamp}</span>
                </div>

                {/* Return Output or Error view */}
                {run.error ? (
                  <div className="bg-red-950/20 border border-red-900/60 text-red-400 p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap font-mono relative overflow-x-auto">
                    <div className="absolute top-1 right-2 text-[9px] text-red-500 font-bold font-sans uppercase">Hiba</div>
                    {run.error}
                    {run.output && (
                      <div className="text-slate-350 border-t border-red-900/30 pt-2 mt-2 font-mono">
                        {run.output}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/80 rounded-lg text-emerald-450 border border-slate-900 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto text-[11px]">
                    {run.output}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Interactive current command line input bar */}
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-slate-900 flex items-center gap-2">
          <span className="text-emerald-500 font-bold select-none text-sm">$</span>
          <input
            type="text"
            value={command}
            onChange={e => setCommand(e.target.value)}
            disabled={isLoading}
            placeholder="Írj be egy parancsot (pl. `ls -la /` vagy `uname -r` vagy `git status`)..."
            className="flex-1 bg-transparent text-white font-mono text-sm border-0 focus:ring-0 focus:outline-none placeholder:text-slate-650"
            autoFocus
          />
          <button
            type="submit"
            disabled={!command.trim() || isLoading}
            className="h-7 w-7 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 cursor-pointer disabled:opacity-35 disabled:pointer-events-none transition"
          >
            {isLoading ? (
              <span className="animate-pulse text-[10px] font-bold">...</span>
            ) : (
              <ArrowRight className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
      </div>

      {/* Security notice card */}
      <div className="bg-slate-950/25 border border-slate-800 p-4 rounded-xl flex gap-3 text-xs text-slate-400">
        <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <div className="space-y-1">
          <strong className="text-slate-300">Privilegizált hozzáférési figyelmeztetés:</strong>
          <p>
            A terminál parancsok közvetlenül az operációs rendszer szintjén futnak le a megadott gazdagép containerében. Kerüld a destruktív parancsokat. A belső adatbázis fájlja (<code className="font-mono bg-slate-850 px-1 py-0.5 rounded text-slate-200">novaswarm-db.json</code>) megőrzésre kerül az OTA frissítések során.
          </p>
        </div>
      </div>
    </div>
  );
}
