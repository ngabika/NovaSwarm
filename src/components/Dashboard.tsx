import React, { useState, useEffect, useRef } from "react";
import { Agent, KanbanCard, Memory, AuditLog } from "../types";
import { 
  Sparkles, 
  BrainCircuit, 
  Columns, 
  MessageSquare, 
  Play, 
  Square, 
  FastForward, 
  Brain, 
  List, 
  Wrench, 
  Cpu, 
  Battery, 
  Volume2, 
  VolumeX, 
  HardDrive, 
  Terminal, 
  Check, 
  AlertTriangle,
  RefreshCw
} from "lucide-react";

interface DashboardProps {
  agents: Agent[];
  kanbanCards: KanbanCard[];
  memories: Memory[];
  logs: AuditLog[];
  systemRunning: boolean;
  telegramConnected: boolean;
  lastRunTime?: string;
  onToggleSystem: (active: boolean) => Promise<void>;
  onTriggerTick: () => Promise<void>;
}

export function Dashboard({
  agents,
  kanbanCards,
  memories,
  logs,
  systemRunning,
  telegramConnected,
  lastRunTime,
  onToggleSystem,
  onTriggerTick
}: DashboardProps) {
  const activeAgents = agents.filter(a => a.active);
  const totalTasks = kanbanCards.length;
  const todoTasks = kanbanCards.filter(c => c.status === "todo").length;
  const inProgressTasks = kanbanCards.filter(c => c.status === "in_progress").length;
  const completedTasks = kanbanCards.filter(c => c.status === "done").length;

  // Live Hardware Telemetry state
  const [hardware, setHardware] = useState({
    battery: "Nem lekérdezhető",
    temp: "42.0°C",
    resources: "RAM szabad: 1530 MB, Lemez: 28% foglalt",
    usbDevices: "Felderítés folyamatban..."
  });
  const [hwLoading, setHwLoading] = useState(true);

  // Self-Healing execution panel state
  const [healingState, setHealingState] = useState<"idle" | "running" | "success" | "error">("idle");
  const [healingLog, setHealingLog] = useState("");
  const [fixedFile, setFixedFile] = useState("");

  // Voice Speech Synthesis settings (Client side speaking toggle)
  const [clientSpeech, setClientSpeech] = useState(false);
  const spokenLogIds = useRef<Set<string>>(new Set());

  // Fetch telemetry from local Linux host
  const fetchTelemetry = async () => {
    try {
      const res = await fetch("/api/hardware");
      if (res.ok) {
        const data = await res.json();
        setHardware(data);
      }
    } catch (e) {
      console.error("Failed to query hardware telemetry:", e);
    } finally {
      setHwLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 6000);
    return () => clearInterval(interval);
  }, []);

  // Client-side Hungarian Voice Synthesis Hook
  useEffect(() => {
    if (!clientSpeech || logs.length === 0) return;
    
    // Find the newest speakable log
    const speakableLogs = [...logs].reverse(); // oldest first to build set of observed IDs
    speakableLogs.forEach(log => {
      // If we haven't spoken this yet and it is from an actual agent with substantial text
      if (
        !spokenLogIds.current.has(log.id) && 
        log.agentId !== "system" && 
        (log.type === "thought" || log.type === "action" || log.type === "system")
      ) {
        spokenLogIds.current.add(log.id);
        
        // Execute speech
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const cleanText = log.message.replace(/[*_#`[\]()]/g, "").substring(0, 200);
          const utterance = new SpeechSynthesisUtterance(`Üzenet tőle: ${log.agentName}. ${cleanText}`);
          utterance.lang = "hu-HU";
          
          const voices = window.speechSynthesis.getVoices();
          const huVoice = voices.find(v => v.lang.startsWith("hu"));
          if (huVoice) {
            utterance.voice = huVoice;
          }
          window.speechSynthesis.speak(utterance);
        }
      }
    });
  }, [logs, clientSpeech]);

  // Handle manual trigger of Self-Healing Compiler
  const handleTriggerSelfHeal = async () => {
    setHealingState("running");
    setHealingLog("Kompiláló és TypeScript típus-ellenőrzés elindítása...");
    setFixedFile("");
    
    try {
      const res = await fetch("/api/self-heal", { method: "POST" });
      const data = await res.json();
      
      if (data.success && data.result.success) {
        setHealingState("success");
        setHealingLog(data.result.log || "Rendszer stabil, nincs hiba!");
        setFixedFile(data.result.fileFixed || "");
      } else {
        setHealingState("error");
        setHealingLog(
          data.result?.log || 
          data.error || 
          "Fordítási hibák keletkeztek amiket az AI-nak nem sikerült automatikusan elhárítania."
        );
      }
    } catch (e: any) {
      setHealingState("error");
      setHealingLog("Önjavítási lekérdezés hálózati kommunikációs hibával megszakadt: " + e.message);
    }
  };

  const getRecentLogs = () => {
    return logs.slice(0, 6);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-800 border border-slate-705 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2 max-w-2xl relative">
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider font-mono">
            ✨ NOVASWARM + PHYSICAL LAPTOP AUTONOMY
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-sans mt-2">
            Önfejlesztő &amp; Önjavító AI Kiszolgáló
          </h1>
          <p className="text-sm text-slate-350 leading-relaxed font-sans">
            A NovaSwarm eléri a fizikai laptop és saját kódja feletti teljes root irányítást. 
            Az ügynökök képesek érzékelni a gép hőmérsékletét, akkumulátorát, és hálózati hibák esetén **önállóan kódolni**, fordítási teszteket végezni, javítani hibás fájljaikat!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 relative w-full md:w-auto">
          {systemRunning ? (
            <button
              id="btn-system-stop"
              onClick={() => onToggleSystem(false)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg transition transform active:scale-95 w-full sm:w-auto text-sm"
            >
              <Square className="w-4 h-4 fill-white" />
              Swarm Leállítása
            </button>
          ) : (
            <button
              id="btn-system-start"
              onClick={() => onToggleSystem(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg transition transform active:scale-95 w-full sm:w-auto text-sm"
            >
              <Play className="w-4 h-4 fill-white animate-pulse" />
              Swarm Indítása
            </button>
          )}

          <button
            id="btn-trigger-tick"
            onClick={onTriggerTick}
            className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 hover:text-white px-5 py-3 rounded-xl transition w-full sm:w-auto text-sm font-semibold"
            title="Kézi futtatás"
          >
            <FastForward className="w-4 h-4 text-indigo-400 animate-bounce" />
            Ciklus Triggere (Tick)
          </button>
        </div>
      </div>

      {/* Stats Bento Grid with Hardware Integrations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total active agents */}
        <div className="bg-slate-800 border border-slate-750 p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-blue-950/50 flex items-center justify-center border border-blue-900/60 text-blue-400">
            <BrainCircuit className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{activeAgents.length} / {agents.length}</div>
            <div className="text-xs font-medium text-slate-400 font-sans mt-0.5">Aktív AI Csapattagok</div>
          </div>
        </div>

        {/* Queued tasks stats */}
        <div className="bg-slate-800 border border-slate-750 p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-amber-950/50 flex items-center justify-center border border-amber-900/60 text-amber-400">
            <Columns className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{inProgressTasks} / {totalTasks}</div>
            <div className="text-xs font-medium text-slate-400 font-sans mt-0.5">Kanban Feladat (Folyamatban)</div>
          </div>
        </div>

        {/* Laptop Core Temperature Gauge */}
        <div className="bg-slate-800 border border-slate-750 p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-red-950/50 flex items-center justify-center border border-red-900/60 text-red-400">
            <Cpu className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{hardware.temp}</div>
            <div className="text-xs font-medium text-slate-400 font-sans mt-0.5">Laptop CPU Hőmérséklet</div>
          </div>
        </div>

        {/* Battery Power status */}
        <div className="bg-slate-800 border border-slate-750 p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-emerald-950/50 flex items-center justify-center border border-emerald-900/60 text-emerald-400">
            <Battery className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white text-sm font-mono truncate max-w-[150px]">{hardware.battery}</div>
            <div className="text-xs font-medium text-slate-400 font-sans mt-1">Szervergép Tápellátás</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Diagnostics, Telemetry & Voice Panel */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Hardware Sensors Dials Card */}
          <div className="bg-slate-800 border border-slate-755 rounded-2xl p-5 space-y-4 shadow-lg">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-700/60">
              <Cpu className="w-4 h-4 text-amber-400" />
              Szervergép Laptop Szenzorok
            </h3>
            
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-400 flex items-center gap-1.5 min-w-[100px]">
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  Akkumulátor:
                </span>
                <span className="text-slate-200 font-mono text-right font-medium">
                  {hardware.battery}
                </span>
              </div>

              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-400 flex items-center gap-1.5 min-w-[100px]">
                  <Cpu className="w-3.5 h-3.5 text-rose-400" />
                  Hőfok &amp; Magok:
                </span>
                <span className="text-slate-200 font-mono text-right font-medium">
                  {hardware.temp}
                </span>
              </div>

              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-400 flex items-center gap-1.5 min-w-[100px]">
                  <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                  Erőforrások:
                </span>
                <span className="text-slate-250 font-mono text-right text-[10px] bg-slate-900 border border-slate-800 p-1.5 rounded w-full">
                  {hardware.resources}
                </span>
              </div>

              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-400 flex items-center gap-1.5 min-w-[100px]">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  Hardverek:
                </span>
                <span className="text-indigo-300 font-mono text-right text-[11px] truncate max-w-[200px]" title={hardware.usbDevices}>
                  {hardware.usbDevices}
                </span>
              </div>
            </div>

            <div className="bg-indigo-950/30 rounded-xl p-3 border border-indigo-900/40 text-xs text-indigo-350 leading-relaxed flex gap-2">
              <span className="text-indigo-400 font-bold block mt-0.5">ℹ️</span>
              <p>
                Rendszerünk közvetlen kapcsolatban áll a Linux Mint backend Kernel `/sys` fájlrendszerével és szenzor hálózattal, óvva a laptopot a töltéshiánytól és a túlhevüléstől.
              </p>
            </div>
          </div>

          {/* Local Voice Engine controls */}
          <div className="bg-slate-800 border border-slate-755 rounded-2xl p-5 space-y-4 shadow-lg">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-700/60">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              Fizikai Hangvezérlés &amp; Bemondás
            </h3>

            <div className="flex items-center justify-between bg-slate-900 p-3.5 rounded-xl border border-slate-750">
              <div className="space-y-1 pr-4">
                <div className="text-xs font-semibold text-white">Böngésző szóbeli felolvasás (Hungarian TTS)</div>
                <div className="text-[11px] text-slate-400 leading-normal">
                  Ha az ágensek hoznak egy döntést, megírnak egy kódot vagy gondolnak valamit, a böngésződön keresztül élőszóban is bemondják!
                </div>
              </div>
              <button
                id="btn-toggle-voice"
                onClick={() => setClientSpeech(!clientSpeech)}
                className={`p-2.5 rounded-xl transition-colors border ${
                  clientSpeech 
                    ? "bg-emerald-950/40 border-emerald-800 text-emerald-400" 
                    : "bg-slate-850 border-slate-700 text-slate-400"
                }`}
                title={clientSpeech ? "Hangosítás bekapcsolva" : "Hangosítás kikapcsolva"}
              >
                {clientSpeech ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>

            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-850 text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-slate-300">🔈 Gazdagép Loudspeaker TTS:</p>
              <p>
                Ha a Mint szerver gép rendelkezik saját hangszóróval, az ágensek a gazda operációs rendszer <span className="font-mono text-slate-200">spd-say</span> és <span className="font-mono text-slate-200">espeak-ng</span> szolgáltatását is közvetlenül meghívják a fizikai jelenlét érdekében!
              </p>
            </div>
          </div>

          {/* Self-Healing Compiler recovery wizard */}
          <div className="bg-slate-800 border border-slate-755 rounded-2xl p-5 space-y-4 shadow-lg">
            <h3 className="text-sm font-bold text-white flex items-center justify-between pb-2 border-b border-slate-700/60">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-indigo-400" />
                Önjavító &amp; Önkódoló Ellenőr
              </div>
              <span className="text-[9px] bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-amber-400 font-mono uppercase">
                Active Loop
              </span>
            </h3>

            <div className="space-y-4">
              <p className="text-xs text-slate-350 leading-relaxed">
                Ha az AI kísérleti kódjai vagy parancsai során szintaktikai hiba lépne fel a projektben, ez az önkódoló tesztelő hurok automatikusan beavatkozik.
              </p>

              {healingState === "idle" && (
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center py-6">
                  <div className="text-xs text-slate-400">Nincs aktív kódvizsgálat futtatás.</div>
                </div>
              )}

              {healingState === "running" && (
                <div className="bg-slate-900 p-4 rounded-xl border border-indigo-900/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Fordítás állapotának ellenőrzése...
                  </div>
                  <p className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2 rounded truncate">
                    {healingLog}
                  </p>
                </div>
              )}

              {healingState === "success" && (
                <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                    <Check className="w-4 h-4" />
                    Rendszer fordítási állapot stabil!
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    {healingLog}
                  </p>
                  {fixedFile && (
                    <div className="text-[10px] text-emerald-300 font-mono bg-emerald-950/60 px-2 py-1 rounded inline-block">
                      Sikeresen javított fájl: {fixedFile}
                    </div>
                  )}
                </div>
              )}

              {healingState === "error" && (
                <div className="bg-red-950/20 p-4 rounded-xl border border-red-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-red-500 font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    Hibás fordítási kódokat találtunk!
                  </div>
                  <div className="text-[10px] font-mono text-red-300 bg-slate-950 p-2 rounded max-h-[120px] overflow-y-auto whitespace-pre-wrap">
                    {healingLog}
                  </div>
                </div>
              )}

              <button
                id="btn-self-heal-trigger"
                onClick={handleTriggerSelfHeal}
                disabled={healingState === "running"}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-700 to-indigo-850 hover:from-indigo-650 hover:to-indigo-800 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition active:scale-98"
              >
                <Wrench className="w-4 h-4" />
                Önjavító (Self-Heal Audit) Kézi Futtatása
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Live Audit feed snippet */}
        <div className="lg:col-span-7 bg-slate-800 border border-slate-755 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            <h3 className="text-md font-bold text-white flex items-center justify-between pb-2 border-b border-slate-700/60">
              <div className="flex items-center gap-2 font-sans text-sm">
                <List className="w-4 h-4 text-indigo-400" />
                Legutóbbi AI Aktivitások &amp; Kód Változások
              </div>
              <span className="text-[10px] bg-slate-900 px-2.5 py-1 rounded border border-slate-750 text-slate-400 uppercase font-mono tracking-wider">
                System and Code Logs
              </span>
            </h3>

            <div className="mt-3 divide-y divide-slate-750/40">
              {getRecentLogs().length === 0 ? (
                <div className="text-slate-550 text-center py-12 text-sm italic font-mono">
                  Még nincs elérhető napló bejegyzés.
                </div>
              ) : (
                getRecentLogs().map(log => {
                  let badgeColor = "bg-slate-900 text-slate-400 border-slate-800";
                  if (log.type === "thought") badgeColor = "bg-blue-950/60 text-blue-400 border-blue-900/60";
                  if (log.type === "action") badgeColor = "bg-purple-950/60 text-purple-400 border-purple-900/60";
                  if (log.type === "system") badgeColor = "bg-amber-950/60 text-amber-400 border-amber-900/60";
                  if (log.type === "telegram") badgeColor = "bg-emerald-950/60 text-emerald-400 border-emerald-900/60";
                  if (log.type === "memory") badgeColor = "bg-indigo-950/60 text-indigo-400 border-indigo-900/60";

                  return (
                    <div key={log.id} className="py-3 flex items-start gap-3 hover:bg-slate-905/35 px-1 rounded transition">
                      <div className="flex flex-col gap-1 items-start min-w-[70px]">
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`text-[8px] font-mono border uppercase px-1 py-0.5 rounded font-bold tracking-tight ${badgeColor}`}>
                          {log.type}
                        </span>
                      </div>
                      
                      <div className="text-xs">
                        <span className="font-bold text-slate-200">
                          {log.agentName}
                        </span>{" "}
                        <span className="text-slate-350 leading-relaxed block mt-1 bg-slate-900/40 p-2 rounded border border-slate-750/30 whitespace-pre-wrap font-mono text-[11px]">
                          {log.message}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="text-right pt-4 border-t border-slate-750/30 mt-4 text-xs">
            <span className="text-slate-500 italic">Minden aktivitást és részletes önjavító gondolatmenetet az **Audit Napló** tabon követhetsz.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
