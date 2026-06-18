import React, { useState } from "react";
import { Settings, ModelRateLimit } from "../types";
import { MessageSquare, Save, Settings as SettingsIcon, AlertCircle, RefreshCw, Send, Sparkles, Cpu, ShieldCheck, Zap, AlertTriangle } from "lucide-react";

interface SettingsFormProps {
  settings: Settings;
  modelLimits?: ModelRateLimit[];
  onSaveSettings: (settings: Partial<Settings>) => Promise<void>;
  onTestTelegram: () => Promise<void>;
}

export function SettingsForm({ settings, modelLimits = [], onSaveSettings, onTestTelegram }: SettingsFormProps) {
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || "");
  const [telegramBotToken, setTelegramBotToken] = useState(settings.telegramBotToken || "");
  const [telegramChatId, setTelegramChatId] = useState(settings.telegramChatId || "");
  const [isBotActive, setIsBotActive] = useState(settings.isBotActive);
  const [checkIntervalSeconds, setCheckIntervalSeconds] = useState(settings.checkIntervalSeconds || 30);
  const [globalModelMode, setGlobalModelMode] = useState(settings.globalModelMode || "auto");

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [success, setSuccess] = useState(true);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg("");
    try {
      await onSaveSettings({
        geminiApiKey,
        telegramBotToken,
        telegramChatId,
        isBotActive,
        checkIntervalSeconds: Number(checkIntervalSeconds),
        globalModelMode
      });
      setSuccess(true);
      setStatusMsg("A beállítások sikeresen mentve!");
    } catch (err: any) {
      setSuccess(false);
      setStatusMsg(err.message || "Hiba történt a mentéskor.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setStatusMsg("");
    try {
      await onTestTelegram();
      setSuccess(true);
      setStatusMsg("Teszt üzenet sikeresen elküldve a Telegram csatornára! Ellenőrizd a mobilodat!");
    } catch (err: any) {
      setSuccess(false);
      setStatusMsg("Hiba történt. Ellenőrizd a Bot Tokent, a Chat ID-t és a hálózati kapcsolatot!");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-400" />
          Rendszer- és Kapcsolati Beállítások
        </h2>
        <p className="text-sm text-slate-400">
          Itt konfigurálhatod a Google Gemini API eléréseket és a Telegram kommunikációs csatornát.
        </p>
      </div>

      {statusMsg && (
        <div
          id="settings-status-alert"
          className={`p-4 rounded-xl text-sm border flex items-center gap-3 ${
            success
              ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/80"
              : "bg-red-950/40 text-red-400 border-red-800"
          }`}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>{statusMsg}</div>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6 shadow-xl">
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white flex items-center gap-2 pb-2 border-b border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            1. Gemini AI API Kulcs
          </h3>

          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl text-xs text-slate-350 space-y-2">
            <p className="font-semibold text-slate-200">ℹ️ Hogyan működik az API kulcs kezelés?</p>
            <p>
              A Google AI Studio automatikusan beilleszti az aktív Gemini API kulcsodat a környezeti változók közé (<code className="bg-slate-950 px-1 py-0.5 rounded text-amber-400">process.env.GEMINI_API_KEY</code>). 
              Ha a platform secrets panelében már megadtad, ezt a mezőt üresen hagyhatod!
            </p>
            <p className="text-slate-400">
              Ha külső vagy saját API kulccsal szeretnéd felülírni a rendszert, írd be az alábbi mezőbe:
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Gemini API Kulcs (Override)</label>
            <input
              id="input-settings-gemini-key"
              type="password"
              placeholder="Saját AI Studio API Kulcs felülírása (opcionális)..."
              value={geminiApiKey}
              onChange={e => setGeminiApiKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-550"
            />
          </div>
        </div>

        {/* Section 1.5 - GEMINI MODEL ROUTER CONFIGURATION */}
        <div className="space-y-4 pt-4 border-t border-slate-750">
          <h3 className="text-md font-medium text-white flex items-center gap-2 pb-2 border-b border-slate-700/60">
            <Sparkles className="w-4 h-4 text-purple-400" />
            1.5 Gemini Intelligens Modellválasztó és Rate-Limit Router
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Globális Kommunikációs Modell</label>
                <select
                  id="select-global-model-mode"
                  value={globalModelMode}
                  onChange={e => setGlobalModelMode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-755 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="auto">🧠 Intelligens Automata (Ajánlott)</option>
                  <option value="gemini-3.1-pro-preview">💎 Gemini 3.1 Pro (Preview)</option>
                  <option value="gemini-2.5-pro">🧪 Gemini 2.5 Pro (Experimental)</option>
                  <option value="gemini-3.5-flash">⚡ Gemini 3.5 Flash (Standard)</option>
                  <option value="gemini-2.5-flash">🧪 Gemini 2.5 Flash (Experimental)</option>
                  <option value="gemini-3.1-flash-lite">🍃 Gemini 3.1 Flash-Lite (Gyors)</option>
                </select>
              </div>

              <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-805 text-xs text-slate-350 space-y-2">
                <span className="font-semibold text-indigo-400 block flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" />
                  Hogyan működik az Automata mód?
                </span>
                <p className="leading-relaxed">
                  Az automata és intelligens útvonalválasztó elemzi az elérhető API modellek aktuális simulated **rate-limitjeit**.
                </p>
                <p className="leading-relaxed">
                  Ha az elsődleges intelligens modell elfogyik, az ágens **azonnal átvált** a következő szintű modellre, elkerülve a 429-es vagy túlterhelési hibaüzeneteket.
                </p>
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <span className="block text-xs font-semibold text-slate-400">Valós idejű szimulált API és Rate-Limit Monitor</span>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-inner">
                {modelLimits.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">Nincs elérhető modell diagnosztikai adat.</p>
                ) : (
                  <div className="space-y-3.5">
                    {modelLimits.map(m => {
                      const pct = (m.remainingRequests / m.maxRequests) * 100;
                      let statusColor = "bg-emerald-500";
                      let textColor = "text-emerald-400 font-semibold";
                      let borderStyle = "border-emerald-950/60";

                      if (pct <= 0) {
                        statusColor = "bg-rose-500 animate-pulse";
                        textColor = "text-rose-400 font-extrabold";
                        borderStyle = "border-rose-950/80";
                      } else if (pct <= 30) {
                        statusColor = "bg-amber-500";
                        textColor = "text-amber-400 font-bold";
                        borderStyle = "border-amber-955";
                      }

                      const isSelected = globalModelMode === "auto" || globalModelMode === m.model;

                      return (
                        <div 
                          key={m.model} 
                          className={`p-2.5 rounded-lg border bg-slate-950/30 flex flex-col gap-1.5 transition ${
                            isSelected ? 'ring-1 ring-indigo-500/40 border-slate-700/50' : 'opacity-60 border-slate-800/40'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                              <span className="text-xs font-semibold text-slate-200">{m.name}</span>
                              <code className="text-[10px] text-slate-500 font-mono">({m.model})</code>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded font-mono text-indigo-300 flex items-center gap-0.5" title="Várható késleltetés">
                                <Zap className="w-2.5 h-2.5" />
                                {m.latency}
                              </span>
                              <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded font-mono text-teal-300 flex items-center gap-0.5" title="Megbízhatósági mutató">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                {m.reliability}%
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${statusColor}`} 
                                style={{ width: `${pct}%` }} 
                              />
                            </div>
                            <span className={`text-xs font-mono min-w-[70px] text-right ${textColor}`}>
                              {m.remainingRequests} / {m.maxRequests} RPS
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="flex justify-between items-center text-[10px] text-slate-450 mt-1 pt-1.5 border-t border-slate-800/60 italic">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span>A rate-limit korlátok másodpercenként töltődnek vissza a háttérben.</span>
                  </div>
                  <span>Frissítés: Aktív</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-750">
          <h3 className="text-md font-medium text-white flex items-center gap-2 pb-2 border-b border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            2. Telegram Bot Konfigurálása
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Telegram Bot Token</label>
              <input
                id="input-settings-tele-token"
                type="password"
                placeholder="Pl. 174620194:AAFl-H39v2..."
                value={telegramBotToken}
                onChange={e => setTelegramBotToken(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-550"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Telegram Chat ID / Csatorna ID</label>
              <input
                id="input-settings-tele-chatid"
                type="text"
                placeholder="Pl. -10020478103, vagy @marveen_channel"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-550"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="flex-1 space-y-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="checkbox-tg-polling"
                  type="checkbox"
                  checked={isBotActive}
                  onChange={e => setIsBotActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                />
                <span className="text-sm font-semibold text-white">Bot válaszadás bekapcsolása</span>
              </label>
              <p className="text-xs text-slate-450 pl-6">
                Ha bekapcsolod, a szerver long-pollinggel figyeli a botbeérkező üzeneteket, és a Főnök ágens (Gábor) válaszol rájuk a Gemini segítségével.
              </p>
            </div>

            {telegramBotToken && telegramChatId && (
              <button
                id="btn-test-tgConnection"
                type="button"
                disabled={testing}
                onClick={handleTest}
                className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:border-sky-500 text-slate-300 hover:text-sky-400 text-xs font-semibold px-4 py-2 rounded-lg self-end md:self-auto transition disabled:opacity-40"
              >
                {testing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Kapcsolat Tesztelése
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-750">
          <h3 className="text-md font-medium text-white flex items-center gap-2 pb-2 border-b border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            3. Autonóm Működési Időzítés
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Leolvasási / Frissítési Ütem (Ciklusidő)</label>
              <select
                id="select-settings-interval"
                value={checkIntervalSeconds}
                onChange={e => setCheckIntervalSeconds(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="10">10 másodperc (Rendkívül gyors / Tesztelés)</option>
                <option value="30">30 másodperc (Ajánlott)</option>
                <option value="60">1 perc</option>
                <option value="300">5 perc (Optimális éles teszthez)</option>
                <option value="900">15 perc</option>
                <option value="3600">1 óra</option>
              </select>
            </div>
            <div className="text-xs text-slate-450 self-end pb-2">
              Ez a beállítás vezérli, hogy az AI csapat tagjai milyen gyakorisággal ébredjenek fel a háttérben elemezni a feladatokat, létrehozni új kártyákat és koordinálni a döntéseket.
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-755 flex justify-end">
          <button
            id="btn-settings-save"
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl text-sm transition disabled:opacity-50 shadow-md"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Beállítások Mentése
          </button>
        </div>
      </form>
    </div>
  );
}
