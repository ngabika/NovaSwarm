import React, { useState, useEffect } from "react";
import { Memory } from "../types";
import { Brain, Search, Plus, Trash2, Calendar, FileText } from "lucide-react";

interface MemoriesProps {
  memories: Memory[];
  onAddMemory: (content: string, entity?: string) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
}

export function Memories({ memories, onAddMemory, onDeleteMemory }: MemoriesProps) {
  const [search, setSearch] = useState("");
  const [content, setContent] = useState("");
  const [entity, setEntity] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [useOllama, setUseOllama] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  // Real-time backend debounced semantic search
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/memories/search?q=${encodeURIComponent(search)}&ollama=${useOllama}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.memories) {
            setSearchResults(data.memories);
          }
        }
      } catch (err) {
        console.error("Semantic search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [search, useOllama]);

  // Use semantic sorted search results if search is active; fallback to standard client includes
  const displayedMemories = searchResults !== null 
    ? searchResults 
    : memories.filter(
        m =>
          m.content.toLowerCase().includes(search.toLowerCase()) ||
          (m.entity && m.entity.toLowerCase().includes(search.toLowerCase()))
      );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await onAddMemory(content, entity || undefined);
    setContent("");
    setEntity("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            Vektorizált Kollektív Memória (Memory Vault)
          </h2>
          <p className="text-sm text-slate-400">
            A csapat által önállóan rögzített tények tára matematikai szemantikus Cosine Similarity keresővel.
          </p>
        </div>
        {!isAdding && (
          <button
            id="btn-add-memory"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition"
          >
            <Plus className="w-4 h-4" />
            Új Tény Megadása
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4 max-w-xl mx-auto">
          <h3 className="text-md font-medium text-white pb-1 border-b border-slate-700/60">
            Új tény felvétele a Memóriába
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Kulcsszavak / Kategória (Opcionális)</label>
              <input
                id="input-memory-entity"
                type="text"
                value={entity}
                onChange={e => setEntity(e.target.value)}
                placeholder="Pl. Ügyfél preferencia / Cégadatok"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">A rögzítendő memória tartalma</label>
              <textarea
                id="textarea-memory-content"
                rows={3}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Pl. Az ügyfél kérése szerint minden publikációt ékes, hiba nélküli magyar magázó stílusban kell megfogalmaznunk."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              id="btn-cancel-add-memory"
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-650 text-slate-300 rounded-lg text-xs"
            >
              Mégse
            </button>
            <button
              id="btn-submit-memory"
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs"
            >
              Emlék Rögzítése
            </button>
          </div>
        </form>
      )}

      {/* Robust Search Header with Semantic switches */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              id="input-search-memories"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Gépelj ide szemantikus kulcsszavakat vagy kérdéseket a memóriakereséshez..."
              className="w-full bg-slate-900/80 border border-slate-750 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {isSearching && (
              <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-750 rounded-xl px-4 py-2 text-xs text-slate-300">
            <input
              type="checkbox"
              id="checkbox-ollama-vectors"
              checked={useOllama}
              onChange={e => setUseOllama(e.target.checked)}
              className="rounded bg-slate-850 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer w-4 h-4"
            />
            <label htmlFor="checkbox-ollama-vectors" className="cursor-pointer select-none font-medium text-slate-200">
              👁️ Helyi Ollama Dense Beágyazás (Eredeti Vektor model)
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedMemories.length === 0 ? (
            <div className="col-span-full bg-slate-800/10 border border-dashed border-slate-850 py-12 text-center text-slate-500 italic text-sm">
              Nem található a keresési feltételnek megfelelő mentett tény / memória.
            </div>
          ) : (
            displayedMemories.map(memory => (
              <div
                id={`memory-card-${memory.id}`}
                key={memory.id}
                className="bg-slate-800/60 rounded-xl border border-slate-750 p-4 hover:border-slate-650 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-slate-900 border border-slate-700/60 text-[10px] uppercase font-bold text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <FileText className="w-3 h-3 text-indigo-500" />
                      {memory.entity || "Rendszermemória"}
                    </span>
                    <button
                      id={`btn-delete-memory-${memory.id}`}
                      onClick={() => {
                        if (confirm("Biztosan törölni akarod ezt a rögzített megállapítást a memóriatár-ból?")) {
                          onDeleteMemory(memory.id);
                        }
                      }}
                      className="text-slate-500 hover:text-red-400 transition"
                      title="Memória törlése"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line font-serif">
                    {memory.content}
                  </p>
                </div>

                <div className="border-t border-slate-750/50 mt-3 pt-2 text-[10px] text-slate-500 font-mono flex flex-wrap justify-between items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(memory.createdAt).toLocaleString()}
                  </span>
                  {memory.score !== undefined && (
                    <span className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 font-semibold px-2 py-0.5 rounded text-[9px]">
                      🔥 Szemantikus egyezés: {Math.round(memory.score * 100)}%
                    </span>
                  )}
                  <span className="text-slate-600">ID: {memory.id}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
