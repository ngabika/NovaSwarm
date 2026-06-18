import React, { useState } from "react";
import { KanbanCard, Agent } from "../types";
import { ListTodo, CheckSquare, Clock, Plus, Trash2, ArrowRight, ArrowLeft, User, Calendar } from "lucide-react";

interface KanbanProps {
  cards: KanbanCard[];
  agents: Agent[];
  onSaveCard: (card: Partial<KanbanCard>) => Promise<void>;
  onDeleteCard: (id: string) => Promise<void>;
}

export function Kanban({ cards, agents, onSaveCard, onDeleteCard }: KanbanProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [columnStatus, setColumnStatus] = useState<'todo' | 'in_progress' | 'done'>("todo");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const startAdd = (status: 'todo' | 'in_progress' | 'done') => {
    setIsAdding(true);
    setColumnStatus(status);
    setEditingCardId(null);
    setTitle("");
    setDescription("");
    setAssignedTo("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await onSaveCard({
      title,
      description,
      status: columnStatus,
      assignedTo: assignedTo || null
    });

    setIsAdding(false);
    setTitle("");
    setDescription("");
    setAssignedTo("");
  };

  const moveCard = async (card: KanbanCard, nextStatus: 'todo' | 'in_progress' | 'done') => {
    await onSaveCard({
      id: card.id,
      status: nextStatus
    });
  };

  const getAgentNameAndAvatar = (id: string | null) => {
    if (!id) return { name: "Nincs hozzárendelve", avatar: "👤" };
    const ag = agents.find(a => a.id === id);
    return ag ? { name: ag.name, avatar: ag.avatar } : { name: "Ismeretlen ágens", avatar: "🤖" };
  };

  const columns: { id: 'todo' | 'in_progress' | 'done'; title: string; color: string; icon: React.ReactNode }[] = [
    {
      id: "todo",
      title: "Teendő (To Do)",
      color: "border-blue-900/40 text-blue-400 bg-blue-950/20",
      icon: <ListTodo className="w-4 h-4 text-blue-400" />
    },
    {
      id: "in_progress",
      title: "Folyamatban (In Progress)",
      color: "border-amber-900/40 text-amber-400 bg-amber-950/20",
      icon: <Clock className="w-4 h-4 text-amber-400" />
    },
    {
      id: "done",
      title: "Kész (Completed)",
      color: "border-emerald-900/40 text-emerald-400 bg-emerald-950/20",
      icon: <CheckSquare className="w-4 h-4 text-emerald-400" />
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-indigo-400" />
            Autonóm Kanban Tábla
          </h2>
          <p className="text-sm text-slate-400">
            Az ügynökök folyamatosan figyelik ezt a táblát, kijelölik magukat, és végrehajtják a feladatokat.
          </p>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4 max-w-xl mx-auto">
          <h3 className="text-md font-medium text-white pb-2 border-b border-slate-700/60">
            Új kártya hozzáadása ehhez: <span className="text-indigo-400 uppercase">{columnStatus}</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Feladat Címe</label>
              <input
                id="input-card-title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Pl. Logó koncepció vázlat"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Leírás</label>
              <textarea
                id="textarea-card-desc"
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Közlendő és részletek..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Felelős Ágens (Hozzárendelés)</label>
              <select
                id="select-card-assign"
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Nincs hozzárendelve (Hagyd az autonóm körre)</option>
                {agents.map(ag => (
                  <option key={ag.id} value={ag.id}>
                    {ag.avatar} {ag.name} ({ag.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              id="btn-cancel-add-card"
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-650 text-slate-300 rounded-lg text-xs"
            >
              Mégse
            </button>
            <button
              id="btn-submit-card"
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs"
            >
              Kártya Létrehozása
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {columns.map(col => {
          const colCards = cards.filter(c => c.status === col.id);
          return (
            <div key={col.id} className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 flex flex-col min-h-[500px]">
              <div className={`p-3 rounded-lg border ${col.color} mb-4 flex justify-between items-center`}>
                <div className="flex items-center gap-2 font-semibold">
                  {col.icon}
                  <span>{col.title}</span>
                  <span className="text-xs bg-slate-800/80 px-2 py-0.5 rounded-full font-bold">
                    {colCards.length}
                  </span>
                </div>
                <button
                  id={`btn-add-card-${col.id}`}
                  onClick={() => startAdd(col.id)}
                  className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white transition"
                  title="Új kártya hozzáadása"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1">
                {colCards.length === 0 ? (
                  <div className="text-slate-550 text-center py-8 text-xs font-mono italic">
                    Nincs aktív feladat
                  </div>
                ) : (
                  colCards.map(card => {
                    const assigned = getAgentNameAndAvatar(card.assignedTo);
                    return (
                      <div
                        id={`kanban-card-${card.id}`}
                        key={card.id}
                        className="bg-slate-800/80 rounded-lg border border-slate-700/60 p-4 hover:border-slate-500 transition flex flex-col justify-between shadow-sm space-y-3"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-white text-sm leading-tight text-slate-100">
                              {card.title}
                            </h4>
                            <button
                              id={`btn-delete-card-${card.id}`}
                              onClick={() => {
                                if (confirm(`Törölni akarod a(z) "${card.title}" kártyát?`)) {
                                  onDeleteCard(card.id);
                                }
                              }}
                              className="text-slate-500 hover:text-red-400 p-1 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {card.description && (
                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed break-words whitespace-pre-line border-t border-slate-700/30 pt-1.5">
                              {card.description}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[11px] border-t border-slate-700/50 pt-2 text-slate-400 font-mono">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-550" />
                              {new Date(card.createdAt).toLocaleDateString()}
                            </span>
                            <span className="bg-slate-900 border border-slate-750 px-2 py-0.5 rounded text-[10px] text-amber-500 font-semibold">
                              ID: {card.id.substr(0, 8)}
                            </span>
                          </div>

                          <div className="flex gap-1.5 items-center justify-between bg-slate-900/60 p-1.5 rounded border border-slate-750">
                            <div className="flex items-center gap-1.5 text-xs text-slate-350">
                              <span className="text-sm">{assigned.avatar}</span>
                              <span className="font-semibold text-slate-300 text-[11px] truncate max-w-[100px]">
                                {assigned.name}
                              </span>
                            </div>

                            <div className="flex gap-1">
                              {col.id !== "todo" && (
                                <button
                                  id={`btn-move-left-${card.id}`}
                                  onClick={() => moveCard(card, col.id === "in_progress" ? "todo" : "in_progress")}
                                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                                  title="Előző fázis"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                              )}
                              {col.id !== "done" && (
                                <button
                                  id={`btn-move-right-${card.id}`}
                                  onClick={() => moveCard(card, col.id === "todo" ? "in_progress" : "done")}
                                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                                  title="Következő fázis"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
