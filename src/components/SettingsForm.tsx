// Made by AI for AI with Google AI Studio prompted by ngabika
import React, { useState, useEffect } from "react";
import { Settings, ModelRateLimit } from "../types";
import { MessageSquare, Save, Settings as SettingsIcon, AlertCircle, RefreshCw, Send, Sparkles, Cpu, ShieldCheck, Zap, AlertTriangle, Loader2, FileCode, Trash2 } from "lucide-react";

interface SettingsFormProps {
  settings: Settings;
  modelLimits?: ModelRateLimit[];
  onSaveSettings: (settings: Partial<Settings>) => Promise<void>;
  onTestTelegram: () => Promise<void>;
}

export function SettingsForm({ settings, modelLimits = [], onSaveSettings, onTestTelegram }: SettingsFormProps) {
  const [configContent, setConfigContent] = useState("");
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configStatus, setConfigStatus] = useState("");
  const [configSuccess, setConfigSuccess] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/config-file");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.content) {
          setConfigContent(data.content);
        }
      }
    } catch (e) {
      console.error("Hiba a .config betöltésekor:", e);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSaveConfigDirect = async () => {
    setConfigSaving(true);
    setConfigStatus("");
    try {
      // client-side validation first
      JSON.parse(configContent);
      
      const res = await fetch("/api/config-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: configContent })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfigSuccess(true);
        setConfigStatus("A `.config` fájl sikeresen mentve lett és azonnal betöltődött a háttérben!");
        // Sync states if settings changed
        if (data.settings) {
          if (data.settings.geminiApiKey) setGeminiApiKey(data.settings.geminiApiKey);
          if (data.settings.geminiApiKeysPool) setGeminiApiKeysPool(data.settings.geminiApiKeysPool);
          if (data.settings.openRouterApiKey) setOpenRouterApiKey(data.settings.openRouterApiKey);
          if (data.settings.openRouterApiKeysPool) setOpenRouterApiKeysPool(data.settings.openRouterApiKeysPool);
          if (data.settings.telegramBotToken) setTelegramBotToken(data.settings.telegramBotToken);
          if (data.settings.telegramChatId) setTelegramChatId(data.settings.telegramChatId);
          if (data.settings.checkIntervalSeconds) setCheckIntervalSeconds(Number(data.settings.checkIntervalSeconds));
          if (data.settings.globalModelMode) setGlobalModelMode(data.settings.globalModelMode);
          if (data.settings.binanceApiKey) setBinanceApiKey(data.settings.binanceApiKey);
          if (data.settings.binanceApiSecret) setBinanceApiSecret(data.settings.binanceApiSecret);
          if (data.settings.strictUserPriority !== undefined) setStrictUserPriority(data.settings.strictUserPriority);
          if (data.settings.binanceEnabled !== undefined) setBinanceEnabled(data.settings.binanceEnabled);
          if (data.settings.ollamaIpOrUrl) setOllamaIpOrUrl(data.settings.ollamaIpOrUrl);
          if (data.settings.ollamaModel) setOllamaModel(data.settings.ollamaModel);
        }
      } else {
        throw new Error(data.error || "Sikertelen mentés");
      }
    } catch (err: any) {
      setConfigSuccess(false);
      setConfigStatus(`Hiba: ${err.message}`);
    } finally {
      setConfigSaving(false);
    }
  };

  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || "");
  const [geminiApiKeysPool, setGeminiApiKeysPool] = useState<string[]>(settings.geminiApiKeysPool || []);
  const [openRouterApiKey, setOpenRouterApiKey] = useState(settings.openRouterApiKey || "");
  const [openRouterApiKeysPool, setOpenRouterApiKeysPool] = useState<string[]>(settings.openRouterApiKeysPool || []);
  const [telegramBotToken, setTelegramBotToken] = useState(settings.telegramBotToken || "");
  const [telegramChatId, setTelegramChatId] = useState(settings.telegramChatId || "");
  const [isBotActive, setIsBotActive] = useState(settings.isBotActive);
  const [checkIntervalSeconds, setCheckIntervalSeconds] = useState(settings.checkIntervalSeconds || 30);
  const [globalModelMode, setGlobalModelMode] = useState(settings.globalModelMode || "auto");
  const [geminiModelPriority, setGeminiModelPriority] = useState(settings.geminiModelPriority || "gemini-3.5-flash, gemini-3.1-flash-lite");
  const [openRouterModelPriority, setOpenRouterModelPriority] = useState(settings.openRouterModelPriority || "google/gemini-2.5-flash:free, meta-llama/llama-3.3-70b-instruct:free, deepseek/deepseek-r1:free, meta-llama/llama-3-8b-instruct:free");
  const [autoReorderModels, setAutoReorderModels] = useState(settings.autoReorderModels || false);
  const [strictUserPriority, setStrictUserPriority] = useState(settings.strictUserPriority !== false);
  const [binanceApiKey, setBinanceApiKey] = useState(settings.binanceApiKey || "");
  const [binanceApiSecret, setBinanceApiSecret] = useState(settings.binanceApiSecret || "");
  const [binanceEnabled, setBinanceEnabled] = useState(settings.binanceEnabled || false);
  const [binanceUseRealAccount, setBinanceUseRealAccount] = useState(settings.binanceUseRealAccount || false);
  const [binanceStrategy, setBinanceStrategy] = useState(settings.binanceStrategy || "trend");
  const [language, setLanguage] = useState(settings.language || "hu");
  
  // Ollama & Auto-Profile Detection States
  const [ollamaIpOrUrl, setOllamaIpOrUrl] = useState(settings.ollamaIpOrUrl || "http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState(settings.ollamaModel || "qwen2.5:1.5b");
  const [hwProfile, setHwProfile] = useState<{
    cpu: string;
    ram: string;
    vga: string;
    recommendedModel: string;
    recommendedReason: string;
    availableModels: Array<{ id: string; name: string; tag: string }>;
  } | null>(null);
  const [loadingHw, setLoadingHw] = useState(false);

  const fetchHwAndRecommend = async () => {
    setLoadingHw(true);
    try {
      const res = await fetch("/api/ollama/hardware-profile");
      if (res.ok) {
        const data = await res.json();
        setHwProfile(data);
        if (!settings.ollamaModel) {
          setOllamaModel(data.recommendedModel);
        }
      }
    } catch (e) {
      console.error("Hardware profile load error:", e);
    } finally {
      setLoadingHw(false);
    }
  };

  useEffect(() => {
    fetchHwAndRecommend();
  }, []);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [discoveringModels, setDiscoveringModels] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [success, setSuccess] = useState(true);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg("");
    try {
      await onSaveSettings({
        geminiApiKey,
        geminiApiKeysPool,
        openRouterApiKey,
        openRouterApiKeysPool,
        telegramBotToken,
        telegramChatId,
        isBotActive,
        checkIntervalSeconds: Number(checkIntervalSeconds),
        globalModelMode,
        geminiModelPriority,
        openRouterModelPriority,
        autoReorderModels,
        strictUserPriority,
        binanceEnabled,
        binanceApiKey,
        binanceApiSecret,
        binanceUseRealAccount,
        binanceStrategy,
        language,
        ollamaIpOrUrl,
        ollamaModel
      });
      setSuccess(true);
      setStatusMsg(language === "hu" ? "A beállítások sikeresen mentve!" : "Settings saved successfully!");
    } catch (err: any) {
      setSuccess(false);
      setStatusMsg(err.message || "Hiba történt a mentéskor.");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoDiscoverModels = async () => {
    setDiscoveringModels(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/models/auto-refresh", { method: "POST" });
      if (!res.ok) {
        throw new Error("Lekérdezés sikertelen.");
      }
      const data = await res.json();
      if (data.settings) {
        if (data.settings.geminiModelPriority) {
          setGeminiModelPriority(data.settings.geminiModelPriority);
        }
        if (data.settings.openRouterModelPriority) {
          setOpenRouterModelPriority(data.settings.openRouterModelPriority);
        }
      }
      setSuccess(true);
      setStatusMsg("A modell-felfedező sikeresen lefutott! Lekérdeztük az OpenRouter aktuális legfrissebb ingyenes modelljeit, és frissítettük a prioritási sorrendet.");
    } catch (err: any) {
      setSuccess(false);
      setStatusMsg(err.message || "Hiba történt az automatikus modellek lekérése közben.");
    } finally {
      setDiscoveringModels(false);
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
        {/* Global Language Support Section */}
        <div className="space-y-4 pb-4 border-b border-slate-700/60">
          <h3 className="text-md font-medium text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ⚙️ Language / Rendszer Nyelve (Multi-Language Support)
          </h3>
          <div className="bg-slate-900/40 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-400">
            {language === "hu" ? (
              <p>Megváltoztathatod a komplett NovaSwarm rendszer és az AI irányító felület nyelvét. Összesen 11 leggyakoribb világnyelv támogatott.</p>
            ) : (
              <p>You can change the language of the entire NovaSwarm interface and AI coordinator team. Supports 11 of the most popular languages globally.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              {language === "hu" ? "Kiválasztott Rendszernyelv" : "Select System Language"}
            </label>
            <select
              id="select-system-language"
              value={language}
              onChange={e => setLanguage(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="hu">Magyar (Hungarian)</option>
              <option value="en">English (English)</option>
              <option value="de">Deutsch (German)</option>
              <option value="es">Español (Spanish)</option>
              <option value="fr">Français (French)</option>
              <option value="it">Italiano (Italian)</option>
              <option value="pt">Português (Portuguese)</option>
              <option value="ru">Русский (Russian)</option>
              <option value="zh">中文 (Chinese)</option>
              <option value="ja">日本語 (Japanese)</option>
              <option value="ar">العربية (Arabic)</option>
            </select>
          </div>
        </div>

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

          {/* Gemini API Key Pool */}
          <div id="gemini-keys-pool-section" className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3 mt-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  Gemini API Kulcsok Rotációs Pool
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ha 2-3-4 vagy akár 50 különböző Gemini kulcsod van (pl. családtagokét is kihasználva), zárd be őket ide. A rendszer teljesen automatikusan, körforgásszerűen (round-robin) elosztja köztük a hívásokat, maximalizálva az uptime-ot és a sebességet!
                </p>
              </div>
            </div>

            {/* List of Keys */}
            {geminiApiKeysPool && geminiApiKeysPool.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {geminiApiKeysPool.map((key, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-750 text-xs">
                    <div className="flex items-center gap-2 font-mono text-slate-300">
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-sans font-semibold text-[10px]">#{index + 1}</span>
                      <span>{key.length > 12 ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}` : "••••••••••••"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...geminiApiKeysPool];
                        updated.splice(index, 1);
                        setGeminiApiKeysPool(updated);
                      }}
                      className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                      title="Eltávolítás"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Key Input */}
            <div className="flex gap-2">
              <input
                id="new-gemini-pool-key"
                type="password"
                placeholder="Írd vagy illeszd be az új Gemini API kulcsot..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const target = e.currentTarget;
                    const val = target.value.trim();
                    if (val) {
                      if (geminiApiKeysPool.includes(val)) {
                        alert(language === "hu" ? "Ez a kulcs már szerepel a poolban!" : "This key is already in the pool!");
                        return;
                      }
                      setGeminiApiKeysPool([...geminiApiKeysPool, val]);
                      target.value = "";
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("new-gemini-pool-key") as HTMLInputElement;
                  if (input) {
                    const val = input.value.trim();
                    if (val) {
                      if (geminiApiKeysPool.includes(val)) {
                        alert(language === "hu" ? "Ez a kulcs már szerepel a poolban!" : "This key is already in the pool!");
                        return;
                      }
                      setGeminiApiKeysPool([...geminiApiKeysPool, val]);
                      input.value = "";
                    }
                  }
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                Hozzáadás
              </button>
            </div>
          </div>
        </div>

        {/* Section 1.2 - OPENROUTER API KEY */}
        <div className="space-y-4 pt-4 border-t border-slate-750">
          <h3 className="text-md font-medium text-white flex items-center gap-2 pb-2 border-b border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            1.2 OpenRouter.ai API Kulcs (Tartalék &amp; Alternatív Útvonal)
          </h3>

          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl text-xs text-slate-350 space-y-2">
            <span className="font-semibold text-indigo-455 block">🛡️ Automatikus Átirányítás &amp; Maximum Uptime</span>
            <p>
              Ha a Google Gemini API korlátozva van (pl. ingyenes Rate-Limit miatt) vagy hálózati kimaradás történik, a rendszer automatikusan és észrevétlenül az <strong>OpenRouter.ai API</strong> ingyenes modelljeire tereli az ágensek működését. Sosem maradsz válasz nélkül!
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">OpenRouter API Kulcs</label>
            <input
              id="input-settings-openrouter-key"
              type="password"
              placeholder="Saját OpenRouter API Kulcs (opcionális)..."
              value={openRouterApiKey}
              onChange={e => setOpenRouterApiKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono placeholder:text-slate-550"
            />
          </div>

          {/* OpenRouter API Key Pool */}
          <div id="openrouter-keys-pool-section" className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3 mt-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  OpenRouter API Kulcsok Rotációs Pool
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ha több OpenRouter fiókból rendelkezel kulccsal, add meg őket itt a terhelés elosztásához és a magasabb hívássebesség eléréséhez tartalék csatornaként!
                </p>
              </div>
            </div>

            {/* List of Keys */}
            {openRouterApiKeysPool && openRouterApiKeysPool.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {openRouterApiKeysPool.map((key, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-755 text-xs">
                    <div className="flex items-center gap-2 font-mono text-slate-300">
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-350 px-1.5 py-0.5 rounded font-sans font-semibold">#{index + 1}</span>
                      <span>{key.length > 12 ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}` : "••••••••••••"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...openRouterApiKeysPool];
                        updated.splice(index, 1);
                        setOpenRouterApiKeysPool(updated);
                      }}
                      className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                      title="Eltávolítás"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Key Input */}
            <div className="flex gap-2">
              <input
                id="new-openrouter-pool-key"
                type="password"
                placeholder="Írd vagy illeszd be az új OpenRouter API kulcsot..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const target = e.currentTarget;
                    const val = target.value.trim();
                    if (val) {
                      if (openRouterApiKeysPool.includes(val)) {
                        alert(language === "hu" ? "Ez a kulcs már szerepel a poolban!" : "This key is already in the pool!");
                        return;
                      }
                      setOpenRouterApiKeysPool([...openRouterApiKeysPool, val]);
                      target.value = "";
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("new-openrouter-pool-key") as HTMLInputElement;
                  if (input) {
                    const val = input.value.trim();
                    if (val) {
                      if (openRouterApiKeysPool.includes(val)) {
                        alert(language === "hu" ? "Ez a kulcs már szerepel a poolban!" : "This key is already in the pool!");
                        return;
                      }
                      setOpenRouterApiKeysPool([...openRouterApiKeysPool, val]);
                      input.value = "";
                    }
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                Hozzáadás
              </button>
            </div>
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
                  Az automata és intelligens útvonalválasztó elemzi az elérhető API modellek aktuális **rate-limitjeit**.
                </p>
                <p className="leading-relaxed">
                  Ha az elsődleges intelligens modell elfogyik, az ágens **azonnal átvált** a következő szintű modellre, elkerülve a 429-es vagy túlterhelési hibaüzeneteket.
                </p>
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <span className="block text-xs font-semibold text-slate-400">Valós idejű API és Rate-Limit Monitor</span>
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

        {/* Section 1.6 - CUSTOM FALLBACK PRIORITIES & AUTO-DISCOVERER */}
        <div className="space-y-4 pt-4 border-t border-slate-750">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-md font-medium text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              1.6 Modell Prioritások és Intelligens Felfedező
            </h3>
            <button
              id="btn-discover-models"
              type="button"
              onClick={handleAutoDiscoverModels}
              disabled={discoveringModels}
              className="px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {discoveringModels ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Szkennelés...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Frissítés és Ingyenes Modellek Felfedezése
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-xs text-slate-350 space-y-2.5">
            <span className="font-semibold text-cyan-400 block">⚡ Dinamikus modell-fáradás elleni védelem</span>
            <p className="leading-relaxed">
              Ha az OpenAI, a Google vagy más szolgáltatók kivezetnének bizonyos ingyenes modelleket a piacról, itt te adhatod meg a pontos prioritási listát és sorrendet vesszővel elválasztva. A rendszer automatikusan fentről lefele haladva próbálja meg a kommunikációt.
            </p>
            <p className="leading-relaxed">
              Az <strong>Ingyenes modellek felfedezése</strong> gomb segítségével a gép lekérdezi a legfrissebb OpenRouter katalógust, megkeresi a 100% ingyenes modelleket és automatikusan beállítja a prioritást az aktív, működő eszközökre!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Google Gemini Fallback Lánc (Vesszővel elválasztva)</label>
              <input
                id="input-gemini-priority"
                type="text"
                placeholder="Pl. gemini-3.5-flash, gemini-3.1-flash-lite"
                value={geminiModelPriority}
                onChange={e => setGeminiModelPriority(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">OpenRouter Fallback Lánc (Vesszővel elválasztva)</label>
              <input
                id="input-openrouter-priority"
                type="text"
                placeholder="Pl. google/gemini-2.1-flash:free, deepseek/deepseek-r1:free"
                value={openRouterModelPriority}
                onChange={e => setOpenRouterModelPriority(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <input
              id="checkbox-auto-reorder-models"
              type="checkbox"
              checked={autoReorderModels}
              onChange={e => setAutoReorderModels(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 search-checkbox"
            />
            <div>
              <label htmlFor="checkbox-auto-reorder-models" className="block text-xs font-bold text-slate-200 cursor-pointer">
                Heti Automatikus Felfedezési Ciklus bekapcsolása (Weekly Explorer)
              </label>
              <span className="text-[10px] text-slate-400 block">
                A rendszer hetente egyszer automatikusan felméri a piacon elérhető ingyenes modellek állapotát, és átrendezi a listát az alapján, hogy megjelent-e jobb vagy gazdaságosabb modell.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/40 p-4 rounded-xl border border-rose-950/40">
            <input
              id="checkbox-strict-user-priority"
              type="checkbox"
              checked={strictUserPriority}
              onChange={e => setStrictUserPriority(e.target.checked)}
              className="w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700 search-checkbox focus:ring-rose-500"
            />
            <div>
              <label htmlFor="checkbox-strict-user-priority" className="block text-xs font-bold text-rose-400 cursor-pointer flex items-center gap-1.5">
                🛡️ Szigorú Felhasználói Priorizálás (Strict Task Focus)
              </label>
              <span className="text-[10px] text-slate-350 block">
                {language === "hu" 
                  ? "Ha be van kapcsolva, az ágensek visszafogják a saját ötleteiket, és KIZÁRÓLAG az Ön által megadott feladatokra és parancsokra fókuszálnak. Szigorúan tilos maguktól kéretlen szoftveres scripteket vagy ál-kezdeményezéseket elindítaniuk."
                  : "When enabled, agents suppress their own random initiatives and focus EXCLUSIVELY on tasks and commands specified by you. Unsolicited script developments and rogue initiatives are strictly forbidden."}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1.7 - OLLAMA LOCAL ENGINE & HARDWARE PROFILER */}
        <div id="section-ollama-local-engine" className="space-y-4 pt-4 border-t border-slate-750">
          <h3 className="text-md font-medium text-white flex items-center gap-2 pb-2 border-b border-slate-700/60 font-sans">
            <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
            1.7 Ollama Helyi Modell Motor & Hardware Profilozó
          </h3>

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-xs text-slate-350 space-y-3">
            <span className="font-semibold text-emerald-400 block flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              🖥️ Hardverprofil és Intelligens offline modell ajánlás
            </span>
            <p className="leading-relaxed">
              Az alábbiakban megtekintheted a szerver gép valós fizikai képességeit (CPU, RAM, VGA). A rendszer a mérések alapján automatikusan a legoptimálisabb paraméterezésű offline modellt javasolja neked, amelyet garantáltan elbír a hardvered!
            </p>

            {loadingHw ? (
              <div className="flex items-center gap-2 text-slate-450 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Laptop hardver feltérképezése folyamatban...</span>
              </div>
            ) : hwProfile ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                <div className="text-left">
                  <span className="text-[10px] text-slate-550 block font-semibold uppercase">Főprocesszor (CPU)</span>
                  <span className="text-xs text-slate-200 truncate block font-mono">{hwProfile.cpu}</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-550 block font-semibold uppercase">Összmemória (RAM)</span>
                  <span className="text-xs text-slate-200 font-mono font-semibold block">{hwProfile.ram}</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-550 block font-semibold uppercase">Grafikus kártya (VGA)</span>
                  <span className="text-xs text-slate-200 truncate block font-mono">{hwProfile.vga}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-red-400 py-1 font-semibold">Nem sikerült lekérni a teljes hardveres tulajdonságokat. Ellenőrizd a gép státuszát!</p>
            )}

            {hwProfile && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-[11px] text-emerald-300 leading-relaxed font-sans flex gap-2 items-start mt-2">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <strong>Automatikus Modell Ajánlás:</strong>{" "}
                  <span className="underline font-mono font-bold text-white uppercase text-xs bg-emerald-900/40 px-1.5 py-0.5 rounded">{hwProfile.recommendedModel}</span> - {hwProfile.recommendedReason}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Ollama IP-cím / URL (Amennyiben más gépen fut)</label>
              <input
                id="input-ollama-host"
                type="text"
                placeholder="Pl. http://localhost:11434"
                value={ollamaIpOrUrl}
                onChange={e => setOllamaIpOrUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-405 mb-1">Futtatandó Offline Modell (Egyedi Modellválasztó)</label>
              <select
                id="select-ollama-model"
                value={ollamaModel}
                onChange={e => setOllamaModel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                {hwProfile ? (
                  hwProfile.availableModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} – {m.tag} {hwProfile.recommendedModel === m.id ? "⭐ (Ajánlott neked)" : ""}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="qwen2.5:0.5b">Qwen 2.5 (0.5b) – Szuper-könnyű, 4 GB alatti RAM-hoz</option>
                    <option value="qwen2.5:1.5b">Qwen 2.5 (1.5b) – Közepes pörgős, 4-8 GB RAM-hoz</option>
                    <option value="deepseek-r1:1.5b">DeepSeek R1 (1.5b) – Könnyű reasoning modell</option>
                    <option value="gemma2:2b">Gemma 2 (2b) – Google egyensúlyos modell</option>
                    <option value="qwen2.5:3b">Qwen 2.5 (3b) – Okos pontos középkategória, 8 GB vagy több RAM</option>
                    <option value="llama3.2:1b">Llama 3.2 (1b) – Meta pici, ultra-gyors</option>
                    <option value="llama3.2:3b">Llama 3.2 (3b) – Meta kiegyensúlyozott</option>
                    <option value="llama3.1:8b">Llama 3.1 (8b) – Nagyobb modell, dedikált GPU-val vagy 16 GB feletti RAM-mal</option>
                    <option value="deepseek-r1:8b">DeepSeek R1 (8b) – Fejlett reasoning modell, 16 GB feletti RAM-mal</option>
                  </>
                )}
              </select>
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

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-xs text-slate-300 space-y-3">
            <span className="font-semibold text-cyan-400 block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              📢 Telegram Élő Parancskészlet (v1.2.0 Command &amp; Control)
            </span>
            <p className="text-slate-400 leading-relaxed">
              Az elmentett paraméterekkel a Telegram botod közvetlen parancsközpontként funkcionál. Írd be a következő parancsokat a Telegram chaten az azonnali, valós idejű végrehajtáshoz és adateléréshez:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-mono leading-relaxed pl-1 text-slate-350">
              <div>
                <span className="text-cyan-400">/egyenleg</span> - Binance portfólió egyenleg &amp; összérték
              </div>
              <div>
                <span className="text-cyan-400">/statusz</span> - Rendszer &amp; ágensek részletes állapota
              </div>
              <div>
                <span className="text-cyan-400">/almodozas_on</span> - Autonóm működés/Álmodozás aktiválás
              </div>
              <div>
                <span className="text-cyan-450">/almodozas_off</span> - Autonóm működés felfüggesztése
              </div>
              <div>
                <span className="text-cyan-400">/kanban</span> - Kanban kártyák és futó feladatok lekérése
              </div>
              <div>
                <span className="text-cyan-400">/memoria</span> - Központi tények és mentett memóriák listázása
              </div>
              <div>
                <span className="text-cyan-400">/modell</span> - Fallback prioritások, AI modellek lekérdezése
              </div>
              <div>
                <span className="text-cyan-400">/keres &lt;kérdés&gt;</span> - Élő, internetes Deep Research azonnal!
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic pt-2 border-t border-slate-800/60">
              💡 Minden parancs automatikusan, éles API-kon és valódi rendszermag lekérdezésekkel történik, bármiféle szimuláció, késleltetés vagy álcázás nélkül.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-750">
          <h3 className="text-md font-medium text-white flex items-center justify-between pb-2 border-b border-slate-700/60">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              2.5 Binance API Kulcsok &amp; Titkos Kulcsok
            </span>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                id="checkbox-binance-enabled"
                type="checkbox"
                checked={binanceEnabled}
                onChange={(e) => setBinanceEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <span className="text-xs text-slate-400 mr-2 font-normal">
                {binanceEnabled ? (language === "hu" ? "Aktív" : "Active") : (language === "hu" ? "Inaktív" : "Inactive")}
              </span>
              <div className="w-11 h-6 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[18px] after:bg-slate-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500 peer-checked:after:bg-slate-950"></div>
            </label>
          </h3>

          {!binanceEnabled ? (
            <div className="bg-slate-900/45 border border-slate-800/85 p-4 rounded-xl text-xs text-slate-400">
              <p className="font-medium text-slate-350">
                {language === "hu"
                  ? "🔒 A Binance kereskedelmi és piaci integráció ki van kapcsolva."
                  : "🔒 Binance trading and market integration is disabled."}
              </p>
              <p className="mt-1">
                {language === "hu"
                  ? "Engedélyezd a fenti kapcsolóval, hogy aktiváld a Kripto-Trader és Kripto-Radar képességeket, valamint hozzáférhess a grafikonokhoz és a papírkereskedéshez."
                  : "Enable the toggle above to activate Crypto-Trader and Crypto-Radar capabilities, charts, and paper trading."}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl text-xs text-slate-350 space-y-2">
                <p className="font-semibold text-slate-200">📊 Elérhető a teszt (papírkereskedési) és valós tőzsdei mód!</p>
                <p>
                  Alapértelmezés szerint a **Binance Kereskedés** fül egy teljesen kockázatmentes, dedikált papírkereskedési motorral (Paper Trading) fut, amely mentes a valós piaci veszteségektől.
                </p>
                <p className="text-slate-400">
                  Amennyiben az ágenseidnek (Attilának és Nórának) valós vagy BNB teszthálózati (Testnet) hozzáférést szeretnél adni a megbízások és számlaegyenleg szinkronizáláshoz, itt adhatod meg az API hozzáféréseidet:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Binance API Key</label>
                  <input
                    id="input-settings-binance-key"
                    type="password"
                    placeholder="Pl. vmPUZPr6uS4p01QC..."
                    value={binanceApiKey}
                    onChange={e => setBinanceApiKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-550"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Binance API Secret</label>
                  <input
                    id="input-settings-binance-secret"
                    type="password"
                    placeholder="Pl. 9S1dfbKLePvPsc82z..."
                    value={binanceApiSecret}
                    onChange={e => setBinanceApiSecret(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-550"
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Kereskedési Környezet (Mód)</label>
              <select
                id="select-settings-binance-mode"
                value={binanceUseRealAccount ? "real" : "demo"}
                onChange={e => setBinanceUseRealAccount(e.target.value === "real")}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 font-medium"
              >
                <option value="demo">🕹️ Szoftveres Szimuláció (Kockázatmentes Demó)</option>
                <option value="real">⚡ Valós / Éles Kereskedés (Saját API Kulccsal)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Autonóm Kereskedési Stratégia</label>
              <select
                id="select-settings-binance-strategy"
                value={binanceStrategy}
                onChange={e => setBinanceStrategy(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 font-medium"
              >
                <option value="trend">📈 Trendkövető (Alapértelmezett)</option>
                <option value="scalping">⚡ Skalpolás (Magas frekvenciájú mikro-tradek)</option>
                <option value="hodl">💎 HODL Felhalmozás (Eladási megbízások letiltása)</option>
              </select>
            </div>
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

      {/* Direct .config file editor as explicitly requested by user */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4 shadow-xl">
        <h3 className="text-md font-medium text-white flex items-center gap-2 pb-2 border-b border-slate-700/60">
          <FileCode className="w-5 h-5 text-amber-500" />
          Közvetlen .config Fájl Szerkesztése
        </h3>
        <p className="text-xs text-slate-400">
          Minden beállításod és API kulcsod egyetlen központi <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400">.config</code> fájlban van tárolva az alkalmazás gyökérkönyvtárában. Itt közvetlenül, nyers JSON formátumban is szerkesztheted.
        </p>

        {configStatus && (
          <div
            id="config-status-alert"
            className={`p-3 rounded-lg text-xs border flex items-center gap-2 ${
              configSuccess
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/80"
                : "bg-red-950/40 text-red-400 border-red-800"
            }`}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <div>{configStatus}</div>
          </div>
        )}

        <div className="space-y-2">
          {configLoading ? (
            <div className="flex items-center justify-center p-8 bg-slate-900 rounded-lg">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          ) : (
            <textarea
              id="textarea-config-content"
              rows={12}
              value={configContent}
              onChange={e => setConfigContent(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-emerald-400 text-xs font-mono focus:outline-none focus:border-amber-500"
              placeholder="{}"
            />
          )}
        </div>

        <div className="flex justify-between items-center bg-slate-900/40 p-3 rounded-lg border border-slate-750">
          <button
            id="btn-config-reload"
            type="button"
            onClick={fetchConfig}
            disabled={configLoading}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Változtatások elvetése / Újratöltés
          </button>

          <button
            id="btn-config-save-direct"
            type="button"
            onClick={handleSaveConfigDirect}
            disabled={configSaving || configLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold rounded-lg text-xs transition disabled:opacity-50 shadow-md"
          >
            {configSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Nyers .config Mentése
          </button>
        </div>
      </div>
    </div>
  );
}
