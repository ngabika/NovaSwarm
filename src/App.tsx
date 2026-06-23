// Made by AI for AI with Google AI Studio prompted by ngabika
import React, { useState, useEffect } from "react";
import { getTranslation, LanguageCode } from "./locales";
import { DashboardState, Agent, KanbanCard, Memory, Settings, McpServer, AgentSkill } from "./types";
import { Dashboard } from "./components/Dashboard";
import { AgentsList } from "./components/AgentsList";
import { Kanban } from "./components/Kanban";
import { Memories } from "./components/Memories";
import { Logs } from "./components/Logs";
import { SettingsForm } from "./components/SettingsForm";
import { McpSkillsHub } from "./components/McpSkillsHub";
import { DreamingSimulator } from "./components/DreamingSimulator";
import { AgentChat } from "./components/AgentChat";
import { BinanceDashboard } from "./components/BinanceDashboard";
import { DocsOta } from "./components/DocsOta";
import { DeepResearch } from "./components/DeepResearch";
import SystemManager from "./components/SystemManager";
import { SetupWizard } from "./components/SetupWizard";
import { 
  Sparkles, 
  BrainCircuit, 
  Columns, 
  Brain, 
  Terminal, 
  Settings as SettingsIcon, 
  LayoutDashboard,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Cpu,
  MessageSquare,
  TrendingUp,
  BookOpen,
  Search,
  Database
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Fetch the entire application state on mount, transition, and periodically
  const fetchState = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const response = await fetch("/api/state");
      if (!response.ok) {
        throw new Error("Sikertelen kapcsolódás a NovaSwarm szerverhez.");
      }
      const data = await response.json();
      setState(data);
      setError("");
    } catch (err: any) {
      setError(err.message || "Hálózati hiba történt az adatok lekérésekor.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchState();
    // Poll the backend state to update logs and task updates every 4 seconds
    const interval = setInterval(() => {
      fetchState(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSystem = async (active: boolean) => {
    try {
      const res = await fetch("/api/team/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active })
      });
      const data = await res.json();
      if (data.success) {
        fetchState(true);
      }
    } catch (err: any) {
      alert("Hiba történt az automatizáció állapotának átírásakor.");
    }
  };

  const handleTriggerTick = async () => {
    try {
      const res = await fetch("/api/team/tick", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        // Optimistic refresh
        setTimeout(() => fetchState(true), 1200);
      }
    } catch (err: any) {
      alert("Hiba történt a Tick futtatásakor.");
    }
  };

  const handleSaveAgent = async (agentData: Partial<Agent>) => {
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agentData)
    });
    if (!res.ok) throw new Error("Ágensek mentése sikertelen.");
    fetchState(true);
  };

  const handleDeleteAgent = async (id: string) => {
    const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Ágens törlése sikertelen.");
    fetchState(true);
  };

  const handleSaveCard = async (cardData: Partial<KanbanCard>) => {
    const res = await fetch("/api/kanban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cardData)
    });
    if (!res.ok) throw new Error("Kártya elmentése sikertelen.");
    fetchState(true);
  };

  const handleDeleteCard = async (id: string) => {
    const res = await fetch(`/api/kanban/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Művelet sikertelen.");
    fetchState(true);
  };

  const handleAddMemory = async (content: string, entity?: string) => {
    const res = await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, entity })
    });
    if (!res.ok) throw new Error("Sikertelen mentés a memóriába.");
    fetchState(true);
  };

  const handleDeleteMemory = async (id: string) => {
    const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Törlés sikertelen.");
    fetchState(true);
  };

  const handleSaveSettings = async (settingsPayload: Partial<Settings>) => {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsPayload)
    });
    if (!res.ok) throw new Error("Beállítások mentése sikertelen.");
    fetchState();
  };

  const handleTestTelegram = async () => {
    const res = await fetch("/api/telegram/test", { method: "POST" });
    if (!res.ok) throw new Error("Sikertelen Telegram teszt.");
  };

  const handleClearLogs = async () => {
    const res = await fetch("/api/logs/clear", { method: "POST" });
    if (!res.ok) throw new Error("Sikertelen napló ürítés.");
    fetchState(true);
  };

  const handleSaveMcpServer = async (mcpPayload: Partial<McpServer>) => {
    const res = await fetch("/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mcpPayload)
    });
    if (!res.ok) throw new Error("MCP mentése sikertelen.");
    fetchState(true);
  };

  const handleDeleteMcpServer = async (id: string) => {
    const res = await fetch(`/api/mcp/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("MCP törlése sikertelen.");
    fetchState(true);
  };

  const handleSaveSkill = async (skillPayload: Partial<AgentSkill>) => {
    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(skillPayload)
    });
    if (!res.ok) throw new Error("Skill mentése sikertelen.");
    fetchState(true);
  };

  const handleDeleteSkill = async (id: string) => {
    const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Skill törlése sikertelen.");
    fetchState(true);
  };

  const handleStartDream = async () => {
    const res = await fetch("/api/dream", { method: "POST" });
    if (!res.ok) throw new Error("Az álom indítása sikertelen.");
    fetchState(true);
  };

  const handleResetDream = async () => {
    const res = await fetch("/api/dream/reset", { method: "POST" });
    if (!res.ok) throw new Error("Az álom törlése sikertelen.");
    fetchState(true);
  };

  const handleSetupComplete = async (data: any) => {
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Sikertelen mentés a Setup Wizardban.");
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Switch rendered tabs
  const renderTabContent = () => {
    if (!state) return null;

    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            agents={state.agents}
            kanbanCards={state.kanbanCards}
            memories={state.memories}
            logs={state.logs}
            systemRunning={state.systemRunning}
            telegramConnected={state.telegramConnected}
            lastRunTime={state.settings.lastRunTime}
            onToggleSystem={handleToggleSystem}
            onTriggerTick={handleTriggerTick}
            language={state.settings.language || "hu"}
          />
        );
      case "agents":
        return (
          <AgentsList
            agents={state.agents}
            onSaveAgent={handleSaveAgent}
            onDeleteAgent={handleDeleteAgent}
          />
        );
      case "kanban":
        return (
          <Kanban
            cards={state.kanbanCards}
            agents={state.agents}
            onSaveCard={handleSaveCard}
            onDeleteCard={handleDeleteCard}
          />
        );
      case "memories":
        return (
          <Memories
            memories={state.memories}
            onAddMemory={handleAddMemory}
            onDeleteMemory={handleDeleteMemory}
          />
        );
      case "logs":
        return (
          <Logs
            logs={state.logs}
            onClearLogs={handleClearLogs}
            onRefresh={() => fetchState(false)}
          />
        );
      case "mcp-skills":
        return (
          <McpSkillsHub
            mcpServers={state.mcpServers}
            skills={state.skills}
            onSaveMcpServer={handleSaveMcpServer}
            onDeleteMcpServer={handleDeleteMcpServer}
            onSaveSkill={handleSaveSkill}
            onDeleteSkill={handleDeleteSkill}
          />
        );
      case "chat":
        return (
          <AgentChat
            agents={state.agents}
            logs={state.logs}
            onRefreshState={() => fetchState(true)}
          />
        );
      case "binance":
        return (
          <BinanceDashboard
            binanceState={state.binanceState}
            settings={state.settings}
            onRefreshState={() => fetchState(true)}
          />
        );
      case "dream":
        return (
          <DreamingSimulator
            currentDream={state.currentDream}
            onStartDream={handleStartDream}
            onResetDream={handleResetDream}
          />
        );
      case "settings":
        return (
          <SettingsForm
            settings={state.settings}
            modelLimits={state.modelLimits || []}
            onSaveSettings={handleSaveSettings}
            onTestTelegram={handleTestTelegram}
          />
        );
      case "docs_ota":
        return (
          <DocsOta
            onRefreshState={() => fetchState(true)}
            language={lang}
            updateAvailable={state.otaUpdateAvailable}
            latestCommitInfo={state.otaLatestCommitInfo}
          />
        );
      case "deep-research":
        return (
          <DeepResearch language={lang} />
        );
      case "system-mgmt":
        return (
          <SystemManager
            backups={state.backups || []}
            settings={state.settings}
            onRefreshState={() => fetchState(true)}
            language={lang === "hu" ? "hu" : "en"}
          />
        );
      default:
        return null;
    }
  };

  const lang = (state?.settings?.language || "hu") as LanguageCode;

  if (loading && !state) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center text-white space-y-3 font-sans">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">
          {lang === "hu" ? "NovaSwarm AI összeköttetés betöltése..." : "Loading NovaSwarm AI Connection..."}
        </p>
      </div>
    );
  }

  if (state && !state.settings.setupCompleted) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-12 antialiased">
      {/* Top Banner and Brand Logo */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-indigo-900/30">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-md font-bold tracking-tight text-white font-mono uppercase">
                  NovaSwarm
                </span>
                <span className="bg-blue-900/40 text-[10px] text-blue-400 px-2 py-0.5 rounded border border-blue-800/40 font-semibold uppercase">
                  Gemini Agent Swarm
                </span>
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                {lang === "hu" ? "Autonóm Multi-Agent Csapat Kezelő" : "Autonomous Multi-Agent Swarm Manager"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {error && (
              <div className="hidden md:flex items-center gap-1.5 bg-red-950/40 border border-red-800 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400">
                <ShieldAlert className="w-4 h-4" />
                {lang === "hu" ? "Kapcsolat Hiba!" : "Connection Error!"}
              </div>
            )}
            <button
              id="btn-global-refresh"
              onClick={() => fetchState(false)}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition flex items-center gap-1 text-xs"
              title={lang === "hu" ? "Adatok kézi frissítése" : "Manual Refresh"}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-800 p-4 rounded-xl text-sm text-red-400 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <strong>{lang === "hu" ? "Kommunikációs hiba:" : "Communication Error:"}</strong> {error} - {lang === "hu" ? "Ellenőrizd, hogy fut-e az Express kiszolgáló!" : "Make sure the Express server is running!"}
            </div>
          </div>
        )}

        {/* Tab Selector Links */}
        <div className="bg-slate-950/40 border border-slate-800 p-1.5 rounded-xl flex flex-wrap gap-1 mb-6">
          {[
            { id: "dashboard", label: getTranslation(lang, "dashboard"), icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: "agents", label: getTranslation(lang, "agents"), icon: <BrainCircuit className="w-4 h-4" /> },
            { id: "chat", label: lang === "hu" ? "Csevegés 💬" : "Chat 💬", icon: <MessageSquare className="w-4 h-4 text-emerald-400" /> },
            { id: "kanban", label: getTranslation(lang, "kanban"), icon: <Columns className="w-4 h-4" /> },
            { id: "memories", label: getTranslation(lang, "memories"), icon: <Brain className="w-4 h-4" /> },
            { id: "mcp-skills", label: lang === "hu" ? "MCP & Skillek" : "MCP & Skills", icon: <Cpu className="w-4 h-4" /> },
            ...(state?.settings?.binanceEnabled
              ? [{ id: "binance", label: getTranslation(lang, "binance") + " 📈", icon: <TrendingUp className="w-4 h-4 text-yellow-500" /> }]
              : []),
            { id: "dream", label: lang === "hu" ? "Álmodozás ✨" : "Dreaming ✨", icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
            { id: "deep-research", label: getTranslation(lang, "research") + " 🔍", icon: <Search className="w-4 h-4 text-cyan-400" /> },
            { id: "logs", label: getTranslation(lang, "logs"), icon: <Terminal className="w-4 h-4" /> },
            { id: "system-mgmt", label: lang === "hu" ? "Mentés & Rendszer 🛡️" : "Backup & System 🛡️", icon: <Database className="w-4 h-4 text-rose-500" /> },
            { id: "docs_ota", label: lang === "hu" ? "Tudástár & OTA 📡" : "Knowledge Base & OTA 📡", icon: <BookOpen className="w-4 h-4 text-indigo-400" />, indicator: state?.otaUpdateAvailable },
            { id: "settings", label: getTranslation(lang, "settings"), icon: <SettingsIcon className="w-4 h-4" /> }
          ].map(tab => (
            <button
              id={`tab-button-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer select-none relative ${
                activeTab === tab.id
                  ? "bg-slate-800 text-white shadow-sm border border-slate-700/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.indicator && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              )}
              {tab.indicator && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          ))}
        </div>

        {/* Dynamic Inner Tab View */}
        <div className="space-y-6">
          {renderTabContent()}
        </div>
      </main>

      {/* Quiet minimal footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 py-6 border-t border-slate-850 text-center text-xs text-slate-500">
        <p>NovaSwarm AI Collaboration Panel. Powered by Gemini 3.5. Fully Internationalized.</p>
      </footer>
    </div>
  );
}
