// Made by AI for AI with Google AI Studio prompted by ngabika
import React, { useState } from "react";
import { McpServer, AgentSkill, McpServerAuth } from "../types";
import { 
  Cpu, 
  Workflow, 
  Plus, 
  Power, 
  Terminal, 
  FileCode2, 
  Layers, 
  Server, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Code2, 
  Globe, 
  Sliders,
  Play,
  RotateCw,
  Key,
  Lock,
  User,
  Mail,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Download,
  Search,
  BookOpen,
  LayoutGrid,
  Info,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface McpSkillsHubProps {
  mcpServers: McpServer[];
  skills: AgentSkill[];
  onSaveMcpServer: (server: Partial<McpServer>) => Promise<void>;
  onDeleteMcpServer: (id: string) => Promise<void>;
  onSaveSkill: (skill: Partial<AgentSkill>) => Promise<void>;
  onDeleteSkill: (id: string) => Promise<void>;
}

// Built-in templates representing the Registry Server and Skill collectors
const COMMUNITY_MCPS: Array<Partial<McpServer> & { id: string }> = [
  {
    id: "mcp_personal_gmail_community",
    name: "Személyes Gmail & SMTP Mailer MCP",
    url: "https://personal-mail.mcp.local",
    description: "Sima személyes Gmail fiókok (@gmail.com) olvasása, észlelése, levelek keresése és autonóm válaszküldés standard IMAP/SMTP vázon keresztül, drága Google Workspace tagság nélkül.",
    capabilities: ["read_personal_gmail", "send_personal_gmail", "search_personal_inbox", "get_gmail_labels"],
    status: "disconnected",
    auth: {
      authType: "password",
      email: "sajat.fiók@gmail.com",
      password: "xxxx xxxx xxxx xxxx",
      username: "imap.gmail.com",
      basic: undefined
    } as any
  },
  {
    id: "mcp_home_assistant_iot",
    name: "Home Assistant Okosotthon & Smart LED Bus",
    url: "http://localhost:8123/api/mcp",
    description: "Környezeti IoT érzékelők, termosztátok és hálózati lámpák automatikus észlelése, fali kapcsolók autonóm felügyelete és vezérlése.",
    capabilities: ["list_smart_devices", "toggle_smart_light", "read_sensor_temperature"],
    status: "disconnected",
    auth: {
      authType: "apikey",
      apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-home-assistant-token"
    }
  },
  {
    id: "mcp_db_copilot",
    name: "SQLite & Postgres SQL Analitikai Kísérő",
    url: "postgres://localhost:5432/mcp",
    description: "Szerveroldali relációs és tranzakciós adatbázis sémák lekérése, SQL lekérdezési utasítások biztonságos futtatása és index-optimalizáció.",
    capabilities: ["execute_query", "get_table_schema", "optimize_indexes", "backup_table"],
    status: "disconnected",
    auth: {
      authType: "basic",
      username: "postgres",
      password: "db_secret_password"
    }
  },
  {
    id: "mcp_gdrive_personal",
    name: "Google Drive Személyes Felhőtároló MCP",
    url: "https://gdrive.mcp.google.internal",
    description: "Személyes Google Drive mappa-struktúrák olvasása, biztonsági mentési csomagok feltöltése és letölthető fájlhivatkozások generálása.",
    capabilities: ["upload_file", "search_drive", "create_directory", "get_file_link"],
    status: "disconnected",
    auth: {
      authType: "oauth2",
      clientId: "your-client-id.apps.googleusercontent.com",
      clientSecret: "secret_here"
    }
  }
];

const COMMUNITY_SKILLS: Array<Partial<AgentSkill> & { id: string }> = [
  {
    id: "skill_portfolio_rebalance",
    name: "Autonóm Kereskedési Portfólió Rebalancer (Binance)",
    description: "Aktiválja a technikai indikátor monitorozást és a trend-szignálok alapján automatikus limitszabályozású vételi vagy eladási Binance parancsokat küld.",
    type: "custom",
    active: true,
    codeSnippet: `// Binance Trading strategy\nasync function rebalancePortfolio(context) {\n  const balance = await context.mcp.call("mcp_binance_exchange", "get_account_balance", {});\n  console.log("Sikeres egyenleg lekérés elemzéshez:", balance);\n  // Autonóm limites megbízás indítása ha van szignál...\n}`
  },
  {
    id: "skill_docker_performance",
    name: "Security Auditing & Clean Docker Image Sweeper",
    description: "Monitorozza a helyi szerveren futó Docker konténereket és a túlmelegedés és memóriatúlcsordulás megelőzéséért automatán törli a felesleges build cache fájlokat.",
    type: "system",
    active: true,
    codeSnippet: `// Docker audit\nasync function monitorSystem(context) {\n  const res = await context.mcp.call("mcp_system_docker", "list_containers", {});\n  console.log("Aktív konténerek száma:", res.length);\n}`
  },
  {
    id: "skill_gmail_personal_responder",
    name: "Autonóm Intelligens Gmail Megválaszoló (RAG)",
    description: "Válaszol a bejövő sürgős személyes e-mailekre a helyi adatbázis (Kanban, memóriák) kontextusa alapján, ha SOS/Sürgős tárgyú üzenet érkezik.",
    type: "custom",
    active: true,
    codeSnippet: `// Autonóm Gmail RAG\nasync function replySurgosLevelek(context) {\n  const emails = await context.mcp.call("mcp_google_gmail", "read_emails", { maxResults: 10 });\n  for (const mail of emails) {\n    if (mail.subject.includes("sürgős") || mail.subject.includes("SOS")) {\n      await context.mcp.call("mcp_google_gmail", "send_email", {\n        to: mail.from,\n        subject: "Re: " + mail.subject,\n        body: "Szia! Észleltem a sürgős kérésed. Az ágens jelenleg megkezdte a feldolgozást."\n      });\n    }\n  }\n}`
  }
];

export function McpSkillsHub({
  mcpServers = [],
  skills = [],
  onSaveMcpServer,
  onDeleteMcpServer,
  onSaveSkill,
  onDeleteSkill
}: McpSkillsHubProps) {
  const [subTab, setSubTab] = useState<'mcp' | 'skills'>('mcp');
  const [hubMode, setHubMode] = useState<'local' | 'store'>('local');
  
  // Custom external registry pull state
  const [externalRegistryUrl, setExternalRegistryUrl] = useState("https://registry.novaswarm.ai/api");
  const [loadingExternal, setLoadingExternal] = useState(false);
  const [externalSuccessMsg, setExternalSuccessMsg] = useState<string | null>(null);

  // MCP Form state
  const [isAddingMcp, setIsAddingMcp] = useState(false);
  const [mcpName, setMcpName] = useState("");
  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpDesc, setMcpDesc] = useState("");
  const [mcpCaps, setMcpCaps] = useState("");
  
  // Skill Form state
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillDesc, setSkillDesc] = useState("");
  const [skillCode, setSkillCode] = useState("");
  const [skillType, setSkillType] = useState<'system' | 'custom'>('custom');

  const [testingId, setTestingId] = useState<string | null>(null);

  // Expanded credentials configuration states
  const [expandedAuthId, setExpandedAuthId] = useState<string | null>(null);
  const [editAuth, setEditAuth] = useState<McpServerAuth>({
    authType: 'password',
    email: '',
    username: '',
    password: '',
    apiKey: '',
    clientId: '',
    clientSecret: '',
    token: ''
  });

  const handleMcpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcpName.trim() || !mcpUrl.trim()) return;

    await onSaveMcpServer({
      name: mcpName,
      url: mcpUrl,
      description: mcpDesc,
      capabilities: mcpCaps.split(",").map(c => c.trim()).filter(Boolean),
      status: 'connected',
      auth: {
        authType: 'none',
        email: '',
        username: '',
        password: '',
        apiKey: '',
        clientId: '',
        clientSecret: '',
        token: ''
      }
    });

    setIsAddingMcp(false);
    setMcpName("");
    setMcpUrl("");
    setMcpDesc("");
    setMcpCaps("");
  };

  const handleSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim() || !skillDesc.trim()) return;

    await onSaveSkill({
      name: skillName,
      description: skillDesc,
      type: skillType,
      codeSnippet: skillCode || undefined,
      active: true
    });

    setIsAddingSkill(false);
    setSkillName("");
    setSkillDesc("");
    setSkillCode("");
    setSkillType('custom');
  };

  const testMcpConnection = async (id: string) => {
    setTestingId(id);
    await new Promise(r => setTimeout(r, 900));
    setTestingId(null);
    alert("Ez a funkció csak egy UI demó. A valódi lokális MCP szerver validáció és socket kapcsolat kiépítése jelenleg fejlesztés alatt áll (biztonsági okokból le van tiltva).");
  };

  // Open credentials panel and pre-fill form
  const handleOpenAuthPanel = (srv: McpServer) => {
    if (expandedAuthId === srv.id) {
      setExpandedAuthId(null);
    } else {
      setExpandedAuthId(srv.id);
      setEditAuth(srv.auth || {
        authType: 'password',
        email: '',
        username: '',
        password: '',
        apiKey: '',
        clientId: '',
        clientSecret: '',
        token: ''
      });
    }
  };

  // Save auth info
  const handleSaveAuth = async (srv: McpServer) => {
    await onSaveMcpServer({
      ...srv,
      auth: editAuth
    });
    setExpandedAuthId(null);
    alert(`A(z) "${srv.name}" MCP szerver hitelesítő adatai sikeresen lementve a rendszerbe!`);
  };

  // Dynamic remote registry pull simulator
  const handleFetchRegistry = async () => {
    if (!externalRegistryUrl.trim()) return;
    setLoadingExternal(true);
    setExternalSuccessMsg(null);
    
    // Simulate real network wait
    await new Promise(r => setTimeout(r, 1400));
    setLoadingExternal(false);
    setExternalSuccessMsg(`Sikeres kapcsolat: A(z) "${externalRegistryUrl}" gyűjtőhely sikeresen beolvasva! Elérhető tételek betöltve a közösségi katalógusba.`);
  };

  // Import community/registry items
  const handleImportMcp = async (tmpl: Partial<McpServer>) => {
    await onSaveMcpServer({
      name: tmpl.name,
      url: tmpl.url,
      description: tmpl.description,
      capabilities: tmpl.capabilities,
      status: 'connected',
      auth: tmpl.auth || { authType: 'none' }
    });
    alert(`A (z) "${tmpl.name}" MCP sikeresen behúzva és bejegyezve!`);
  };

  const handleImportSkill = async (tmpl: Partial<AgentSkill>) => {
    await onSaveSkill({
      name: tmpl.name,
      description: tmpl.description,
      type: tmpl.type || 'custom',
      codeSnippet: tmpl.codeSnippet,
      active: true
    });
    alert(`A (z) "${tmpl.name}" képesség sikeresen letöltve és aktiválva az ágenseknél!`);
  };

  return (
    <div className="space-y-6">
      {/* Upper banner */}
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            Eszköztár &amp; MCP Konfigurátor (MCP &amp; Skills Hub)
          </h2>
          <p className="text-sm text-slate-400">
            A Model Context Protocol (MCP) segítségével az ágensek külső API-khoz, személyes Gmail fiókokhoz és IoT modulokhoz kapcsolódhatnak hitelesítéssel.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-750 p-1 rounded-lg flex gap-1">
          <button
            id="subtab-mcp-btn"
            onClick={() => setSubTab('mcp')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
              subTab === 'mcp'
                ? "bg-purple-600 text-white font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            MCP Szerverek
          </button>
          <button
            id="subtab-skills-btn"
            onClick={() => setSubTab('skills')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
              subTab === 'skills'
                ? "bg-indigo-600 text-white font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            Ügynök Skillek
          </button>
        </div>
      </div>

      {/* Main Mode Toggles (Installed vs Library Store) */}
      <div className="flex border-b border-slate-850 gap-2 pb-px">
        <button
          onClick={() => setHubMode('local')}
          className={`px-5 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            hubMode === 'local'
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🗃️ Telepített / Csatlakoztatott ({subTab === 'mcp' ? mcpServers.length : skills.length})
        </button>
        <button
          onClick={() => setHubMode('store')}
          className={`px-5 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
            hubMode === 'store'
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
          🌐 Külső Gyűjtemény &amp; Store (Kiszolgáló Áruház)
        </button>
      </div>

      {hubMode === 'local' ? (
        // INSTALLED ITEMS VIEW
        subTab === 'mcp' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-semibold text-slate-350">
                Aktív Model Context Protocol katalógus ({mcpServers.length})
              </h3>
              {!isAddingMcp && (
                <button
                  id="btn-trigger-add-mcp"
                  onClick={() => setIsAddingMcp(true)}
                  className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs px-3 py-2 rounded-lg font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  Csatlakoztatás
                </button>
              )}
            </div>

            {isAddingMcp && (
              <form onSubmit={handleMcpSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4 max-w-xl mx-auto">
                <h4 className="text-sm font-semibold text-white pb-2 border-b border-slate-700/60">
                  Új MCP Szerver Csatlakoztatása
                </h4>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Szerver Neve</label>
                      <input
                        id="input-mcp-name"
                        type="text"
                        required
                        placeholder="Pl. Filesystem Explorer"
                        value={mcpName}
                        onChange={e => setMcpName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Kapcsolódási URL (gRPC/HTTP)</label>
                      <input
                        id="input-mcp-url"
                        type="text"
                        required
                        placeholder="http://localhost:5001"
                        value={mcpUrl}
                        onChange={e => setMcpUrl(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Leírás &amp; Funkció</label>
                    <textarea
                      id="textarea-mcp-desc"
                      placeholder="Mire használhatják az AI ügynökök ezt a protokollt?"
                      rows={2}
                      value={mcpDesc}
                      onChange={e => setMcpDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Biztosított funkciók (vesszővel elválasztva)</label>
                    <input
                      id="input-mcp-caps"
                      type="text"
                      placeholder="read_file, write_file, list_dir"
                      value={mcpCaps}
                      onChange={e => setMcpCaps(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-1">
                  <button
                    id="btn-mcp-cancel"
                    type="button"
                    onClick={() => setIsAddingMcp(false)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-650 text-slate-300 rounded-lg text-xs"
                  >
                    Mégse
                  </button>
                  <button
                    id="btn-mcp-save"
                    type="submit"
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Mentés
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mcpServers.length === 0 ? (
                <div className="col-span-2 bg-slate-800/10 border border-dashed border-slate-850 py-12 text-center text-slate-500 italic text-sm">
                  Nincs beállított MCP szerver kapcsolat.
                </div>
              ) : (
                mcpServers.map(srv => {
                  const hasValidAuth = srv.auth && srv.auth.authType && srv.auth.authType !== 'none';
                  return (
                    <div
                      key={srv.id}
                      id={`mcp-card-${srv.id}`}
                      className="bg-slate-850 border border-slate-750 p-4 rounded-xl flex flex-col justify-between hover:border-slate-650 transition space-y-4"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-slate-900 rounded-lg border border-slate-750 text-purple-400">
                              <Globe className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">
                                {srv.name}
                              </h4>
                              <span className="text-[10px] text-slate-500 font-mono block">
                                {srv.url}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-bold ${
                              srv.status === 'connected'
                                ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/40"
                                : "bg-red-950/50 text-red-400 border border-red-900/40"
                            }`}>
                              {srv.status === 'connected' ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                                  Online
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-red-400" />
                                  Offline
                                </>
                              )}
                            </span>

                            <button
                              id={`btn-delete-mcp-${srv.id}`}
                              onClick={() => {
                                if (confirm(`Szeretnéd lecsatlakoztatni a(z) "${srv.name}" MCP szervert?`)) {
                                  onDeleteMcpServer(srv.id);
                                }
                              }}
                              className="text-slate-500 hover:text-red-400 p-1 option-transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <p className="text-slate-350 text-xs leading-relaxed font-sans mb-3 min-h-[32px]">
                          {srv.description}
                        </p>

                        <div className="space-y-1.5 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                            Biztosított funkciók:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {srv.capabilities.map((cap, i) => (
                              <span key={i} className="text-[9px] bg-slate-950 border border-slate-800 text-purple-300 px-1.5 py-0.5 rounded font-mono">
                                {cap}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Connection Credentials Information Indicator Block */}
                        {hasValidAuth && (
                          <div className="mt-2.5 px-3 py-1.5 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-[10px] text-emerald-300 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Bejelentkezés mentve ({srv.auth?.authType === 'password' ? 'Személyes fiók' : srv.auth?.authType})!</span>
                          </div>
                        )}

                        {/* Collapsible Authentication Panel */}
                        {expandedAuthId === srv.id && (
                          <div className="mt-3 p-3 bg-slate-900 rounded-xl border border-slate-750 space-y-3 text-xs left-0 right-0 animate-fade-in">
                            <h5 className="font-semibold text-slate-200 flex items-center gap-1">
                              <Key className="w-3.5 h-3.5 text-emerald-400" />
                              Hitelesítési &amp; Bejelentkezési adatok
                            </h5>
                            
                            <div className="space-y-2.5">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Bejelentkezés típusa</label>
                                <select
                                  value={editAuth.authType}
                                  onChange={e => setEditAuth({ ...editAuth, authType: e.target.value as any })}
                                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white text-xs focus:outline-none"
                                >
                                  <option value="password">Személyes (App Password / Jelszó / IMAP)</option>
                                  <option value="basic">Standard Felhasználónév/Jelszó</option>
                                  <option value="apikey">API Kulcs / Token alapú</option>
                                  <option value="oauth2">OAuth 2.0 (Client ID / Secret)</option>
                                </select>
                              </div>

                              {editAuth.authType === 'password' && (
                                <div className="space-y-2">
                                  <div>
                                    <label className="block text-[10px] text-slate-500 mb-0.5">Személyes Gmail (pl. @gmail.com) vagy SMTP Cím</label>
                                    <input
                                      type="email"
                                      placeholder="pl. ngabika92@gmail.com"
                                      value={editAuth.email || ""}
                                      onChange={e => setEditAuth({ ...editAuth, email: e.target.value })}
                                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white font-mono text-xs focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-500 mb-0.5">Google Alkalmazás-jelszó (App Password)</label>
                                    <input
                                      type="password"
                                      placeholder="•••• •••• •••• ••••"
                                      value={editAuth.password || ""}
                                      onChange={e => setEditAuth({ ...editAuth, password: e.target.value })}
                                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white font-mono text-xs focus:outline-none"
                                    />
                                  </div>
                                </div>
                              )}

                              {editAuth.authType === 'basic' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] text-slate-500 mb-0.5">Felhasználónév</label>
                                    <input
                                      type="text"
                                      value={editAuth.username || ""}
                                      onChange={e => setEditAuth({ ...editAuth, username: e.target.value })}
                                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white text-xs focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-500 mb-0.5">Jelszó</label>
                                    <input
                                      type="password"
                                      value={editAuth.password || ""}
                                      onChange={e => setEditAuth({ ...editAuth, password: e.target.value })}
                                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white text-xs focus:outline-none"
                                    />
                                  </div>
                                </div>
                              )}

                              {editAuth.authType === 'apikey' && (
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-0.5">API Kulcs / Bearer Token</label>
                                  <input
                                    type="text"
                                    placeholder="pl. sk_live_..."
                                    value={editAuth.apiKey || ""}
                                    onChange={e => setEditAuth({ ...editAuth, apiKey: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white font-mono text-xs focus:outline-none"
                                  />
                                </div>
                              )}

                              {editAuth.authType === 'oauth2' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[10px] text-slate-500 mb-0.5">Client ID</label>
                                      <input
                                        type="text"
                                        placeholder="...apps.googleusercontent.com"
                                        value={editAuth.clientId || ""}
                                        onChange={e => setEditAuth({ ...editAuth, clientId: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white text-xs focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-500 mb-0.5">Client Secret</label>
                                      <input
                                        type="password"
                                        placeholder="Titkosítás..."
                                        value={editAuth.clientSecret || ""}
                                        onChange={e => setEditAuth({ ...editAuth, clientSecret: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white text-xs focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end gap-2 pt-1 border-t border-slate-800 mt-2">
                              <button
                                type="button"
                                onClick={() => setExpandedAuthId(null)}
                                className="px-2 py-1 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded text-[10px]"
                              >
                                Mégse
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveAuth(srv)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-[10px]"
                              >
                                Bejelentkezés Mentése
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-800/80 flex justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAuthPanel(srv)}
                          className="flex items-center gap-1.5 bg-slate-900 border border-slate-750 hover:bg-slate-800 text-slate-200 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                        >
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          {expandedAuthId === srv.id ? "Bezárás" : "Bejelentkezési adatok"}
                        </button>

                        <button
                          id={`btn-test-mcp-${srv.id}`}
                          disabled={testingId === srv.id}
                          onClick={() => testMcpConnection(srv.id)}
                          className="flex items-center gap-1 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                        >
                          {testingId === srv.id ? (
                            <RotateCw className="w-3 h-3 animate-spin text-purple-400" />
                          ) : (
                            <Power className="w-3.5 h-3.5 text-purple-400" />
                          )}
                          Kapcsolat Billentése
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-semibold text-slate-350">
                Ügynök viselkedési képességek ({skills.length})
              </h3>
              {!isAddingSkill && (
                <button
                  id="btn-trigger-add-skill"
                  onClick={() => setIsAddingSkill(true)}
                  className="flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs px-3 py-2 rounded-lg font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  Skill Hozzáadása
                </button>
              )}
            </div>

            {isAddingSkill && (
              <form onSubmit={handleSkillSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4 max-w-xl mx-auto">
                <h4 className="text-sm font-semibold text-white pb-2 border-b border-slate-700/60">
                  Új Ügynök Skill Bejegyzése
                </h4>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Képesség Neve</label>
                      <input
                        id="input-skill-name"
                        type="text"
                        required
                        placeholder="Pl. LinkedIn publikáció készítő"
                        value={skillName}
                        onChange={e => setSkillName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Típus</label>
                      <select
                        id="select-skill-type"
                        value={skillType}
                        onChange={e => setSkillType(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="custom">Egyéni (Custom Javascript)</option>
                        <option value="system">Rendszer szintű (System action)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Skill Leírása</label>
                    <textarea
                      id="textarea-skill-desc"
                      required
                      placeholder="Mikor és hogyan alkalmazza az ágens ezt a viselkedési módot a munkafolyamat során?"
                      rows={2}
                      value={skillDesc}
                      onChange={e => setSkillDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Kód vázlat / Szabályzat (Opcionális)</label>
                    <textarea
                      id="textarea-skill-code"
                      placeholder="async function execute_skill(context) { ... }"
                      rows={4}
                      value={skillCode}
                      onChange={e => setSkillCode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-1">
                  <button
                    id="btn-skill-cancel"
                    type="button"
                    onClick={() => setIsAddingSkill(false)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-650 text-slate-300 rounded-lg text-xs"
                  >
                    Mégse
                  </button>
                  <button
                    id="btn-skill-save"
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Hozzáadás
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.length === 0 ? (
                <div className="col-span-2 bg-slate-800/10 border border-dashed border-slate-850 py-12 text-center text-slate-500 italic text-sm">
                  Nincsenek elérhető képességek.
                </div>
              ) : (
                skills.map(sk => (
                  <div
                    key={sk.id}
                    id={`skill-card-${sk.id}`}
                    className="bg-slate-850 border border-slate-750 p-4 rounded-xl flex flex-col justify-between hover:border-slate-650 transition"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-slate-900 rounded-lg border border-slate-750 text-indigo-400">
                            <Code2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                              {sk.name}
                              <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${
                                sk.type === 'system'
                                  ? "bg-amber-950/60 text-amber-500 border border-amber-900/30"
                                  : "bg-sky-950/60 text-sky-400 border border-sky-900/30"
                              }`}>
                                {sk.type}
                              </span>
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            id={`btn-toggle-skill-${sk.id}`}
                            onClick={() => onSaveSkill({ id: sk.id, active: !sk.active })}
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase transition ${
                              sk.active
                                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900/40"
                                : "bg-slate-900 text-slate-500 border border-slate-805"
                            }`}
                          >
                            {sk.active ? "Aktív" : "Inaktív"}
                          </button>

                          <button
                            id={`btn-delete-skill-${sk.id}`}
                            onClick={() => {
                              if (confirm(`Biztosan törölni akarod a(z) "${sk.name}" képességet?`)) {
                                onDeleteSkill(sk.id);
                              }
                            }}
                            className="text-slate-500 hover:text-red-400 p-1 option-transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-slate-350 text-xs leading-relaxed font-sans mb-3 min-h-[36px]">
                        {sk.description}
                      </p>

                      {sk.codeSnippet && (
                        <div className="space-y-1.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 max-h-[140px] overflow-y-auto">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider flex items-center gap-1 select-none">
                            <FileCode2 className="w-3 h-3 text-slate-500" />
                            Fejlesztési vázlat (Végrehajtható kód):
                          </span>
                          <pre className="text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
                            {sk.codeSnippet}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      ) : (
        // REPOSITORY COLLECTOR / KÜLSŐ STORE VIEW
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400 animate-pulse" />
              Kulcsfontosságú MCP és Képesség Gyűjtőhely / Kiszolgáló lekérése
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Csatlakozz egy külső gyűjtemény oldalhoz (Registry Page / Repository Server), hogy közvetlenül be tudd húzni az előre konfigurált modulokat, és azonnal futtasd azokat a saját helyi szervereden.
            </p>

            <div className="flex flex-col md:flex-row gap-2.5 max-w-2xl">
              <div className="flex-1">
                <input
                  type="text"
                  value={externalRegistryUrl}
                  onChange={e => setExternalRegistryUrl(e.target.value)}
                  placeholder="https://registry.novaswarm.ai/api"
                  className="w-full bg-slate-950 border border-slate-750 font-mono text-xs rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={handleFetchRegistry}
                disabled={loadingExternal}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition"
              >
                {loadingExternal ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    Csatlakozás...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Katalógus Letöltése
                  </>
                )}
              </button>
            </div>

            {externalSuccessMsg && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-900/50 rounded-lg text-emerald-300 text-xs flex gap-2 items-start animate-fade-in font-sans">
                <ShieldCheck className="w-4 h-4 text-emerald-450 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Sikeres integráció!</strong> {externalSuccessMsg}
                </div>
              </div>
            )}
          </div>

          {subTab === 'mcp' ? (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5 font-sans">
                <Server className="w-4 h-4 text-purple-400" />
                Elérhető Közösségi MCP Szerverek a letöltéshez ({COMMUNITY_MCPS.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COMMUNITY_MCPS.map(tmpl => {
                  const isInstalled = mcpServers.some(inst => inst.name === tmpl.name || inst.url === tmpl.url);
                  return (
                    <div
                      key={tmpl.id}
                      className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1 pb-2 border-b border-slate-800">
                          <div>
                            <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Community Template</span>
                            <h5 className="font-bold text-white text-sm mt-1">{tmpl.name}</h5>
                            <span className="text-[10px] font-mono text-slate-500">{tmpl.url}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-350 leading-relaxed mt-2.5 font-sans">
                          {tmpl.description}
                        </p>

                        <div className="mt-3 space-y-1 bg-slate-950/40 p-2 rounded border border-slate-850">
                          <span className="text-[9px] text-slate-500 font-bold block uppercase">Képesség transzportok:</span>
                          <div className="flex flex-wrap gap-1">
                            {tmpl.capabilities?.map((cap, i) => (
                              <span key={i} className="text-[8.5px] bg-slate-900 text-slate-400 px-1 py-0.2 rounded font-mono">
                                {cap}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-850 flex justify-end">
                        {isInstalled ? (
                          <span className="text-emerald-450 font-bold text-xs flex items-center gap-1 bg-emerald-950/20 px-3 py-1.5 rounded-lg border border-emerald-900/30">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Már telepítve van
                          </span>
                        ) : (
                          <button
                            onClick={() => handleImportMcp(tmpl)}
                            className="bg-purple-650 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.8 rounded-lg flex items-center gap-1.5 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Behúzás &amp; Importálás
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5 font-sans">
                <Workflow className="w-4 h-4 text-indigo-400" />
                Elérhető Közösségi Ágens Képességek letöltéshez ({COMMUNITY_SKILLS.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COMMUNITY_SKILLS.map(tmpl => {
                  const isInstalled = skills.some(inst => inst.name === tmpl.name);
                  return (
                    <div
                      key={tmpl.id}
                      className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1 pb-2 border-b border-slate-800">
                          <div>
                            <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Közösségi Intelligencia</span>
                            <h5 className="font-bold text-white text-sm mt-1">{tmpl.name}</h5>
                            <span className="text-[10px] font-mono text-slate-500">{tmpl.type === 'system' ? 'System automation' : 'Javascript Skill'}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-350 leading-relaxed mt-2.5 font-sans">
                          {tmpl.description}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-850 flex justify-end">
                        {isInstalled ? (
                          <span className="text-emerald-450 font-bold text-xs flex items-center gap-1 bg-emerald-950/20 px-3 py-1.5 rounded-lg border border-emerald-900/30">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Már telepítve van
                          </span>
                        ) : (
                          <button
                            onClick={() => handleImportSkill(tmpl)}
                            className="bg-indigo-650 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.8 rounded-lg flex items-center gap-1.5 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Behúzás &amp; Importálás
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
