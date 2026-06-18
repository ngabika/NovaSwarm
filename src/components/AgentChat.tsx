import React, { useState, useEffect, useRef } from "react";
import { Agent, AuditLog } from "../types";
import { Send, Trash2, Brain, Sparkles, User, Info, MessageSquare } from "lucide-react";

interface AgentChatProps {
  agents: Agent[];
  logs: AuditLog[];
  onRefreshState: () => void;
}

export function AgentChat({ agents, logs, onRefreshState }: AgentChatProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || "");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [errorChat, setErrorChat] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  // Filter logs for chat type belonging to selected agent
  const chatMessages = logs
    .filter(l => l.type === "chat" && l.agentId === selectedAgentId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Auto scroll to latest chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length, selectedAgentId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending || !selectedAgent) return;

    const payload = { text: messageText };
    setMessageText("");
    setSending(true);
    setErrorChat("");

    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error("Sikertelen üzenetküldés az ágens részére.");
      }
      onRefreshState();
    } catch (err: any) {
      setErrorChat(err.message || "Nem sikerült az elküldés.");
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (!selectedAgent) return;
    if (!confirm(`Biztosan törlöd a(z) ${selectedAgent.name} ágenssel folytatott csevegést?`)) return;

    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}/chat/clear`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Sikertelen törlés.");
      onRefreshState();
    } catch (err: any) {
      setErrorChat(err.message || "Sikertelen csevegés törlés.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-slate-950/20 rounded-2xl border border-slate-800 p-5 min-h-[600px]" id="agent-chat-container">
      {/* Sidebar: Agents Grid Selector */}
      <div className="lg:col-span-1 border-r border-slate-800 pr-0 lg:pr-5 flex flex-col space-y-4">
        <h3 className="text-sm font-bold tracking-widest text-slate-400 font-mono uppercase flex items-center gap-2">
          <Brain className="w-4 h-4 text-emerald-400" />
          Válassz Ágenst
        </h3>
        <p className="text-xs text-slate-500">
          Kattints egy ügynökre a közvetlen, kétoldalú csevegéshez.
        </p>
        
        <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
          {agents.map(ag => {
            const isSelected = ag.id === selectedAgentId;
            return (
              <button
                key={ag.id}
                onClick={() => {
                  setSelectedAgentId(ag.id);
                  setErrorChat("");
                }}
                className={`flex items-center gap-3 p-3 rounded-xl transition text-left cursor-pointer select-none border min-w-[200px] lg:min-w-0 ${
                  isSelected
                    ? "bg-slate-800/80 border-emerald-500/50 shadow-md shadow-emerald-900/10 text-white"
                    : "bg-slate-900/40 border-slate-800/85 hover:border-slate-700 hover:bg-slate-900/70 text-slate-300"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg shadow border border-slate-700/50">
                  {ag.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs truncate flex items-center justify-between">
                    <span>{ag.name}</span>
                    {ag.active ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5 capitalize">{ag.role}</div>
                  <div className="text-[9px] text-slate-500 truncate mt-0.5 font-mono">{ag.model}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Feed Area */}
      <div className="lg:col-span-3 flex flex-col h-[550px] lg:h-[620px] bg-slate-900/30 rounded-xl border border-slate-850 overflow-hidden">
        {selectedAgent ? (
          <>
            {/* Chat Header */}
            <div className="bg-slate-950/60 px-5 py-3.5 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-2xl border border-slate-700">
                  {selectedAgent.avatar}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {selectedAgent.name}
                    <span className="bg-slate-800 text-[9px] font-mono font-semibold px-2 py-0.5 rounded text-amber-400 border border-slate-750">
                      {selectedAgent.model}
                    </span>
                  </h4>
                  <p className="text-[10px] text-emerald-400 font-medium tracking-wide">
                    {selectedAgent.role.toUpperCase()} • AKTÍV CSEVEGÉS
                  </p>
                </div>
              </div>

              <button
                onClick={handleClearHistory}
                disabled={chatMessages.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-red-950/50 hover:text-red-400 text-slate-400 rounded-lg text-xs font-semibold transition border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Csevegési előzmények törlése"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Előzmények ürítése</span>
              </button>
            </div>

            {/* Simulated Banner Tip if Gemini API is missing (detected heuristically via mock answers) */}
            <div className="bg-blue-950/30 border-b border-blue-900/30 px-5 py-2 flex items-center gap-2 text-xs text-blue-300">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>
                <strong>Interaktív Csevegő:</strong> Ha a Beállításokban nincs Gemini API kulcs mentve, az ágens valósághű szimulált válaszokat ad.
              </span>
            </div>

            {/* Chat Body Scroll */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4 bg-slate-950/30">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-12">
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                    <MessageSquare className="w-5 h-5 text-slate-500 animate-pulse" />
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Még nincs üzenetváltás <strong>{selectedAgent.name}</strong> ágenssel ezen a felületen. Írj neki valamit lent!
                  </p>
                  <p className="text-[10px] text-slate-500 italic max-w-xs px-4">
                    "Uram, elemezzem az aktuális tőzsdei megbízásokat?" vagy "Készítsünk új tennivalókat?"
                  </p>
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isUser = msg.data?.isUser === true;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-2.5`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-lg bg-slate-850 border border-slate-750 flex items-center justify-center text-md shadow flex-shrink-0 mt-0.5">
                          {selectedAgent.avatar}
                        </div>
                      )}
                      
                      <div className="flex flex-col max-w-[80%]">
                        <div className="flex items-center gap-2 px-1 mb-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                            {isUser ? "Te (Felhasználó)" : selectedAgent.name}
                          </span>
                          <span className="text-[9px] text-slate-600 font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? "bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-900/10"
                            : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none pr-6"
                        }`}>
                          <div className="whitespace-pre-line font-sans">{msg.message}</div>
                        </div>
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-lg bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shadow flex-shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Error notifications */}
            {errorChat && (
              <div className="bg-red-950/40 border-t border-red-900/40 px-5 py-2 text-xs text-red-400">
                {errorChat}
              </div>
            )}

            {/* Submit chat message input */}
            <form onSubmit={handleSendMessage} className="bg-slate-950/70 p-4 border-t border-slate-850 flex gap-2 items-center">
              <input
                type="text"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder={`Küldj üzenetet ${selectedAgent.name} részére...`}
                disabled={sending}
                className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500/50 placeholder-slate-500 disabled:opacity-55"
              />
              <button
                type="submit"
                disabled={!messageText.trim() || sending}
                className="px-4.5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <Sparkles className="w-4 h-4 animate-spin text-emerald-300" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Küldés</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex justify-center items-center h-full text-slate-500 text-xs">
            Nincs szerkeszthető ágens. Csatlakoztass ágenseket az AI Csapat fülön!
          </div>
        )}
      </div>
    </div>
  );
}
