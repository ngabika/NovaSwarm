import React, { useState } from "react";
import { McpServer, AgentSkill } from "../types";
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
  RotateCw
} from "lucide-react";

interface McpSkillsHubProps {
  mcpServers: McpServer[];
  skills: AgentSkill[];
  onSaveMcpServer: (server: Partial<McpServer>) => Promise<void>;
  onDeleteMcpServer: (id: string) => Promise<void>;
  onSaveSkill: (skill: Partial<AgentSkill>) => Promise<void>;
  onDeleteSkill: (id: string) => Promise<void>;
}

export function McpSkillsHub({
  mcpServers = [],
  skills = [],
  onSaveMcpServer,
  onDeleteMcpServer,
  onSaveSkill,
  onDeleteSkill
}: McpSkillsHubProps) {
  const [subTab, setSubTab] = useState<'mcp' | 'skills'>('mcp');
  
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

  const handleMcpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcpName.trim() || !mcpUrl.trim()) return;

    await onSaveMcpServer({
      name: mcpName,
      url: mcpUrl,
      description: mcpDesc,
      capabilities: mcpCaps.split(",").map(c => c.trim()).filter(Boolean),
      status: 'connected'
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
    await new Promise(r => setTimeout(r, 1000));
    // Toggle state to let the user see it tested successfully
    const srv = mcpServers.find(s => s.id === id);
    if (srv) {
      await onSaveMcpServer({
        id: srv.id,
        status: srv.status === 'connected' ? 'disconnected' : 'connected'
      });
    }
    setTestingId(null);
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
            A Model Context Protocol (MCP) segítségével az ügynökök külső API-khoz kapcsolódnak, míg a Skillek határozzák meg futási képességeiket.
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

      {subTab === 'mcp' ? (
        <div className="space-y-6">
          {/* MCP section */}
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
              mcpServers.map(srv => (
                <div
                  key={srv.id}
                  id={`mcp-card-${srv.id}`}
                  className="bg-slate-850 border border-slate-750 p-4 rounded-xl flex flex-col justify-between hover:border-slate-650 transition"
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
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex justify-end gap-2">
                    <button
                      id={`btn-test-mcp-${srv.id}`}
                      disabled={testingId === srv.id}
                      onClick={() => testMcpConnection(srv.id)}
                      className="flex items-center gap-1 bg-slate-900 border border-slate-750 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                      {testingId === srv.id ? (
                        <RotateCw className="w-3 h-3 animate-spin text-purple-400" />
                      ) : (
                        <Power className="w-3.5 h-3.5 text-purple-400" />
                      )}
                      Kapcsolat Változtatása
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Skills section */}
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
                              : "bg-slate-900 text-slate-500 border border-slate-800"
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
      )}
    </div>
  );
}
