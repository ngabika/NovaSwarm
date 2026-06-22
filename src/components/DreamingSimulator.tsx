import React, { useState, useEffect } from "react";
import { DreamState, McpServer, AgentSkill } from "../types";
import { 
  Sparkles, 
  Brain, 
  Cpu, 
  Moon, 
  Zap, 
  RefreshCw, 
  Eye, 
  Terminal, 
  FileCode2, 
  Shuffle, 
  Award,
  BookOpen
} from "lucide-react";

interface DreamingSimulatorProps {
  currentDream?: DreamState;
  onStartDream: () => Promise<void>;
  onResetDream: () => Promise<void>;
}

export function DreamingSimulator({
  currentDream,
  onStartDream,
  onResetDream
}: DreamingSimulatorProps) {
  const [loading, setLoading] = useState(false);
  const [dots, setDots] = useState("");

  // Simple loading animation text
  useEffect(() => {
    let interval: any;
    if (currentDream?.isDreaming) {
      interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? "" : prev + "."));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [currentDream?.isDreaming]);

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStartDream();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await onResetDream();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Area */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 p-6 rounded-2xl border border-purple-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Moon className="w-32 h-32 text-purple-400 animate-pulse" />
        </div>
        
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="inline-flex items-center gap-1 bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider animate-pulse">
            <Sparkles className="w-3 h-3" />
            Belső Reflexió &amp; Öntanulás
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Ágensek Álmodozási Fázisa (Dreaming Mode)
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Az álom fázisban az ágensek belső kognitív reflexiókat futtatnak a meglévő audit logok, memóriák és korábbi Kanban feladatok alapján. Ez alatt önállóan hoznak létre új ágens képességeket (Skilleket), fedeznek fel külső eszközcsatlakozásokat (MCP) és szintetizálnak mélyebb összefüggéseket a memóriatárba.
          </p>
        </div>
      </div>

      {/* Main Console / Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dreaming Controller / Main Card */}
        <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider block">
              Álomállapot Vezérlő
            </h3>
            
            <div className="space-y-2.5 p-4 bg-slate-950 rounded-xl border border-slate-850">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Aktuális Ébrenléti Mód:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Aktív
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Kognitív Állapot:</span>
                <span className="text-indigo-300 font-mono font-bold">
                  {currentDream?.isDreaming ? `Álmodozás folyamatban${dots}` : "Pihenő / Ébrenlét"}
                </span>
              </div>
              {currentDream?.activeAgentName && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Aktív Álmodó Ügynök:</span>
                  <span className="text-purple-400 font-bold block">
                    {currentDream.activeAgentName}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Az álmodozás lefutása körülbelül 2-5 másodpercet vesz igénybe. Ezalatt az ágensek véletlenszerű asszociatív mintákat futtatnak a Gemini API segítségével, aminek a végén az adatbázis magától frissül kibővített képességekkel.
            </p>
          </div>

          <div className="space-y-2 pt-4">
            {!currentDream?.isDreaming && !currentDream?.discoveries ? (
              <button
                id="btn-trigger-dreaming"
                disabled={loading}
                onClick={handleStart}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm py-3 px-4 rounded-xl transition shadow-lg shadow-purple-500/10 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Moon className="w-4 h-4 text-purple-200" />
                )}
                Önálló Álmodozás Indítása
              </button>
            ) : currentDream?.isDreaming ? (
              <div className="w-full bg-slate-950 border border-purple-500/30 text-purple-300 text-center py-4 rounded-xl text-xs font-mono font-medium animate-pulse flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                <span>Tanulás és reflexió folyamatban{dots}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-400" />
                  Sikeres szintézis fázis!
                </div>
                <button
                  id="btn-reset-dreaming"
                  disabled={loading}
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 px-4 rounded-lg transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Új Álom Előkészítése
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Brainscape / Thoughts & Internal logs */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-purple-400" />
              Tudatalatti Gondolatmenet (Brainscape)
            </h3>
            
            <div className="bg-slate-950 rounded-2xl border border-slate-850 p-4 min-h-[180px] flex flex-col justify-between space-y-4 font-mono">
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                {currentDream?.thoughts && currentDream.thoughts.length > 0 ? (
                  currentDream.thoughts.map((thought, i) => (
                    <div 
                      key={i} 
                      className={`text-xs flex items-start gap-2 leading-relaxed transition-all duration-500 ${
                        i === currentDream.thoughts.length - 1 ? "text-purple-300 font-semibold" : "text-slate-400"
                      }`}
                    >
                      <span className="text-purple-500/80 mr-1 select-none">&rsaquo;</span>
                      <span>{thought}</span>
                    </div>
                  ))
                ) : currentDream?.isDreaming ? (
                  <div className="text-xs text-slate-500 italic">
                    neuronhálózat betöltése...
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic text-center py-12">
                    Az ágens tudatalatti naplója jelenleg üres. Indítsd el az álmodozást, hogy az ügynökök elkezdjenek reflexiókat szintetizálni.
                  </div>
                )}
              </div>
              
              <div className="border-t border-slate-850 pt-3 text-[10px] text-slate-500 flex justify-between items-center">
                <span>Rendszer állapot: {currentDream?.isDreaming ? "REM fázis" : "Éber szinkron"}</span>
                <span>Neuralis Szinapszisok: 100% optimális</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Discoveries Section */}
      {currentDream?.discoveries && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-md font-bold text-slate-300 flex items-center gap-1.5 pt-2">
            <Award className="w-5 h-5 text-amber-400" />
            Az álom során született és integrált eredmények:
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Memory synthesis */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 hover:border-slate-700/60 transition shadow-inner">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-850 text-indigo-400">
                <BookOpen className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Mély Memória Szintézis</span>
              </div>
              <p className="text-slate-300 text-xs italic leading-relaxed min-h-[60px]">
                "{currentDream.discoveries.memory || "Nem definiált"}"
              </p>
              <div className="text-[10px] text-slate-500 block">
                Mentve az ágens memóriatárba. Örökké emlékezni fognak a következő futások alkalmával.
              </div>
            </div>

            {/* Skill Discovery */}
            {currentDream.discoveries.skill && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 hover:border-slate-700/60 transition shadow-inner">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-850 text-purple-400">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Újonnan Elsajátított Skill</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {currentDream.discoveries.skill.name}
                  </h4>
                  <p className="text-slate-400 text-xs leading-relaxed mt-1 min-h-[48px]">
                    {currentDream.discoveries.skill.description}
                  </p>
                </div>
                {currentDream.discoveries.skill.codeSnippet && (
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850/60 max-h-[100px] overflow-y-auto">
                    <pre className="text-[9px] text-purple-300 font-mono overflow-x-auto">
                      {currentDream.discoveries.skill.codeSnippet}
                    </pre>
                  </div>
                )}
                <div className="text-[10px] text-slate-500 block">
                  Aktívvá vált az Ágens Skillek katalógusban.
                </div>
              </div>
            )}

            {/* MCP Discovery */}
            {currentDream.discoveries.mcp && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 hover:border-slate-700/60 transition shadow-inner">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-850 text-blue-400">
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Felfedezett Új MCP Szerver</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {currentDream.discoveries.mcp.name}
                  </h4>
                  <p className="text-slate-400 text-xs leading-relaxed mt-1 min-h-[48px]">
                    {currentDream.discoveries.mcp.description}
                  </p>
                  <span className="text-[9px] font-mono text-slate-500 block bg-slate-950 p-1 rounded border border-slate-850 mt-2 truncate">
                    {currentDream.discoveries.mcp.url}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {currentDream.discoveries.mcp.capabilities.map((cap, i) => (
                    <span key={i} className="text-[8px] bg-slate-950 border border-slate-850 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                      {cap}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 block">
                  Elérhetővé téve az MCP Szerver katalógusban.
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
