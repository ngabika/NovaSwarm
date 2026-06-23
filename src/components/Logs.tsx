import React, { useState } from "react";
import { AuditLog } from "../types";
import { FileCode2, Terminal, RefreshCw, Trash2, CheckCircle2, MessageSquare, BrainCircuit, Columns, Settings } from "lucide-react";

interface LogsProps {
  logs: AuditLog[];
  onClearLogs: () => Promise<void>;
  onRefresh: () => void;
}

export function Logs({ logs, onClearLogs, onRefresh }: LogsProps) {
  const [filter, setFilter] = useState<string>("all");

  const filteredLogs = logs.filter(log => {
    if (filter === "all") return true;
    return log.type === filter;
  });

  const getLogTypeBadges = (type: AuditLog['type']) => {
    switch (type) {
      case "thought":
        return {
          text: "Gondolat",
          color: "bg-purple-950/60 text-purple-300 border border-purple-800/80",
          icon: <BrainCircuit className="w-3.5 h-3.5" />
        };
      case "chat":
        return {
          text: "Csevegés",
          color: "bg-emerald-950/60 text-emerald-300 border border-emerald-800/80",
          icon: <MessageSquare className="w-3.5 h-3.5" />
        };
      case "action":
        return {
          text: "Művelet",
          color: "bg-blue-950/60 text-blue-300 border border-blue-800/80",
          icon: <Terminal className="w-3.5 h-3.5" />
        };
      case "telegram":
        return {
          text: "Telegram",
          color: "bg-sky-950/60 text-sky-300 border border-sky-800/80",
          icon: <MessageSquare className="w-3.5 h-3.5" />
        };
      case "memory":
        return {
          text: "Memória",
          color: "bg-indigo-950/60 text-indigo-300 border border-indigo-800/80",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />
        };
      case "kanban":
        return {
          text: "Kanban",
          color: "bg-amber-950/60 text-amber-300 border border-amber-800/80",
          icon: <Columns className="w-3.5 h-3.5" />
        };
      default:
        return {
          text: "Rendszer",
          color: "bg-slate-900 text-slate-350 border border-slate-750",
          icon: <Settings className="w-3.5 h-3.5" />
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-450 mr-1 uppercase">Kategóriák:</span>
          {[
            { id: "all", label: "Mind" },
            { id: "thought", label: "🧠 Gondolatok" },
            { id: "chat", label: "💬 Csevegés" },
            { id: "action", label: "⚡ Műveletek" },
            { id: "telegram", label: "📢 Telegram" },
            { id: "memory", label: "💾 Memória" },
            { id: "kanban", label: "📋 Kanban" },
            { id: "system", label: "⚙️ Rendszer" }
          ].map(btn => (
            <button
              id={`btn-filter-log-${btn.id}`}
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                filter === btn.id
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-900 text-slate-400 border-slate-750 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            id="btn-refresh-logs"
            onClick={onRefresh}
            className="p-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-400 hover:text-white transition"
            title="Napló frissítése"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            id="btn-clear-logs"
            onClick={async () => {
              if (confirm("Biztosan törölni szeretnéd a teljes futási naplót?")) {
                await onClearLogs();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-950/50 hover:bg-red-900/40 text-red-400 border border-red-900/60 rounded-lg text-xs transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Napló Törlése
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Terminal Header */}
        <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-900 flex justify-between items-center text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
            </span>
            <span className="text-slate-500 pl-2">|</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
              marveen_engine_audit.log
            </span>
          </div>
          <span className="text-slate-600">Bejegyzések száma: {filteredLogs.length}</span>
        </div>

        {/* Terminal Content */}
        <div className="p-4 font-mono text-xs leading-relaxed overflow-y-auto max-h-[550px] space-y-3 bg-slate-950">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-650 text-center py-12 italic">
              Nincsenek elérhető audit naplóbejegyzések ehhez a filterhez.
            </div>
          ) : (
            filteredLogs.map(log => {
              const badge = getLogTypeBadges(log.type);
              return (
                <div
                  id={`log-row-${log.id}`}
                  key={log.id}
                  className="group py-2 border-b border-slate-900/50 last:border-0 hover:bg-slate-900/30 px-2 rounded-lg transition"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-[10px] text-slate-600 font-semibold select-none">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 uppercase tracking-wider ${badge.color}`}>
                      {badge.icon}
                      {badge.text}
                    </span>
                    <span className="text-slate-300 font-semibold font-mono text-[11px] flex items-center">
                      🤖 {log.agentName}
                    </span>
                  </div>
                  <div className="text-slate-300 font-sans leading-relaxed text-sm whitespace-pre-wrap pl-6 border-l border-slate-800">
                    {log.message}
                  </div>
                  {log.data && (
                    <pre className="mt-2 text-[10px] bg-slate-900/80 p-2 rounded border border-slate-850/60 text-slate-450 overflow-x-auto font-mono max-w-full">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
