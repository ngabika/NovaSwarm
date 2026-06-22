import React, { useState } from "react";
import { 
  BookOpen, 
  RefreshCw, 
  Cpu, 
  Github, 
  GitPullRequest, 
  ShieldCheck, 
  Layers, 
  Brain, 
  Play, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";

interface DocsOtaProps {
  onRefreshState: () => void;
  language?: string;
  updateAvailable?: boolean;
  latestCommitInfo?: string;
}

export function DocsOta({ onRefreshState, language, updateAvailable, latestCommitInfo }: DocsOtaProps) {
  const [otaState, setOtaState] = useState<"idle" | "downloading" | "assembling" | "success" | "error">("idle");
  const [otaLog, setOtaLog] = useState("");
  const [gitDetails, setGitDetails] = useState("");

  const isHu = language === "hu";

  const t = {
    confirmMsg: isHu 
      ? "Biztosan indítod az 1.0-ás Over-The-Air szoftverfrissítést a GitHubról? Ez megszakítás nélkül megőrzi a megszerzett tudásbázist és memóriákat, majd automatikusan újraépíti és újraindítja a NovaSwarm szolgáltatást."
      : "Are you sure you want to download and install the 1.0 Over-The-Air software update from GitHub? This maintains your memory database intact and rebuilds + restarts the NovaSwarm service automatically.",
    stepFetch: isHu 
      ? "GitHub repó ellenőrzése és legfrissebb kódok lekérése (git fetch)..."
      : "Verifying GitHub repository and pulling latest source files (git fetch)...",
    stepAssemble: isHu 
      ? "Verziófrissítés sikeresen lehúzva! Alkalmazás újrafordítása (npm run build)..."
      : "Update pulled successfully! Recompiling application build (npm run build)...",
    stepSuccess: isHu 
      ? "Sikeres OTA frissítés! Az eddig megtanult memóriákat hiánytalanul importáltam az új 1.0-ás verzióba. A rendszer háttérszolgáltatása 3 másodpercen belül újraindul!"
      : "OTA Update successfully installed! Your existing memory database has been safely imported. The background services will restart inside 3 seconds!",
    stepDownloadError: isHu 
      ? "Hiba történt a GitHubról való letöltés közben."
      : "An error occurred while fetching source codes from GitHub.",
    stepNetworkError: isHu 
      ? "Frissítési kommunikációs hiba: "
      : "OTA Update communication exception: ",
    
    // UI static labels
    upperBadge: isHu ? "Active Knowledge Base & OTA Updates" : "Active Knowledge Base & OTA Updates",
    upperTitle: isHu ? "Belső Architektúra & Over-The-Air (OTA) Frissítő" : "Internal Architecture & Over-The-Air (OTA) Hub",
    upperDesc: isHu
      ? "Ezen a felületen keresztül a NovaSwarm és te is teljes betekintést nyerhetsz a rendszer belső működésébe. Ha a fejlesztőcsapattal új funkciókat toltok fel a GitHub repóba, egyetlen gombnyomással frissítheted a kiszolgálót adatvesztés nélkül!"
      : "Gain full insight into the internal operating principles of NovaSwarm. Keep your application updated with zero data loss or database wipes when push changes are published to your GitHub repository.",
    
    kbTitle: isHu ? "Ki és mi az a NovaSwarm? (Rendszerleírás és Működés)" : "Who & What is NovaSwarm? (System Architecture)",
    
    sec1Title: isHu ? "1. Többrétegű Ágens Architektúra (Multi-Agent)" : "1. Multi-Layer Agent Architecture",
    sec1Text: isHu
      ? "A NovaSwarm nem egy egyszerű chatbot, hanem egy **autonóm együttműködő ágensszövetség**. Két fő szerepkör irányítja a rendszert, akik folyamatosan ciklikusan kommunikálnak és szinkronizálják a feladatokat:"
      : "NovaSwarm is not just a simple interface; it is an **autonomous cooperative multi-agent alliance**. Two primary core experts coordinate system tasks seamlessly:",
    sec1Gabor: isHu 
      ? "Gábor (Agy / Swarm Leader): A kreatív stratéga és posztoló. Ő dönt a Telegram csatornára való kiküldésről, elemzi a piaci híreket, megálmodja a jövőt, és kártyákat hoz létre a Kanban táblán."
      : "Gabor (Mind / Swarm Leader): The creative strategist and publisher. Decides on Telegram broadcasts, digests market news, charts future pathways, and updates the Kanban board.",
    sec1Attila: isHu
      ? "Attila (Technikai Vezető / Developer Expert): Ő hajtja végre a technikai feladatokat, írja és elemzi az MCP szervereket, kezeli a helyi gép parancsait, és felügyeli a hardver épségét."
      : "Attila (Tech Lead / Developer Expert): Executes technical workflows, builds and programs Model Context Protocol (MCP) servers, manages shell scripting, and guards host health.",
    
    sec2Title: isHu ? "2. Gazdagép és szenzor hálózati integráció" : "2. Hardware and OS Sensor Interactivity",
    sec2Text: isHu
      ? "A háttérben futó Express backend közvetlen root hozzáféréssel bír a Linux Mint szerver gép /sys/class fájlrendszeréhez. Az ügynökök minden futási ciklusban (tick) beolvassák:"
      : "The underlying Express backend accesses diagnostics directly from the virtual or physical Linux Mint host filesystem `/sys/class`. Every single execution tick compiles:",
    sec2Temp: isHu 
      ? "CPU Hőmérséklet: Monitorozza a régi laptop hűtési képességét és túlmelegedés ellen véd."
      : "CPU Thermal Core: Measures temperature sensors to protect laptop cores from physical damage or heat throttling.",
    sec2Bat: isHu
      ? "Akkumulátor állapot és feszültség: Áramkimaradás esetén energiatakarékos módba kapcsolja a Swarmot és Telegram riasztást küld."
      : "Host Battery & Voltage: Automatically enables high-efficiency green-mode if utility grid failures or power outages occur.",
    sec2Disk: isHu
      ? "Tárhely és RAM szabad kapacitás: Megelőzi az elakadást és a merevlemez megtelését."
      : "System Storage & Memory: Evaluates disk capacities, log files volume, and RAM allocations to ensure continuous uptime.",
    sec2Usb: isHu
      ? "Lokális USB/PCI fizikai hardverek: Beolvassa a géphez csatlakoztatott eszközöket a fizikai valóság megértéséhez."
      : "Local Physical Interfaces: Maps active USB and PCI ports on the machine to interact with outer sensors.",
    
    sec3Title: isHu ? "3. Helyi Önfejlesztő és Javító Hurok (Self-Healing)" : "3. Autocoding & Self-Healing Loop",
    sec3Text: isHu
      ? "Az ágensek a gazdagépen képesek tetszőleges programokat futtatni és fájlokat módosítani. Ha a fordítóban (Linter/Compiler/Typescript) hiba lép fel, Attila automatikusan aktiválja az önjavító mechanizmust:"
      : "Agents can run diagnostic tasks and refactor code directly on the host machine. If there are syntax, lint, compiler, or TypeScript exceptions, the Self-Heal Auditor:",
    sec3Item1: isHu 
      ? "Kiolvassa a hibaüzenetet és azonosítja a hibás fájlt, majd megkeresi a pontos sorokat."
      : "Parses target error messages to extract trace details and match exact syntax issues.",
    sec3Item2: isHu
      ? "Egy dedikált Gemini kódgeneráló hívással kijavítja a szintaktikai hibát."
      : "Triggers high-accuracy Gemini coding reasoning models to synthesize programmatic fixes.",
    sec3Item3: isHu
      ? "Háttérben lefordítja és teszteli az új kódot. Ha a build sikeres, élesíti és a hangszórón keresztül bejelenti ténykedését!"
      : "Compiles code locally and evaluates output. Upon success, deploys code to production and announces completion via physical speaker speech synthesis!",
    
    sec4Title: isHu ? "4. Model Context Protocol (MCP) és Skillek" : "4. Model Context Protocol (MCP) & Agentic Skills",
    sec4Text: isHu
      ? "A rendszer kiterjeszthető külső és belső standardizált API csatornákkal. A rendszer rendelkezik előre konfigurált Workspace Google-szolgáltatásokkal (Gmail, Calendar, Photos, Ads, Business Profile) és pénzügyi Binance Live Exchange MCP csatolóval is!"
      : "Equipped with next-generation standardized data buses. Fully integrated with Workspace solutions (Gmail, Drive, Docs, Calendar) and high-performance financial interfaces such as Binance Live Exchange MCP tools!",
    
    sec5Title: isHu ? "5. Örökké tartó memória (Durable Memory Core)" : "5. Persistent Long-Term Memory (Durable Memory Core)",
    sec5Text: isHu
      ? "A NovaSwarm minden gondolata, sikeres kódjavítása és megszerzett tudása a novaswarm-db.json adatbázisban tárolódik. Ez a fájl sosem törlődik ki az Over-The-Air (OTA) frissítések során, így a rendszer folyamatosan okosodik!"
      : "Any generated memory, custom parameters, or healed files are safely hosted in the persistent backend `novaswarm-db.json`. These metrics are entirely preserved from git cleanup operations to guarantee continuity!",
    
    gitTitle: isHu ? "Szoftver Verzió & GitHub Kapcsolat" : "System Version & Source Connection",
    gitVer: isHu ? "Aktuális verzió" : "Current Active Version",
    gitBranch: isHu ? "OTA Frissítési ág:" : "Target Update Branch:",
    gitProtect: isHu ? "Adatbázis mag védelme:" : "Database Memory Shield:",
    gitLocked: isHu ? "ZÁROLT / AKTÍV" : "ACTIVE / SHIELDED",
    gitType: isHu ? "Verziókezelés típusa:" : "Deploy Repository Engine:",
    
    otaPanelTitle: isHu ? "Over-The-Air (OTA) Kezelőpult" : "Over-The-Air (OTA) Controls",
    otaDesc: isHu
      ? "Ha szoftvert fejlesztesz vagy frissítesz a gépeden, és azt feltolod a GitHub repóba, itt tudod egyszerűen lehúzni és élesíteni a frissítéseket a kiszolgálón."
      : "If you push adjustments or features to your repository, trigger this deployment system to execute Git Pull and re-initiate NovaSwarm directly within the terminal.",
    otaIdle: isHu ? "A rendszer várakozik. Nyomd meg a lenti gombot a frissítések lekéréséhez." : "Status idle. Press the software trigger button below to synchronize codebases.",
    otaDownloading: isHu ? "GitHub kód letöltése..." : "Downloading codebase from GitHub...",
    otaRebuilding: isHu ? "Újraépítés (Rebuilding) folyamatban..." : "Assembling & building applications in progress...",
    otaSuccessTitle: isHu ? "Frissítés sikeresen befejeződött!" : "Over-the-Air Update Completed successfully!",
    otaErrorTitle: isHu ? "OTA Frissítési Hiba!" : "OTA Update Failure!",
    otaBtn: isHu ? "Szoftver OTA Frissítés Letöltése (Közvetlen Pull)" : "Pull and Deploy Over-The-Air Update (Git Pull)"
  };

  const handleStartOta = async () => {
    if (!confirm(t.confirmMsg)) {
      return;
    }

    setOtaState("downloading");
    setOtaLog(t.stepFetch);
    
    try {
      const res = await fetch("/api/ota-update", { method: "POST" });
      const data = await res.json();
      
      if (data.success) {
        setOtaState("assembling");
        setOtaLog(t.stepAssemble);
        setGitDetails(data.gitLog || "");
        
        setTimeout(() => {
          setOtaState("success");
          setOtaLog(t.stepSuccess);
          onRefreshState();
        }, 4000);
      } else {
        setOtaState("error");
        setOtaLog(data.error || t.stepDownloadError);
      }
    } catch (err: any) {
      setOtaState("error");
      setOtaLog(t.stepNetworkError + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Info Banner */}
      <div className="bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-800 border border-indigo-900/60 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5 shadow-lg">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-900/80 text-indigo-400 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider font-mono border border-indigo-800/40">
              {t.upperBadge}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-sans mt-2">
            {t.upperTitle}
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            {t.upperDesc}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Part: Knowledge Base (The NovaSwarm about itself) */}
        <div className="lg:col-span-7 space-y-6 bg-slate-800 border border-slate-755 rounded-2xl p-6 shadow-md">
          <h3 className="text-md font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-700/60 font-sans">
            <BookOpen className="w-5 h-5 text-indigo-455" />
            {t.kbTitle}
          </h3>

          <div className="space-y-5 text-slate-300 text-xs leading-relaxed max-h-[600px] overflow-y-auto pr-2">
            {/* Sec 1 */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5 font-sans">
                <Layers className="w-4 h-4 text-emerald-455" />
                {t.sec1Title}
              </h4>
              <p>
                {t.sec1Text}
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-350">
                <li>
                  <strong className="text-slate-200">{isHu ? "Gábor (Agy / Swarm Leader):" : "Gabor (Mind / Swarm Leader):"}</strong> {isHu ? "A kreatív stratéga és posztoló. Ő dönt a Telegram csatornára való kiküldésről, elemzi a piaci híreket, megálmodja a jövőt, és kártyákat hoz létre a Kanban táblán." : "The creative strategist and publisher. Decides on Telegram broadcasts, digests market news, charts future pathways, and updates the Kanban board."}
                </li>
                <li>
                  <strong className="text-slate-200">{isHu ? "Attila (Technikai Vezető / Developer Expert):" : "Attila (Tech Lead / Developer Expert):"}</strong> {isHu ? "Ő hajtja végre a technikai feladatokat, írja és elemzi az MCP szervereket, kezeli a helyi gép parancsait, és felügyeli a hardver épségét." : "Executes technical workflows, builds and programs Model Context Protocol (MCP) servers, manages shell scripting, and guards host health."}
                </li>
              </ul>
            </div>

            {/* Sec 2 */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5 font-sans">
                <Cpu className="w-4 h-4 text-amber-455" />
                {t.sec2Title}
              </h4>
              <p>
                {t.sec2Text}
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-350">
                <li>
                  <strong className="text-slate-250">{isHu ? "CPU Hőmérséklet:" : "CPU Thermal Core:"}</strong> {isHu ? "Monitorozza a régi laptop hűtési képességét és túlmelegedés ellen véd." : "Measures temperature sensors to protect laptop cores from physical damage or heat throttling."}
                </li>
                <li>
                  <strong className="text-slate-250">{isHu ? "Akkumulátor állapot és feszültség:" : "Host Battery & Voltage:"}</strong> {isHu ? "Áramkimaradás esetén energiatakarékos módba kapcsolja a Swarmot és Telegram riasztást küld." : "Automatically enables high-efficiency green-mode if utility grid failures or power outages occur."}
                </li>
                <li>
                  <strong className="text-slate-250">{isHu ? "Tárhely és RAM szabad kapacitás:" : "System Storage & Memory:"}</strong> {isHu ? "Megelőzi az elakadást és a merevlemez megtelését." : "Evaluates disk capacities, log files volume, and RAM allocations to ensure continuous uptime."}
                </li>
                <li>
                  <strong className="text-slate-250">{isHu ? "Lokális USB/PCI fizikai hardverek:" : "Local Physical Interfaces:"}</strong> {isHu ? "Beolvassa a géphez csatlakoztatott eszközöket a fizikai valóság megértéséhez." : "Maps active USB and PCI ports on the machine to interact with outer sensors."}
                </li>
              </ul>
            </div>

            {/* Sec 3 */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5 font-sans">
                <Brain className="w-4 h-4 text-indigo-400" />
                {t.sec3Title}
              </h4>
              <p>
                {t.sec3Text}
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-350">
                <li>{t.sec3Item1}</li>
                <li>{t.sec3Item2}</li>
                <li>{t.sec3Item3}</li>
              </ul>
            </div>

            {/* Sec 4 */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5 font-sans">
                <Terminal className="w-4 h-4 text-purple-400" />
                {t.sec4Title}
              </h4>
              <p>
                {t.sec4Text}
              </p>
            </div>

            {/* Sec 5 */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5 font-sans">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {t.sec5Title}
              </h4>
              <p>
                {t.sec5Text}
              </p>
            </div>
          </div>
        </div>

        {/* Right Part: Over-The-Air GitHub Updater control center */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Version and Status box */}
          <div className="bg-slate-800 border border-slate-755 rounded-2xl p-5 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-700/60 font-sans">
              <Github className="w-4 h-4 text-indigo-400" />
              {t.gitTitle}
            </h3>

            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-450 uppercase font-mono block">{t.gitVer}</span>
                <span className="text-xl font-extrabold text-indigo-400 font-mono">v2.0.3 (Swarm Command &amp; Control Release)</span>
              </div>
              <span className="bg-emerald-950/60 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded border border-emerald-800/40 font-mono uppercase">
                PRODUCTION STABLE
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">{t.gitType}</span>
                <span className="font-mono text-slate-200">Git Over-The-Air (OTA)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.gitProtect}</span>
                <span className="font-mono text-emerald-400 flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {t.gitLocked}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t.gitBranch}</span>
                <span className="font-mono text-slate-200">main / master</span>
              </div>
            </div>
          </div>

          {/* Update Action Panel */}
          <div className="bg-slate-800 border border-slate-755 rounded-2xl p-5 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-700/60 font-sans">
              <RefreshCw className="w-4 h-4 text-indigo-400" />
              {t.otaPanelTitle}
            </h3>

            <p className="text-xs text-slate-350 leading-relaxed">
              {t.otaDesc}
            </p>

            {updateAvailable && (
              <div className="bg-emerald-950/30 p-3 rounded-lg border border-emerald-900/60 mb-3 animate-pulse">
                <p className="text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 mb-1">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Új verzió letölthető!
                </p>
                <p className="text-[10px] text-center text-emerald-300 font-mono">
                  {latestCommitInfo}
                </p>
              </div>
            )}

            {otaState === "idle" && (
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center py-6 text-xs text-slate-400">
                {t.otaIdle}
              </div>
            )}

            {otaState === "downloading" && (
              <div className="bg-slate-900 p-4 rounded-xl border border-blue-900/40 space-y-3">
                <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {t.otaDownloading}
                </div>
                <p className="text-[11px] font-mono text-slate-300">
                  {otaLog}
                </p>
              </div>
            )}

            {otaState === "assembling" && (
              <div className="bg-slate-900 p-4 rounded-xl border border-amber-900/40 space-y-3">
                <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {t.otaRebuilding}
                </div>
                <p className="text-[11px] font-mono text-slate-300">
                  {otaLog}
                </p>
              </div>
            )}

            {otaState === "success" && (
              <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/60 space-y-3">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  {t.otaSuccessTitle}
                </div>
                <p className="text-[11px] text-slate-300">
                  {otaLog}
                </p>
                {gitDetails && (
                  <pre className="text-[9px] font-mono text-slate-400 bg-slate-950 p-2 rounded max-h-[100px] overflow-y-auto whitespace-pre-wrap">
                    {gitDetails}
                  </pre>
                )}
              </div>
            )}

            {otaState === "error" && (
              <div className="bg-red-950/20 p-4 rounded-xl border border-red-900/50 space-y-2">
                <div className="flex items-center gap-2 text-xs text-red-500 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  {t.otaErrorTitle}
                </div>
                <div className="text-[11px] font-mono text-red-300 bg-slate-950 p-2.5 rounded max-h-[120px] overflow-y-auto whitespace-pre-wrap">
                  {otaLog}
                </div>
              </div>
            )}

            <button
              id="btn-start-ota-process"
              disabled={otaState === "downloading" || otaState === "assembling"}
              onClick={handleStartOta}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-650 disabled:opacity-50 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-md transition active:scale-98 cursor-pointer"
            >
              <GitPullRequest className="w-4 h-4 animate-pulse" />
              {t.otaBtn}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
