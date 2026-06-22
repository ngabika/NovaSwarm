import React, { useState } from "react";
import { Agent, Settings } from "../types";
import { Bot, Key, MessageSquare, User, Sparkles, CheckCircle, ArrowRight, Settings as SettingsIcon } from "lucide-react";

interface SetupWizardProps {
  onComplete: (data: { settings: Partial<Settings>, firstAgent: Partial<Agent> }) => Promise<void>;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [geminiKey, setGeminiKey] = useState("");
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [userName, setUserName] = useState("");
  const [userBio, setUserBio] = useState("");

  // Agent State
  const [agentType, setAgentType] = useState<"boss" | "tech_lead" | "writer">("boss");
  const [agentName, setAgentName] = useState("Nova");

  const agentTemplates = {
    boss: {
      name: "Gábor (Általános Mester)",
      role: "boss" as const,
      avatar: "🎩",
      systemInstruction: "Te vagy a NovaSwarm elsődleges és legfőbb ágense. Felelős vagy a felhasználó minden kérésének megválaszolásáért, a folyamatok átlátásáért és a csapat későbbi bővítéséért. Kreatív és határozott vezető vagy."
    },
    tech_lead: {
      name: "Attila (Vezető Fejlesztő)",
      role: "tech_lead" as const,
      avatar: "💻",
      systemInstruction: "Te vagy a NovaSwarm vezető fejlesztője. Elsődleges feladatod a kódolás, a szerveren történő parancsok végrehajtása, fájlok szerkesztése és a GitHub-bal való munka. Törekszel a tiszta és stabil kódra."
    },
    writer: {
      name: "Cili (Tartalomíró)",
      role: "writer" as const,
      avatar: "✍️",
      systemInstruction: "Te vagy a NovaSwarm fő írója és elemzője. Kiváló vagy a tartalomkészítésben, PR anyagok és kreatív szövegek írásában. Kommunikációd mindig barátságos és inspiráló."
    }
  };

  const handleNext = () => {
    if (step === 1 && !geminiKey.trim()) {
      alert("A Gemini API Kulcs megadása kötelező a rendszer működéséhez!");
      return;
    }
    setStep(s => s + 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const template = agentTemplates[agentType];
      
      await onComplete({
        settings: {
          geminiApiKey: geminiKey,
          openRouterApiKey: openRouterKey,
          telegramBotToken: telegramToken,
          telegramChatId: telegramChatId,
          userName: userName,
          userBio: userBio,
          setupCompleted: true,
          isBotActive: true,
          teamActive: true
        },
        firstAgent: {
          id: `agent_${Date.now()}`,
          name: agentName,
          role: template.role,
          avatar: template.avatar,
          systemInstruction: template.systemInstruction,
          active: true
        }
      });
    } catch (err) {
      console.error(err);
      alert("Hiba történt a beállítás mentésekor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay"></div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-800/80 p-6 border-b border-slate-750 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">NovaSwarm Kezdeti Beállítások</h2>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Üdvözöllek! Alakítsuk ki a személyes AI Swarm környezeted (Lépés {step}/4)
            </p>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`w-2 h-2 rounded-full transition-colors ${s === step ? 'bg-purple-500' : s < step ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto" style={{ flexGrow: 1 }}>
          
          {step === 1 && (
            <div className="animate-fade-in space-y-5">
              <div className="flex items-center gap-3 text-emerald-400 mb-6">
                <Key className="w-6 h-6" />
                <h3 className="text-lg font-semibold text-white">API Kulcsok</h3>
              </div>
              <p className="text-sm text-slate-350 mb-4">
                A rendszer működéséhez elengedhetetlen egy valid LLM API kulcs. A NovaSwarm a Google Gemini modellekre épít, ez az egyedüli kötelező elem.
              </p>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Google Gemini API Kulcs (Kötelező) *</label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 mt-4">OpenRouter API Kulcs (Opcionális)</label>
                <input
                  type="password"
                  value={openRouterKey}
                  onChange={e => setOpenRouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition font-mono text-sm"
                />
                <p className="text-[10px] text-slate-500 mt-1">Alternatív modellek (pl. Claude, Llama) eléréséhez szükséges.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in space-y-5">
              <div className="flex items-center gap-3 text-blue-400 mb-6">
                <MessageSquare className="w-6 h-6" />
                <h3 className="text-lg font-semibold text-white">Telegram Integráció</h3>
              </div>
              <p className="text-sm text-slate-350 mb-4">
                Ha szeretnéd, hogy az ágenseid mobilon (Telegram) is elérjenek, és push üzeneteket küldjenek neked, állítsd be a bot tokenedet.
              </p>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Telegram Bot Token (Opcionális)</label>
                <input
                  type="password"
                  value={telegramToken}
                  onChange={e => setTelegramToken(e.target.value)}
                  placeholder="123456789:ABCDefghIJKL..."
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 mt-4">Telegram Chat ID (Opcionális)</label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={e => setTelegramChatId(e.target.value)}
                  placeholder="Csatorna vagy személyes azonosító (pl. 987654321)"
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition font-mono text-sm"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in space-y-5">
              <div className="flex items-center gap-3 text-amber-400 mb-6">
                <User className="w-6 h-6" />
                <h3 className="text-lg font-semibold text-white">Bemutatkozás & Kontextus</h3>
              </div>
              <p className="text-sm text-slate-350 mb-4">
                Írd le röviden, ki vagy és mik a preferenciáid. Az ágensek ezt a memóriába vésik, és így fognak kezelni.
              </p>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Neved vagy Beceneved</label>
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="pl. Gábor"
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500 transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 mt-4">Rövid bió és utasítások</label>
                <textarea
                  value={userBio}
                  onChange={e => setUserBio(e.target.value)}
                  rows={4}
                  placeholder="Fejlesztő vagyok, tegezz bátran. Főként React-ben kódolok és a precíz, lényegre törő válaszokat szeretem..."
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500 transition text-sm"
                />
                <p className="text-[10px] text-slate-500 mt-1">A rendszer ezt alapértelmezett direktívaként kezeli majd.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in space-y-5">
              <div className="flex items-center gap-3 text-purple-400 mb-6">
                <Sparkles className="w-6 h-6" />
                <h3 className="text-lg font-semibold text-white">Első Ágens Kiválasztása</h3>
              </div>
              <p className="text-sm text-slate-350 mb-4">
                Bár később bármennyi ágenst létrehozhatsz, válasszuk ki azt a személyiséget, aki a kezdetektől veled lesz!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(Object.entries(agentTemplates) as [keyof typeof agentTemplates, any][]).map(([key, tmpl]) => (
                  <div 
                    key={key}
                    onClick={() => setAgentType(key)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${agentType === key ? 'bg-purple-900/30 border-purple-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="text-3xl mb-2">{tmpl.avatar}</div>
                    <h4 className="font-bold text-white text-sm mb-1">{tmpl.name}</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3">
                      {tmpl.systemInstruction}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Ágensed megnevezése</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  placeholder="Adj nevet neki..."
                  className="w-full max-w-sm bg-slate-950 border border-slate-750 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-800/50 p-4 border-t border-slate-750 flex justify-between items-center">
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1 || loading}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${step === 1 ? 'opacity-0' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
          >
            Vissza
          </button>
          
          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-5 py-2.5 bg-white text-black hover:bg-slate-200 rounded-lg text-sm font-bold flex items-center gap-2 transition"
            >
              Tovább <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-purple-500/20"
            >
              {loading ? (
                <>Rendszer init...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Kész, Indítás!
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
