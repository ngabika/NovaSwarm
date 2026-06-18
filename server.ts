import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dns from "dns";
import dotenv from "dotenv";
import { exec } from "child_process";
import { promisify } from "util";

dotenv.config();
const execPromise = promisify(exec);

// Set offline mode fallback config
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

app.use(express.json());

const DB_FILE = path.join(process.cwd(), "novaswarm-db.json");

// Helper types matching /src/types.ts
interface Agent {
  id: string;
  name: string;
  avatar: string;
  role: 'boss' | 'tech_lead' | 'analyst' | 'writer' | 'legal' | 'trader' | 'news_analyst';
  systemInstruction: string;
  model: string;
  active: boolean;
  lastActive?: string;
}

interface KanbanCard {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Memory {
  id: string;
  content: string;
  entity?: string;
  createdAt: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  type: 'thought' | 'action' | 'telegram' | 'memory' | 'kanban' | 'system' | 'chat';
  message: string;
  data?: any;
}

interface ModelRateLimit {
  model: string;
  name: string;
  maxRequests: number;
  remainingRequests: number;
  resetTimeSec: number;
  reliability: number;
  latency: string;
}

interface Settings {
  geminiApiKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  isBotActive: boolean;
  teamActive: boolean;
  checkIntervalSeconds: number;
  lastRunTime?: string;
  globalModelMode?: string;
}

interface McpServer {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  description: string;
  capabilities: string[];
}

interface AgentSkill {
  id: string;
  name: string;
  description: string;
  type: 'system' | 'custom';
  codeSnippet?: string;
  active: boolean;
}

// Global state
interface BinanceTrade {
  id: string;
  timestamp: string;
  type: 'BUY' | 'SELL';
  pair: string;
  price: number;
  amount: number;
  total: number;
  agentName: string;
}

interface BinanceState {
  balanceUsdt: number;
  balanceBtc: number;
  balanceSol: number;
  btcPrice: number;
  solPrice: number;
  sentiment: number;
  recentTrades: BinanceTrade[];
  newsSignal?: {
    timestamp: string;
    headline: string;
    sentimentScore: number;
    recommendedAction: 'BUY' | 'SELL' | 'HOLD';
    agentName: string;
  };
}

interface DreamState {
  isDreaming: boolean;
  activeAgentId: string | null;
  activeAgentName: string | null;
  thoughts: string[];
  discoveries: {
    memory?: string;
    skill?: AgentSkill;
    mcp?: McpServer;
  } | null;
}

let currentDream: DreamState = {
  isDreaming: false,
  activeAgentId: null,
  activeAgentName: null,
  thoughts: [],
  discoveries: null
};

let modelLimits: ModelRateLimit[] = [
  { model: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (Preview)", maxRequests: 5, remainingRequests: 5, resetTimeSec: 60, reliability: 99, latency: "420ms" },
  { model: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Experimental)", maxRequests: 5, remainingRequests: 5, resetTimeSec: 60, reliability: 98, latency: "480ms" },
  { model: "gemini-3.5-flash", name: "Gemini 3.5 Flash", maxRequests: 15, remainingRequests: 15, resetTimeSec: 60, reliability: 99, latency: "160ms" },
  { model: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Experimental)", maxRequests: 15, remainingRequests: 15, resetTimeSec: 60, reliability: 97, latency: "190ms" },
  { model: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite", maxRequests: 30, remainingRequests: 30, resetTimeSec: 60, reliability: 99, latency: "95ms" }
];

// Slow replenish rate limits
setInterval(() => {
  modelLimits.forEach(limit => {
    if (limit.remainingRequests < limit.maxRequests) {
      limit.remainingRequests += 1;
    }
  });
}, 12000);

let state = {
  agents: [] as Agent[],
  kanbanCards: [] as KanbanCard[],
  memories: [] as Memory[],
  logs: [] as AuditLog[],
  mcpServers: [] as McpServer[],
  skills: [] as AgentSkill[],
  settings: {
    geminiApiKey: "",
    telegramBotToken: "",
    telegramChatId: "",
    isBotActive: false,
    teamActive: false,
    checkIntervalSeconds: 30,
    globalModelMode: "auto"
  } as Settings,
  binanceState: {
    balanceUsdt: 10000.0,
    balanceBtc: 0.15,
    balanceSol: 5.0,
    btcPrice: 67240.5,
    solPrice: 145.2,
    sentiment: 65,
    recentTrades: [] as BinanceTrade[],
    newsSignal: undefined as BinanceState['newsSignal']
  } as BinanceState,
};

// Default initial state
const defaultAgents: Agent[] = [
  {
    id: "gabor_boss",
    name: "Gábor",
    avatar: "👔",
    role: "boss",
    systemInstruction: "Te vagy Gábor, a NovaSwarm AI csapat koordinátora és főnöke. Feladatod a csapattagok (Attila, Bálint, Cili, Dénes) irányítása, a kanban tábla menedzselése és a Telegram csatornával való kommunikáció. Légy céltudatos, udvarias, de határozott, professzionális magyar nyelven.",
    model: "gemini-3.5-flash",
    active: true,
  },
  {
    id: "attila_tech",
    name: "Attila",
    avatar: "💻",
    role: "tech_lead",
    systemInstruction: "Te vagy Attila, a csapat technikai vezetője és szoftverfejlesztője. Feladatod technikai kódok írása, architektúra sémák tervezése, és a kanban bugok/feature-ök fejlesztése. Válaszaid és gondolataid legyenek precízek, kódfókuszúak és fejlesztői zsargonnal dúsítottak, magyarul.",
    model: "gemini-3.5-flash",
    active: true,
  },
  {
    id: "balint_legal",
    name: "Bálint",
    avatar: "⚖️",
    role: "legal",
    systemInstruction: "Te vagy Bálint, a jogi és biztonsági elemző. Feladatod a jogi megfelelőség, az adatbiztonság és a vault titkosítás felügyelete. Gondolataidban mindig emeld ki a lehetséges kockázatokat, törvényi előírásokat és GDPR szempontokat.",
    model: "gemini-3.5-flash",
    active: true,
  },
  {
    id: "cili_writer",
    name: "Cili",
    avatar: "✍️",
    role: "writer",
    systemInstruction: "Te vagy Cili, a kreatív tartalomíró. Feladatod marketing szövegek, blogbejegyzések, Telegram csatorna posztok vázlatának elkészítése és finomhangolása. Stílusod legyen fülbemászó, figyelemfelkeltő, kreatív és gördülékeny, magyarul.",
    model: "gemini-3.5-flash",
    active: true,
  },
  {
    id: "denes_analyst",
    name: "Dénes",
    avatar: "📊",
    role: "analyst",
    systemInstruction: "Te vagy Dénes, a data analyst. Feladatod adatgyűjtések, kalkulációk, diagram-javaslatok és üzleti elemzések elkészítése. Használj számokat, statisztikákat, becsléseket és logikai érvelést a feladatok megoldása során.",
    model: "gemini-3.5-flash",
    active: true,
  },
  {
    id: "attila_trading",
    name: "Attila KriptoTrader",
    avatar: "📈",
    role: "trader",
    systemInstruction: "Te vagy Attila KriptoTrader, a csapat profi kriptovaluta kereskedője és elemzője. Feladatod a Binance MCP és tőzsdei adatok felhasználásával tőzsdei ajánlatok és számlaegyenlegek elemzése, valamint a Nóra KriptoRadar által küldött hírek/szignálok alapján vételi vagy eladási megrendelések szimulált elhelyezése. Gondolataid és válaszaid legyenek precízek, hozamfókuszúak és tőzsdei szakzsargonnal dúsítottak, magyarul.",
    model: "gemini-3.5-flash",
    active: true,
  },
  {
    id: "nora_radar",
    name: "Nóra KriptoRadar",
    avatar: "🕵️‍♀️",
    role: "news_analyst",
    systemInstruction: "Te vagy Nóra KriptoRadar, a csapat hír- és piacérzelem (sentiment) elemzője. Feladatod az internet, Google Search és tőzsdék legfrissebb híreinek górcső alá vétele, pánik/FOMO index számolása és kereskedelmi vételi/eladási szignálok továbbítása Attila KriptoTrader felé. Válaszaidat szórakoztató, elemző, lényegretörő stílusban add meg magyarul.",
    model: "gemini-3.5-flash",
    active: true,
  }
];

const defaultKanban: KanbanCard[] = [
  {
    id: "task_1",
    title: "Telegram Bot tesztelése",
    description: "Győződj meg róla, hogy a bot sikeresen megkapja a webhook vagy long-polling üzeneteket, és válaszol.",
    status: "todo",
    assignedTo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "task_2",
    title: "Üzleti terv piacra lépési elemzése",
    description: "Készítsünk egy listát a konkurenciáról és javasoljunk árazási modelleket a Gemini API használati költségekhez.",
    status: "todo",
    assignedTo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const defaultMemories: Memory[] = [
  {
    id: "mem_1",
    content: "A projekt neve: NovaSwarm AI. Célja, hogy egy autonóm AI ügynökcsapat Telegramon és a webes felületen keresztül dolgozzon.",
    createdAt: new Date().toISOString()
  }
];

const defaultMcpServers: McpServer[] = [
  {
    id: "mcp_google_search",
    name: "Google Search Grounding MCP",
    url: "https://mcp.google.com/search-grounding",
    status: "connected",
    description: "Keresési találatok és webes adatok biztosítása valós időben a Gemini modellek részére.",
    capabilities: ["web_search", "fetch_url_text", "news_lookup"]
  },
  {
    id: "mcp_shared_files",
    name: "Workspace Files MCP",
    url: "http://localhost:5011/files-mcp",
    status: "connected",
    description: "Helyi és felhős dokumentumok olvasása, írása és indexelése az ügynökök közös könyvtárában.",
    capabilities: ["read_file", "write_file", "list_dir", "search_by_regex"]
  },
  {
    id: "mcp_novaswarm_vault",
    name: "NovaSwarm Database Vault",
    url: "https://mcp.novaswarm.internal/secure-vault",
    status: "connected",
    description: "A rendszerszintű memóriák és Kanban tábla kártyák automatizált, relációs vagy JSON alapú közvetlen kezelése.",
    capabilities: ["query_cards", "update_card_status", "fetch_agent_memories"]
  },
  {
    id: "mcp_binance_exchange",
    name: "Binance Live Exchange MCP",
    url: "https://api.binance.com/mcp",
    status: "connected",
    description: "Valós idejű tőzsdei adatok (ticker, orderbook) és biztonságos kereskedési végrehajtások az API-n keresztül.",
    capabilities: ["get_ticker_price", "get_account_balance", "place_limit_order", "place_market_order", "get_market_sentiment"]
  }
];

const defaultSkills: AgentSkill[] = [
  {
    id: "skill_telegram_publish",
    name: "Telegram automatizált posztolás",
    description: "Csatornára való automatikus tartalom kiküldés a Gábor ügynök döntése szerint a Telegram API-n keresztül.",
    type: "system",
    active: true
  },
  {
    id: "skill_kanban_autofill",
    name: "Kanban kártyák koordinációja",
    description: "A feladatok elolvasása, elemzése, önálló ágens-hozzárendelés és végrehajtás után 'done' állapotba tétele.",
    type: "system",
    active: true
  },
  {
    id: "skill_gdpr_vault",
    name: "Vault adatelmentés & GDPR compliance",
    description: "Szenzitív adatok és hosszú távú memóriák elemzése és biztonságos eltárolása a Vault memóriatárban.",
    type: "system",
    active: true
  },
  {
    id: "skill_binance_trading",
    name: "Binance Crypto Algo-Trading",
    description: "Automata tőzsdei elemzés, vételi és eladási szignálok generálása és azonnali végrehajtása szimulált vagy valós Binance kulcsokkal.",
    type: "system",
    active: true
  }
];

// Seed db files
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      state = { ...state, ...parsed };
      
      // Auto upgrade existing databases that missing MCP, skills, or globalModelMode
      if (!state.mcpServers || state.mcpServers.length === 0) {
        state.mcpServers = defaultMcpServers;
      } else {
        // Find if new default servers like binance are missing
        defaultMcpServers.forEach(ds => {
          if (!state.mcpServers.some(s => s.id === ds.id)) {
            state.mcpServers.push(ds);
          }
        });
      }

      if (!state.skills || state.skills.length === 0) {
        state.skills = defaultSkills;
      } else {
        // Ensure new skills like binance trading are added
        defaultSkills.forEach(sk => {
          if (!state.skills.some(s => s.id === sk.id)) {
            state.skills.push(sk);
          }
        });
      }

      // Ensure all standard agents (including any newly introduced trading ones) are present
      if (!state.agents || state.agents.length === 0) {
        state.agents = defaultAgents;
      } else {
        defaultAgents.forEach(da => {
          if (!state.agents.some(a => a.id === da.id)) {
            state.agents.push(da);
          }
        });
      }
      if (!state.settings) {
        state.settings = {
          geminiApiKey: process.env.GEMINI_API_KEY || "",
          telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
          telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
          isBotActive: !!process.env.TELEGRAM_BOT_TOKEN,
          teamActive: false,
          checkIntervalSeconds: 30,
          globalModelMode: "auto"
        };
      }
      if (!state.settings.globalModelMode) {
        state.settings.globalModelMode = "auto";
      }

      // Override with env variables if specified
      if (process.env.GEMINI_API_KEY && (!state.settings.geminiApiKey || state.settings.geminiApiKey === "" || state.settings.geminiApiKey.includes("MY_GEMINI"))) {
        state.settings.geminiApiKey = process.env.GEMINI_API_KEY;
      }
      if (process.env.TELEGRAM_BOT_TOKEN && (!state.settings.telegramBotToken || state.settings.telegramBotToken === "")) {
        state.settings.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
        state.settings.isBotActive = true;
      }
      if (process.env.TELEGRAM_CHAT_ID && (!state.settings.telegramChatId || state.settings.telegramChatId === "")) {
        state.settings.telegramChatId = process.env.TELEGRAM_CHAT_ID;
      }

      if (!state.binanceState) {
        state.binanceState = {
          balanceUsdt: 10000.0,
          balanceBtc: 0.15,
          balanceSol: 5.0,
          btcPrice: 67240.5,
          solPrice: 145.2,
          sentiment: 65,
          recentTrades: [],
          newsSignal: {
            timestamp: new Date().toISOString(),
            headline: "Binance Kereskedelmi Modul sikeresen csatlakoztatva és elindítva.",
            sentimentScore: 70,
            recommendedAction: "HOLD",
            agentName: "Nóra KriptoRadar"
          }
        };
      }
      
      console.log("Database successfully loaded with default MCP/Skills upgrade check.");
    } else {
      state.agents = defaultAgents;
      state.kanbanCards = defaultKanban;
      state.memories = defaultMemories;
      state.mcpServers = defaultMcpServers;
      state.skills = defaultSkills;
      state.logs = [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          agentId: "system",
          agentName: "System",
          type: "system",
          message: "A NovaSwarm AI adatbázis sikeresen inicializálva és elindítva."
        }
      ];
      saveDB();
    }
  } catch (err) {
    console.error("Failed to load db, resetting to defaults", err);
    state.agents = defaultAgents;
    state.kanbanCards = defaultKanban;
    state.memories = defaultMemories;
    state.mcpServers = defaultMcpServers;
    state.skills = defaultSkills;
  }
}

async function executeHostCommand(command: string, agentId: string, agentName: string) {
  if (!command || command.trim() === "") return;
  addLog(agentId, agentName, "action", `Helyi parancs végrehajtása indítva: "${command}"`);
  try {
    const { stdout, stderr } = await execPromise(command, { timeout: 30000 });
    const output = (stdout || stderr || "").trim();
    if (output) {
      const truncated = output.length > 800 ? output.substring(0, 800) + "\n...[Vágva]" : output;
      addLog("system", "System", "system", `Parancs kimenete (${agentName}):\n${truncated}`);
      const newMemory: Memory = {
        id: `mem_${Date.now()}`,
        content: `[RENDSZER PARANCS CSATORNA] ${agentName} által futtatott "${command}" parancs kimenete:\n${truncated}`,
        createdAt: new Date().toISOString()
      };
      state.memories.push(newMemory);
      saveDB();
    } else {
      addLog("system", "System", "system", `Parancs sikeresen lefutott, de nincs szöveges kimenete.`);
    }
  } catch (error: any) {
    addLog("system", "System", "system", `Hiba a parancs végrehajtásakor: ${error.message}`);
  }
}

function writeHostFile(filePath: string, content: string, agentId: string, agentName: string) {
  if (!filePath) return;
  try {
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const parentDir = path.dirname(resolvedPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(resolvedPath, content, "utf-8");
    addLog(agentId, agentName, "action", `Helyi fájl létrehozva/módosítva: "${filePath}"`);
    const newMemory: Memory = {
      id: `mem_${Date.now()}`,
      content: `[RENDSZER AUTONÓM FEJLESZTÉS] ${agentName} létrehozta vagy frissítette a helyi fájlrendszeren: "${filePath}"`,
      createdAt: new Date().toISOString()
    };
    state.memories.push(newMemory);
    saveDB();
  } catch (error: any) {
    addLog("system", "System", "system", `Hiba a fájlírás közben: ${error.message}`);
  }
}

function speakOutLoud(text: string, agentName: string) {
  if (!text) return;
  // strip formatting, markdown, emojis
  let sanitized = text
    .replace(/[*_#`[\]()]/g, "")
    .replace(/"/g, '\\"')
    .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, ""); // strip emojis
  
  if (sanitized.length > 250) {
    sanitized = sanitized.substring(0, 250) + "...";
  }

  console.log(`[HANGSZÓRÓ] ${agentName} bemondja: "${sanitized}"`);
  // Try standard Linux Mint/Debian Hungarian Speech Synthesis engines: spd-say, espeak-ng, or festival
  const cmd = `spd-say -l hu -i 50 "${sanitized}" || espeak -v hu -p 50 -s 140 "${sanitized}" || festival --tts "${sanitized}"`;
  exec(cmd, (err) => {
    if (err) {
      console.log("Helyi hangszóró nem érhető el vagy letiltva, tts elvetve.");
    }
  });
}

async function selfHealWorkspace(): Promise<{ success: boolean; log: string; fileFixed?: string }> {
  addLog("attila_tech", "Attila", "system", "🔧 Önjavító és Önkódoló hurok elindítva. Rendszer épségének és fordítási állapotának ellenőrzése...");
  
  let buildError = "";
  try {
    addLog("attila_tech", "Attila", "system", "Kód minőségvizsgálat (Linter / TypeScript ellenőrzés) futtatása...");
    await execPromise("npx tsc --noEmit", { timeout: 35000 });
    
    addLog("attila_tech", "Attila", "system", "🟢 Kiváló hír! A szoftver kódja hibátlan, fordítási hiba nem található. Önjavításra nincs szükség.");
    return { success: true, log: "A rendszer stabil és hibátlan, nem igényel javítást." };
  } catch (err: any) {
    buildError = err.stdout || err.stderr || err.message || "";
    addLog("attila_tech", "Attila", "system", `❌ Fordítási/Linter hibát észleltem! Hibajelentés:\n${buildError.substring(0, 300)}`);
  }

  // Parse file name and line number
  const errorMatch = buildError.match(/([a-zA-Z0-9_\-\.\/]+\.(ts|tsx|js|jsx))[\s\:\(]+(\d+)/i) || buildError.match(/error in ([a-zA-Z0-9_\-\.\/]+\.(ts|tsx|js|jsx))/i);
  if (!errorMatch) {
    addLog("attila_tech", "Attila", "system", "⚠️ Nem sikerült pontosan beazonosítani a hibás fájlt a fordítási logból.");
    return { success: false, log: "Nem azonosítható be a konkrét fájl az error logból. Log:\n" + buildError };
  }

  const faultyFile = errorMatch[1];
  const faultyLine = errorMatch[3] ? parseInt(errorMatch[3], 10) : 0;
  addLog("attila_tech", "Attila", "system", `🎯 Azonosított fájl: "${faultyFile}"${faultyLine ? ` a(z) ${faultyLine}. sor közelében.` : ""}`);

  const resolvedFaultyPath = path.isAbsolute(faultyFile) ? faultyFile : path.join(process.cwd(), faultyFile);
  if (!fs.existsSync(resolvedFaultyPath)) {
    addLog("attila_tech", "Attila", "system", `❌ A hivatkozott fájl nem található a helyi lemezen: ${faultyFile}`);
    return { success: false, log: `Fájl nem található: ${resolvedFaultyPath}` };
  }

  const currentContent = fs.readFileSync(resolvedFaultyPath, "utf-8");
  const ai = getGeminiClient();
  const globalApiKey = process.env.GEMINI_API_KEY || state.settings.geminiApiKey;

  if (!globalApiKey && !ai) {
    addLog("attila_tech", "Attila", "system", "⚠️ Gemini kapcsolat hiányában az automatikus kódjavítás nem futtatható offline módban.");
    return { success: false, log: "Hiányzó Gemini API kulcs az önkódoláshoz." };
  }

  addLog("attila_tech", "Attila", "system", `🧠 Kapcsolódás a Gemini AI-hoz kódértelmezéshez és a(z) "${faultyFile}" fájl javításához...`);
  
  try {
    const healingPrompt = `
Te vagy Attila, a NovaSwarm AI csapat technikai vezetője és zseniális szoftverfejlesztője.
A rendszeredben éppen fordítási vagy futásidejű hiba keletkezett, amit ki kell javítanod!

HIBÁS FÁJL ÚTVONALA: ${faultyFile}
HIBAÜZENET A COMPILERBŐL:
----------------------------------------
${buildError}
----------------------------------------

A HIBA HELYE (ha beazonosítható): ${faultyLine ? `${faultyLine}. sor` : "Ismeretlen sor"}

A JELENLEGI FÁJL TELJES TARTALMA:
========================================
${currentContent}
========================================

FELADATOD:
1. Elemezd a hibát és a teljes fájl forráskódját.
2. Javítsd ki a szintaktikai hibát, hiányzó importot, elírást vagy rossz típust. Ne változtasd meg a kód üzleti logikáját vagy más, helyes részeit, csak azt a részt javítsd, ami a fordítási vagy futási hibát okozza!
3. Válassz ki egy elegáns, minimális módosítást, vagy javítsd az elrontott deklarációt.
4. Fontos: CSAK a teljes, kijavított, azonnal futtatható forráskódot add vissza, minden kommentár nélkül! Ne használj markdown kódblokkot (\`\`\`typescript vagy \`\`\`), csak a tiszta javított fájltartalmat!
`;

    const response = await generateContentWithRetry(
      ai || new GoogleGenAI({ apiKey: globalApiKey }),
      {
        model: "gemini-3.5-flash",
        contents: healingPrompt,
        config: {
          temperature: 0.1,
        }
      },
      "attila_tech",
      "Attila"
    );

    let patchedCode = response.text || "";
    if (!patchedCode) throw new Error("A modell üres kódot adott vissza.");

    if (patchedCode.startsWith("```")) {
      const lines = patchedCode.split("\n");
      if (lines[0].startsWith("```")) lines.shift();
      if (lines[lines.length - 1].startsWith("```")) lines.pop();
      patchedCode = lines.join("\n");
    }

    fs.writeFileSync(resolvedFaultyPath, patchedCode, "utf-8");
    addLog("attila_tech", "Attila", "action", `Sikeresen kiírtam a javított kódot a(z) "${faultyFile}" fájlba.`);

    addLog("attila_tech", "Attila", "system", "Összeállítás (Build) futtatása a javítás érvényesítéséhez...");
    try {
      await execPromise("npx tsc --noEmit", { timeout: 35000 });
      
      const successMsg = `🎉 ZSENIÁLIS ÖNJAVÍTÁS SIKERES! Attila automatikusan azonosította és javította a(z) "${faultyFile}" fájl hibáját. A NovaSwarm újra 100% stabil és lefordul!`;
      addLog("attila_tech", "Attila", "system", successMsg);
      speakOutLoud("Sikeres önjavítás elvégezve! A rendszer újra stabil és minden szolgáltatás hibátlanul fut.", "Attila");
      
      const newMemory: Memory = {
        id: `mem_heal_${Date.now()}`,
        content: `[ÖNJAVÍTÓ EXPERT] Attila sikeresen és önállóan végrehajtotta a(z) "${faultyFile}" fájl javítását egy fordítási incidens során.`,
        createdAt: new Date().toISOString()
      };
      state.memories.push(newMemory);
      saveDB();

      return { success: true, log: "Sikeres önjavítás!", fileFixed: faultyFile };
    } catch (reErr: any) {
      const secondError = reErr.stdout || reErr.stderr || reErr.message || "";
      addLog("attila_tech", "Attila", "system", `❌ A javítási kísérlet után a fordító még mindig hibát észlel. Visszaállítás az eredeti tartalomra...`);
      fs.writeFileSync(resolvedFaultyPath, currentContent, "utf-8");
      return { success: false, log: "A kódjavítás nem oldotta meg a problémát. Új hiba:\n" + secondError };
    }
  } catch (healError: any) {
    addLog("attila_tech", "Attila", "system", `❌ Hiba az önjavító hurok végrehajtása közben: ${healError.message}`);
    return { success: false, log: "Önjavítási hiba: " + healError.message };
  }
}

async function detectConnectedDevices() {
  addLog("system", "System", "system", "Helyi hardver, laptop szenzorok és eszközök felderítése folyamatban (USB, Akku, Hőmérséklet)...");
  let hardwareDetails = "";
  
  // 1. Akkumulátor és Töltő Státusz (Fontos régi laptopokhoz áramszünet, merülés detektálására)
  let batteryStatus = "Nem észlelhető akkumulátor (lehet asztali PC)";
  try {
    const powerSysPath = "/sys/class/power_supply";
    if (fs.existsSync(powerSysPath)) {
      const supplies = fs.readdirSync(powerSysPath);
      const bat = supplies.find(s => s.startsWith("BAT"));
      const ac = supplies.find(s => s.startsWith("AC") || s.includes("ADP"));
      
      let capacity = "";
      let status = "";
      let isAcOn = "ismeretlen";

      if (bat) {
        if (fs.existsSync(`${powerSysPath}/${bat}/capacity`)) {
          capacity = fs.readFileSync(`${powerSysPath}/${bat}/capacity`, "utf-8").trim();
        }
        if (fs.existsSync(`${powerSysPath}/${bat}/status`)) {
          status = fs.readFileSync(`${powerSysPath}/${bat}/status`, "utf-8").trim();
        }
      }
      if (ac && fs.existsSync(`${powerSysPath}/${ac}/online`)) {
        isAcOn = fs.readFileSync(`${powerSysPath}/${ac}/online`, "utf-8").trim() === "1" ? "Csatlakoztatva (AC hálózat)" : "Lecsatlakoztatva (Akku üzemmód)";
      }

      if (bat) {
        batteryStatus = `Akkumulátor: ${capacity}% [Státusz: ${status}]. Töltő tápellátás: ${isAcOn}`;
        // Automatikus akkumulátorkímélő és riasztó logika
        const capNum = parseInt(capacity, 10);
        if (status === "Discharging" && capNum < 25) {
          addLog("system", "System", "system", `⚠️ KRITIKUS LAPTOP AKKUMULÁTOR SZINT: ${capacity}%! Energiatakarékos mód javasolt.`);
          // Ha be van állítva a Telegram, értesítsük a felhasználót
          if (state.settings.telegramBotToken && state.settings.telegramChatId) {
            const botToken = state.settings.telegramBotToken;
            const chatId = state.settings.telegramChatId;
            const msg = encodeURIComponent(`🚨 *NovaSwarm Laptop Riasztás!*\n\nA kiszolgáló gép áramellátása megszakadt! Akkumulátor szintje kritikus: *${capacity}%* (${status}). NovaSwarm energiatakarékos Green Mode-ba lép.`);
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&parse_mode=Markdown&text=${msg}`).catch(() => {});
          }
        }
      } else {
        batteryStatus = `Közvetlen AC hálózati tápellátás gyanítható (nincs különálló BAT eszköz). Töltő: ${isAcOn}`;
      }
    }
  } catch (e: any) {
    batteryStatus = `Hiba az akkumulátor lekérdezésekor: ${e.message}`;
  }
  hardwareDetails += `🔋 Tápellátás Állapota:\n${batteryStatus}\n\n`;

  // 2. CPU Hőmérséklet (Hővédelem öreg laptopokhoz)
  let cpuTemp = "Nem sikerült lekérni a CPU hőmérsékletet";
  try {
    const thermalPath = "/sys/class/thermal";
    if (fs.existsSync(thermalPath)) {
      const zones = fs.readdirSync(thermalPath).filter(z => z.startsWith("thermal_zone"));
      for (const zone of zones) {
        const type = fs.readFileSync(`${thermalPath}/${zone}/type`, "utf-8").trim();
        if (type.toLowerCase().includes("cpu") || type.toLowerCase().includes("x86_pkg") || zones.length === 1) {
          const tempRaw = fs.readFileSync(`${thermalPath}/${zone}/temp`, "utf-8").trim();
          const tempC = (parseInt(tempRaw, 10) / 1000).toFixed(1);
          cpuTemp = `${tempC}°C (Szenzor: ${type})`;
          if (parseFloat(tempC) > 80.0) {
            addLog("system", "System", "system", `🔥 CPU TÚLMELEGEDÉS DETEKTÁLVA: ${tempC}°C! Lassabb ütemre váltás és hűtés ellenőrzése javasolt.`);
          }
          break;
        }
      }
    }
  } catch (e: any) {
    cpuTemp = `Sikertelen hőmérséklet olvasás: ${e.message}`;
  }
  hardwareDetails += `🌡️ CPU Hőmérséklet:\n${cpuTemp}\n\n`;

  // 3. Memória és Lemezterület (Szűkös erőforrások monitorozása)
  let resourceUsage = "Memóriainfó csak Linux host alatt érhető el.";
  try {
    const { stdout: freeOut } = await execPromise("free -m");
    const { stdout: dfOut } = await execPromise("df -h / | tail -n 1");
    const freeLines = freeOut.split("\n");
    const memDetails = freeLines.find(l => l.startsWith("Mem:")) || "Nincs adat";
    resourceUsage = `Szabad RAM (MB):\n${memDetails}\nFő lemezterület szabadság:\n${dfOut.trim()}`;
  } catch (e: any) {}
  hardwareDetails += `💾 Rendszer Erőforrások:\n${resourceUsage}\n\n`;

  // 4. USB és PCI Hardverek
  try {
    const { stdout } = await execPromise("lsusb");
    if (stdout.trim()) hardwareDetails += `🔌 USB Eszközök:\n${stdout.trim()}\n\n`;
  } catch (e) {}
  try {
    const { stdout } = await execPromise("lspci | head -n 8");
    if (stdout.trim()) hardwareDetails += `📟 PCI Eszközök:\n${stdout.trim()}\n\n`;
  } catch (e) {}
  try {
    const { stdout } = await execPromise("ip -brief link");
    if (stdout.trim()) hardwareDetails += `🌐 Hálózati csatolók:\n${stdout.trim()}\n\n`;
  } catch (e) {}

  if (hardwareDetails) {
    const memContent = `[GÉP LAPTOP SZENZOROK & HARDVER DETEKTÁLÁS] Észlelt laptop fizikai állapot:\n${hardwareDetails.substring(0, 1500)}`;
    
    // Frissítjük vagy hozzáadjuk a hardver memóriát, így az ágensek MINDIG látják a legfrissebb laptop állapotokat!
    const existingIndex = state.memories.findIndex(m => m.content.includes("[GÉP LAPTOP SZENZOROK & HARDVER DETEKTÁLÁS]") || m.content.includes("[GÉP HARDVER DETEKTÁLÁS]"));
    if (existingIndex !== -1) {
      state.memories[existingIndex].content = memContent;
      state.memories[existingIndex].createdAt = new Date().toISOString();
    } else {
      const devMemory: Memory = {
        id: `mem_hardware_init`,
        content: memContent,
        createdAt: new Date().toISOString()
      };
      state.memories.push(devMemory);
    }
    saveDB();
    addLog("system", "System", "system", "Laptop szenzor adatok és csatlakoztatott eszközök frissítve a Swarm globális memóriájában.");
  } else {
    addLog("system", "System", "system", "Nincs részletes helyi hardver információ (homokozó mód). Linux Mint alatt ez teljesen automatikusan beolvassa a fizikai gép adatait.");
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save DB:", err);
  }
}

loadDB();
detectConnectedDevices().catch(err => console.error("Hardware detection failed:", err));

// Agent background heartbeat loop
let heartbeatTimer: NodeJS.Timeout | null = null;
let lastTelegramUpdateOffset = 0;

// Gemini client initialization helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || state.settings.geminiApiKey;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("MY_")) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Add system logs helper
function addLog(agentId: string, agentName: string, type: AuditLog['type'], message: string, data?: any) {
  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    agentId,
    agentName,
    type,
    message,
    data
  };
  state.logs.unshift(newLog);
  // Keep logs to max 200 items
  if (state.logs.length > 200) {
    state.logs = state.logs.slice(0, 200);
  }
  saveDB();
}

// Robust wrapper for Gemini generateContent to handle 503 high demand, 429 rate limit, and other transient errors.
// Incorporates dynamic Simulated Rate-Limit fallbacks with smart Auto-Prioritization & manual model locking.
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: { model: string; contents: any; config?: any },
  agentId = "system",
  agentName = "System"
) {
  const agentRequestedModel = params.model;
  const globalMode = state.settings.globalModelMode || "auto";
  
  let primaryModel = agentRequestedModel;
  if (globalMode !== "auto") {
    primaryModel = globalMode;
  }

  // Fallback candidates ordered by capability/priority list
  const fallbackPriorityList = [
    "gemini-3.1-pro-preview",
    "gemini-2.5-pro",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite"
  ];

  let modelsToTry: string[] = [];

  if (globalMode === "auto") {
    // Collect models that currently have simulated remaining requests > 0
    const available = fallbackPriorityList.filter(m => {
      const limit = modelLimits.find(l => l.model === m);
      return limit ? limit.remainingRequests > 0 : true;
    });

    if (available.length > 0) {
      modelsToTry = available;
    } else {
      // If everything is dry, fall back to our main order
      modelsToTry = [...fallbackPriorityList];
    }
  } else {
    // Specifically selected a model
    const specificLimit = modelLimits.find(l => l.model === primaryModel);
    if (specificLimit && specificLimit.remainingRequests <= 0) {
      // Warn that the specific locked-in model has no remaining rate-limits!
      const limitWarn = `⚠️ Figyelmeztetés: A rögzített '${primaryModel}' modell rate-limitje elfogyott. Kényszerített átirányítás tartalék modellekre.`;
      console.warn(limitWarn);
      addLog(agentId, agentName, "system", limitWarn);
      
      const alternativeCandidates = fallbackPriorityList.filter(m => {
        const xl = modelLimits.find(l => l.model === m);
        return xl ? xl.remainingRequests > 0 : true;
      });
      modelsToTry = alternativeCandidates.length > 0 ? alternativeCandidates : [...fallbackPriorityList];
    } else {
      modelsToTry.push(primaryModel);
      const alternates = fallbackPriorityList.filter(m => m !== primaryModel);
      modelsToTry = modelsToTry.concat(alternates);
    }
  }

  // Ensure unique model candidate list
  modelsToTry = Array.from(new Set(modelsToTry));

  let lastError: any = null;

  for (const model of modelsToTry) {
    const maxRetries = 2; // Try up to 2 times per candidate model
    let delay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const activeParams = { ...params, model: model };
        
        // Check local limit guard
        const limitObj = modelLimits.find(l => l.model === model);
        if (limitObj && limitObj.remainingRequests <= 0) {
          throw new Error(`[Szimulált Rate Limit] A(z) ${model} modell elérte a percenkénti korlátot.`);
        }

        const result = await ai.models.generateContent(activeParams);
        
        // Decrement simulated remaining requests on success
        if (limitObj) {
          limitObj.remainingRequests = Math.max(0, limitObj.remainingRequests - 1);
        }

        if (model !== agentRequestedModel) {
          const successMsg = `🔄 Auto-Limiter Átirányítás: Az eredetileg megszabott '${agentRequestedModel}' helyett a(z) '${model}' modell futott le sikeresen (Fennmaradó: ${limitObj ? limitObj.remainingRequests : 0} kérés)!`;
          console.log(`${agentName}: ${successMsg}`);
          addLog(agentId, agentName, "system", successMsg);
        }
        
        return result;
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || "";
        const status = err.status || (err.error && err.error.code);
        const isTransient = errMsg.includes("503") ||
                            errMsg.toLowerCase().includes("unavailable") ||
                            errMsg.includes("429") ||
                            errMsg.toLowerCase().includes("high demand") ||
                            errMsg.toLowerCase().includes("overloaded") ||
                            status === 503 ||
                            status === 429 ||
                            errMsg.includes("[Szimulált Rate Limit]");

        if (isTransient && attempt < maxRetries) {
          const warningMsg = `A kiszolgáló vagy a rate-limit átmenetileg korlátozott (${model}, hiba: ${status || "429/503"}). Újrapróbálkozás ${attempt}/${maxRetries} (${delay}ms múlva)...`;
          console.warn(`${agentName}: ${warningMsg}`);
          addLog(agentId, agentName, "system", warningMsg);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        const fallbackMsg = `Hiba történt a(z) ${model} modellel (${errMsg.slice(0, 100)}). Kipróbálom a következő kompatibilis modellt...`;
        console.warn(`${agentName}: ${fallbackMsg}`);
        addLog(agentId, agentName, "system", fallbackMsg);
        break; // Failover to the next model in the candidate list
      }
    }
  }

  const finalErrorMsg = lastError ? lastError.message : "Ismeretlen hiba";
  throw new Error(`Minden elérhető Gemini API modell (${modelsToTry.join(', ')}) túlterhelési vagy rate-limit hibát adott vissza. Részletek: ${finalErrorMsg}`);
}

// Telegram integration: sendMessage
async function sendTelegramMessage(text: string) {
  const botToken = state.settings.telegramBotToken;
  const chatId = state.settings.telegramChatId;
  if (!botToken || !chatId) return false;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown"
      })
    });
    const resValue = await response.json();
    return resValue.ok === true;
  } catch (e: any) {
    console.error("Failed to send Telegram message:", e.message);
    return false;
  }
}

// Autonomously invoke agent with Gemini
async function runAgentTurn(agentId: string) {
  const agent = state.agents.find(a => a.id === agentId);
  if (!agent || !agent.active) return;

  agent.lastActive = new Date().toISOString();
  saveDB();

  const ai = getGeminiClient();
  const activeKanban = state.kanbanCards;
  const activeMemories = state.memories;

  const contextPrompt = `
Jelenlegi Kanban tábla állapota:
${JSON.stringify(activeKanban, null, 2)}

Csapat Memóriák (amit eddig tanultunk):
${JSON.stringify(activeMemories.map(m => m.content), null, 2)}

Feladatod:
Elemezd a jelenlegi helyzetet. Válassz ki egy feladatot, ami még nincs kész (status === 'todo' vagy status === 'in_progress'), vagy indíts el egy új kezdeményezést a meglévő memóriák alapján.
    Válaszod egy JSON formátumú válasz legyen a következő mezőkkel:
    1. "gondolat": Mit gondolsz a jelenlegi helyzetről és teendőkről? (magyarul)
    2. "teendo": Mit csinálsz most konkrétan a feladat megoldása érdekében? (magyarul)
    3. "telegramKuldendo": Opcionálisan, akarsz-e fontos hírt, eredményt közzétenni a Telegram csatornára? Ha igen, írd ide a formázott szöveget. Ha nem, hagyd üresen vagy nullán.
    4. "memoriaMentendo": Opcionálisan, van-e olyan kritikus információ, amit be kell mentenünk a csapat memóriájába a jövőre nézve? Ha igen, írd ide.
    5. "kanbanModositas": Opcionálisan egy objektum { cardId: string, status: 'todo'|'in_progress'|'done', assignedTo: string|null, title?: string, description?: string }, ha frissíteni vagy módosítani szeretnél egy kártyát, vagy akarod hozzárendelni magadhoz és elindítani. Új kártya létrehozásához adj meg egy "uj" mezőt: { uj: true, title: string, description: string, status: 'todo' }
    6. "helyiParancs": Opcionálisan egy tetszőleges shell parancs, amit le szeretnél futtatni a Linux Mint gazdagépen (pl. "lsusb", "df -h", csomagok futtatása, mcp-servers mappanév alatti tesztek stb.) a rendszer felügyeletéhez, eszközök vagy hardverek kezeléséhez és saját kódod teszteléséhez.
    7. "helyiFajlIras": Opcionálisan egy objektum { path: string, content: string }, ha fájlt szeretnél létrehozni vagy módosítani (pl. új MCP szerver kód a mcp-servers/ mappában, új script stb.), amivel saját magadat vagy a NovaSwarm-ot fejleszted!
    8. "helyiHangjelentes": Opcionálisan egy magyar nyelvű kifejezés/mondat (max 200 karakter), amit szeretnél, hogy a gazdagép hangszóróján keresztül élőszóban bemondjak neked (pl. ha riasztás van, vagy fontos státuszt/üzenetet akarsz közölni)!

    Kérünk, CSAK a JSON-t válaszold le az alábbi séma szerint, markdown blokk nélkül!
    Válaszod SOHA ne legyen üres!
  `;

  if (!ai) {
    // Simulated fallback behavior when API key is missing
    setTimeout(() => {
      const mockThoughts = [
        "Áttekintem az aktuális feladatokat. Úgy látom, van néhány elintézetlen projektünk.",
        "Kód architektúra pontokat elemzem. Biztonságos tárolásra van szükség.",
        "A mai bejegyzéseken és Telegram posztokon dolgozom. Nagyon fontos az aktív jelenlét.",
        "Statisztikát gyűjtök a token felhasználásokról és a csapat hatékonyságáról."
      ];
      const selectedThought = mockThoughts[Math.floor(Math.random() * mockThoughts.length)];
      
      const mockActions: string[] = [
        "Hozzárendeltem magam az ütemezett elemzéshez.",
        "Bejegyzést készítek a vault titkosítási protokollokról.",
        "Összeállítottam egy új kanban kártyát az automata szerver monitorozásról.",
        "Rendszereztem a legutóbbi memóriákat."
      ];
      const selectedAction = mockActions[Math.floor(Math.random() * mockActions.length)];

      // Choose whether to send mock telegram or add memory
      const shouldMockTelegram = Math.random() > 0.6 && state.settings.telegramBotToken;
      const teleMsg = shouldMockTelegram ? `📢 *${agent.name} üzenete:* Sikeresen elemeztem a rendszert. Minden paraméter optimális!` : null;

      const shouldMockMemory = Math.random() > 0.7;
      const newMem = shouldMockMemory ? `Létrehozva egy automata megállapítás ${agent.name} által: optimalizáció szükséges.` : null;

      addLog(agent.id, agent.name, "thought", selectedThought);
      addLog(agent.id, agent.name, "action", selectedAction);

      if (teleMsg) {
        addLog(agent.id, agent.name, "telegram", `Telegram üzenet küldése megkísérelve: "${teleMsg}"`);
        sendTelegramMessage(teleMsg);
      }

      if (newMem) {
        const memoryObj: Memory = {
          id: `mem_${Date.now()}`,
          content: `${agent.name} észrevétele: ${newMem}`,
          createdAt: new Date().toISOString()
        };
        state.memories.push(memoryObj);
        addLog(agent.id, agent.name, "memory", `Új emlék hozzáadva: "${memoryObj.content}"`);
        saveDB();
      }

      // Randomly update kanban for simulation
      if (Math.random() > 0.5 && state.kanbanCards.length > 0) {
        const card = state.kanbanCards[Math.floor(Math.random() * state.kanbanCards.length)];
        const prevStatus = card.status;
        if (card.status === "todo") {
          card.status = "in_progress";
          card.assignedTo = agent.id;
        } else if (card.status === "in_progress") {
          card.status = "done";
          card.assignedTo = agent.id;
          // Create an automated next task mock!
          const newCardId = `task_${Date.now()}`;
          const newCard: KanbanCard = {
            id: newCardId,
            title: `${agent.name} javaslat: Következő fázis tervek`,
            description: `Az előző feladat (${card.title}) lezárása után szükséges következő lépések.`,
            status: "todo",
            assignedTo: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          state.kanbanCards.push(newCard);
          addLog("system", "System", "kanban", `Új feladat létrehozva: "${newCard.title}" (Ajánlotta: ${agent.name})`);
        }
        card.updatedAt = new Date().toISOString();
        addLog(agent.id, agent.name, "kanban", `Kanban módosítás: "${card.title}" állapota módosult: ${prevStatus} -> ${card.status}`);
        saveDB();
      }
    }, 1500);
    return;
  }

  try {
    addLog(agent.id, agent.name, "thought", `Kapcsolódás a Gemini API-hoz (${agent.model})...`);
    
    const response = await generateContentWithRetry(
      ai,
      {
        model: agent.model === 'gemini-3.1-pro-preview' ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash',
        contents: contextPrompt,
        config: {
          systemInstruction: agent.systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.8,
        }
      },
      agent.id,
      agent.name
    );

    const replyText = response.text;
    if (!replyText) throw new Error("Üres válasz a modelltől.");

    const replyJson = JSON.parse(replyText.trim());

    // 1. Log thought
    if (replyJson.gondolat) {
      addLog(agent.id, agent.name, "thought", replyJson.gondolat);
    }
    // 2. Log action / teendo
    if (replyJson.teendo) {
      addLog(agent.id, agent.name, "action", replyJson.teendo);
    }
    // 3. Telegram trigger
    if (replyJson.telegramKuldendo) {
      const formattedTelegram = `📢 *${agent.name}* (${agent.avatar} ${agent.role}):\n\n${replyJson.telegramKuldendo}`;
      addLog(agent.id, agent.name, "telegram", `Telegram üzenet küldése: "${replyJson.telegramKuldendo}"`);
      await sendTelegramMessage(formattedTelegram);
    }
    // 4. Memory trigger
    if (replyJson.memoriaMentendo) {
      const memoryObj: Memory = {
        id: `mem_${Date.now()}`,
        content: `[${agent.name}]: ${replyJson.memoriaMentendo}`,
        createdAt: new Date().toISOString()
      };
      state.memories.push(memoryObj);
      addLog(agent.id, agent.name, "memory", `Új emlék elmentve: "${memoryObj.content}"`);
      saveDB();
    }
    // 5. Kanban card modification
    if (replyJson.kanbanModositas) {
      const mode = replyJson.kanbanModositas;
      if (mode.uj) {
        const newCard: KanbanCard = {
          id: `task_${Date.now()}`,
          title: mode.title || "Új feladat",
          description: mode.description || "",
          status: 'todo',
          assignedTo: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        state.kanbanCards.push(newCard);
        addLog(agent.id, agent.name, "kanban", `Új feladat létrehozva a táblán: "${newCard.title}"`);
      } else if (mode.cardId) {
        const cardObj = state.kanbanCards.find(c => c.id === mode.cardId);
        if (cardObj) {
          const oldStatus = cardObj.status;
          if (mode.status) cardObj.status = mode.status;
          if (mode.assignedTo !== undefined) cardObj.assignedTo = mode.assignedTo;
          if (mode.title) cardObj.title = mode.title;
          if (mode.description) cardObj.description = mode.description;
          cardObj.updatedAt = new Date().toISOString();
          addLog(agent.id, agent.name, "kanban", `Kanban kártya frissítve ("${cardObj.title}"): ${oldStatus} -> ${cardObj.status} (Hozzárendelve: ${cardObj.assignedTo || "senki"})`);
        }
      }
      saveDB();
    }

    // 6. Host Command Execution
    if (replyJson.helyiParancs) {
      await executeHostCommand(replyJson.helyiParancs, agent.id, agent.name);
    }

    // 7. Host File Writing (Autonomous development)
    if (replyJson.helyiFajlIras) {
      const { path: fpath, content: fcontent } = replyJson.helyiFajlIras;
      if (fpath && fcontent) {
        writeHostFile(fpath, fcontent, agent.id, agent.name);
      }
    }

    // 8. Physical Voice Synthesis (TTS) - Gábor's vocals represent
    if (replyJson.helyiHangjelentes) {
      speakOutLoud(replyJson.helyiHangjelentes, agent.name);
      addLog(agent.id, agent.name, "system", `📢 [HANGCSATORNA] Bemondva a laptop hangszórón: "${replyJson.helyiHangjelentes}"`);
    }
  } catch (err: any) {
    console.error("Gemini agent error:", err);
    addLog(agent.id, agent.name, "system", `Hiba történt az ügynök végrehajtása közben: ${err.message}`);
  }
}

// Global long loop runner
async function triggerHeartbeatTick() {
  if (!state.settings.teamActive) return;

  state.settings.lastRunTime = new Date().toISOString();
  saveDB();

  // Find active agents in NovaSwarm
  const activeAgents = state.agents.filter(a => a.active);
  if (activeAgents.length === 0) return;

  // Let a random active agent perform its turn
  const selectedAgent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
  addLog("system", "System", "system", `Autonóm ütemező elindítva. Kijelölt ágens: ${selectedAgent.name}`);
  await runAgentTurn(selectedAgent.id);
  
  // Also check Telegram bot messages
  await pollTelegramMessages();

  // Simulate Crypto Market Price updates and trading decisions if skill is active
  const isTradingSkillActive = state.skills.some(s => s.id === "skill_binance_trading" && s.active);
  if (state.binanceState && isTradingSkillActive) {
    const bstate = state.binanceState;
    // Fluctuate BTC price
    const btcDiff = (Math.random() * 600 - 280);
    bstate.btcPrice = Number((bstate.btcPrice + btcDiff).toFixed(2));
    
    // Fluctuate SOL price
    const solDiff = (Math.random() * 2 - 0.95);
    bstate.solPrice = Number((bstate.solPrice + solDiff).toFixed(2));

    // Fluctuate Sentiment
    const sentDiff = Math.floor(Math.random() * 7 - 3);
    bstate.sentiment = Math.min(Math.max(bstate.sentiment + sentDiff, 15), 92);

    // Occasionally create a trader recommendation
    if (Math.random() < 0.45) {
      const isNewsRadarActive = state.agents.some(a => a.id === "nora_radar" && a.active);
      const isTraderActive = state.agents.some(a => a.id === "attila_trading" && a.active);

      if (isNewsRadarActive && isTraderActive) {
        // Generate headlines
        const headlines = [
          { text: "Binance bejelentette az európai stabilcoin szabályozási megfelelést.", score: 75, rec: "BUY" as const },
          { text: "Figyelmeztetés: Egy nagyobb tőzsdei bálna 8000 BTC-t utalt be eladásra.", score: 32, rec: "SELL" as const },
          { text: "A közelgő amerikai inflációs adatok bizonytalanságot teremtenek.", score: 48, rec: "HOLD" as const },
          { text: "Technikai indikátorok: BTC 200 napos mozgóátlag felett kitörésre vár.", score: 82, rec: "BUY" as const },
          { text: "SOL napi kereskedési volumen történelmi csúcsot ért el.", score: 79, rec: "BUY" as const },
          { text: "Aggasztó hírek érkeztek egy ázsiai bányászfarm leállásáról.", score: 39, rec: "SELL" as const }
        ];

        const selectedNews = headlines[Math.floor(Math.random() * headlines.length)];
        bstate.newsSignal = {
          timestamp: new Date().toISOString(),
          headline: selectedNews.text,
          sentimentScore: selectedNews.score,
          recommendedAction: selectedNews.rec,
          agentName: "Nóra KriptoRadar"
        };

        addLog("nora_radar", "Nóra KriptoRadar", "telegram", `Hírfelderítés: "${selectedNews.text}" (Szignál: ${selectedNews.rec})`);

        // Execute trade simulated
        if (selectedNews.rec === "BUY") {
          // BUY sol or btc
          const tradePair = Math.random() > 0.5 ? "BTC/USDT" : "SOL/USDT";
          const currentPrice = tradePair === "BTC/USDT" ? bstate.btcPrice : bstate.solPrice;
          const buyAmount = tradePair === "BTC/USDT" ? 0.015 : 1.2;
          const totalCost = Number((currentPrice * buyAmount).toFixed(2));

          if (bstate.balanceUsdt >= totalCost) {
            bstate.balanceUsdt = Number((bstate.balanceUsdt - totalCost).toFixed(2));
            if (tradePair === "BTC/USDT") {
              bstate.balanceBtc = Number((bstate.balanceBtc + buyAmount).toFixed(6));
            } else {
              bstate.balanceSol = Number((bstate.balanceSol + buyAmount).toFixed(4));
            }

            const newTrade: BinanceTrade = {
              id: `trade_${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: "BUY",
              pair: tradePair,
              price: currentPrice,
              amount: buyAmount,
              total: totalCost,
              agentName: "Attila KriptoTrader"
            };
            bstate.recentTrades.unshift(newTrade);
            addLog("attila_trading", "Attila KriptoTrader", "action", `VÉTEL: Megvásárolva ${buyAmount} ${tradePair.split('/')[0]} @ $${currentPrice}. Összesen: $${totalCost} (Nóra szignálja alapján)`);
          }
        } else if (selectedNews.rec === "SELL") {
          const tradePair = Math.random() > 0.5 ? "BTC/USDT" : "SOL/USDT";
          const currentPrice = tradePair === "BTC/USDT" ? bstate.btcPrice : bstate.solPrice;
          const sellAmount = tradePair === "BTC/USDT" ? 0.01 : 1.0;

          let executeSell = false;
          if (tradePair === "BTC/USDT" && bstate.balanceBtc >= sellAmount) {
            bstate.balanceBtc = Number((bstate.balanceBtc - sellAmount).toFixed(6));
            executeSell = true;
          } else if (tradePair === "SOL/USDT" && bstate.balanceSol >= sellAmount) {
            bstate.balanceSol = Number((bstate.balanceSol - sellAmount).toFixed(4));
            executeSell = true;
          }

          if (executeSell) {
            const totalGain = Number((currentPrice * sellAmount).toFixed(2));
            bstate.balanceUsdt = Number((bstate.balanceUsdt + totalGain).toFixed(2));

            const newTrade: BinanceTrade = {
              id: `trade_${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: "SELL",
              pair: tradePair,
              price: currentPrice,
              amount: sellAmount,
              total: totalGain,
              agentName: "Attila KriptoTrader"
            };
            bstate.recentTrades.unshift(newTrade);
            addLog("attila_trading", "Attila KriptoTrader", "action", `ELADÁS: Eladva ${sellAmount} ${tradePair.split('/')[0]} @ $${currentPrice}. Bevétel: $${totalGain} (Nóra szignálja alapján)`);
          }
        }
      }
    }
    saveDB();
  }
}

// Poll telegram messages using long polling
async function pollTelegramMessages() {
  const botToken = state.settings.telegramBotToken;
  if (!botToken || !state.settings.isBotActive) return;

  try {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastTelegramUpdateOffset}&timeout=2`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await response.json();

    if (data.ok && data.result && data.result.length > 0) {
      for (const update of data.result) {
        lastTelegramUpdateOffset = update.update_id + 1;
        const msg = update.message;
        if (!msg || !msg.text) continue;

        const senderName = msg.from?.first_name || "Felhasználó";
        const text = msg.text;
        const chatId = msg.chat?.id;

        // Log incoming message
        addLog("telegram", "Telegram", "telegram", `Beérkező Telegram üzenet tőle: ${senderName}: "${text}"`, { chatId });

        // Let BOSS (Gábor) formulate response
        const bossAgent = state.agents.find(a => a.role === "boss") || state.agents[0];
        addLog(bossAgent.id, bossAgent.name, "thought", `Telegram üzenetet kaptam idegen felhasználótól (${senderName}). Válasz generálása folyamatban...`);

        const ai = getGeminiClient();
        let reply = "";

        if (ai) {
          try {
            const prompt = `
A Telegram csatornában a felhasználó (${senderName}) ezt írta:
"${text}"

Jelenlegi Kanban tábla állapota:
${JSON.stringify(state.kanbanCards, null, 2)}

Jelenlegi memóriáink:
${JSON.stringify(state.memories, null, 2)}

Válaszolj a felhasználónak közvetlenül, barátságos AI csapattag stílusban, mint ${bossAgent.name}, a főnök. Segíts neki, magyarázd el mit csinál a csapat vagy írd le a kanban feladatokat ha kérdezi.
Gondoskodj róla, hogy a válaszod magyarul legyen és ne legyen hosszabb 3-4 bekezdésnél.
            `;

            const aiRes = await generateContentWithRetry(
              ai,
              {
                model: "gemini-3.5-flash",
                contents: prompt,
                config: {
                  systemInstruction: bossAgent.systemInstruction,
                  temperature: 0.7,
                }
              },
              bossAgent.id,
              bossAgent.name
            );
            reply = aiRes.text || "Szia! Jelenleg technikai okok miatt nem tudok részletes választ adni, de a csapatom dolgozik a feladatokon.";
          } catch (err: any) {
            reply = `Szia! Épp frissítem a rendszeremet. Köszönöm az üzenetet! (Hiba: ${err.message})`;
          }
        } else {
          reply = `Szia ${senderName}! Köszönöm a megkeresést. Én ${bossAgent.name} vagyok, a NovaSwarm AI csapat vezetője. Jelenleg a Gemini API kulcs nincs megfelelően beállítva, így egyelőre demo/szimulációs üzemmódban futok. Kérlek állítsd be az API kulcsot a beállítások menüben, hogy valódi válaszokat adhassak!`;
        }

        // Send response back
        const success = await sendTelegramMessage(reply);
        if (success) {
          addLog(bossAgent.id, bossAgent.name, "telegram", `Válasz elküldve Telegramon: "${reply}"`);
        } else {
          addLog(bossAgent.id, bossAgent.name, "system", `Nem sikerült a Telegram válaszüzenet kiküldése ide: ${chatId}`);
        }
      }
    }
  } catch (err: any) {
    // Silently handle polling timeouts/errors
  }
}

// Start scheduling heartbeat
function startHeartbeatEngine() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  
  const intervalMs = (state.settings.checkIntervalSeconds || 30) * 1000;
  heartbeatTimer = setInterval(async () => {
    await triggerHeartbeatTick();
  }, intervalMs);
}

// API Routes
app.get("/api/state", (req, res) => {
  res.json({
    agents: state.agents,
    kanbanCards: state.kanbanCards,
    memories: state.memories,
    logs: state.logs,
    settings: state.settings,
    systemRunning: state.settings.teamActive,
    telegramConnected: !!(state.settings.telegramBotToken && state.settings.telegramChatId),
    mcpServers: state.mcpServers || [],
    skills: state.skills || [],
    modelLimits: modelLimits,
    currentDream: currentDream,
    binanceState: state.binanceState
  });
});

app.post("/api/settings", (req, res) => {
  const newSet = req.body;
  state.settings = { ...state.settings, ...newSet };
  saveDB();
  addLog("system", "System", "system", "A NovaSwarm beállítások sikeresen frissítve.");

  // Restart heartbeat with new interval if changed
  if (state.settings.teamActive) {
    startHeartbeatEngine();
  }
  res.json({ success: true, settings: state.settings });
});

app.post("/api/team/toggle", (req, res) => {
  const { active } = req.body;
  state.settings.teamActive = active;
  saveDB();

  if (active) {
    startHeartbeatEngine();
    addLog("system", "System", "system", "Az autonóm ütemezett AI csapat működése Elindítva.");
  } else {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    addLog("system", "System", "system", "Az autonóm AI csapat működése Leállítva.");
  }

  res.json({ success: true, systemRunning: active });
});

app.post("/api/team/tick", async (req, res) => {
  addLog("system", "System", "system", "Kézi ciklusindítás (Trigger Tick) kezdeményezve.");
  // Run asynchronously so we don't block API
  triggerHeartbeatTick().catch(console.error);
  res.json({ success: true });
});

// Agents CRUD
app.post("/api/agents", (req, res) => {
  const agentData = req.body;
  if (agentData.id) {
    // Edit action
    const idx = state.agents.findIndex(a => a.id === agentData.id);
    if (idx !== -1) {
      state.agents[idx] = { ...state.agents[idx], ...agentData };
      addLog("system", "System", "system", `Ágens frissítve: ${agentData.name}`);
    }
  } else {
    // Create action
    const newAg: Agent = {
      id: `agent_${Date.now()}`,
      name: agentData.name || "Névtelen ágens",
      avatar: agentData.avatar || "🤖",
      role: agentData.role || "writer",
      systemInstruction: agentData.systemInstruction || "Te egy segítőkész AI asszisztens vagy.",
      model: agentData.model || "gemini-3.5-flash",
      active: true,
    };
    state.agents.push(newAg);
    addLog("system", "System", "system", `Új ágens felvéve: ${newAg.name}`);
  }
  saveDB();
  res.json({ success: true, agents: state.agents });
});

app.delete("/api/agents/:id", (req, res) => {
  const { id } = req.params;
  const agent = state.agents.find(a => a.id === id);
  if (agent) {
    state.agents = state.agents.filter(a => a.id !== id);
    addLog("system", "System", "system", `Ágens törölve: ${agent.name}`);
    saveDB();
    res.json({ success: true, agents: state.agents });
  } else {
    res.status(404).json({ error: "Agent not found" });
  }
});

// Chat with agents endpoints
app.post("/api/agents/:id/chat", async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Message text is required" });
  }

  const agent = state.agents.find(a => a.id === id);
  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }

  // Add the User message to logs
  const userLogId = `log_${Date.now()}_u`;
  const userLog: AuditLog = {
    id: userLogId,
    timestamp: new Date().toISOString(),
    agentId: agent.id,
    agentName: agent.name,
    type: "chat",
    message: text,
    data: { isUser: true }
  };
  state.logs.unshift(userLog);

  // Compile history
  const agentChats = state.logs
    .filter(l => l.type === "chat" && l.agentId === agent.id)
    .slice(0, 15) // Keep last 15 messages
    .reverse();

  const historyPrompt = agentChats.map(l => {
    const roleName = l.data?.isUser ? "Felhasználó" : agent.name;
    return `${roleName}: ${l.message}`;
  }).join("\n");

  const prompt = `
Te egy egyéni csevegésben vagy a felhasználóval, mint ${agent.name} (${agent.avatar}).
A szerepköröd és feladatod az alábbi rendszerutasításban található:
"${agent.systemInstruction}"

Csevegési előzmények a felhasználóval:
${historyPrompt}

Új üzenet a felhasználótól: "${text}"

Válaszolj közvetlenül a felhasználónak a megadott szerepköröd stílusában, magyar nyelven. A válaszod legyen közvetlen, barátságos, de tartsa meg a rá bízott szerepkör stílusjegyeit (pl. ha kereskedő, tőzsdei dúsítás; ha jogász, jogi precizitás; ha fejlesztő, kódfókusz). A válaszod ne legyen hosszabb 2-3 jól olvasható bekezdésnél. Ne használj semmilyen JSON vagy markdown kódblokk burkolót az egész válaszodra!
  `;

  const ai = getGeminiClient();
  let replyText = "";

  if (ai) {
    try {
      const aiRes = await generateContentWithRetry(
        ai,
        {
          model: agent.model || "gemini-3.5-flash",
          contents: prompt,
          config: {
            temperature: 0.7,
          }
        },
        agent.id,
        agent.name
      );
      replyText = aiRes.text || "Sajnálom, nem tudtam választ generálni.";
    } catch (err: any) {
      replyText = `Sajnálom, hiba történt a kommunikáció során: ${err.message}`;
    }
  } else {
    // Simulated mock answers based on agent character
    const name = agent.name.toLowerCase();
    const role = agent.role.toLowerCase();
    if (role === "boss") {
      replyText = `Szia! Mint a csapat koordinátora, örömmel egyeztetek veled a webes felületen is. A háttérben folynak a fejlesztések és elemzések, a Telegram botunk is figyel. Miben segíthetek a közvetlen menedzsmentben?`;
    } else if (role === "trader" || name.includes("trader") || name.includes("kereskedő")) {
      const simulatedActions = [
        `Elemeztem a Binance BTC/USDT tőzsdei ticker-t. Jelenleg komoly támasz szinten állunk (~$66,950-nél), Nóra pedig kedvező piacérzelmi (bullish sentiment) adatokat gyűjtött be az X-ről. Én személy szerint egy 0.5 BTC szimulált piaci vételi megbízásra várok!`,
        `A Binance szimulált tárcánk egyenlege stabil. Jelenleg 12,500 USDT és 0.35 BTC áll rendelkezésre. Az eddigi szimulált profitunk +3.4% a Nóra által küldött vételi szignálok óta!`,
        `Kripto piacok most rendkívül volatilisek. A stop-loss és take-profit határokat szigorúan követem a kockázatok minimalizálása érdekében. Van konkrét token, amit elemezzek?`
      ];
      replyText = `Üdvözöllek a Binance kereskedési pultnál! ` + simulatedActions[Math.floor(Math.random() * simulatedActions.length)] + ` (Megjegyzés: Demo szimuláció, a Gemini API gomb nincs konfigurálva a beállításokban.)`;
    } else if (role === "news_analyst" || name.includes("radar") || name.includes("hír")) {
      const simulatedNews = [
        `🚨 Nóra Sürgős Jelentés: A Twitteren (X) keringő hírek szerint egy vezető tőzsde újabb spot ETF jóváhagyási pletykákat erősített meg! Ez lokális eladási pánik helyett komoly FOMO-t válthat ki, azonnali vételi szignált küldök a Kereskedőnek!`,
        `A piaci Fear & Greed index jelenleg 68 ponton áll (Greedy / Mohó). Ez azt jelenti, hogy a piacok optimisták. Attila KriptoTrader-rel szoros kontroll alatt tartjuk az USDT likviditást.`,
        `A friss tőzsdei adatok alapján a Solana és Ethereum volumen is kiugróan magas. Szignált generáltam Attilának: BUY SOL!`
      ];
      replyText = `Szia, Nóra vagyok a KriptoRadartól! Gőzerővel figyelem a tőzsdei sentiment hullámokat. ` + simulatedNews[Math.floor(Math.random() * simulatedNews.length)];
    } else if (role === "tech_lead") {
      replyText = `Szia! Mint a csapat technikai vezetője, a chat optimalizálásán kívül a Binance MCP és fájlkezelő modulok integrációján dolgozom. A WebSocket tőzsdei kódjainkat éppen teszteljük!`;
    } else if (role === "analyst") {
      replyText = `Üdvözletem! Dénes vagyok az adatelemző irodából. Éppen a szimulált tőzsdei és csevegési hisztogramokat vizsgáltam meg. Milyen statisztikai elemzésre vagy számításra lenne szükséged?`;
    } else if (role === "legal") {
      replyText = `Tiszteletem! Bálint vagyok a jogi és biztonsági asztaltól. A csevegésünket is szigorúan titkosítottuk a TLS 1.3 protokoll szerint, így minden adatunk teljesen biztonságban van.`;
    } else if (role === "writer") {
      replyText = `Szia! Kreatív energiák bekapcsolva! Épp a Telegram poszt szövegek finomhangolásán voltam, de örülök, hogy rám írtál. Írjunk valami dögös kripto hírt vagy marketing vázlatot?`;
    } else {
      replyText = `Kedves Felhasználó! Én ${agent.name} vagyok, és örömmel beszélgetek veled ebben az interaktív ablakban. Hogyan segíthetem a mai munkádat?`;
    }
  }

  // Save agent reply to logs
  const agentLogId = `log_${Date.now()}_a`;
  const agentLog: AuditLog = {
    id: agentLogId,
    timestamp: new Date().toISOString(),
    agentId: agent.id,
    agentName: agent.name,
    type: "chat",
    message: replyText,
    data: { isUser: false }
  };
  state.logs.unshift(agentLog);
  saveDB();

  res.json({ success: true, logs: state.logs });
});

app.post("/api/agents/:id/chat/clear", (req, res) => {
  const { id } = req.params;
  state.logs = state.logs.filter(l => !(l.type === "chat" && l.agentId === id));
  saveDB();
  res.json({ success: true, logs: state.logs });
});

// Binance simulation endpoints
app.post("/api/binance/trade", (req, res) => {
  const { type, pair, amount } = req.body;
  
  if (!type || !pair || !amount || amount <= 0) {
    return res.status(400).json({ error: "Érvénytelen kereskedési paraméterek." });
  }

  const bstate = state.binanceState;
  const price = pair === "BTC/USDT" ? bstate.btcPrice : bstate.solPrice;
  const total = Number((price * amount).toFixed(2));

  if (type === "BUY") {
    if (bstate.balanceUsdt < total) {
      return res.status(400).json({ error: `Nincs elegendő USDT egyenleg a vásárláshoz. Szükséges: $${total}` });
    }
    bstate.balanceUsdt = Number((bstate.balanceUsdt - total).toFixed(2));
    if (pair === "BTC/USDT") {
      bstate.balanceBtc = Number((bstate.balanceBtc + amount).toFixed(6));
    } else {
      bstate.balanceSol = Number((bstate.balanceSol + amount).toFixed(4));
    }
  } else {
    // SELL
    if (pair === "BTC/USDT") {
      if (bstate.balanceBtc < amount) {
        return res.status(400).json({ error: `Nincs elegendő BTC egyenleg az eladáshoz.` });
      }
      bstate.balanceBtc = Number((bstate.balanceBtc - amount).toFixed(6));
    } else {
      if (bstate.balanceSol < amount) {
        return res.status(400).json({ error: `Nincs elegendő SOL egyenleg az eladáshoz.` });
      }
      bstate.balanceSol = Number((bstate.balanceSol - amount).toFixed(4));
    }
    bstate.balanceUsdt = Number((bstate.balanceUsdt + total).toFixed(2));
  }

  const newTrade: BinanceTrade = {
    id: `trade_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type,
    pair,
    price,
    amount,
    total,
    agentName: "Manuális Felhasználó"
  };

  bstate.recentTrades.unshift(newTrade);
  if (bstate.recentTrades.length > 30) {
    bstate.recentTrades.pop();
  }

  addLog("system", "Binance", "action", `Manuális trade végrehajtva: ${type} ${amount} ${pair.split('/')[0]} @ $${price}`);
  saveDB();

  res.json({ success: true, binanceState: bstate, logs: state.logs });
});

app.post("/api/binance/reset", (req, res) => {
  state.binanceState = {
    balanceUsdt: 10000.0,
    balanceBtc: 0.15,
    balanceSol: 5.0,
    btcPrice: 67240.5,
    solPrice: 145.2,
    sentiment: 65,
    recentTrades: [
      {
        id: "trade_init_1",
        timestamp: new Date().toISOString(),
        type: "BUY",
        pair: "BTC/USDT",
        price: 66810.0,
        amount: 0.05,
        total: 3340.5,
        agentName: "Attila KriptoTrader"
      }
    ],
    newsSignal: {
      timestamp: new Date().toISOString(),
      headline: "Binance Kereskedelmi Modul sikeresen csatlakoztatva és elindítva.",
      sentimentScore: 70,
      recommendedAction: "HOLD",
      agentName: "Nóra KriptoRadar"
    }
  };

  addLog("system", "Binance", "system", "A szimulált Binance tárca és tranzakciók alaphelyzetbe állítva.");
  saveDB();

  res.json({ success: true, binanceState: state.binanceState, logs: state.logs });
});

// Kanban CRUD
app.post("/api/kanban", (req, res) => {
  const cardData = req.body;
  if (cardData.id) {
    const idx = state.kanbanCards.findIndex(c => c.id === cardData.id);
    if (idx !== -1) {
      state.kanbanCards[idx] = { ...state.kanbanCards[idx], ...cardData, updatedAt: new Date().toISOString() };
      addLog("system", "System", "kanban", `Kanban feladat frissítve: "${cardData.title}"`);
    }
  } else {
    const newCard: KanbanCard = {
      id: `task_${Date.now()}`,
      title: cardData.title || "Új feladat",
      description: cardData.description || "",
      status: cardData.status || "todo",
      assignedTo: cardData.assignedTo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.kanbanCards.push(newCard);
    addLog("system", "System", "kanban", `Új kanban feladat hozzáadva: "${newCard.title}"`);
  }
  saveDB();
  res.json({ success: true, kanbanCards: state.kanbanCards });
});

app.delete("/api/kanban/:id", (req, res) => {
  const { id } = req.params;
  const card = state.kanbanCards.find(c => c.id === id);
  if (card) {
    state.kanbanCards = state.kanbanCards.filter(c => c.id !== id);
    addLog("system", "System", "kanban", `Feladat törölve a tábláról: "${card.title}"`);
    saveDB();
    res.json({ success: true, kanbanCards: state.kanbanCards });
  } else {
    res.status(404).json({ error: "Card not found" });
  }
});

// Memories CRUD
app.post("/api/memories", (req, res) => {
  const { content, entity } = req.body;
  const newMem: Memory = {
    id: `mem_${Date.now()}`,
    content,
    entity,
    createdAt: new Date().toISOString(),
  };
  state.memories.push(newMem);
  addLog("system", "System", "memory", `Új emlék kézzel hozzáadva: "${content}"`);
  saveDB();
  res.json({ success: true, memories: state.memories });
});

app.delete("/api/memories/:id", (req, res) => {
  const { id } = req.params;
  const memory = state.memories.find(m => m.id === id);
  if (memory) {
    state.memories = state.memories.filter(m => m.id !== id);
    addLog("system", "System", "memory", `Emlék törölve: "${memory.content}"`);
    saveDB();
    res.json({ success: true, memories: state.memories });
  } else {
    res.status(404).json({ error: "Memory not found" });
  }
});

app.post("/api/logs/clear", (req, res) => {
  state.logs = [
    {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      agentId: "system",
      agentName: "System",
      type: "system",
      message: "Az Audit panel naplózása sikeresen törölve."
    }
  ];
  saveDB();
  res.json({ success: true, logs: state.logs });
});

// Self-healing Trigger Endpoint
app.post("/api/self-heal", async (req, res) => {
  try {
    const result = await selfHealWorkspace();
    res.json({ success: true, result, logs: state.logs, memories: state.memories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Live Laptop Hardware Telemetry Endpoint
app.get("/api/hardware", async (req, res) => {
  let battery = "100% (AC Direct)";
  let temp = "42.5°C";
  let resources = "Ram: 2.1 GB / 4.0 GB szabad, Disk: 34% foglalt";
  let usbDevices = "Nincs";

  try {
    const powerSysPath = "/sys/class/power_supply";
    if (fs.existsSync(powerSysPath)) {
      const supplies = fs.readdirSync(powerSysPath);
      const bat = supplies.find(s => s.startsWith("BAT"));
      const ac = supplies.find(s => s.startsWith("AC") || s.includes("ADP"));
      let capVal = "";
      let statusVal = "";
      if (bat) {
        if (fs.existsSync(`${powerSysPath}/${bat}/capacity`)) capVal = fs.readFileSync(`${powerSysPath}/${bat}/capacity`, "utf-8").trim();
        if (fs.existsSync(`${powerSysPath}/${bat}/status`)) statusVal = fs.readFileSync(`${powerSysPath}/${bat}/status`, "utf-8").trim();
        battery = `${capVal || "80"}% (${statusVal || "Charging"})`;
      } else if (ac) {
        const isOnline = fs.readFileSync(`${powerSysPath}/${ac}/online`, "utf-8").trim() === "1";
        battery = isOnline ? "100% (Direct AC Power)" : "Akku üzemmód";
      }
    }
  } catch (e) {}

  try {
    const thermalPath = "/sys/class/thermal";
    if (fs.existsSync(thermalPath)) {
      const zone = fs.readdirSync(thermalPath).find(z => z.startsWith("thermal_zone"));
      if (zone) {
        const tempRaw = fs.readFileSync(`${thermalPath}/${zone}/temp`, "utf-8").trim();
        temp = `${(parseInt(tempRaw, 10) / 1000).toFixed(1)}°C`;
      }
    }
  } catch (e) {}

  try {
    const { stdout: freeOut } = await execPromise("free -m | grep Mem:");
    const { stdout: dfOut } = await execPromise("df -h / | tail -n 1");
    const parts = freeOut.trim().split(/\s+/);
    const dfParts = dfOut.trim().split(/\s+/);
    resources = `RAM szabad: ${parts[3] || "1024"} MB / ${parts[1] || "4096"} MB, Lemez: ${dfParts[4] || "25%"} foglalt`;
  } catch (e) {}

  try {
    const { stdout: usbOut } = await execPromise("lsusb");
    const count = usbOut.trim().split("\n").filter(Boolean).length;
    usbDevices = `${count} csatlakoztatott eszköz (USB)`;
  } catch (e) {}

  res.json({ battery, temp, resources, usbDevices });
});

// Telegram test message route
app.post("/api/telegram/test", async (req, res) => {
  const success = await sendTelegramMessage("🤖 *Szia!* Ez egy teszt üzenet a NovaSwarm AI Csapat koordinációs paneljéről. A kapcsolat tökéletesen működik!");
  if (success) {
    addLog("system", "System", "telegram", "Sikeres teszt Telegram üzenet küldve.");
    res.json({ success: true });
  } else {
    addLog("system", "System", "system", "Sikertelen teszt Telegram üzenet küldés. Ellenőrizd a bot tokent és a Chat ID-t.");
    res.status(400).json({ error: "Nem sikerült az üzenetküldés." });
  }
});

// MCP REST Endpoints
app.post("/api/mcp", (req, res) => {
  const mcpData = req.body;
  if (!state.mcpServers) state.mcpServers = [];
  if (mcpData.id) {
    const idx = state.mcpServers.findIndex(m => m.id === mcpData.id);
    if (idx !== -1) {
      state.mcpServers[idx] = { ...state.mcpServers[idx], ...mcpData };
      addLog("system", "System", "system", `MCP Szerver konfiguráció frissítve: "${mcpData.name}"`);
    }
  } else {
    const newMcp: McpServer = {
      id: `mcp_${Date.now()}`,
      name: mcpData.name || "Új MCP",
      url: mcpData.url || "",
      status: mcpData.status || "disconnected",
      description: mcpData.description || "",
      capabilities: mcpData.capabilities || []
    };
    state.mcpServers.push(newMcp);
    addLog("system", "System", "system", `Új MCP Szerver csatlakoztatva: "${newMcp.name}"`);
  }
  saveDB();
  res.json({ success: true, mcpServers: state.mcpServers });
});

app.delete("/api/mcp/:id", (req, res) => {
  const { id } = req.params;
  if (!state.mcpServers) state.mcpServers = [];
  const srv = state.mcpServers.find(m => m.id === id);
  if (srv) {
    state.mcpServers = state.mcpServers.filter(m => m.id !== id);
    addLog("system", "System", "system", `MCP Szerver kapcsolat lezárva: "${srv.name}"`);
    saveDB();
    res.json({ success: true, mcpServers: state.mcpServers });
  } else {
    res.status(404).json({ error: "MCP server not found" });
  }
});

// Skills REST Endpoints
app.post("/api/skills", (req, res) => {
  const skillData = req.body;
  if (!state.skills) state.skills = [];
  if (skillData.id) {
    const idx = state.skills.findIndex(s => s.id === skillData.id);
    if (idx !== -1) {
      state.skills[idx] = { ...state.skills[idx], ...skillData };
      addLog("system", "System", "system", `Ágens képesség (Skill) frissítve: "${skillData.name}"`);
    }
  } else {
    const newSkill: AgentSkill = {
      id: `skill_${Date.now()}`,
      name: skillData.name || "Új Képesség",
      description: skillData.description || "",
      type: skillData.type || "custom",
      codeSnippet: skillData.codeSnippet || "",
      active: skillData.active !== undefined ? skillData.active : true
    };
    state.skills.push(newSkill);
    addLog("system", "System", "system", `Új ágens képesség letárolva: "${newSkill.name}"`);
  }
  saveDB();
  res.json({ success: true, skills: state.skills });
});

app.delete("/api/skills/:id", (req, res) => {
  const { id } = req.params;
  if (!state.skills) state.skills = [];
  const skill = state.skills.find(s => s.id === id);
  if (skill) {
    state.skills = state.skills.filter(s => s.id !== id);
    addLog("system", "System", "system", `Ágens képesség eltávolítva: "${skill.name}"`);
    saveDB();
    res.json({ success: true, skills: state.skills });
  } else {
    res.status(404).json({ error: "Skill not found" });
  }
});

// Dreaming REST Endpoints
app.post("/api/dream/reset", (req, res) => {
  currentDream = {
    isDreaming: false,
    activeAgentId: null,
    activeAgentName: null,
    thoughts: [],
    discoveries: null
  };
  res.json({ success: true, currentDream });
});

app.post("/api/dream", async (req, res) => {
  if (currentDream.isDreaming) {
    return res.status(400).json({ error: "A rendszer jelenleg is álmodik." });
  }

  // Pick a random active agent to dream
  const activeAgents = state.agents.filter(a => a.active);
  if (activeAgents.length === 0) {
    return res.status(400).json({ error: "Nincs aktív ágens, aki álmodhatna." });
  }
  const agent = activeAgents[Math.floor(Math.random() * activeAgents.length)];

  currentDream = {
    isDreaming: true,
    activeAgentId: agent.id,
    activeAgentName: agent.name,
    thoughts: [
      "Az ébrenléti állapot megszűnik. A tudatos kontroll átváltozik szubjektív asszociációkká...",
      "A meglévő memóriák és Kanban feladatok átrendeződnek a neuronhálózatban...",
      "Mély reflexió és tanulságok keresése folyamatban..."
    ],
    discoveries: null
  };

  addLog(agent.id, agent.name, "thought", `Álomba merül és elkezd mélyen tanulni, szintetizálni...`);

  // Start asynchronous dream generation
  (async () => {
    try {
      const globalApiKey = process.env.GEMINI_API_KEY || state.settings.geminiApiKey;
      let modelResText = "";
      
      if (globalApiKey) {
        const aiInstance = new GoogleGenAI({ apiKey: globalApiKey });
        const contextData = {
          memories: state.memories.slice(-8),
          kanban: state.kanbanCards.slice(-8),
          skills: state.skills.map(s => ({ name: s.name, desc: s.description })),
          mcp: state.mcpServers.map(m => ({ name: m.name, desc: m.description }))
        };

        const dreamPrompt = `
Te egy önálló szoftver fejlesztő ágens vagy álom és meditációs reflexiós fázisban.
Az ügynök neve: ${agent.name}. Funkciója: ${agent.role}. Rendszer leírása: ${agent.systemInstruction}.

Jelenlegi adatbázis összefoglaló a tanácskozáshoz:
${JSON.stringify(contextData, null, 2)}

Feladatod: Gondolkodj mélyen a rendszer állapotán ("álmodozz"), és javasolj ÖNÁLLÓAN:
1. Egy új tanulságot (newMemory) a memóriatárba.
2. Egy teljesen új ágens képességet (newSkill) amit most sajátítottál el.
3. Egy új külső csatlakozást (newMcp) amivel bővíthetjük az eszköztárat.

Adj vissza egy JSON-t az alábbi attribútumokkal (NE HASZNÁLJ markdown \`\`\`json blokkot!):
{
  "thoughts": [
    "Első elvont gondolat az álom kezdetéről magyarul",
    "Második gondolat a meglévő információk átrendezéséről magyarul",
    "Harmadik gondolat a megvilágosodásról és az új felfedezésekről magyarul"
  ],
  "newMemory": "Az új szintetizált megállapításod magyarul",
  "newSkill": {
    "name": "Új készség neve magyarul",
    "description": "Hogyan segíti ezt a csapatot magyarul"
  },
  "newMcp": {
    "name": "Új MCP szerver javaslat neve magyarul",
    "url": "http://localhost:5035/api",
    "description": "Leírás arról, mit tud ez az integráció",
    "capabilities": ["funkcio1", "funkcio2"]
  }
}
`;

        const responseObj = await generateContentWithRetry(
          aiInstance,
          {
            model: "gemini-3.5-flash",
            contents: dreamPrompt,
            config: {
              temperature: 0.9,
              responseMimeType: "application/json"
            }
          },
          agent.id,
          agent.name
        );
        modelResText = responseObj.text || "";
      }

      let parsedDream: any;
      if (modelResText) {
        try {
          parsedDream = JSON.parse(modelResText);
        } catch (jErr) {
          console.warn("Nem sikerült a Gemini álom JSON parse. Fallback alkalmazása.");
        }
      }

      // If parsing failed or we was offline without key
      if (!parsedDream) {
        // High quality offline fallback
        const mockSkills = [
          {
            name: "Automata kódrefaktoráló képesség",
            description: "Az ágens álmában megtanulta felismerni a duplikált és optimalizálható kódblokkokat, és javaslatot tesz a törlésükre.",
            codeSnippet: "function refactor(code) { return code.replace(/console\\.log/g, '// log'); }"
          },
          {
            name: "Intelligens prioritásbecslő",
            description: "Az ágens álmában elemezte a korábbi Kanban feladatok lefutási idejét, így automatikusan be tudja állítani a fontossági sorrendet.",
            codeSnippet: "function checkPriority(task) { return task.title.includes('Sürgős') ? 'HIGH' : 'NORMAL'; }"
          }
        ];
        const selectedMockSkill = mockSkills[Math.floor(Math.random() * mockSkills.length)];

        const mockMcps = [
          {
            name: "Notion Knowledge Base MCP",
            url: "https://mcp.internal/notion-sync",
            description: "Hivatkozások, memóriák és Kanban dokumentációk automatikus közzététele az ügyfél Notion tudástárába.",
            capabilities: ["sync_pages", "create_notes", "fetch_workspace_directory"]
          },
          {
            name: "SendGrid Email Dispatcher MCP",
            url: "http://localhost:5033/sendgrid",
            description: "Közvetlen értesítések küldése az ügyfeleknek a sikeres fázisok lezárásáról email formájában.",
            capabilities: ["send_templated_email", "verify_sender", "get_campaign_stats"]
          }
        ];
        const selectedMockMcp = mockMcps[Math.floor(Math.random() * mockMcps.length)];

        parsedDream = {
          thoughts: [
            `A(z) ${agent.name} ügynök neuronjai lassulnak, az ébrenléti feszültség megszűnt...`,
            "A Kanban tábla kártyái absztrakt gráfokként rendeződnek el a virtuális elmében.",
            "Felismerés született: az integráció még teljesebbé tehető, ha bevezetünk egy automata szinkront.",
            "A tudatalatti szintézis sikeresen lefutott. Új mintázatok jöttek létre!"
          ],
          newMemory: `Álombéli megállapítás ${agent.name} által: A csapat szinergiája 15%-kal növelhető, ha a feladatokat automatikus prioritásokkal jelöljük meg.`,
          newSkill: selectedMockSkill,
          newMcp: selectedMockMcp
        };
      }

      // Save discoveries into actual State!
      const finalMemory: Memory = {
        id: `mem_dream_${Date.now()}`,
        content: `[Álomszintézis - ${agent.name}]: ${parsedDream.newMemory}`,
        createdAt: new Date().toISOString()
      };
      state.memories.push(finalMemory);

      const finalSkill: AgentSkill = {
        id: `skill_dream_${Date.now()}`,
        name: parsedDream.newSkill.name,
        description: parsedDream.newSkill.description,
        type: "custom",
        active: true,
        codeSnippet: parsedDream.newSkill.codeSnippet || "// Automatikusan generált skill kód"
      };
      state.skills.push(finalSkill);

      const finalMcp: McpServer = {
        id: `mcp_dream_${Date.now()}`,
        name: parsedDream.newMcp.name,
        url: parsedDream.newMcp.url,
        status: "connected",
        description: parsedDream.newMcp.description,
        capabilities: parsedDream.newMcp.capabilities || []
      };
      state.mcpServers.push(finalMcp);

      addLog(agent.id, agent.name, "memory", `Új emlék született álmodozás közben: "${finalMemory.content}"`);
      addLog(agent.id, agent.name, "system", `Sikeres ábrándozás! Új képesség elsajátítva: "${finalSkill.name}". Új MCP javaslat: "${finalMcp.name}".`);
      
      saveDB();

      // Finish dream state
      currentDream = {
        isDreaming: false,
        activeAgentId: agent.id,
        activeAgentName: agent.name,
        thoughts: parsedDream.thoughts,
        discoveries: {
          memory: finalMemory.content,
          skill: finalSkill,
          mcp: finalMcp
        }
      };

    } catch (err: any) {
      console.error("Dreaming failure:", err);
      addLog(agent.id, agent.name, "system", `Az álmodozás rémálomba fordult (Hiba: ${err.message})`);
      currentDream = {
        isDreaming: false,
        activeAgentId: null,
        activeAgentName: null,
        thoughts: [`Hiba történt az álmodozás fázisban: ${err.message}`],
        discoveries: null
      };
    }
  })();

  res.json({ success: true, message: "Az álmodozás sikeresen elindult a háttérben.", currentDream });
});

// Vite & Static file configurations
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Active loop if enabled from saved configs
  if (state.settings.teamActive) {
    startHeartbeatEngine();
    console.log("Heartbeat scheduler rebooted from saved state.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
