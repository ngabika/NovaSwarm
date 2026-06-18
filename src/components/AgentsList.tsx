import React, { useState } from "react";
import { Agent } from "../types";
import { Shield, Sparkles, UserPlus, Save, Trash2, Edit3, X } from "lucide-react";

interface AgentsListProps {
  agents: Agent[];
  onSaveAgent: (agent: Partial<Agent>) => Promise<void>;
  onDeleteAgent: (id: string) => Promise<void>;
}

export function AgentsList({ agents, onSaveAgent, onDeleteAgent }: AgentsListProps) {
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [error, setError] = useState("");

  const [formName, setFormName] = useState("");
  const [formAvatar, setFormAvatar] = useState("🤖");
  const [formRole, setFormRole] = useState<Agent['role']>("writer");
  const [formInstruction, setFormInstruction] = useState("");
  const [formModel, setFormModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-pro-preview'>("gemini-3.5-flash");

  const startEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setIsAddingNew(false);
    setFormName(agent.name);
    setFormAvatar(agent.avatar || "🤖");
    setFormRole(agent.role);
    setFormInstruction(agent.systemInstruction);
    setFormModel(agent.model);
    setError("");
  };

  const startAdd = () => {
    setEditingAgent(null);
    setIsAddingNew(true);
    setFormName("");
    setFormAvatar("🤖");
    setFormRole("writer");
    setFormInstruction("");
    setFormModel("gemini-3.5-flash");
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formInstruction.trim()) {
      setError("A név és a rendszer utasítás megadása kötelező!");
      return;
    }

    try {
      const payload: Partial<Agent> = {
        name: formName,
        avatar: formAvatar,
        role: formRole,
        systemInstruction: formInstruction,
        model: formModel,
        active: editingAgent ? editingAgent.active : true,
      };

      if (editingAgent) {
        payload.id = editingAgent.id;
      }

      await onSaveAgent(payload);
      setEditingAgent(null);
      setIsAddingNew(false);
      setError("");
    } catch (err: any) {
      setError(err.message || "Hiba történt a mentés során.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            AI Ügynökök Csapata
          </h2>
          <p className="text-sm text-slate-400">
            Minden ügynök egyedi rendszer-utasításokkal rendelkezik, amiket tetszőlegesen módosíthatsz.
          </p>
        </div>
        {!isAddingNew && !editingAgent && (
          <button
            id="btn-add-agent"
            onClick={startAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            <UserPlus className="w-4 h-4" />
            Új Ágens Felvétele
          </button>
        )}
      </div>

      {(isAddingNew || editingAgent) && (
        <form onSubmit={handleSave} className="bg-slate-800 border border-slate-700/80 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-700/60 pb-3">
            <h3 className="text-lg font-medium text-white">
              {editingAgent ? `Ágens szerkesztése: ${editingAgent.name}` : "Új AI ágens létrehozása"}
            </h3>
            <button
              id="btn-cancel-form"
              type="button"
              onClick={() => {
                setEditingAgent(null);
                setIsAddingNew(false);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && <div className="p-3 bg-red-950/40 text-red-400 text-sm rounded-lg border border-red-800">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Ágens Neve</label>
              <input
                id="input-agent-name"
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Pl. Gábor"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Avatar / Emoji</label>
              <select
                id="select-agent-avatar"
                value={formAvatar}
                onChange={e => setFormAvatar(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="👔">👔 Főnök (Suit)</option>
                <option value="💻">💻 Fejlesztő (Computer)</option>
                <option value="⚖️">⚖️ Jogász (Scales)</option>
                <option value="✍️">✍️ Író (Draft)</option>
                <option value="📊">📊 Elemző (Chart)</option>
                <option value="🤖">🤖 Általános Robot</option>
                <option value="🚀">🚀 Rakéta</option>
                <option value="🕵️">🕵️ Nyomozó</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Csapat szerepkör</label>
              <select
                id="select-agent-role"
                value={formRole}
                onChange={e => setFormRole(e.target.value as Agent['role'])}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="boss">Boss (Koordinátor / Admin)</option>
                <option value="tech_lead">Tech Lead (Programozó / IT)</option>
                <option value="legal">Legal (Jogi / Compliance)</option>
                <option value="writer">Content Writer (Copywriting)</option>
                <option value="analyst">Data Analyst (Adatvizsgálat)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Ajánlott Gemini Modell</label>
              <select
                id="select-agent-model"
                value={formModel}
                onChange={e => setFormModel(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Gyors &amp; Biztonságos)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Haladó okfejtés - Paid model)</option>
              </select>
            </div>
            <div className="flex bg-blue-950/20 border border-blue-900/60 p-3 rounded-lg text-xs text-blue-300 gap-2 items-start">
              <Shield className="w-5 h-5 flex-shrink-0" />
              <div>
                Rendszer utasítása szabályozza az AI ügynök teljes viselkedését, stílusát, nyelvezetét és döntéshozatali módszertanát az autonóm ciklus lefutásakor.
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Rendszer Szabályzat / Utasítás (System Instruction)</label>
            <textarea
              id="textarea-agent-instruction"
              rows={4}
              value={formInstruction}
              onChange={e => setFormInstruction(e.target.value)}
              placeholder="Te vagy..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-serif text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              id="btn-cancel-edit"
              type="button"
              onClick={() => {
                setEditingAgent(null);
                setIsAddingNew(false);
              }}
              className="px-4 py-2 bg-slate-750 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-700 rounded-lg text-sm font-medium transition"
            >
              Mégse
            </button>
            <button
              id="btn-submit-agent"
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition"
            >
              <Save className="w-4 h-4" />
              Mentés és Frissítés
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {agents.map(agent => (
          <div
            key={agent.id}
            id={`agent-card-${agent.id}`}
            className={`bg-slate-800 rounded-xl border p-5 flex flex-col justify-between transition hover:shadow-lg ${
              agent.active ? "border-slate-700" : "border-slate-800 opacity-60"
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-3xl border border-slate-700">
                    {agent.avatar || "🤖"}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      {agent.name}
                      <span className="text-xs font-normal bg-slate-700/60 text-slate-350 px-2 py-0.5 rounded-full capitalize">
                        {agent.role}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{agent.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id={`btn-toggle-active-${agent.id}`}
                    onClick={() => onSaveAgent({ id: agent.id, active: !agent.active })}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                      agent.active
                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 hover:bg-emerald-900"
                        : "bg-slate-900 text-slate-500 border border-slate-850 hover:text-slate-400"
                    }`}
                  >
                    {agent.active ? "Aktív" : "Inaktív"}
                  </button>

                  <button
                    id={`btn-edit-agent-${agent.id}`}
                    onClick={() => startEdit(agent)}
                    className="p-1 px-2 text-slate-400 hover:text-blue-400 transition"
                    title="Szerkesztés"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {agents.length > 1 && (
                    <button
                      id={`btn-delete-agent-${agent.id}`}
                      onClick={() => {
                        if (confirm(`Biztosan törölni akarod ${agent.name} ágenst a csapatból?`)) {
                          onDeleteAgent(agent.id);
                        }
                      }}
                      className="p-1 px-2 text-slate-450 hover:text-red-500 transition"
                      title="Ágens törlése"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/60 rounded-lg p-3 text-sm text-slate-300 font-sans leading-relaxed border border-slate-850 h-32 overflow-y-auto mb-3">
                <span className="text-xs font-semibold text-slate-400 block mb-1">Rendszer Utasítás:</span>
                {agent.systemInstruction}
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/40 text-[11px] font-mono text-slate-400">
              <div>
                <span className="text-slate-500">Modell:</span>{" "}
                <span className="text-amber-400 font-semibold">{agent.model}</span>
              </div>
              <div>
                <span className="text-slate-500">Utoljára aktív:</span>{" "}
                <span className="text-slate-300">{agent.lastActive ? new Date(agent.lastActive).toLocaleTimeString() : "Soha"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
