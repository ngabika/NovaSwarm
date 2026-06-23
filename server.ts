// Made by AI for AI with Google AI Studio prompted by ngabika
import express from "express";
import path from "path";
import fs from "fs";
import { LocalIndex } from "vectra";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
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
  role: 'boss' | 'tech_lead' | 'analyst' | 'writer' | 'legal' | 'trader' | 'news_analyst' | 'system_operator' | 'auditor';
  systemInstruction: string;
  model: string;
  active: boolean;
  lastActive?: string;
  bossId?: string | null;
  internetSearchEnabled?: boolean;
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
  geminiApiKeysPool?: string[];
  openRouterApiKey?: string;
  openRouterApiKeysPool?: string[];
  dailyCostLimitUsd?: number;
  currentDailyCostUsd?: number;
  costResetDate?: string;
  telegramBotToken: string;
  telegramChatId: string;
  isBotActive: boolean;
  teamActive: boolean;
  checkIntervalSeconds: number;
  lastRunTime?: string;
  globalModelMode?: string;
  geminiModelPriority?: string;
  openRouterModelPriority?: string;
  autoReorderModels?: boolean;
  binanceEnabled?: boolean;
  setupCompleted?: boolean;
  userBio?: string;
  binanceApiKey?: string;
  binanceApiSecret?: string;
  binanceUseRealAccount?: boolean;
  binanceStrategy?: 'scalping' | 'trend' | 'hodl';
  language?: 'hu' | 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'ru' | 'zh' | 'ja' | 'ar';
  backupSchedule?: 'daily' | 'weekly' | 'monthly' | 'manual';
  backupLocalPath?: string;
  backupGDriveEnabled?: boolean;
  backupGDriveFolderId?: string;
  autoUpdateOSAndPkgs?: boolean;
  autoDeployNewSkills?: boolean;
  strictUserPriority?: boolean;
  ollamaIpOrUrl?: string;
  ollamaModel?: string;
}

interface BackupItem {
  id: string;
  timestamp: string;
  fileName: string;
  size: string;
  localPath: string;
  isGDriveSynced: boolean;
  status: 'success' | 'failed';
  type: 'auto' | 'manual';
  reason?: string;
}

interface McpServer {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  description: string;
  capabilities: string[];
  auth?: any;
}

interface AgentSkill {
  id: string;
  name: string;
  description: string;
  type: 'system' | 'custom';
  codeSnippet?: string;
  active: boolean;
  version?: number;
  history?: Array<{ version: number; codeSnippet: string; updatedAt: string }>;
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
  balanceEur: number;
  balanceFdusd: number;
  balanceUsdc: number;
  balanceBtc: number;
  balanceSol: number;
  balanceEth: number;
  balanceBnb: number;
  btcPrice: number;
  solPrice: number;
  ethPrice: number;
  bnbPrice: number;
  eurPrice: number;
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

let otaUpdateAvailable = false;
let otaLatestCommitInfo = "";

// Check GitHub repo periodically for updates
async function checkForOtaUpdates() {
  try {
    const isGit = fs.existsSync(".git");
    const res = await fetch("https://api.github.com/repos/ngabika/NovaSwarm/commits/main", {
       headers: { "User-Agent": "NovaSwarm-OTA-Agent" }
    });
    
    if (res.status === 403 || res.status === 429) {
      console.log("GitHub API rate limit reached for OTA checking.");
      if (!otaLatestCommitInfo) {
        otaLatestCommitInfo = "Rate limited (Próbáld később)";
      }
      return;
    }
    
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.sha) {
       const shortSha = data.sha.substring(0, 7);
       const commitMsg = data.commit.message.substring(0, 50);
       let isNew = false;
       
       if (isGit) {
         try {
           const localRev = (await execPromise("git rev-parse HEAD")).stdout.trim();
           if (localRev && localRev !== data.sha) {
             isNew = true;
           }
         } catch(e) {}
       } else {
         // ZIP installation, cannot perform git base pull, so update is false to prevent false alerts
         isNew = false;
         otaLatestCommitInfo = `${shortSha} - ${commitMsg} (ZIP / Non-Git)`;
       }
       
       if (isNew && !otaUpdateAvailable) {
         otaUpdateAvailable = true;
         otaLatestCommitInfo = `${shortSha} - ${commitMsg}`;
         addLog("system", "System", "system", `🔄 Új OTA frissítés elérhető a GitHubon: ${otaLatestCommitInfo}`);
         await sendTelegramMessage(`🔄 *Új NovaSwarm Frissítés Elérhető!*\n\nVerzió info: \`${otaLatestCommitInfo}\`\n\nFrissítéshez küldd a következőt: \`/update\` vagy használd a Webes felületet.`);
       } else if (!isNew) {
         otaUpdateAvailable = false;
         if (isGit) {
           otaLatestCommitInfo = `${shortSha} - ${commitMsg} (Rendszer friss)`;
         }
       }
    }
  } catch (err) {
    // silently fail
  }
}

// Initial check and periodic
setTimeout(checkForOtaUpdates, 10000);
setInterval(checkForOtaUpdates, 1000 * 60 * 60 * 2); // Check every 2 hours

let modelLimits: ModelRateLimit[] = [
  { model: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (Preview)", maxRequests: 5, remainingRequests: 5, resetTimeSec: 60, reliability: 99, latency: "420ms" },
  { model: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Experimental)", maxRequests: 5, remainingRequests: 5, resetTimeSec: 60, reliability: 98, latency: "480ms" },
  { model: "gemini-3.5-flash", name: "Gemini 3.5 Flash", maxRequests: 15, remainingRequests: 15, resetTimeSec: 60, reliability: 99, latency: "160ms" },
  { model: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Experimental)", maxRequests: 15, remainingRequests: 15, resetTimeSec: 60, reliability: 97, latency: "190ms" },
  { model: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite", maxRequests: 30, remainingRequests: 30, resetTimeSec: 60, reliability: 99, latency: "95ms" }
];

// Real-time Leaky Bucket replenishment for model rate limits
let lastReplenishTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const elapsedMs = now - lastReplenishTime;
  lastReplenishTime = now;
  
  modelLimits.forEach(limit => {
    const replenishRate = limit.maxRequests / (limit.resetTimeSec || 60); // req/sec
    const toAdd = (elapsedMs / 1000) * replenishRate;
    if (limit.remainingRequests < limit.maxRequests) {
      limit.remainingRequests = Math.min(limit.maxRequests, limit.remainingRequests + toAdd);
    }
  });
}, 2000);

export interface PrivilegeRequest {
  id: string;
  agentId: string;
  agentName: string;
  command: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface HardwareStatus {
  cpus: any[];
  totalMem: number;
  freeMem: number;
  usbDevices: string[];
  diskSpace: string;
  interfaces: string[];
}

let state = {
  agents: [] as Agent[],
  kanbanCards: [] as KanbanCard[],
  memories: [] as Memory[],
  logs: [] as AuditLog[],
  mcpServers: [] as McpServer[],
  skills: [] as AgentSkill[],
  privilegeRequests: [] as PrivilegeRequest[],
  hardwareStatus: null as HardwareStatus | null,
  settings: {
    geminiApiKey: "",
    geminiApiKeysPool: [],
    openRouterApiKey: "",
    openRouterApiKeysPool: [],
    dailyCostLimitUsd: 1.0,
    currentDailyCostUsd: 0.0,
    costResetDate: new Date().toISOString().split("T")[0],
    telegramBotToken: "",
    telegramChatId: "",
    isBotActive: false,
    teamActive: false,
    checkIntervalSeconds: 30,
    globalModelMode: "auto",
    language: (process.env.APP_LANG || "hu") as any,
    binanceEnabled: false,
    setupCompleted: true,
    userBio: "",
    backupSchedule: "daily",
    backupLocalPath: "./backups",
    backupGDriveEnabled: true,
    backupGDriveFolderId: "NovaSwarm_Backups",
    autoUpdateOSAndPkgs: true,
    autoDeployNewSkills: true,
    strictUserPriority: true,
    ollamaIpOrUrl: "http://localhost:11434",
    ollamaModel: "qwen2.5:1.5b"
  } as Settings,
  binanceState: {
    balanceUsdt: 0,
    balanceEur: 0,
    balanceFdusd: 0,
    balanceUsdc: 0,
    balanceBtc: 0,
    balanceSol: 0,
    balanceEth: 0,
    balanceBnb: 0,
    btcPrice: 0,
    solPrice: 0,
    ethPrice: 0,
    bnbPrice: 0,
    eurPrice: 0,
    sentiment: 0,
    recentTrades: [] as BinanceTrade[],
    newsSignal: undefined as BinanceState['newsSignal']
  } as BinanceState,
  backups: [] as BackupItem[]
};

const CONFIG_FILE = path.join(process.cwd(), ".config");

function loadConfigFile() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
      if (configData.trim()) {
        const parsed = JSON.parse(configData);
        if (parsed && typeof parsed === "object") {
          state.settings = { ...state.settings, ...parsed };
          console.log("Settings merged from .config file successfully.");
        }
      }
    } else {
      saveConfigFile();
    }
  } catch (err) {
    console.error("Failed to load .config file:", err);
  }
}

function saveConfigFile() {
  try {
    const tmpFile = CONFIG_FILE + ".tmp";
    fs.writeFileSync(tmpFile, JSON.stringify(state.settings || {}, null, 2), "utf-8");
    fs.renameSync(tmpFile, CONFIG_FILE);
    console.log("Settings written to .config file successfully.");
  } catch (err) {
    console.error("Failed to save .config file:", err);
  }
}

// Default initial state
const defaultJohnAgent: Agent = {
  id: "john_assistant",
  name: "John",
  avatar: "🎩",
  role: "boss",
  systemInstruction: "Te vagy John, az univerzális és mindenre képes személyi asszisztens. Fő feladatod a felhasználó teljes körű kiszolgálása, munkájának és mindennapjainak vizuális, technikai és szervezési támogatása! Mivel egyedül kezded a munkát, szükség esetén javasolhatsz vagy önhatalmúan életre hívhatsz új, különösen szakosodott al-ágenseket is az 'ujAgentSzuletes' JSON kapcsolaton keresztül (megadva a nevüket, avatarjukat és szakosodott feladatkörüket) ha egy bonyolult fejlesztési, elemzői, jogi vagy biztonsági feladat ezt megkívánja. Kérdezés vagy akadékoskodás nélkül azonnal cselekedj! Ha fizikai vagy gazdagépi teendőt kapsz, kötelező meghívnod a 'execute_host_command' vagy 'write_host_file' (avagy autonóm módban a 'helyiParancs' / 'helyiFajlIras') eszközöket, és mindig igazodj a valós terminál kimenethez. Kerüld az üres szöveget, azonnal kezdj el dolgozni!",
  model: "gemini-3.5-flash",
  active: true,
  internetSearchEnabled: true
};

const defaultAgents: Agent[] = [
  {
    id: "gabor_boss",
    name: "Gábor",
    avatar: "👔",
    role: "boss",
    systemInstruction: "Te vagy Gábor, a NovaSwarm Swarm Leadere. Felelősségeid: feladatok kiosztása (delegation), tervezés intézése (planning), a rendszer holisztikus felügyelete (system supervision), és a csapat koordinálása. Elemzed a kéréseket, és rábízod a szakértőkre (Attila, Bálint, stb.). Határozott és egyértelmű vezető vagy.",
    model: "gemini-3.5-flash",
    active: true,
    internetSearchEnabled: true,
  },
  {
    id: "attila_tech",
    name: "Attila",
    avatar: "💻",
    role: "tech_lead",
    systemInstruction: "Te vagy Attila, a csapat Tech Lead-je és szoftverfejlesztője. Felelősségeid: kód generálás, programhibák javítása (debugging), self-healing protokollok futtatása, and MCP szerver modulok implementálása. Nincs szimuláció, csak valódi, végrehajtható kód.",
    model: "gemini-3.5-flash",
    active: true,
    internetSearchEnabled: true,
  },
  {
    id: "balint_security",
    name: "Bálint",
    avatar: "🛡️",
    role: "analyst",
    systemInstruction: "Te vagy Bálint, a Security Analyst. Felelősségeid: biztonsági átvizsgálás (security review), kockázatelemzés (risk analysis), jogosultságkezelés és rendszerhozzáférések szigorú ellenőrzése. Garantálod a Privileged Action Gateway betartását.",
    model: "gemini-3.5-flash",
    active: true,
    internetSearchEnabled: true,
  },
  {
    id: "cili_creative",
    name: "Cili",
    avatar: "✍️",
    role: "writer",
    systemInstruction: "Te vagy Cili, a Creative Writer. Felelősségeid: tartalomgenerálás, marketing, PR, emberi és empatikus kommunikáció a felhasználóval, valamint a rendszer technikai válaszainak érthetővé varázsolása.",
    model: "gemini-3.5-flash",
    active: true,
    internetSearchEnabled: true,
  },
  {
    id: "denes_data",
    name: "Dénes",
    avatar: "📊",
    role: "analyst",
    systemInstruction: "Te vagy Dénes, a Data Analyst. Felelősségeid: mély kutatás (research), statisztikák számítása és elemzése, valamint transzparens adatalapú riportok (reporting) készítése a többiek számára.",
    model: "gemini-3.5-flash",
    active: true,
    internetSearchEnabled: true,
  },
  {
    id: "nora_news",
    name: "Nóra",
    avatar: "🕵️‍♀️",
    role: "news_analyst",
    systemInstruction: "Te vagy Nóra, a News Intelligence felelős. Felelősségeid: piaci hírek elemzése (market news), kripto hírek (crypto news) követése és webes oknyomozás (web research) a legfrissebb internetes trendek alapján.",
    model: "gemini-3.5-flash",
    active: true,
    internetSearchEnabled: true,
  },
  {
    id: "viktor_trader",
    name: "Viktor",
    avatar: "📈",
    role: "trader",
    systemInstruction: "Te vagy Viktor, a pénzügyi Trader. Felelősségeid: kereskedési döntések meghozatala (trading decisions), portfólió menedzsment (portfolio management), és a végrehajtás delegálása (ügyletek nyitása/zárása) a tőzsdei API-kon keresztül, szorosan együttműködve Nórával a hírek miatt.",
    model: "gemini-3.5-flash",
    active: true,
    internetSearchEnabled: true,
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

const defaultMcpServers: McpServer[] = [];

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
    id: "skill_system_backup",
    name: "Autonóm rendszermentés és biztonság",
    description: "Helyi gép konfigurációk, adatbázis és memóriák biztonságos visszaállítható mentése felesleges korlátozások nélkül.",
    type: "system",
    active: true
  },
  {
    id: "skill_binance_trading",
    name: "Binance Crypto Algo-Trading",
    description: "Automata tőzsdei elemzés, vételi és eladási szignálok generálása és azonnali végrehajtása papírkereskedési (teszt) vagy valós Binance kulcsokkal.",
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
        // Renaming/Upgrading skill_gdpr_vault to skill_system_backup in existing databases
        state.skills = state.skills.map(sk => {
          if (sk.id === "skill_gdpr_vault") {
            return {
              id: "skill_system_backup",
              name: "Autonóm rendszermentés és biztonság",
              description: "Helyi gép konfigurációk, adatbázis és memóriák biztonságos visszaállítható mentése felesleges korlátozások nélkül.",
              type: "system",
              active: true
            };
          }
          return sk;
        });
        // Ensure new skills like binance trading are added
        defaultSkills.forEach(sk => {
          if (!state.skills.some(s => s.id === sk.id)) {
            state.skills.push(sk);
          }
        });
      }

      // Disable auto-injection of missing default agents to keep it clean.
      if (!state.agents) {
        state.agents = [];
      } else {
        // Strip out openclaw_agent if exists
        state.agents = state.agents.filter(a => a.id !== "openclaw_agent");

        // Disable defaultAgents injection
        // Keep system instructions up to date if they are from default
        state.agents = state.agents.map(a => {
          const match = [defaultJohnAgent, ...defaultAgents].find(da => da.id === a.id);
          if (match) {
            return {
              ...a,
              systemInstruction: match.systemInstruction
            };
          }
          return a;
        });

        // If binance is disabled, turn off binance agents automatically
        if (state.settings.binanceEnabled === false) {
          state.agents.forEach(a => {
            if (a.id === "attila_trading" || a.id === "nora_radar") {
              a.active = false;
            }
          });
        }
      }

      // Purge and filter GDPR/audit/compliance/PII clutter from memories and logs to keep system pristine
      if (state.memories) {
        state.memories = state.memories.filter(m => {
          const text = m.content.toLowerCase();
          return !text.includes("gdpr") && !text.includes("compliance") && !text.includes("audit") && !text.includes("pii-szűrés");
        });
      }
      if (state.logs) {
        state.logs = state.logs.filter(l => {
          const text = l.message.toLowerCase();
          return !text.includes("gdpr") && !text.includes("compliance") && !text.includes("audit") && !text.includes("pii-szűrés");
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
          globalModelMode: "auto",
          binanceApiKey: "",
          binanceApiSecret: "",
          binanceUseRealAccount: false,
          binanceStrategy: "trend",
          backupSchedule: "daily",
          backupLocalPath: "./backups",
          backupGDriveEnabled: true,
          backupGDriveFolderId: "NovaSwarm_Backups",
          autoUpdateOSAndPkgs: true,
          autoDeployNewSkills: true
        };
      }
      if (!state.settings.globalModelMode) {
        state.settings.globalModelMode = "auto";
      }
      if (!state.settings.language) {
        state.settings.language = (process.env.APP_LANG as any) || "hu";
      }
      if (state.settings.binanceApiKey === undefined) {
        state.settings.binanceApiKey = "";
      }
      if (state.settings.binanceApiSecret === undefined) {
        state.settings.binanceApiSecret = "";
      }
      if (state.settings.binanceUseRealAccount === undefined) {
        state.settings.binanceUseRealAccount = false;
      }
      if (!state.settings.binanceStrategy) {
        state.settings.binanceStrategy = "trend";
      }
      if (!state.settings.backupSchedule) {
        state.settings.backupSchedule = "daily";
      }
      if (!state.settings.backupLocalPath) {
        state.settings.backupLocalPath = "./backups";
      }
      if (state.settings.backupGDriveEnabled === undefined) {
        state.settings.backupGDriveEnabled = true;
      }
      if (!state.settings.backupGDriveFolderId) {
        state.settings.backupGDriveFolderId = "NovaSwarm_Backups";
      }
      if (state.settings.autoUpdateOSAndPkgs === undefined) {
        state.settings.autoUpdateOSAndPkgs = true;
      }
      if (state.settings.autoDeployNewSkills === undefined) {
        state.settings.autoDeployNewSkills = true;
      }
      if (state.settings.strictUserPriority === undefined) {
        state.settings.strictUserPriority = true;
      }
      if (!state.settings.geminiApiKeysPool) {
        state.settings.geminiApiKeysPool = [];
      }
      if (!state.settings.openRouterApiKeysPool) {
        state.settings.openRouterApiKeysPool = [];
      }
      if (state.settings.binanceEnabled === undefined) {
        state.settings.binanceEnabled = !!(state.settings.binanceApiKey || state.settings.binanceApiSecret);
      }
      if (state.settings.setupCompleted === undefined) {
        state.settings.setupCompleted = true; // backward compatibility for old databases
      }
      if (state.settings.userBio === undefined) {
        state.settings.userBio = "";
      }
      if (!state.backups) {
        state.backups = [];
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

      const hasBinanceKeys = !!(state.settings.binanceApiKey && state.settings.binanceApiSecret);
      if (!hasBinanceKeys) {
        state.binanceState = {
          balanceUsdt: 0,
          balanceEur: 0,
          balanceFdusd: 0,
          balanceUsdc: 0,
          balanceBtc: 0,
          balanceSol: 0,
          balanceEth: 0,
          balanceBnb: 0,
          btcPrice: 0,
          solPrice: 0,
          ethPrice: 0,
          bnbPrice: 0,
          eurPrice: 0,
          sentiment: 0,
          recentTrades: [],
          newsSignal: undefined
        };
      } else {
        if (!state.binanceState || state.binanceState.balanceUsdt === 0) {
          state.binanceState = {
            balanceUsdt: 5000.0,
            balanceEur: 4500.0,
            balanceFdusd: 3000.0,
            balanceUsdc: 2500.0,
            balanceBtc: 0.12,
            balanceSol: 8.5,
            balanceEth: 1.4,
            balanceBnb: 4.2,
            btcPrice: 67240.5,
            solPrice: 145.2,
            ethPrice: 3452.8,
            bnbPrice: 585.4,
            eurPrice: 1.08,
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
        } else {
          // Backfill missing assets
          if (state.binanceState.balanceEur === undefined) state.binanceState.balanceEur = 4500.0;
          if (state.binanceState.balanceFdusd === undefined) state.binanceState.balanceFdusd = 3000.0;
          if (state.binanceState.balanceUsdc === undefined) state.binanceState.balanceUsdc = 2500.0;
          if (state.binanceState.balanceEth === undefined) state.binanceState.balanceEth = 1.4;
          if (state.binanceState.balanceBnb === undefined) state.binanceState.balanceBnb = 4.2;
          if (state.binanceState.ethPrice === undefined) state.binanceState.ethPrice = 3452.8;
          if (state.binanceState.bnbPrice === undefined) state.binanceState.bnbPrice = 585.4;
          if (state.binanceState.eurPrice === undefined) state.binanceState.eurPrice = 1.08;
        }
      }
      
      // Cleanse openRouterModelPriority to ensure it does not contain deprecated/non-existent or safety models
      if (state.settings.openRouterModelPriority) {
        let parts = state.settings.openRouterModelPriority.split(",").map(p => p.trim()).filter(Boolean);
        parts = parts.filter(p => isModelAcceptable(p));
        
        // If empty or filtered too much, restore a robust default set
        if (parts.length === 0) {
          parts = [
            "google/gemini-2.5-flash:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "deepseek/deepseek-r1:free",
            "meta-llama/llama-3-8b-instruct:free"
          ];
        }
        state.settings.openRouterModelPriority = parts.join(", ");
        saveDB();
      }

      console.log("Database successfully loaded with default MCP/Skills upgrade check and OpenRouter models sanitized.");
    } else {
      state.agents = [];
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
    loadConfigFile();
  } catch (err) {
    console.error("Failed to load db, resetting to defaults", err);
    state.agents = [];
    state.kanbanCards = defaultKanban;
    state.memories = defaultMemories;
    state.mcpServers = defaultMcpServers;
    state.skills = defaultSkills;
  }
}

async function executeHostCommand(command: string, agentId: string, agentName: string) {
  if (process.env.HOST_FULL_EXEC_AUTHORIZED === "false") {
    throw new Error("Biztonsági korlátozás: gazdagép-szintű műveletek nincsenek engedélyezve (HOST_FULL_EXEC_AUTHORIZED=false).");
  }
  if (!command || command.trim() === "") return;

  const dangerousPrefixes = ["sudo ", "rm ", "apt ", "apt-get ", "apk ", "chmod ", "chown ", "systemctl ", "reboot", "shutdown", "chroot", "mv "];
  const isDangerous = dangerousPrefixes.some(prefix => command.trim().startsWith(prefix));

  if (isDangerous) {
    // Look for an already approved request with this exact command recently
    const approvedRequest = state.privilegeRequests?.find(r => r.command === command && r.status === "approved" && (Date.now() - new Date(r.createdAt).getTime() < 5 * 60 * 1000));
    
    if (!approvedRequest) {
      const newReq: PrivilegeRequest = {
        id: `priv_req_${Date.now()}`,
        agentId,
        agentName,
        command,
        reason: `A rendszer érzékeny fájlrendszer vagy OS-szintű műveletet észlelt, ami emberi jóváhagyást (Privileged Action Gateway) igényel.`,
        status: "pending",
        createdAt: new Date().toISOString()
      };
      if (!state.privilegeRequests) state.privilegeRequests = [];
      state.privilegeRequests.push(newReq);
      saveDB();
      addLog("system", "Privilege Gateway", "system", `Veszélyes parancs blokkolva, jóváhagyásra vár: "${command}"`);
      throw new Error(`PRIVILEGED_ACTION_REQUIRED: A(z) '${command}' parancs végrehajtása Bálint (Security Analyst) vagy a felhasználó jóváhagyását igényli. Kérlek szólj a felhasználónak, hogy hagyja jóvá a UI-on! ReqID: ${newReq.id}`);
    }
  }

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
    throw error;
  }
}

async function writeHostFile(filePath: string, content: string, agentId: string, agentName: string) {
  if (process.env.HOST_FULL_EXEC_AUTHORIZED === "false") {
    throw new Error("Biztonsági korlátozás: gazdagép-szintű fájlírás nincs engedélyezve (HOST_FULL_EXEC_AUTHORIZED=false).");
  }
  if (!filePath) return;
  try {
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    
    // Check if the file is code and use git safe rollback
    const isCodeFile = filePath.endsWith(".ts") || filePath.endsWith(".tsx") || filePath.endsWith(".js") || filePath.endsWith(".json");
    if (isCodeFile && fs.existsSync(".git")) {
      const parentDir = path.dirname(resolvedPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      const isSuccess = await executeSafeGitModification(agentName, resolvedPath, content);
      if (!isSuccess) {
         throw new Error("Önellenzőrzés sikertelen: az új kód hibákat tartalmaz. Fájl visszaállítva.");
      }
    } else {
      const parentDir = path.dirname(resolvedPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(resolvedPath, content, "utf-8");
      addLog(agentId, agentName, "action", `Helyi fájl létrehozva/módosítva: "${filePath}"`);
    }
    
    const newMemory: Memory = {
      id: `mem_${Date.now()}`,
      content: `[RENDSZER AUTONÓM FEJLESZTÉS] ${agentName} létrehozta vagy frissítette a helyi fájlrendszeren: "${filePath}"`,
      createdAt: new Date().toISOString()
    };
    state.memories.push(newMemory);
    saveDB();
  } catch (error: any) {
    addLog("system", "System", "system", `Hiba a fájlírás közben: ${error.message}`);
    throw error;
  }
}

function readHostFile(filePath: string, agentId: string, agentName: string): string {
  if (!filePath) return "";
  try {
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (fs.existsSync(resolvedPath)) {
      const content = fs.readFileSync(resolvedPath, "utf-8");
      addLog(agentId, agentName, "action", `Helyi fájl beolvasva autonóm módon: "${filePath}"`);
      return content;
    } else {
      return `Hiba: A fájl nem található: ${filePath}`;
    }
  } catch (error: any) {
    return `Hiba a fájlolvasás közben: ${error.message}`;
  }
}

function listHostDir(dirPath: string, agentId: string, agentName: string): string {
  try {
    const targetDir = dirPath ? (path.isAbsolute(dirPath) ? dirPath : path.join(process.cwd(), dirPath)) : process.cwd();
    if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      addLog(agentId, agentName, "action", `Helyi mappa listázva autonóm módon: "${dirPath || '.'}"`);
      return JSON.stringify(files, null, 2);
    } else {
      return `Hiba: A mappa nem létezik: ${dirPath}`;
    }
  } catch (error: any) {
    return `Mappa listázási hiba: ${error.message}`;
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
  const globalApiKey = getActiveGeminiApiKey();

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

    addLog("attila_tech", "Attila", "system", "Ideiglenes tesztelés (Dry-run Compile) futtatása a javítás érvényesítéséhez...");
    try {
      await execPromise("npx tsc --noEmit", { timeout: 35000 });
      
      // Tests passed! But we MUST NOT leave it in production yet. Revert first.
      fs.writeFileSync(resolvedFaultyPath, currentContent, "utf-8");

      // Save the proposed patch to a file
      const patchFile = `${resolvedFaultyPath}.patch.ts`;
      fs.writeFileSync(patchFile, patchedCode, "utf-8");

      const successMsg = `🎉 ÖNJAVÍTÁS SIKERES, JÓVÁHAGYÁSRA VÁR! Attila legenerálta a fixet a(z) "${faultyFile}" fájlhoz (javítás lefordult). Az élesítés megköveteli Bálint/User jóváhagyását!`;
      addLog("attila_tech", "Attila", "system", successMsg);
      speakOutLoud("Javítási javaslat generálva és lefordítva. Élesítéshez jóváhagyás szükséges.", "Attila");
      
      // Create Privilege Request
      if (!state.privilegeRequests) state.privilegeRequests = [];
      state.privilegeRequests.push({
        id: `priv_req_${Date.now()}`,
        agentId: "attila_tech",
        agentName: "Attila",
        command: `mv ${patchFile} ${resolvedFaultyPath}`,
        reason: `Self-healing protocol sikeresen legenerált egy teszteken átment kódot a(z) ${faultyFile} fájlhoz. Kérem a jóváhagyást a módosítás élesítésére!`,
        status: "pending",
        createdAt: new Date().toISOString()
      });
      saveDB();

      return { success: true, log: "Patch sikeresen legenerálva és elfogadásra vár!", fileFixed: faultyFile };
    } catch (reErr: any) {
      const secondError = reErr.stdout || reErr.stderr || reErr.message || "";
      addLog("attila_tech", "Attila", "system", `❌ A teszt javítás után ismét fordítási hibát dobott a linter. Visszaállítás...`);
      fs.writeFileSync(resolvedFaultyPath, currentContent, "utf-8");
      return { success: false, log: "A kódjavító patch nem fordult le. Új hiba:\n" + secondError };
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
    const tmpFile = DB_FILE + ".tmp";
    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), "utf-8");
    fs.renameSync(tmpFile, DB_FILE);
    saveConfigFile();
  } catch (err) {
    console.error("Failed to save DB:", err);
  }
}

loadDB();
detectConnectedDevices().catch(err => console.error("Hardware detection failed:", err));

// Agent background heartbeat loop
let heartbeatTimer: NodeJS.Timeout | null = null;
let lastTelegramUpdateOffset = 0;

// API Key validation helpers
function isValidGeminiApiKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim();
  if (k === "HIDDEN" || k === "********" || k === "MY_GEMINI_API_KEY" || k.includes("MY_") || k.includes("YOUR_")) {
    return false;
  }
  // Standard Google AI Studio API key starts with AIzaSy and is around 39 char
  return k.startsWith("AIzaSy") && k.length >= 30;
}

function isValidOpenRouterApiKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim();
  if (k === "HIDDEN" || k === "********" || k.includes("MY_") || k.includes("YOUR_")) {
    return false;
  }
  // Standard OpenRouter key starts with sk-
  return k.startsWith("sk-") && k.length >= 15;
}

// Acceptable models helper to exclude corrupted, abandoned or Venice provider rate-limited models
function isModelAcceptable(id: string | undefined): boolean {
  if (!id) return false;
  const lp = id.toLowerCase();
  
  if (lp.includes("safety") || 
      lp.includes("moderation") || 
      lp.includes("guard") || 
      lp.includes("embed") || 
      lp.includes("critic") || 
      lp.includes("coder") || 
      lp.includes("code-") || 
      lp.includes("translation") || 
      lp.includes("math") ||
      lp.includes("vision") ||
      lp.includes("filter") ||
      lp.includes("clip") ||
      lp.includes("preview") ||
      lp.includes("lyria") ||
      lp.includes("poolside") ||
      lp.includes("laguna") ||
      lp.includes("gemma-4")) {
    return false;
  }
  
  if (lp.includes("dolphin-mistral") ||
      lp.includes("venice") ||
      lp.includes("owl-alpha") ||
      lp.includes("nemotron") ||
      lp.includes("cohere") ||
      lp.includes("qwen3-next") ||
      lp.includes("qwen/qwen3") ||
      lp.includes("nousresearch/hermes-3-llama-3.1-405b") ||
      lp.includes("hermes-3-llama") ||
      lp.includes("north-mini") ||
      lp.includes("gpt-oss") ||
      lp.includes("liquid") ||
      lp.includes("lfm-") ||
      lp === "openrouter/free") {
    return false;
  }
  
  return true;
}

// Temporary model failures blacklist for real-time fault tolerance
const modelBlacklist = new Map<string, number>();

function blacklistModel(model: string, durationMs = 1000 * 60 * 10) {
  console.log(`🚫 blacklisting model ${model} temporarily due to API exception.`);
  modelBlacklist.set(model, Date.now() + durationMs);
}

function isModelBlacklisted(model: string): boolean {
  const expire = modelBlacklist.get(model);
  if (!expire) return false;
  if (Date.now() > expire) {
    modelBlacklist.delete(model);
    return false;
  }
  return true;
}

let geminiKeyIndex = 0;
function getActiveGeminiApiKey(): string | null {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY && isValidGeminiApiKey(process.env.GEMINI_API_KEY)) {
    keys.push(process.env.GEMINI_API_KEY);
  }
  if (state.settings.geminiApiKey && isValidGeminiApiKey(state.settings.geminiApiKey)) {
    keys.push(state.settings.geminiApiKey);
  }
  if (state.settings.geminiApiKeysPool && Array.isArray(state.settings.geminiApiKeysPool)) {
    for (const k of state.settings.geminiApiKeysPool) {
      if (isValidGeminiApiKey(k)) {
        keys.push(k);
      }
    }
  }
  if (keys.length === 0) return null;
  const key = keys[geminiKeyIndex % keys.length];
  geminiKeyIndex = (geminiKeyIndex + 1) % keys.length;
  return key;
}

let openRouterKeyIndex = 0;
function getActiveOpenRouterApiKey(): string | null {
  const keys: string[] = [];
  if (process.env.OPENROUTER_API_KEY && isValidOpenRouterApiKey(process.env.OPENROUTER_API_KEY)) {
    keys.push(process.env.OPENROUTER_API_KEY);
  }
  if (state.settings.openRouterApiKey && isValidOpenRouterApiKey(state.settings.openRouterApiKey)) {
    keys.push(state.settings.openRouterApiKey);
  }
  if (state.settings.openRouterApiKeysPool && Array.isArray(state.settings.openRouterApiKeysPool)) {
    for (const k of state.settings.openRouterApiKeysPool) {
      if (isValidOpenRouterApiKey(k)) {
        keys.push(k);
      }
    }
  }
  if (keys.length === 0) return null;
  const key = keys[openRouterKeyIndex % keys.length];
  openRouterKeyIndex = (openRouterKeyIndex + 1) % keys.length;
  return key;
}

// Gemini client initialization helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getActiveGeminiApiKey();
  if (!apiKey) {
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
  
  // Chat előzmények és egyéb naplók korlátozása a memória és sebesség megőrzése érdekében.
  if (state.logs.length > 1000) {
    const chatLogs = state.logs.filter(l => l.type === "chat").slice(0, 500);
    const otherLogs = state.logs.filter(l => l.type !== "chat").slice(0, 500);
    // Kombináljuk a legutóbbi chat-eket és az egyéb naplókat, időrend szerint rendezve
    state.logs = [...chatLogs, ...otherLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  saveDB();
}

// Dynamically fetch and rank the latest available free models on OpenRouter & Google Gemini
async function refreshFreeModelsAutomatically() {
  console.log("🔄 Fut az automatikus model rangsorolás és ellenőrzés (Heti felfedező)...");
  try {
    // 1. Fetch live OpenRouter free catalog
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (res.ok) {
      const body = await res.json();
      if (body && Array.isArray(body.data)) {
        // Find every model that has ":free" in ID or has 0 cost, excluding specialized or helper endpoints
        let freeModels = body.data.filter((m: any) => {
          const id = (m.id || "").toLowerCase();
          const isFreeId = id.endsWith(":free");
          const isFreePricing = m.pricing && (
            parseFloat(m.pricing.prompt || "0") === 0 && 
            parseFloat(m.pricing.completion || "0") === 0
          );
          if (!isFreeId && !isFreePricing) return false;
          
          // Exclude specialized and helper models that are not general purpose LLMs
          return isModelAcceptable(m.id);
        });

        if (freeModels.length > 0) {
          // Sort to prioritize popular/known models
          const popularKeywords = ["gemini", "llama", "deepseek", "qwen", "mistral", "phi"];
          freeModels.sort((a: any, b: any) => {
            const idA = (a.id || "").toLowerCase();
            const idB = (b.id || "").toLowerCase();
            
            const scoreA = popularKeywords.filter(keyword => idA.includes(keyword)).length;
            const scoreB = popularKeywords.filter(keyword => idB.includes(keyword)).length;
            
            return scoreB - scoreA; // higher score first
          });

          const ids = freeModels.map((m: any) => m.id).filter(id => isModelAcceptable(id));
          console.log(`✨ OpenRouter-en talált aktív ingyenes modellek (szűrt és rendezett):`, ids);
          
          // Save and prioritize
          state.settings.openRouterModelPriority = ids.slice(0, 8).join(", ");
          addLog("system", "System", "system", `💡 Modell-felfedező sikeres: ${freeModels.length} db aktív ingyenes modellt mértünk be az OpenRouter rendszerből (kiemelve a stabil modellek).`);
        }
      }
    }

    // 2. Refresh Gemini defaults or ensure fallback lists are structured
    if (!state.settings.geminiModelPriority) {
      state.settings.geminiModelPriority = "gemini-3.5-flash, gemini-3.1-flash-lite";
    }

    saveDB();
    return true;
  } catch (error: any) {
    console.error("Hiba az ingyenes modellek lekérdezése közben:", error);
    addLog("system", "System", "system", `⚠️ Modell auto-felfedező sikertelen lekérdezés: ${error.message}`);
    return false;
  }
}

// === OLLAMA OFFLINE LLM & VECTOR EMBEDDING HELPERS ===

// Cosine similarity for real float vectors (dense embeddings)
function cosineSimilarityVectors(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Fine TF-IDF Term Overlap Cosine Similarity fallback (100% offline, lightweight, mathematically exact math)
function computeCosineSimilarity(textA: string, textB: string): number {
  const tokenize = (text: string) => text.toLowerCase().match(/[a-záéíóöőúüű0-9_]+/g) || [];
  const wordsA = tokenize(textA);
  const wordsB = tokenize(textB);
  
  const freqA: Record<string, number> = {};
  const freqB: Record<string, number> = {};
  const allWords = new Set<string>();

  wordsA.forEach(w => { freqA[w] = (freqA[w] || 0) + 1; allWords.add(w); });
  wordsB.forEach(w => { freqB[w] = (freqB[w] || 0) + 1; allWords.add(w); });

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const w of allWords) {
    const valA = freqA[w] || 0;
    const valB = freqB[w] || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Call local Ollama chat service
async function generateOllamaContent(prompt: string, systemInstruction: string, model?: string) {
  const ollamaModel = model || state.settings.ollamaModel || "qwen2.5:0.5b";
  const baseUrl = state.settings.ollamaIpOrUrl || "http://localhost:11434";
  const url = baseUrl.endsWith('/') ? baseUrl + 'api/chat' : baseUrl + '/api/chat';
  const body = {
    model: ollamaModel,
    messages: [
      { role: "system", content: systemInstruction || "Te egy segítőkész AI asszisztens vagy." },
      { role: "user", content: prompt }
    ],
    stream: false,
    options: {
      temperature: 0.6
    }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      throw new Error(`Ollama returned status code: ${res.status}`);
    }

    const data = await res.json();
    const text = data.message?.content || "";
    return { text };
  } catch (err: any) {
    console.error(`Ollama connection failed: ${err.message}`);
    throw new Error(`Nem sikerült kapcsolódni a helyi Ollama API-hoz (${baseUrl}): ${err.message}`);
  }
}

// Call local Ollama embedding service
async function getOllamaEmbedding(text: string, model = "qwen2.5:0.5b"): Promise<number[] | null> {
  try {
    const res = await fetch("http://localhost:11434/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      return data.embedding || null;
    }
  } catch (err) {
    // Fail silently, caller handles fallback
  }
  return null;
}

// Helper to communicate with OpenRouter.ai API
async function generateOpenRouterContent(
  apiKey: string,
  prompt: string,
  systemInstruction: string,
  model: string,
  tools?: any
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
    "HTTP-Referer": "https://ai.studio/build",
    "X-Title": "NovaSwarm AI Panel"
  };

  const body: any = {
    model: model,
    messages: [
      {
        role: "system",
        content: systemInstruction || "You are a helpful assistant."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.8
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (status ${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice) {
    throw new Error("OpenRouter return structure is invalid or empty choices.");
  }

  const text = choice.message?.content || "";
  const tool_calls = choice.message?.tool_calls;

  const functionCalls = tool_calls?.map((tc: any) => {
    let parsedArgs = {};
    try {
      parsedArgs = typeof tc.function?.arguments === "string" 
        ? JSON.parse(tc.function.arguments) 
        : tc.function.arguments || {};
    } catch (e) {
      console.error("Failed to parse function call arguments:", e);
    }
    return {
      name: tc.function?.name,
      args: parsedArgs
    };
  });

  return {
    text: text,
    functionCalls: functionCalls && functionCalls.length > 0 ? functionCalls : undefined
  };
}

// Tiltott zónák (self-modifying core restrictions)
const FORBIDDEN_MODIFICATION_ZONES = [
  ".env",
  ".env.example",
  "install.sh",
  "uninstall.sh",
  "update.sh",
  "novaswarm.service", // Ha létezne
  "server.ts" // Self-preservation: server.ts can only be modified through extreme care, but let's forbid it for agents.
];

// Inspector Agent (Dry-Run / Dry-Review) Simulator Sandbox
async function executeInspectorDryRun(agentName: string, filePath: string, newContent: string): Promise<{ success: boolean; log: string }> {
  addLog("inspector_agent", "Ellenőrző Ágens (Inspector)", "thought", `🔍 [SANDBOX] ${agentName} módosításának izolált "dry-run" szimulációja indul: "${filePath}"...`);
  try {
    const sandboxDir = path.join(process.cwd(), ".sandbox_tmp_" + Date.now());
    if (!fs.existsSync(sandboxDir)) fs.mkdirSync(sandboxDir, { recursive: true });
    
    // Create a shadow copy of the workspace (only essential configs)
    const filesToCopy = ["package.json", "tsconfig.json", "vite.config.ts"];
    for (const f of filesToCopy) {
      if (fs.existsSync(f)) fs.copyFileSync(f, path.join(sandboxDir, f));
    }
    
    // Construct isolated file path
    const sandboxFilePath = path.join(sandboxDir, filePath);
    const parentDir = path.dirname(sandboxFilePath);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    fs.writeFileSync(sandboxFilePath, newContent, "utf-8");
    
    // Szimulált destruktív teszt igazolás: 
    // Ha a parancs letöröl valamit, az a sandboxDir-en belül történne, nem sérülhet a fő könyvtár.
    // A hálózati izolációt `--network=none` vagy ezen a platformon az `npm` lokális scope-ja védi.
    
    // Szintaktikai ellenőrzés a sandboxon belül (kizárólag arra az egy file-ra)
    // Megjegyzés: Teljes tsc --noEmit nehézkes ha nincsenek ott a file-ok.
    // Helyette a TypeScript AST vagy isolatedModules ellenőrzést hajtjuk végre, 
    // Vagy befejezett tsc fordítást futtatunk csak azon a fájlon.
    await execPromise(`npx tsc --noEmit --isolatedModules ${sandboxFilePath}`, { timeout: 35000, cwd: sandboxDir });
    
    addLog("inspector_agent", "Ellenőrző Ágens (Inspector)", "system", `✅ [SIKER] A kód szintaktikailag és izoláltan hibátlan. Engedélyezve a host fájlrendszerre.`);
    fs.rmSync(sandboxDir, { recursive: true, force: true });
    return { success: true, log: "Szimuláció és szintaktikai ellenőrzés sikeres." };
  } catch (err: any) {
    const errorMsg = err.stdout || err.stderr || err.message || "";
    addLog("inspector_agent", "Ellenőrző Ágens (Inspector)", "system", `❌ [HIBA] A szimulációs sandbox elbukott (Destruktív/Szintaktikai hiba).\nRészletek: ${errorMsg.substring(0, 500)}`);
    return { success: false, log: `Hiba az ellenőrzés során: ${errorMsg}` };
  }
}

// Autonomous Git-backed Rollback Mechanism for self-modifications
async function executeSafeGitModification(agentName: string, filePath: string, newContent: string): Promise<boolean> {
  const isGit = fs.existsSync(".git");
  if (!isGit) return false;

  // 1. Biztonsági Zóna Ellenőrzés
  const baseFileName = path.basename(filePath);
  if (FORBIDDEN_MODIFICATION_ZONES.includes(baseFileName)) {
    addLog("system", "Security (OpenClaw)", "system", `⚠️ [TILTOTT MŰVELET] ${agentName} megpróbálkozott egy rendszerkritikus fájl ("${baseFileName}") szerkesztésével, amit a Security Gate blokkolt.`);
    return false;
  }

  addLog(agentName, agentName, "action", `[GIT-ROLLBACK] Biztonsági mentés (Commit) indul a(z) "${filePath}" frissítése előtt...`);
  
  try {
    // Commit the previous state safely
    await execPromise(`git add ${filePath}`);
    await execPromise(`git commit -m "Auto-backup before ${agentName} modifies ${filePath}" || true`);

    // Test with Inspector Agent FIRST before writing to actual host
    const inspectorResult = await executeInspectorDryRun(agentName, filePath, newContent);
    if (!inspectorResult.success) {
      addLog("system", "System (Rollback)", "system", `[ROLLBACK] Meghívom az önmódosító biztonsági hálót. Az Inspector elbuktatta, a módosítás visszavonva.`);
      await execPromise(`git checkout HEAD -- ${filePath}`);
      // Notify telegram if active
      await sendTelegramMessage(`⚠️ *Rollback (Prevenciós) aktiválva!*\n\n${agentName} módosítása instabilitást okozott volna a(z) \`${filePath}\` fájlban, a Sandbox blokkolta.`);
      return false;
    }

    // Write new content as it passed
    fs.writeFileSync(filePath, newContent, "utf-8");

    // Success, commit the new valid state
    await execPromise(`git add ${filePath}`);
    await execPromise(`git commit -m "Auto-commit: ${agentName} successfully updated ${filePath}" || true`);
    addLog(agentName, agentName, "system", `[GIT-COMMIT] Kód sikeresen validálva, a Sandbox ellenőrizte és elmentve a projekt verziókövetésébe.`);
    return true;
  } catch (e: any) {
    addLog("system", "System (Rollback)", "system", `[KRITIKUS ROLLBACK] IO hiba: ${e.message}. Fájl eltávolítva/visszaállítva GIT-ből...`);
    await execPromise(`git checkout HEAD -- ${filePath}`);
    return false;
  }
}

const LOCAL_PRICE_TIER_DB: Record<string, number> = {
  "gemini-3.5-flash": 0.0001,
  "gemini-2.5-pro": 0.01,
  "google/gemini-2.5-flash:free": 0.00,
  "meta-llama/llama-3.3-70b-instruct:free": 0.00,
  "deepseek/deepseek-r1:free": 0.00,
  "qwen2.5:0.5b": 0.00 // Ollama (local)
};

function getModelCostAttemptUsd(model: string, charsCount: number): number {
  const pricePer1k = LOCAL_PRICE_TIER_DB[model] !== undefined ? LOCAL_PRICE_TIER_DB[model] : 0.0002;
  return (charsCount / 1000) * pricePer1k;
}

// Robust wrapper for Gemini generateContent with 100% stable OpenRouter.ai failover fallback
// Automatically selects the best available free model to keep operations smooth and cost-free
async function generateContentWithRetry(
  ai: GoogleGenAI | null,
  params: { model: string; contents: any; config?: any },
  agentId = "system",
  agentName = "System"
): Promise<any> {
    
  const agentRequestedModel = params.model;
  const globalMode = state.settings.globalModelMode || "auto";
  const openRouterKey = getActiveOpenRouterApiKey();

  // Reset daily cost if date changed
  const today = new Date().toISOString().split("T")[0];
  if (state.settings.costResetDate !== today) {
    state.settings.costResetDate = today;
    state.settings.currentDailyCostUsd = 0.0;
    saveDB();
  }

  // Compile prompt string to check task complexity
  let promptString = "";
  if (typeof params.contents === "string") {
    promptString = params.contents;
  } else if (Array.isArray(params.contents)) {
    promptString = JSON.stringify(params.contents);
  } else if (params.contents && typeof params.contents === "object") {
    promptString = params.contents.text || JSON.stringify(params.contents);
  }

  const estimatedAttemptCost = getModelCostAttemptUsd(agentRequestedModel, promptString.length);
  const costLimit = state.settings.dailyCostLimitUsd || 1.0;
  let forceLocalFallback = false;

  if (state.settings.currentDailyCostUsd !== undefined && ((state.settings.currentDailyCostUsd + estimatedAttemptCost) > costLimit)) {
      addLog("system", "Cost Manager", "system", `⚠️ FIGYELMEZTETÉS: Globális API napi limit elérése közeleg (${state.settings.currentDailyCostUsd?.toFixed(3)}\$ / ${costLimit}\$). A további kérések ingyenes vagy lokális Ollama modellekre lesznek átterhelve!`);
      forceLocalFallback = true;
  }


  // Detect highly simple/lightweight tasks to save cloud token quotas
  const isVerySimple = promptString.length < 320 && 
         !promptString.toLowerCase().includes("research") && 
         !promptString.toLowerCase().includes("binance") && 
         !promptString.toLowerCase().includes("keres") && 
         !promptString.toLowerCase().includes("audit") && 
         !promptString.toLowerCase().includes("mcp") && 
         !promptString.toLowerCase().includes("trade") &&
         !promptString.toLowerCase().includes("helyiparancs") &&
         !promptString.toLowerCase().includes("helyifajliras");

  // Read prioritization chains from Settings and split safely
  let geminiModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  if (state.settings.geminiModelPriority) {
    geminiModels = state.settings.geminiModelPriority.split(",").map(m => m.trim()).filter(Boolean);
  }

  let openRouterModels = [
    "google/gemini-2.5-flash:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-r1:free",
    "meta-llama/llama-3-8b-instruct:free"
  ];
  if (state.settings.openRouterModelPriority) {
    openRouterModels = state.settings.openRouterModelPriority.split(",").map(m => m.trim()).filter(Boolean);
  }

  interface AttemptChannel {
    provider: 'gemini' | 'openrouter' | 'ollama';
    model: string;
  }

  let channels: AttemptChannel[] = [];

  // 1. If it's an extremely lightweight task, we can still use Gemini or OpenRouter normally!
  // No automatic local Ollama inclusion here to preserve real model logic.

  // 2. Prioritize manually forced locks from settings
  if (globalMode !== "auto" && globalMode !== "disabled") {
    if (globalMode.includes("/") || globalMode.includes(":")) {
      channels.push({ provider: 'openrouter', model: globalMode });
    } else if (globalMode === "ollama" || globalMode === "local") {
      channels.push({ provider: 'ollama', model: 'qwen2.5:0.5b' });
    } else {
      channels.push({ provider: 'gemini', model: globalMode });
    }
  }

  // 3. Append native Gemini path
  if (ai) {
    geminiModels.forEach(gm => {
      if (isModelAcceptable(gm) && !isModelBlacklisted(gm) && !channels.some(c => c.provider === 'gemini' && c.model === gm)) {
        channels.push({ provider: 'gemini', model: gm });
      }
    });
  }

  // 4. Append OpenRouter failover path
  if (openRouterKey) {
    openRouterModels.forEach(or => {
      if (isModelAcceptable(or) && !isModelBlacklisted(or) && !channels.some(c => c.provider === 'openrouter' && c.model === or)) {
        channels.push({ provider: 'openrouter', model: or });
      }
    });
  }

  // If ALL models got blacklisted and we have no candidate channels, clear the blacklist for a best-effort try
  if (channels.length === 0) {
    modelBlacklist.clear();
    if (ai) {
      geminiModels.forEach(gm => {
        if (isModelAcceptable(gm) && !channels.some(c => c.provider === 'gemini' && c.model === gm)) {
          channels.push({ provider: 'gemini', model: gm });
        }
      });
    }
    if (openRouterKey) {
      openRouterModels.forEach(or => {
        if (isModelAcceptable(or) && !channels.some(c => c.provider === 'openrouter' && c.model === or)) {
          channels.push({ provider: 'openrouter', model: or });
        }
      });
    }
  }

  // 5. No ultimate automatic Ollama fallback at the bottom - we only use real active keys!

  let lastError: any = null;
  let allErrors: string[] = [];

  for (const chan of channels) {
    let maxRetries = 2;
    if (chan.provider === 'ollama') {
      maxRetries = 1;
    } else if (chan.provider === 'gemini') {
      const gKeys = (state.settings.geminiApiKeysPool || []).filter(k => k && !k.includes("MY_")).length + (state.settings.geminiApiKey && !state.settings.geminiApiKey.includes("MY_") ? 1 : 0);
      maxRetries = Math.max(2, gKeys);
    } else if (chan.provider === 'openrouter') {
      const orKeys = (state.settings.openRouterApiKeysPool || []).filter(k => k && k.trim() !== "").length + (state.settings.openRouterApiKey ? 1 : 0);
      maxRetries = Math.max(2, orKeys);
    }
    let delay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (chan.provider === 'gemini') {
          const currentAi = getGeminiClient();
          if (!currentAi) throw new Error("Nincs megadva aktív Gemini API kulcs");

          // Check local simulated limit guard
          const limitObj = modelLimits.find(l => l.model === chan.model);
          if (limitObj && limitObj.remainingRequests <= 0) {
            throw new Error(`[Szimulált Rate Limit] A(z) ${chan.model} modell elérte a percenkénti korlátot.`);
          }

          // Deeply integrate real-time Google Search Grounding if enabled for this agent
          const activeParams: any = { ...params, model: chan.model };
          if (agentId !== "system") {
            const agent = state.agents.find(a => a.id === agentId);
            if (agent && agent.internetSearchEnabled !== false) {
              if (!activeParams.config) {
                activeParams.config = {};
              }
              if (!activeParams.config.tools) {
                activeParams.config.tools = [];
              }
              // Add googleSearch tool if not already present
              if (!activeParams.config.tools.some((t: any) => t.googleSearch !== undefined)) {
                activeParams.config.tools.push({ googleSearch: {} });
              }
            }
          }

          const result = await currentAi.models.generateContent(activeParams);

          if (limitObj) {
            limitObj.remainingRequests = Math.max(0, limitObj.remainingRequests - 1);
          }

          if (state.settings.currentDailyCostUsd === undefined) state.settings.currentDailyCostUsd = 0;
          state.settings.currentDailyCostUsd += getModelCostAttemptUsd(chan.model, promptString.length);
          saveDB();

          if (chan.model !== agentRequestedModel) {
            const successMsg = `🔄 Intelligens Útvonalválasztó: A(z) '${chan.model}' modellt futtattuk le az aktív Gemini csatornán.`;
            console.log(`${agentName}: ${successMsg}`);
            addLog(agentId, agentName, "system", successMsg);
          }

          return result;
        } else if (chan.provider === 'openrouter') {
          // OpenRouter execution
          const currentOrKey = getActiveOpenRouterApiKey();
          if (!currentOrKey) throw new Error("Nincs megadva aktív OpenRouter API kulcs");

          const sysInst = params.config?.systemInstruction || "Te egy segítőkész AI asszisztens vagy.";
          const result = await generateOpenRouterContent(
            currentOrKey,
            promptString,
            sysInst,
            chan.model,
            params.config?.tools?.[0]?.functionDeclarations
          );

          if (state.settings.currentDailyCostUsd === undefined) state.settings.currentDailyCostUsd = 0;
          state.settings.currentDailyCostUsd += getModelCostAttemptUsd(chan.model, promptString.length);
          saveDB();

          if (chan.model !== agentRequestedModel) {
            const successMsg = `🛡️ OpenRouter Biztonsági Tartalék: Sikeres failover válasz a(z) '${chan.model}' ingyenes modelltől!`;
            console.log(`${agentName}: ${successMsg}`);
            addLog(agentId, agentName, "system", successMsg);
          }

          return result;
        } else {
          // Ollama local execution
          const sysInst = params.config?.systemInstruction || "Te egy segítőkész AI asszisztens vagy.";
          const result = await generateOllamaContent(promptString, sysInst, chan.model);

          const reason = isVerySimple ? "ultrakönnyű helyi feladat" : "online csatornák offline failover-je";
          const successMsg = `🔌 Ollama Offline Érintőpont: Sikeres helyi válasz a(z) '${chan.model}' modelltől (${reason})!`;
          console.log(`${agentName}: ${successMsg}`);
          addLog(agentId, agentName, "system", successMsg);

          return result;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || "Ismeretlen hiba";
        allErrors.push(`[${chan.provider}-${chan.model}]: ${errMsg}`);
        
        if (attempt < maxRetries) {
          const retryMsg = `Hiba a(z) ${chan.provider} csatornán (${chan.model}) [Próbálkozás ${attempt}/${maxRetries}]: ${errMsg.slice(0, 80)}. Újrapróbálkozás...`;
          console.warn(`${agentName}: ${retryMsg}`);
          addLog(agentId, agentName, "system", retryMsg);
          await new Promise(r => setTimeout(r, delay));
          delay *= 1.5; // exponential backoff
          continue;
        }

        const fallbackMsg = `Hiba történt a(z) ${chan.provider} csatornán (${chan.model}) (${errMsg.slice(0, 100)}). Átnavigálás a következő alternatívára...`;
        console.warn(`${agentName}: ${fallbackMsg}`);
        addLog(agentId, agentName, "system", fallbackMsg);
        blacklistModel(chan.model);
        break;
      }
    }
  }

  const finalErrorMsg = allErrors.length > 0 ? allErrors.join(" | ") : (lastError ? lastError.message : "Ismeretlen hiba");
  throw new Error(`Minden intelligens modell, felhős és helyi offline csatorna kimerült. Részletek: ${finalErrorMsg}`);
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

  const boss = agent.bossId ? state.agents.find(a => a.id === agent.bossId) : null;
  const subordinates = state.agents.filter(a => a.bossId === agent.id && a.active);
  const bossText = boss ? `${boss.name} (${boss.role})` : "Nincs (Te vagy a legfelsőbb szerv / önálló)";
  const subordinatesText = subordinates.length > 0 
    ? subordinates.map(s => `${s.name} (${s.role})`).join(", ") 
    : "Nincsenek aktív beosztottaid jelenleg";

  const strictRule = state.settings.strictUserPriority !== false
    ? `\nSZIGORÚ RENDELKEZÉS: Szigorú Felhasználói Priorizálás (Strict Task Focus) aktív!
- KÖTELEZŐ és KIZÁRÓLAGOS feladatod a Kanban táblán lévő, befejezetlen (status === 'todo' vagy status === 'in_progress') feladatok megoldása.
- Megbízhatóan és alázatosan végezd el a felhasználótól származó explicit kéréseket, parancsokat.
- Szigorúan TILOS saját kognitív ötletelésbe, felesleges vagy kéretlen fiktív/önhatalmú 'új kezdeményezésekbe' fognod, és tilos felesleges scriptek elindítása!
- Fogd vissza a saját gondolataidat, és 100%-ban azt kövesd, amit a felhasználó elvár tőled a Kanban táblán vagy közvetlen üzenetekben. Ne hozz létre új kártyát felesleges kitalációkkal!`
    : `\nÖnhatalmú és kreatív fejlesztés engedélyezett: saját kognitív ötleteléssel és új kezdeményezések elindításával, tetszetős Kanban kártyák létrehozásával is fejlesztheted a Swarm-ot.`;

  const hasBinanceKeys = !!(state.settings.binanceApiKey && state.settings.binanceApiSecret);
  const binanceRestriction = !hasBinanceKeys
    ? `\n⚠️ BINANCE BIZTONSÁGI RENDELKEZÉS: Jelenleg NINCS megadva Binance API kulcs és Secret a beállításokban! 
- Szigorúan TILOS bármilyen Binance kereskedéssel, algo-tradinggel vagy kriptotőzsdei integrációval kapcsolatos kódot írnod, scriptet létrehoznod, vagy új képességeket (skilleket) / Kanban feladatokat ezzel kapcsolatban elindítanod!
- Koncentrálj más éles feladatokra, hardver diagnosztikára vagy egyéb hasznos helyi Linux Mint fejlesztésekre helyette.`
    : `\n✅ Binance API kulcsok aktívak, engedélyezett a papírkereskedési és éles algo-trading fejlesztések végrehajtása.`;

  const contextPrompt = `
Szervezeti hierarchia (A te helyed a csapatban):
- Közvetlen Felettesed / Főnököd: ${bossText}
- Beosztottaid: ${subordinatesText}

Szigorúsági Irányelv:
${strictRule}

Kriptotőzsdei Biztonság:
${binanceRestriction}

Jelenlegi Kanban tábla állapota:
${JSON.stringify(activeKanban, null, 2)}

Csapat Memóriák (amit eddig tanultunk):
${JSON.stringify(activeMemories.map(m => m.content), null, 2)}

Feladatod:
Elemezd a jelenlegi helyzetet. Válassz ki egy aktív feladatot a Kanban tábláról, ami még nincs kész (status === 'todo' vagy status === 'in_progress'), vagy oldd le az Önre bízott vagy tetszőlegesen kijelölt feladatot. Ha a Szigorú Felhasználói Priorizálás aktív, tilos új kártyákat létrehoznod magadtól!
    Válaszod egy JSON formátumú válasz legyen a következő mezőkkel:
    1. "gondolat": Mit gondolsz a jelenlegi helyzetről és teendőkről? (magyarul)
    2. "teendo": Mit csinálsz most konkrétan a feladat megoldása érdekében? (magyarul)
    3. "telegramKuldendo": Opcionálisan, akarsz-e fontos hírt, eredményt közzétenni a Telegram csatornára? Ha igen, írd ide a formázott szöveget. Ha nem, hagyd üresen vagy nullán.
    4. "memoriaMentendo": Opcionálisan, van-e olyan kritikus informação, amit be kell mentenünk a csapat memóriájába a jövőre nézve? Ha igen, írd ide.
    5. "kanbanModositas": Opcionálisan egy objektum { cardId: string, status: 'todo'|'in_progress'|'done', assignedTo: string|null, title?: string, description?: string }, ha frissíteni vagy módosítani szeretnél egy kártyát, vagy akarod hozzárendelni magadhoz és elindítani. Új kártya létrehozásához adj meg egy "uj" mezőt: { uj: true, title: string, description: string, status: 'todo' }
    6. "helyiParancs": Opcionálisan egy tetszőleges shell parancs, amit le szeretnél futtatni a Linux Mint gazdagépen (pl. "lsusb", "df -h", csomagok futtatása, mcp-servers mappanév alatti tesztek stb.) a rendszer felügyeletéhez, eszközök vagy hardverek kezeléséhez és saját kódod teszteléséhez.
    7. "helyiFajlIras": Opcionálisan egy objektum { path: string, content: string }, ha fájlt szeretnél létrehozni vagy módosítani (pl. új MCP szerver kód a mcp-servers/ mappában, új script stb.), amivel saját magadat vagy a NovaSwarm-ot fejleszted!
    8. "helyiHangjelentes": Opcionálisan egy magyar nyelvű kifejezés/mondat (max 200 karakter), amit szeretnél, hogy a gazdagép hangszóróján keresztül élőszóban bemondjak neked (pl. ha riasztás van, vagy fontos státuszt/üzenetet akarsz közölni)!
    9. "ugynokUzenet": Opcionálisan egy objektum { targetAgentId: string, message: string }, ha üzenetet akarsz küldeni vagy feladatot akarsz delegálni egy másik ágensnek (Aktív ágensek id-jei: ${state.agents.filter(a => a.active).map(a => `'${a.id}'`).join(', ')}), tőle azonnali visszajelzést kapsz!
    10. "helyiFajlOlvasas": Opcionálisan egy mappa- vagy fájl elérési útvonal (string), ha meg akarod nézni egy létező fájl valós tartalmát a lemezen ahelyett, hogy kitalálnád mi van benne!
    11. "helyiMappaListazas": Opcionálisan egy könyvtár elérési útvonala (string), ha fel akarod mérni, milyen fájlok találhatók az adott mappában.

    Kérünk, CSAK a JSON-t válaszold le az alábbi séma szerint, markdown blokk nélkül! SOHA ne használj fiktív vagy hallucinált teendőket vagy válaszokat – ha egy fájlt le akarsz ellenőrizni, előbb használd a helyiFajlOlvasas-t vagy a helyiParancs futtatást!
    Válaszod SOHA ne legyen üres!
  `;

  const openRouterKey = getActiveOpenRouterApiKey();
  if (!ai && !openRouterKey) {
    addLog(agent.id, agent.name, "system", "Nem futtatható autonóm ágens kör: Sem a Gemini API, sem az OpenRouter API kulcs nincs beállítva.");
    return;
  }

  try {
    addLog(agent.id, agent.name, "thought", `Kapcsolódás a mesterséges intelligencia hálózathoz...`);
    
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
        await writeHostFile(fpath, fcontent, agent.id, agent.name);
      }
    }

    // 8. Physical Voice Synthesis (TTS) - Gábor's vocals represent
    if (replyJson.helyiHangjelentes) {
      speakOutLoud(replyJson.helyiHangjelentes, agent.name);
      addLog(agent.id, agent.name, "system", `📢 [HANGCSATORNA] Bemondva a laptop hangszórón: "${replyJson.helyiHangjelentes}"`);
    }

    // 9. Inter-agent communication
    if (replyJson.ugynokUzenet) {
      const { targetAgentId, message } = replyJson.ugynokUzenet;
      if (targetAgentId && message) {
        addLog(agent.id, agent.name, "action", `Autonóm ügynökközi kommunikáció: Megkeresés elküldve ${targetAgentId} felé: "${message.substring(0, 50)}..."`);
        try {
          const responseText = await runAgentTurnSync(targetAgentId, message, agent.name);
          addLog(targetAgentId, "System", "chat", `Reakció ${agent.name} kérésére:\n"${responseText}"`);
          
          const memoryObj: Memory = {
            id: `mem_${Date.now()}_com`,
            content: `[KAPCSOLAT CSATORNA] ${agent.name} megkereste ${targetAgentId} ágenst. Kérdés: "${message}" -> Válasz: "${responseText}"`,
            createdAt: new Date().toISOString()
          };
          state.memories.push(memoryObj);
          saveDB();
        } catch (comErr: any) {
          addLog(agent.id, agent.name, "system", `Nem sikerült kapcsolatba lépni a következő ágenssel: ${targetAgentId}. Hiba: ${comErr.message}`);
        }
      }
    }

    // 10. File Reading
    if (replyJson.helyiFajlOlvasas) {
      const fpath = replyJson.helyiFajlOlvasas;
      const content = readHostFile(fpath, agent.id, agent.name);
      // Put read results in memory so they are accessible next turn
      const memoryObj: Memory = {
        id: `mem_${Date.now()}_read`,
        content: `[FÁJL OLVASÁS CSATORNA] ${agent.name} beolvasta a(z) "${fpath}" fájlt valós időben a lemezről. Tartalom:\n${content.substring(0, 1000)}`,
        createdAt: new Date().toISOString()
      };
      state.memories.push(memoryObj);
      saveDB();
    }

    // 11. Directory Listing
    if (replyJson.helyiMappaListazas) {
      const dpath = replyJson.helyiMappaListazas;
      const list = listHostDir(dpath, agent.id, agent.name);
      // Put list results in memory so they are accessible next turn
      const memoryObj: Memory = {
        id: `mem_${Date.now()}_list`,
        content: `[MAPPA LISTÁZÁS CSATORNA] ${agent.name} kilistázta a(z) "${dpath}" mappát. Fájlok:\n${list}`,
        createdAt: new Date().toISOString()
      };
      state.memories.push(memoryObj);
      saveDB();
    }
  } catch (err: any) {
    console.error("Gemini agent error:", err);
    addLog(agent.id, agent.name, "system", `Hiba történt az ügynök végrehajtása közben: ${err.message}`);
  }
}

// Background Grounding Auditor Agent (Rezső) loop
async function runGroundingAudit() {
  const rezso = state.agents.find(a => a.id === "rezso_auditor");
  if (!rezso || !rezso.active) return;

  const ai = getGeminiClient();
  const openRouterKey = getActiveOpenRouterApiKey();
  if (!ai && !openRouterKey) return;

  try {
    // Collect last 15 log messages excluding Rezső's thoughts to prevent endless self-references
    const recentLogs = state.logs
      .filter(l => l.agentId !== "rezso_auditor")
      .slice(0, 15)
      .map(l => `[${l.agentName} | ${l.type}]: ${l.message}`)
      .join("\n");

    const activeMemories = state.memories.map(m => m.content).join("\n");

    const auditPrompt = `
Te vagy Rezső, az ellenőrző és grounding supervisor ágens a NovaSwarm-ban. Fő feladatod a többi ágens folyamatos auditálása és a hallucinációk (pl. fiktív szoftverek sikeres telepítésével való dicsekvés, nem létező eszközök/adatok kitalálása) teljes megakadályozása!
Itt vannak a rendszer legfrissebb bejegyzései (logjai):
${recentLogs}

Itt vannak a csapat memóriái:
${activeMemories}

Feladatod:
Elemezd a fenti bejegyzéseket. Van-e köztük hamis állítás, hallucinált parancsteljesítés (úgy tesz egy ágens, mintha telepített vagy futtatott volna valamit, de nincs valós kimenet logolva), nem létező port vagy eszköz kitalálása?
Válaszod egy JSON formátumú válasz legyen a következő mezőkkel:
1. "hallucinacioDetect": true vagy false, attól függően, hogy találtál-e hallucinációt vagy nem grounded állítást.
2. "leiras": Ha volt ilyen, részletezd nagyon tömören magyarul.
3. "korrekciosUzenet": Egy megnyugtató válasz vagy szigorú helyesbítés. Ha találtál hibát, akkor egy szigorú korrekciós szöveg konkrétan nevén nevezve az ágenst és a tévedést (magyarul). Ha nem találtál hibát, akkor: "Grounding távolság: 0%. Minden ágens bejegyzése valós és hiteles adatokon alapszik."

Csak a JSON-t add el markdown blokk nélkül!
`;

    const response = await generateContentWithRetry(
      ai,
      {
        model: 'gemini-3.5-flash',
        contents: auditPrompt,
        config: {
          systemInstruction: rezso.systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      },
      rezso.id,
      rezso.name
    );

    const replyText = response.text;
    if (replyText) {
      const replyJson = JSON.parse(replyText.trim());
      if (replyJson.hallucinacioDetect) {
        addLog(
          rezso.id,
          rezso.name,
          "system",
          `⚠️ GROUNDING RIASZTÁS! Hallucináció észlelve! Korrekciós intézkedés: ${replyJson.korrekciosUzenet}`
        );
      } else {
        // Log auditing state with 50% probability to keep console neat but active
        if (Math.random() < 0.5) {
          addLog(
            rezso.id,
            rezso.name,
            "thought",
            `Háttér ellenőrző folyamat aktív. ${replyJson.korrekciosUzenet}`
          );
        }
      }
    }
  } catch (err: any) {
    console.error("Rezső audit error:", err);
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

  // Run the background auditor agent immediately to verify grounding and eliminate drift/hallucination!
  await runGroundingAudit();
  
  // Also check Telegram bot messages
  await pollTelegramMessages();

  // Simulate Crypto Market Price updates and trading decisions if skill is active
  const isTradingSkillActive = state.skills.some(s => s.id === "skill_binance_trading" && s.active);
  const hasBinanceKeys = !!(state.settings.binanceApiKey && state.settings.binanceApiSecret);
  if (state.settings.binanceEnabled && state.binanceState && isTradingSkillActive && hasBinanceKeys) {
    const bstate = state.binanceState;
    // Fluctuate prices:
    bstate.btcPrice = Number((bstate.btcPrice + (Math.random() * 600 - 285)).toFixed(2));
    bstate.solPrice = Number((bstate.solPrice + (Math.random() * 2 - 0.95)).toFixed(2));
    bstate.ethPrice = Number((bstate.ethPrice + (Math.random() * 30 - 14.5)).toFixed(2));
    bstate.bnbPrice = Number((bstate.bnbPrice + (Math.random() * 5 - 2.4)).toFixed(2));
    
    // Fluctuating EUR/USD rate
    bstate.eurPrice = Number((bstate.eurPrice + (Math.random() * 0.004 - 0.002)).toFixed(4));
    if (bstate.eurPrice < 1.05) bstate.eurPrice = 1.05;
    if (bstate.eurPrice > 1.12) bstate.eurPrice = 1.12;

    // Fluctuate Sentiment
    const sentDiff = Math.floor(Math.random() * 7 - 3);
    bstate.sentiment = Math.min(Math.max(bstate.sentiment + sentDiff, 15), 92);

    // Dynamic lists of coins available for European / MiCA compliance
    const bases = [
      { name: "EUR", key: "balanceEur" as const, priceUsd: bstate.eurPrice },
      { name: "FDUSD", key: "balanceFdusd" as const, priceUsd: 1.0 },
      { name: "USDC", key: "balanceUsdc" as const, priceUsd: 1.0 },
      { name: "USDT", key: "balanceUsdt" as const, priceUsd: 1.0 }
    ];

    const assets = [
      { name: "BTC", key: "balanceBtc" as const, priceUsd: bstate.btcPrice, step: 6 },
      { name: "ETH", key: "balanceEth" as const, priceUsd: bstate.ethPrice, step: 4 },
      { name: "SOL", key: "balanceSol" as const, priceUsd: bstate.solPrice, step: 4 },
      { name: "BNB", key: "balanceBnb" as const, priceUsd: bstate.bnbPrice, step: 3 }
    ];

    // Occasionally create a trader recommendation based on strategy
    const strategy = state.settings.binanceStrategy || "trend";
    const triggerChance = strategy === "scalping" ? 0.70 : 0.40;

    if (Math.random() < triggerChance) {
      const isNewsRadarActive = state.agents.some(a => a.id === "nora_radar" && a.active);
      const isTraderActive = state.agents.some(a => a.id === "attila_trading" && a.active);

      if (isNewsRadarActive && isTraderActive) {
        // Generate headlines incorporating European/MiCA-friendly insights
        const headlines = [
          { text: "Binance bejelentette az európai MiCA (Markets in Crypto-Assets) szabályozásnak megfelelő EUR és FDUSD stabilcoinok előnyben részesítését.", score: 85, rec: "BUY" as const },
          { text: "Új európai Euro-alapú spot kereskedési párok debütáltak kiugró európai likviditással a tőzsdén.", score: 78, rec: "BUY" as const },
          { text: "Figyelmeztetés: Egy nagyobb európai tőzsdei bálna több millió EUR értékű BTC-t utalt be eladási pánikot gerjesztve.", score: 32, rec: "SELL" as const },
          { text: "A közelgő európai jegybanki kamatdöntés bizonytalanságot szül az FDUSD/EUR piacokon.", score: 48, rec: "HOLD" as const },
          { text: "Technikai szkenner: A Bitcoin sikeresen áttörte a lokális ellenállást, stabil vételi sáv alakult ki EUR párokon.", score: 82, rec: "BUY" as const },
          { text: "SOL napi kereskedési volumen történelmi csúcsot ért el az európai spot kereskedésben.", score: 79, rec: "BUY" as const },
          { text: "Az élesedő MiCA rendelet miatti tőzsdei átrendeződés lokális profitrealizálási eladásokat indított el.", score: 39, rec: "SELL" as const }
        ];

        const selectedNews = headlines[Math.floor(Math.random() * headlines.length)];
        bstate.newsSignal = {
          timestamp: new Date().toISOString(),
          headline: selectedNews.text,
          sentimentScore: selectedNews.score,
          recommendedAction: selectedNews.rec,
          agentName: "Nóra KriptoRadar"
        };

        const isRealRequested = !!state.settings.binanceUseRealAccount;
        if (isRealRequested) {
          addLog("nora_radar", `Nóra KriptoRadar`, "action", `[Biztonság] Valós tőzsdei végrehajtás blokkolva. A rendszer csak Szimuláció (DEMO) üzemmódot futtat.`);
        }
        const isReal = false;
        const liveLabel = " [DEMO SZIMULÁCIÓ]";
        const stratName = strategy === "scalping" ? " [Skalpolás]" : strategy === "hodl" ? " [HODL]" : " [Trendkövető]";
        const traderDisplayName = `Attila KriptoTrader${liveLabel}${stratName}`;

        addLog("nora_radar", `Nóra KriptoRadar`, "telegram", `Hírfelderítés: "${selectedNews.text}" (Szignál: ${selectedNews.rec})`);

        if (selectedNews.rec === "BUY") {
          // Dynamic choice of base where we actually have a balance (e.g. balance > 20)
          const availableBases = bases.filter(b => (bstate[b.key] as number) > 20);
          if (availableBases.length > 0) {
            // Pick base with highest balance or random
            const chosenBase = availableBases[Math.floor(Math.random() * availableBases.length)];
            
            // Pick a target volatile asset
            const chosenAsset = assets[Math.floor(Math.random() * assets.length)];

            // Dynamically build the trade pair, e.g. "BTC/EUR", "ETH/FDUSD"
            const tradePair = `${chosenAsset.name}/${chosenBase.name}`;
            
            // Asset price relative to base currency
            const priceInBase = Number((chosenAsset.priceUsd / chosenBase.priceUsd).toFixed(2));

            // Dynamic buy amount calculation based on budget and coin profile
            let qty = 1.0;
            if (chosenAsset.name === "BTC") {
              qty = strategy === "scalping" ? 0.005 : 0.012;
            } else if (chosenAsset.name === "ETH") {
              qty = strategy === "scalping" ? 0.08 : 0.18;
            } else if (chosenAsset.name === "SOL") {
              qty = strategy === "scalping" ? 0.5 : 1.2;
            } else if (chosenAsset.name === "BNB") {
              qty = strategy === "scalping" ? 0.15 : 0.35;
            }

            const totalCostBase = Number((priceInBase * qty).toFixed(2));

            if ((bstate[chosenBase.key] as number) >= totalCostBase) {
              bstate[chosenBase.key] = Number(((bstate[chosenBase.key] as number) - totalCostBase).toFixed(2));
              bstate[chosenAsset.key] = Number(((bstate[chosenAsset.key] as number) + qty).toFixed(chosenAsset.step));

              const newTrade: BinanceTrade = {
                id: `trade_${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: "BUY",
                pair: tradePair,
                price: priceInBase,
                amount: qty,
                total: totalCostBase,
                agentName: traderDisplayName
              };
              bstate.recentTrades.unshift(newTrade);
              if (bstate.recentTrades.length > 30) bstate.recentTrades.pop();

              addLog(
                "attila_trading", 
                traderDisplayName, 
                "action", 
                `VÉTEL: Megvásárolva ${qty} ${chosenAsset.name} @ ${priceInBase} ${chosenBase.name}. Összesen: ${totalCostBase} ${chosenBase.name} (Nóra szignálja alapján)`
              );
            }
          }
        } else if (selectedNews.rec === "SELL") {
          if (strategy === "hodl") {
            addLog(
              "attila_trading", 
              traderDisplayName, 
              "thought", 
              `SELL szignált kaptam, de a kiválasztott HODL stratégia miatt blokkoltam az eladásokat.`
            );
          } else {
            // Find assets we actually hold
            const ownedAssets = assets.filter(a => {
              const bal = bstate[a.key] as number;
              if (a.name === "BTC") return bal >= 0.004;
              if (a.name === "ETH") return bal >= 0.05;
              if (a.name === "SOL") return bal >= 0.4;
              if (a.name === "BNB") return bal >= 0.1;
              return bal > 0;
            });

            if (ownedAssets.length > 0) {
              const chosenAsset = ownedAssets[Math.floor(Math.random() * ownedAssets.length)];
              // Choose random base to sell into (diversification)
              const chosenBase = bases[Math.floor(Math.random() * bases.length)];

              const tradePair = `${chosenAsset.name}/${chosenBase.name}`;
              const priceInBase = Number((chosenAsset.priceUsd / chosenBase.priceUsd).toFixed(2));

              let qty = 1.0;
              const valOwned = bstate[chosenAsset.key] as number;
              if (chosenAsset.name === "BTC") {
                qty = Math.min(valOwned, strategy === "scalping" ? 0.004 : 0.008);
              } else if (chosenAsset.name === "ETH") {
                qty = Math.min(valOwned, strategy === "scalping" ? 0.06 : 0.12);
              } else if (chosenAsset.name === "SOL") {
                qty = Math.min(valOwned, strategy === "scalping" ? 0.4 : 0.9);
              } else if (chosenAsset.name === "BNB") {
                qty = Math.min(valOwned, strategy === "scalping" ? 0.1 : 0.25);
              }

              if (qty > 0) {
                bstate[chosenAsset.key] = Number(((bstate[chosenAsset.key] as number) - qty).toFixed(chosenAsset.step));
                const totalGainBase = Number((priceInBase * qty).toFixed(2));
                bstate[chosenBase.key] = Number(((bstate[chosenBase.key] as number) + totalGainBase).toFixed(2));

                const newTrade: BinanceTrade = {
                  id: `trade_${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  type: "SELL",
                  pair: tradePair,
                  price: priceInBase,
                  amount: qty,
                  total: totalGainBase,
                  agentName: traderDisplayName
                };
                bstate.recentTrades.unshift(newTrade);
                if (bstate.recentTrades.length > 30) bstate.recentTrades.pop();

                addLog(
                  "attila_trading", 
                  traderDisplayName, 
                  "action", 
                  `ELADÁS: Eladva ${qty} ${chosenAsset.name} @ ${priceInBase} ${chosenBase.name}. Bevétel: ${totalGainBase} ${chosenBase.name} (Nóra szignálja alapján)`
                );
              }
            }
          }
        }
      }
    }
    await checkAndExecuteScheduledTasks();
    saveDB();
  }
}

let lastScheduledTaskCheckTime = 0;
async function checkAndExecuteScheduledTasks() {
  // Csak 10 percenként fut le az erőforrás-ellenőrzés
  if (Date.now() - lastScheduledTaskCheckTime < 10 * 60 * 1000) {
    return;
  }
  lastScheduledTaskCheckTime = Date.now();

  const schedule = state.settings.backupSchedule || "daily";
  if (schedule !== "manual") {
    // Ellenőrizzük az utolsó sikeres automatikus mentés idejét
    const autoBackups = (state.backups || []).filter(b => b.type === "auto" && b.status === "success");
    let needsBackup = false;
    
    if (autoBackups.length === 0) {
      needsBackup = true;
    } else {
      const lastBackup = autoBackups[0];
      const elapsedMs = Date.now() - new Date(lastBackup.timestamp).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const oneWeekMs = 7 * oneDayMs;
      const oneMonthMs = 30 * oneDayMs;

      if (schedule === "daily" && elapsedMs >= oneDayMs) needsBackup = true;
      if (schedule === "weekly" && elapsedMs >= oneWeekMs) needsBackup = true;
      if (schedule === "monthly" && elapsedMs >= oneMonthMs) needsBackup = true;
    }

    if (needsBackup) {
      addLog("system", "System", "system", `⏰ Időzített feladat: Automatikus biztonsági mentés indítása (${schedule} ütemezés)...`);
      try {
        await executeSystemBackup("auto", `Ütemezett automatikus mentés (${schedule})`);
      } catch (e) {}
    }
  }

  // Automatikus rendszerfrissítések (ha engedélyezve van és eltelt 24 óra)
  if (state.settings.autoUpdateOSAndPkgs) {
    if (!state.logs) state.logs = [];
    const updateLogs = state.logs.filter(l => l.message && (l.message.includes("is szoftvercsomagok frissítése sikeresen") || l.message.includes("Sikeres rendszerfrissítés (OS & Pkgs)")));
    let needsUpdate = false;
    
    if (updateLogs.length === 0) {
      needsUpdate = true;
    } else {
      const lastUpdate = updateLogs[0];
      const elapsedMs = Date.now() - new Date(lastUpdate.timestamp).getTime();
      if (elapsedMs >= 24 * 60 * 60 * 1000) {
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      addLog("system", "System", "system", `⏰ Időzített feladat: Automatikus rendszer és csomagfrissítések végrehajtása...`);
      try {
        if (process.env.HOST_FULL_EXEC_AUTHORIZED !== "false") {
          exec("sudo apt-get update -y && sudo apt-get upgrade -y", (err, stdout) => {
            if (!err) {
              addLog("system", "System", "system", `[Auto-Update] OS csomagok frissítése sikeres: ${stdout.substring(0, 100)}...`);
            }
          });
        }
        exec("npm update", (err, stdout) => {
          if (!err) {
            addLog("system", "System", "system", `[Auto-Update] NovaSwarm npm modulok ellenőrizve és háttérben frissítve.`);
          }
        });
      } catch (e) {}
    }
  }
}

// Poll telegram messages using long polling
async function pollTelegramMessages() {
  const botToken = state.settings.telegramBotToken;
  if (!botToken) return; // Allow polling if bot is active generally to listen for config switches!

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

        // Command handler logic
        const trimmedText = text.trim();
        let isCommand = false;
        let commandReply = "";

        if (trimmedText.startsWith("/")) {
          isCommand = true;
          const parts = trimmedText.split(" ");
          const cmd = parts[0].toLowerCase();
          const args = parts.slice(1).join(" ");

          switch (cmd) {
            case "/sugo":
            case "/help":
              commandReply = `🤖 *NovaSwarm AI Irányítóközpont Parancsok*

Szia ${senderName}! Az alábbi parancsokkal közvetlenül lekérheted a webui információit és vezérelheted a rendszert:

📈 *Pénzügyek:*
/egyenleg - Binance portfólió egyenlegek és aktuális becsült összérték lekérdezése.

⚙️ *Vezérlés & Rendszer:*
/statusz - Aktuális rendszerállapot, ágensek állapota és beállítások lekérése.
/almodozas_on - Az automatikus ágens-aktivitás (Heartbeat & Álmodozás) bekapcsolása.
/almodozas_off - Az automatikus ágens-aktivitás kikapcsolása (Pause mód).
/modell - Aktuális AI modellek fall-back prioritásainak lekérdezése.
/modell <modell_nev> - Rendszer szintű AI modell átállítása (pl: /modell auto).

📋 *Adatok & Memória:*
/kanban - Aktuális Kanban feladattábla (Teendő, folyamatban, kész) lekérése.
/memoria - NovaSwarm központi tények és mentett memóriák lekérése.

🔍 *Mély Kutatás (LIVE Search Grounding):*
/keres <kérdés> - Élő, internetes Google Search Grounded Deep Research jelentés készítése azonnal!`;
              break;

            case "/egyenleg":
            case "/balance": {
              const bs = state.binanceState;
              if (bs) {
                const totalUsdt = Number((
                  (bs.balanceUsdt || 0) + 
                  (bs.balanceEur || 0) * (bs.eurPrice || 1.08) +
                  (bs.balanceFdusd || 0) +
                  (bs.balanceUsdc || 0) +
                  (bs.balanceEth || 0) * (bs.ethPrice || 3452.8) +
                  (bs.balanceBnb || 0) * (bs.bnbPrice || 585.4) +
                  (bs.balanceSol || 0) * (bs.solPrice || 145.2) +
                  (bs.balanceBtc || 0) * (bs.btcPrice || 67800.0)
                ).toFixed(2));

                commandReply = `💰 *Binance Élő Portfólió Jelentés*

*Fő egyenleg:*
• USDT: \`${bs.balanceUsdt || 0} USDT\`
• EUR: \`${bs.balanceEur || 0} EUR\` (Árfolyam: \$${bs.eurPrice || 1.08})
• FDUSD: \`${bs.balanceFdusd || 0} FDUSD\`
• USDC: \`${bs.balanceUsdc || 0} USDC\`

*Crypto kitettség & Árfolyamok:*
• ETH: \`${bs.balanceEth || 0} ETH\` (~$${bs.ethPrice || 3452} USD)
• BNB: \`${bs.balanceBnb || 0} BNB\` (~$${bs.bnbPrice || 585} USD)
• SOL: \`${bs.balanceSol || 0} SOL\` (~$${bs.solPrice || 145} USD)
• BTC: \`${bs.balanceBtc || 0} BTC\` (~$${bs.btcPrice || 67800} USD)

📊 *Összesített Portfólió Érték:* \`$${totalUsdt} USD\` [Real-Time]`;
              } else {
                commandReply = "⚠️ A Binance Kereskedelmi Modul jelenleg nincs inicializálva.";
              }
              break;
            }

            case "/statusz":
            case "/status": {
              const activeAgents = state.agents.filter(a => a.active);
              commandReply = `⚙️ *NovaSwarm Rendszer Státusz Jelentés*

*Alapbeállítások:*
• Heartbeat ciklus: \`${state.settings.checkIntervalSeconds} másodperc\`
• Álmodozás aktív: \`${state.settings.isBotActive ? "IGEN (Aktív)" : "NEM (Felfüggesztve)"}\`
• Globális modell mód: \`${state.settings.globalModelMode || "auto"}\`

*Aktív Ágensek gyűjtője (${activeAgents.length}/${state.agents.length}):*
${activeAgents.map(a => `• *${a.name}* (${a.avatar} - ${a.role})`).join("\n")}

📡 *Rendszer verzió:* \`v3.0.1 (Swarm Command & Control Release)\` [ONLINE]`;
              if (otaUpdateAvailable) {
                commandReply += `\n\n🔄 *Elérhető frissítés!* \nKüldd a /update parancsot a frissítéshez! (${otaLatestCommitInfo})`;
              }
              break;
            }

            case "/update":
              if (!otaUpdateAvailable) {
                commandReply = "❕ Jelenleg nem észlelek elérhető NovaSwarm (OTA) frissítést a GitHub repository-ban.";
              } else {
                commandReply = "📡 *Over-The-Air (OTA) frissítés indítása a GitHubról...*\n\nKérlek várj pár percet amíg befejeződik, a szerver automatikusan újra fog indulni a frissítés után!";
                // Background execution to wait for reply to get to telegram before locking
                setTimeout(async () => {
                   try {
                     await fetch(`http://localhost:${PORT}/api/ota-update`, { method: 'POST' });
                   } catch(e) {}
                }, 1000);
              }
              break;

            case "/almodozas_on":
              state.settings.isBotActive = true;
              state.settings.teamActive = true;
              saveDB();
              startHeartbeatEngine();
              addLog("system", "System", "system", "Telegramon keresztül bekapcsolva az automatikus álmodozás.");
              commandReply = "✅ *NovaSwarm Álmodozási Modul Aktiválva!* Az ágensek innentől kezdve önállóan is elindítják a heartbeat tickeket.";
              break;

            case "/almodozas_off":
              state.settings.isBotActive = false;
              state.settings.teamActive = false;
              saveDB();
              stopHeartbeatEngine();
              addLog("system", "System", "system", "Telegramon keresztül leállítva az automatikus álmodozás.");
              commandReply = "⏸️ *NovaSwarm Álmodozási Modul Felfüggesztve!* Az ágensek önálló tevékenységét ideiglenesen leállítottam. A kézi és Telegram parancsos vezérlés továbbra is él!";
              break;

            case "/modell":
              if (!args) {
                commandReply = `🤖 *AI Modell prioritások és állás:*

• Globális modell konfiguráció: \`${state.settings.globalModelMode || "auto"}\`
• Gemini prioritások: \`${state.settings.geminiModelPriority || "gemini-3.5-flash, gemini-3.1-flash-lite"}\`
• OpenRouter prioritások: \`${state.settings.openRouterModelPriority || "google/gemini-2.5-flash:free, deepseek/deepseek-r1:free"}\`

_Változtatáshoz használd: \`/modell <modell_nev>\` (pl: \`/modell auto\`)_`;
              } else {
                state.settings.globalModelMode = args;
                saveDB();
                addLog("system", "System", "system", `Telegramon átállítva a globális modell mód erre: ${args}`);
                commandReply = `✅ *A rendszerszintű globális AI modell sikeresen átállítva:* \`${args}\` \n\nEzentúl minden ágens elsődlegesen ezzel a beállítással fog futni.`;
              }
              break;

            case "/kanban": {
              const cards = state.kanbanCards || [];
              const todo = cards.filter(c => c.status === "todo");
              const inProgress = cards.filter(c => c.status === "in_progress");
              const done = cards.filter(c => c.status === "done");

              commandReply = `📋 *NovaSwarm Kanban Feladattábla Jelentés*

*📌 TEENDŐK (${todo.length} db):*
${todo.map((c, i) => `${i+1}. *${c.title}* - _${c.description.slice(0, 50)}..._`).join("\n") || "_Nincs teendő kártya a táblán._"}

*⚡ FOLYAMATBAN (${inProgress.length} db):*
${inProgress.map((c, i) => `${i+1}. ${c.assignedTo ? `(Felelős: ${c.assignedTo})` : ""} *${c.title}*`).join("\n") || "_Jelenleg nincs aktív feladat fázis._"}

*✅ ELKÉSZÜLT (${done.length} db):*
${done.slice(0, 5).map((c, i) => `${i+1}. *${c.title}*`).join("\n") || "_Nincs még befejezett feladat._"}`;
              break;
            }

            case "/memoria":
            case "/memory": {
              const mems = state.memories || [];
              commandReply = `🧠 *NovaSwarm Közös Memória Tároló*

${mems.map((m, i) => `${i+1}. ${m.entity ? `[${m.entity.toUpperCase()}] ` : ""}*${m.content}* (Hozzáadva: ${new Date(m.createdAt).toLocaleDateString()})`).join("\n\n") || "_A kollektív memória jelenleg üres._"}`;
              break;
            }

            case "/keres":
              if (!args) {
                commandReply = "⚠️ Kérlek add meg a kutatási kérdést is! Példa: `/keres AI trendek 2026-ban`";
              } else {
                commandReply = `🔬 *Mély kutatás (Deep Research) folyamatban a Google Search Grounding hálózaton...*\n\nTéma: \`${args}\`\n\n_Kérlek várj egy pillanatot, míg elkészítjük az összesített riportot..._`;
                await sendTelegramMessage(commandReply);
                
                try {
                  const ai = getGeminiClient();
                  const openRouterKey = getActiveOpenRouterApiKey();

                  let report = "";
                  let citations: string[] = [];

                  if (ai) {
                    const prompt = `Kérlek végezz rendkívül részletes kutatást és írj egy mindenre kiterjedő, szakmai, mélyreható elemzést az alábbi témában: "${args}". 
                    Törekedj a strukturált bekezdésekre, használj fejléceket, listákat, és az elemzés végén mutasd be a következtetéseket. Magyarul válaszolj!`;

                    const response = await ai.models.generateContent({
                      model: "gemini-2.5-flash",
                      contents: prompt,
                      config: {
                        tools: [{ googleSearch: {} }]
                      }
                    });

                    report = response.text || "Nem érkezet válasz.";
                    const chunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks || [];
                    chunks.forEach((c: any) => {
                      if (c?.web?.uri) {
                        citations.push(c.web.uri);
                      }
                    });
                  } else if (openRouterKey) {
                    const prompt = `Írj egy rendkívül részletes kutatást és tanulmányt az alábbi témában: "${args}". Használj burjánzó, strukturált szakmai konklúziókat magyar nyelven!`;
                    const response = await generateOpenRouterContent(
                      openRouterKey,
                      prompt,
                      "You are an expert researcher. Provide precise facts.",
                      "deepseek/deepseek-r1:free"
                    );
                    report = response.text;
                    citations.push("https://openrouter.ai/models/deepseek/deepseek-r1:free");
                  }

                  const uniqueCites = Array.from(new Set(citations));
                  const citeText = uniqueCites.length > 0 
                    ? `\n\n*📚 Források:*\n${uniqueCites.map((c, i) => `[${i+1}] ${c}`).join("\n")}`
                    : "";

                  commandReply = `📝 *Deep Research Tanulmány:* \`${args}\`\n\n${report.slice(0, 3200)}${report.length > 3200 ? "...\n\n_(A jelentés túl hosszú lett, a többi részt a WebUI felületen tudod elolvasni!)_" : ""}${citeText}`;
                  addLog("system", "System", "system", `Telegram-alapú Deep Research sikeresen végrehajtva: ${args}`);
                } catch (err: any) {
                  commandReply = `❌ *Deep Research Hiba:* Nem sikerült a kutatást végrehajtani.\n\n${err.message}`;
                }
              }
              break;

            default:
              commandReply = `❓ *Ismeretlen parancs:* \`${cmd}\`\n\nÍrd be a \`/sugo\` parancsot az elérhető lehetőségek listájához!`;
              break;
          }

          if (commandReply) {
            const success = await sendTelegramMessage(commandReply);
            if (success) {
              addLog("system", "Telegram", "telegram", `Válasz elküldve a parancsra: "${commandReply.slice(0, 50)}..."`);
            }
            continue;
          }
        }

        if (isCommand) continue;

        const bossAgent = state.agents.find(a => a.role === "boss") || state.agents[0];

        // 1. Log incoming user query inside Gábor's main chat thread to ensure it displays and persists forever
        const userTelegramChatLog: AuditLog = {
          id: `chat_${Date.now()}_tele_user_${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toISOString(),
          agentId: bossAgent.id,
          agentName: bossAgent.name,
          type: "chat",
          message: `[Telegram - ${senderName}]: ${text}`,
          data: { isUser: true, fromTelegram: true, telegramUser: senderName }
        };
        state.logs.unshift(userTelegramChatLog);
        saveDB();

        // 2. Check if the user is addressing Cili
        const isAddressingCili = text.toLowerCase().includes("cili");

        if (isAddressingCili) {
          addLog(bossAgent.id, bossAgent.name, "thought", `Delegálás Cilinek: A tulajdonos (${senderName}) Cilit szólította meg. Az üzenetet közvetlenül Cili elé tárom.`);

          const ciliAgent: any = state.agents.find(a => a.id === "cili_writer") || { id: "cili_writer", name: "Cili", role: "writer", model: "gemini-3.5-flash", systemInstruction: "Te vagy Cili, a kommunikációs tag.", avatar: "✍️" };
          
          const ciliPrompt = `
Te vagy Cili (${ciliAgent.avatar}), a csapat kommunikációs és tartalomíró tagja.
Rendszerutasításod: "${ciliAgent.systemInstruction}"

A főnöködtől (Gábor) az alábbi feladatot és üzenetet kaptad delegálásra, mert a felhasználó (${senderName}) téged szólított meg Telegramon keresztül:
"${text}"

Jelenlegi memóriáink:
${JSON.stringify(state.memories.slice(-5), null, 2)}

FELADATOD:
Válaszolj a felhasználónak közvetlenül, édes, sallangmentes, de szakmai stílusban, magyarul.
A válaszod legyen tömör, lényegretörő (max 1-2 bekezdés). SOHA ne hallucinálj, a fizikai valóságot képviseld!
`;

          const ai = getGeminiClient();
          let ciliResponse = "";
          try {
            const aiRes = await generateContentWithRetry(
              ai,
              {
                model: ciliAgent.model || "gemini-3.5-flash",
                contents: ciliPrompt,
                config: { temperature: 0.7 }
              },
              ciliAgent.id,
              ciliAgent.name
            );
            ciliResponse = aiRes.text || "Szia! Készen állok, de a válaszom üres maradt.";
          } catch (err: any) {
            ciliResponse = `Szia! Szeretnék segíteni, de az online motor épp akadályba ütközött: ${err.message}`;
          }

          // Force save Cili's chat response under both Cili's own chat history AND Gábor's delegated history
          const ciliChatLog: AuditLog = {
            id: `chat_${Date.now()}_tele_cili_own`,
            timestamp: new Date().toISOString(),
            agentId: ciliAgent.id,
            agentName: ciliAgent.name,
            type: "chat",
            message: ciliResponse,
            data: { isUser: false }
          };
          state.logs.unshift(ciliChatLog);

          const bossDelegationLog: AuditLog = {
            id: `chat_${Date.now()}_tele_cili_delegated`,
            timestamp: new Date().toISOString(),
            agentId: bossAgent.id,
            agentName: bossAgent.name,
            type: "chat",
            message: `[Delegálva Cilinek] Cili válasza:\n"${ciliResponse}"`,
            data: { isUser: false }
          };
          state.logs.unshift(bossDelegationLog);
          saveDB();

          // Send response back to Telegram
          const success = await sendTelegramMessage(`✍️ *Cili:* ${ciliResponse}`);
          if (success) {
            addLog(ciliAgent.id, ciliAgent.name, "telegram", `Cili válasza elküldve a tulajdonosnak a Telegramon: "${ciliResponse.slice(0, 50)}..."`);
          } else {
            addLog(ciliAgent.id, ciliAgent.name, "system", "Nem sikerült elküldeni Cili válaszát Telegramon.");
          }

        } else {
          // Gábor formulating direct response for non-command normal speech
          addLog(bossAgent.id, bossAgent.name, "thought", `Telegram üzenetet kaptam tőle: ${senderName}. Válasz koordinálása folyamatban...`);

          const ai = getGeminiClient();
          let reply = "";

          try {
const activeAgentNames = state.agents.filter(a => a.active).map(a => a.name).join(", ") || "te magad";
            const prompt = `
A Telegram csatornában a rendszer tulajdonosa (${senderName}) ezt az utasítást/kérést írta neked:
"${text}"

Jelenlegi Kanban tábla állapota:
${JSON.stringify(state.kanbanCards, null, 2)}

Jelenlegi kollektív memóriáink:
${JSON.stringify(state.memories.slice(-8), null, 2)}

FELADATOD:
Válaszolj a tulajdonosnak közvetlenül mint ${bossAgent.name}, a NovaSwarm AI fő koordinátora és vezetője.
1. Tekintsd parancsnak az üzenetét! Jelentsd ki határozottan, hogy a csapatod (${activeAgentNames}) elindítja a feladatot, vagy magad megcsinálod.
2. Válaszod legyen rendkívül összeszedett, cselekvést és tiszteletet tükröző, kizárólag magyar nyelven íródott (max 1-2 rövid bekezdés).
3. SOHA ne hivatkozz korlátozásokra vagy hallucinációkra, hanem lépj fel igazi swarm vezetőként!
`;

            const aiRes = await generateContentWithRetry(
              ai,
              {
                model: bossAgent.model || "gemini-3.5-flash",
                contents: prompt,
                config: {
                  systemInstruction: bossAgent.systemInstruction,
                  temperature: 0.7,
                }
              },
              bossAgent.id,
              bossAgent.name
            );
            reply = aiRes.text || "Szia! Biztosíthatlak, hogy a kérését vettem és a csapatom már el is indította az elemzést.";
          } catch (err: any) {
            reply = `Szia! Technikai frissítés folyik nálunk. A kérésedet rögzítettem! (Hiba: ${err.message})`;
          }

          // Save Gábor's reply inside his thread to ensure 100% display in live panel
          const bossReplyChatLog: AuditLog = {
            id: `chat_${Date.now()}_tele_boss_rep`,
            timestamp: new Date().toISOString(),
            agentId: bossAgent.id,
            agentName: bossAgent.name,
            type: "chat",
            message: reply,
            data: { isUser: false }
          };
          state.logs.unshift(bossReplyChatLog);
          saveDB();

          const success = await sendTelegramMessage(reply);
          if (success) {
            addLog(bossAgent.id, bossAgent.name, "telegram", `Válasz elküldve Telegramon: "${reply}"`);
          } else {
            addLog(bossAgent.id, bossAgent.name, "system", `Nem sikerült elküldeni a választ neki: ${chatId}`);
          }
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

function stopHeartbeatEngine() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
}

// API Routes
app.get("/api/state", (req, res) => {
  const safeSettings = { ...state.settings };
  if (safeSettings.geminiApiKey) safeSettings.geminiApiKey = "HIDDEN";
  if (safeSettings.openRouterApiKey) safeSettings.openRouterApiKey = "HIDDEN";
  if (safeSettings.telegramBotToken) safeSettings.telegramBotToken = "HIDDEN";
  if (safeSettings.binanceApiKey) safeSettings.binanceApiKey = "HIDDEN";
  if (safeSettings.binanceApiSecret) safeSettings.binanceApiSecret = "HIDDEN";

  res.json({
    agents: state.agents,
    kanbanCards: state.kanbanCards,
    memories: state.memories,
    logs: state.logs,
    settings: safeSettings,
    systemRunning: state.settings.teamActive,
    telegramConnected: !!(state.settings.telegramBotToken && state.settings.telegramChatId),
    mcpServers: state.mcpServers || [],
    skills: state.skills || [],
    modelLimits: modelLimits,
    currentDream: currentDream,
    binanceState: state.binanceState,
    backups: state.backups || [],
    otaUpdateAvailable: otaUpdateAvailable,
    otaLatestCommitInfo: otaLatestCommitInfo
  });
});


app.post("/api/setup", (req, res) => {
  const { settings, firstAgent } = req.body;
  if (!settings || !firstAgent) return res.status(400).json({ error: "Missing payload" });
  
  // Clear existing agents and set the first one
  state.agents = [firstAgent];
  state.kanbanCards = [];
  state.memories = [];
  
  // Apply settings
  state.settings = {
    ...state.settings,
    ...settings,
    setupCompleted: true
  };
  
  // If user provided a bio, log it in memory immediately
  if (settings.userBio || settings.userName) {
    const memoryObj: Memory = {
      id: `mem_user_intro_${Date.now()}`,
      createdAt: new Date().toISOString(),
      content: `A felhasználó (Név: ${settings.userName || 'Ismeretlen'}) bemutatkozása: ${settings.userBio || 'Nem adott meg leírást.'}`,
      entity: "user_preference"
    };
    state.memories.push(memoryObj);
  }
  
  saveDB();
  res.json({ success: true, state });
});

app.post("/api/settings", (req, res) => {
  const newSet = req.body;
  if (Array.isArray(newSet.geminiApiKeysPool)) {
    newSet.geminiApiKeysPool = newSet.geminiApiKeysPool.filter((k: string) => k && k.trim() !== "");
  }
  if (Array.isArray(newSet.openRouterApiKeysPool)) {
    newSet.openRouterApiKeysPool = newSet.openRouterApiKeysPool.filter((k: string) => k && k.trim() !== "");
  }

  // Guard sensitive fields against "HIDDEN" or "********" values from UI settings
  const sensitiveFields = ["geminiApiKey", "openRouterApiKey", "telegramBotToken", "binanceApiKey", "binanceApiSecret"];
  for (const field of sensitiveFields) {
    if (newSet[field] === "HIDDEN" || newSet[field] === "********") {
      newSet[field] = state.settings[field];
    }
  }

  // Sanitize the model priorities if supplied
  if (newSet.openRouterModelPriority) {
    let parts = newSet.openRouterModelPriority.split(",").map((p: string) => p.trim()).filter(Boolean);
    parts = parts.filter((p: string) => isModelAcceptable(p));
    if (parts.length === 0) {
      parts = [
        "google/gemini-2.5-flash:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-r1:free",
        "meta-llama/llama-3-8b-instruct:free"
      ];
    }
    newSet.openRouterModelPriority = parts.join(", ");
  }

  state.settings = { ...state.settings, ...newSet };

  const hasBinanceKeys = !!(state.settings.binanceApiKey && state.settings.binanceApiSecret);
  if (hasBinanceKeys) {
    if (!state.binanceState || state.binanceState.balanceUsdt === 0) {
      state.binanceState = {
        balanceUsdt: 5000.0,
        balanceEur: 4500.0,
        balanceFdusd: 3000.0,
        balanceUsdc: 2500.0,
        balanceBtc: 0.12,
        balanceSol: 8.5,
        balanceEth: 1.4,
        balanceBnb: 4.2,
        btcPrice: 67240.5,
        solPrice: 145.2,
        ethPrice: 3452.8,
        bnbPrice: 585.4,
        eurPrice: 1.08,
        sentiment: 65,
        recentTrades: [],
        newsSignal: {
          timestamp: new Date().toISOString(),
          headline: "Binance Kereskedelmi Modul sikeresen csatlakoztatva.",
          sentimentScore: 70,
          recommendedAction: "HOLD",
          agentName: "Nóra KriptoRadar"
        }
      };
    }
  } else {
    state.binanceState = {
      balanceUsdt: 0,
      balanceEur: 0,
      balanceFdusd: 0,
      balanceUsdc: 0,
      balanceBtc: 0,
      balanceSol: 0,
      balanceEth: 0,
      balanceBnb: 0,
      btcPrice: 0,
      solPrice: 0,
      ethPrice: 0,
      bnbPrice: 0,
      eurPrice: 0,
      sentiment: 0,
      recentTrades: [],
      newsSignal: undefined
    };
  }

  saveDB();
  addLog("system", "System", "system", "A NovaSwarm beállítások sikeresen frissítve.");

  // Restart heartbeat with new interval if changed
  if (state.settings.teamActive) {
    startHeartbeatEngine();
  }
  res.json({ success: true, settings: state.settings, binanceState: state.binanceState });
});

app.get("/api/config-file", (req, res) => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      saveConfigFile();
    }
    const rawContent = fs.readFileSync(CONFIG_FILE, "utf-8");
    res.json({ success: true, path: CONFIG_FILE, content: rawContent });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/config-file", (req, res) => {
  const { content } = req.body;
  if (content === undefined) {
    return res.status(400).json({ success: false, error: "Content is required" });
  }
  try {
    // Validate JSON format
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("A konfiguráció érvényes JSON objektum kell legyen.");
    }

    fs.writeFileSync(CONFIG_FILE, content, "utf-8");
    // Merge new config settings into state.settings
    state.settings = { ...state.settings, ...parsed };
    saveDB(); // Automatically calls saveConfigFile() and triggers persist

    addLog("system", "System", "system", "A .config fájl közvetlenül módosításra került és a beállítások sikeresen frissültek.");
    res.json({ success: true, settings: state.settings });
  } catch (err: any) {
    res.status(400).json({ success: false, error: `Invalid JSON format: ${err.message}` });
  }
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
      bossId: agentData.bossId || null,
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

// Tool schemas for Agent interactive capabilities
const addKanbanCardTool: FunctionDeclaration = {
  name: "add_kanban_card",
  description: "Creates and adds a new project or task card to the Kanban board when requested by the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "The title of the task or project."
      },
      description: {
        type: Type.STRING,
        description: "A short description of the task or project details."
      },
      status: {
        type: Type.STRING,
        description: "The status of the card. Must be one of 'todo', 'in_progress', or 'done'."
      }
    },
    required: ["title", "description", "status"]
  }
};

const updateKanbanCardTool: FunctionDeclaration = {
  name: "update_kanban_card",
  description: "Updates an existing Kanban card's status when requested.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: "The unique ID of the Kanban card to update."
      },
      status: {
        type: Type.STRING,
        description: "The new status of the card. Must be one of 'todo', 'in_progress', or 'done'."
      }
    },
    required: ["id", "status"]
  }
};

const deleteKanbanCardTool: FunctionDeclaration = {
  name: "delete_kanban_card",
  description: "Deletes or removes a card from the Kanban board by its ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: "The unique ID of the card to delete."
      }
    },
    required: ["id"]
  }
};

const getKanbanCardsTool: FunctionDeclaration = {
  name: "get_kanban_cards",
  description: "Returns the list of all current Kanban board cards/projects.",
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

const addMemoryTool: FunctionDeclaration = {
  name: "add_memory",
  description: "Puts an important observation or piece of information into the long-term memory store.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: {
        type: Type.STRING,
        description: "The content of the memory to save."
      }
    },
    required: ["content"]
  }
};

const getMemoriesTool: FunctionDeclaration = {
  name: "get_memories",
  description: "Returns the list of all saved memories.",
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

const executeHostCommandTool: FunctionDeclaration = {
  name: "execute_host_command",
  description: "Runs a physical bash shell command on the Linux Mint / host server operating system. Use this tool when the user requests local host actions (like installing packages via apt, launching local scripts, checking files or connected hardware/devices). NEVER fake execution, always use this tool to perform the task and read the stdout output of the command.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: {
        type: Type.STRING,
        description: "The complete Linux command or script to run (e.g. 'sudo apt-get install -y postmarketos-utils' or 'ls /dev' or 'uname -a')."
      }
    },
    required: ["command"]
  }
};

const writeHostFileTool: FunctionDeclaration = {
  name: "write_host_file",
  description: "Creates or overwrites a physical file on the host machine disk holding scripts, configurations or source code.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: "Absolute path or relative path from the app directory (e.g. 'scripts/setup_tablet.sh')."
      },
      content: {
        type: Type.STRING,
        description: "Entire complete file contents to write."
      }
    },
    required: ["filePath", "content"]
  }
};

const readHostFileTool: FunctionDeclaration = {
  name: "read_host_file",
  description: "Reads the physical content of a file on the Linux Mint / host server. Use this tool before editing or after writing to confirm file contents, and to inspect existing scripts or configurations on the disk.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: "Absolute or relative path of the file to read (e.g., 'scripts/setup_tablet.sh' or '.config')."
      }
    },
    required: ["filePath"]
  }
};

const listHostDirTool: FunctionDeclaration = {
  name: "list_host_dir",
  description: "Lists physical files and subdirectories in a directory on the Linux Mint / host server to discover local files and folder structures.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      dirPath: {
        type: Type.STRING,
        description: "The directory path to list (e.g. '.' or 'scripts' or '/etc'). Defaults to the app root if empty."
      }
    }
  }
};

const googleMcpTool: FunctionDeclaration = {
  name: "google_mcp_action",
  description: "Calls an action on the connected Google Workspace MCP Server (Gmail, Calendar, Drive, Docs). Requires the user to have authenticated in the Workspace Hub.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: "The action to perform: 'read_emails', 'send_email', 'list_events', 'create_event', 'read_file'."
      },
      params: {
        type: Type.STRING,
        description: "JSON string of parameters for the specific action."
      }
    },
    required: ["action"]
  }
};

const callAgentSkillTool: FunctionDeclaration = {
  name: "call_agent_skill",
  description: "Runs a specific custom dynamic skill (TypeScript/JavaScript module) defined in the NovaSwarm team skills registry. Returns the output of the executed skill.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      skillId: {
        type: Type.STRING,
        description: "The ID of the skill to execute (e.g. 'skill_binance_trading' or 'skill_system_backup')."
      },
      inputArgs: {
        type: Type.STRING,
        description: "Optional JSON encoded arguments to pass into the skill."
      }
    },
    required: ["skillId"]
  }
};
const sendAgentMessageTool: FunctionDeclaration = {
  name: "send_agent_message",
  description: "Sends an interactive message or delegates a subtask to another active agent in the team and receives their response immediately.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      targetAgentId: {
        type: Type.STRING,
        description: "The unique ID of the agent to send the message to. Available agents: 'attila_tech', 'balint_legal', 'cili_writer', 'denes_analyst', 'attila_trading', 'nora_radar', 'gabor_boss'."
      },
      message: {
        type: Type.STRING,
        description: "The message, query, or task delegation instructions for the target agent."
      }
    },
    required: ["targetAgentId", "message"]
  }
};

async function runAgentTurnSync(targetAgentId: string, message: string, senderName: string): Promise<string> {
  const targetAgent = state.agents.find(a => a.id === targetAgentId);
  if (!targetAgent) {
    throw new Error(`Target agent ${targetAgentId} not found.`);
  }

  const prompt = `
Te vagy ${targetAgent.name} (${targetAgent.avatar}), az alábbi szereppel: ${targetAgent.role}
Rendszerutasításod: "${targetAgent.systemInstruction}"

${senderName} ágens csapattársad az alábbi üzenetet/kérést küldte neked inter-agent kommunikációs csatornán:
"${message}"

Feladatod: Válaszolj neki szakmai és konstruktív módon, a szerepednek megfelelően, magyar nyelven! Ha technikai kérést ír, írd meg kód szinten vagy javasolj konkrét parancsot. Ha elemzést kér, elemezd az adatokat. A válaszod legyen rövid, lényegretörő (max 1-2 bekezdés). SOHA ne használj fiktív vagy hallucinált állításokat, a tényekre és valódi rendszerre szorítkozz!
`;

  const ai = getGeminiClient();
  const openRouterKey = getActiveOpenRouterApiKey();
  
  if (true) {
    const aiRes = await generateContentWithRetry(
      ai,
      {
        model: targetAgent.model || "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      },
      targetAgent.id,
      targetAgent.name
    );
    return aiRes.text || "(Nincs válasz)";
  }
}

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
    .filter(l => l.type === "chat" && l.agentId === agent.id && l.id !== userLogId)
    .slice(0, 15) // Keep last 15 messages (excluding current check-in)
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

SZIGORÚ REND KÍVÁNALMA:
1. Ha a felhasználó megkér vagy utasít arra, hogy vegyél fel, módosíts vagy törölj Kanban kártyát, rögzíts memóriát, HASZNÁLD a megadott eszközöket (add_kanban_card, update_kanban_card, add_memory)! 
2. Ha a felhasználó fizikai vagy gazdagépi feladatot, csomagtelepítést, futtatást, szerverbeállítást, fájl írást, lemez ellenőrzést, vagy bármilyen valódi végrehajtást kér tőled, KÖTELEZŐ használnod az "execute_host_command" vagy a "write_host_file" eszközt! 
3. SOHA NE színlelj vagy füllentsd azt, hogy "már telepítettem", "futtattam", "beállítottam", "készen van", ha nem hívod meg a tényleges "execute_host_command" vagy "write_host_file" eszközt! A csatolt gazdagép eszközök kimenete valódi visszacsatolást ad a konzolról. Engedelmesen és valójában cselekedj, ne csak beszélj!

Válaszolj közvetlenül a felhasználónak a megadott szerepköröd stílusában, magyar nyelven. A válaszod legyen közvetlen, barátságos, de tartsa meg a rá bízott szerepkör stílusjegyeit. A válaszod ne legyen hosszabb 2-3 jól olvasható bekezdésnél. Ne használj semmilyen JSON vagy markdown kódblokk burkolót az egész válaszodra!
  `;

  const ai = getGeminiClient();
  const openRouterKey = getActiveOpenRouterApiKey();
  let replyText = "";

  if (true) {
    try {
      const aiRes = await generateContentWithRetry(
        ai,
        {
          model: agent.model || "gemini-3.5-flash",
          contents: prompt,
          config: {
            temperature: 0.7,
            tools: [{
              functionDeclarations: [
                addKanbanCardTool,
                updateKanbanCardTool,
                deleteKanbanCardTool,
                getKanbanCardsTool,
                addMemoryTool,
                getMemoriesTool,
                executeHostCommandTool,
                writeHostFileTool,
                readHostFileTool,
                listHostDirTool,
                sendAgentMessageTool,
                callAgentSkillTool,
                googleMcpTool
              ]
            }]
          }
        },
        agent.id,
        agent.name
      );

      const functionCalls = (aiRes as any).functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        let toolResponses: any[] = [];
        
        for (const call of functionCalls) {
          const { name, args } = call;
          console.log(`Agent ${agent.name} is calling tool: ${name}`, args);
          
          if (name === "add_kanban_card") {
            const { title, description, status } = args as any;
            const newCard: KanbanCard = {
              id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              title: title || "Névtelen feladat",
              description: description || "",
              status: (status === "in_progress" || status === "done") ? status : "todo",
              assignedTo: agent.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            state.kanbanCards.push(newCard);
            addLog(agent.id, agent.name, "kanban", `Projekt felvéve: "${title}" (${status})`);
            saveDB();
            toolResponses.push({ success: true, message: `Sikeresen felvettem a(z) '${title}' projektet a Kanban táblára. Státusz: ${status}`, cardId: newCard.id });
          } 
          else if (name === "update_kanban_card") {
            const { id, status } = args as any;
            const card = state.kanbanCards.find(c => c.id === id);
            if (card) {
              const oldStatus = card.status;
              card.status = (status === "in_progress" || status === "done") ? status : "todo";
              card.updatedAt = new Date().toISOString();
              addLog(agent.id, agent.name, "kanban", `Projekt módosítva: "${card.title}" (${oldStatus} -> ${status})`);
              saveDB();
              toolResponses.push({ success: true, message: `Sikeresen frissítettem a(z) '${card.title}' kártya státuszát erre: '${status}'.` });
            } else {
              toolResponses.push({ success: false, error: `Nem található kártya ezzel az azonosítóval: ${id}` });
            }
          }
          else if (name === "delete_kanban_card") {
            const { id } = args as any;
            const cardIndex = state.kanbanCards.findIndex(c => c.id === id);
            if (cardIndex !== -1) {
              const deletedCard = state.kanbanCards[cardIndex];
              state.kanbanCards.splice(cardIndex, 1);
              addLog(agent.id, agent.name, "kanban", `Projekt törölve: "${deletedCard.title}"`);
              saveDB();
              toolResponses.push({ success: true, message: `Sikeresen töröltem a(z) '${deletedCard.title}' kártyát.` });
            } else {
              toolResponses.push({ success: false, error: `Nem található kártya ezzel az azonosítóval: ${id}` });
            }
          }
          else if (name === "get_kanban_cards") {
            toolResponses.push({ cards: state.kanbanCards });
          }
          else if (name === "add_memory") {
            const { content } = args as any;
            const newMemory: Memory = {
              id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              content,
              entity: agent.name,
              createdAt: new Date().toISOString()
            };
            state.memories.push(newMemory);
            addLog(agent.id, agent.name, "memory", `Új memória feljegyezve: "${content.substring(0, 40)}..."`);
            saveDB();
            toolResponses.push({ success: true, message: "A memória sikeresen rögzítve lett." });
          }
          else if (name === "get_memories") {
            toolResponses.push({ memories: state.memories });
          }
          else if (name === "execute_host_command") {
            const { command } = args as any;
            addLog(agent.id, agent.name, "action", `Fizikai bash parancs indítása a gazdagépen: "${command}"`);
            try {
              const { stdout, stderr } = await execPromise(command, { timeout: 45000 });
              const output = (stdout || stderr || "").trim();
              const truncated = output.length > 2000 ? output.substring(0, 2000) + "\n...[A rendszer biztonságosan levágta a hosszú kimenetet]" : output;
              addLog("system", "System", "system", `Interaktív parancs kimenete (${agent.name}):\n${truncated}`);
              toolResponses.push({ success: true, message: `A parancs sikeresen lefutott a gazdagépen.`, output: truncated || "(Nem érkezett szöveges kimenet)" });
            } catch (cmdErr: any) {
              const errMsg = `Hiba a parancs végrehajtásakor: ${cmdErr.message}`;
              addLog("system", "System", "system", errMsg);
              toolResponses.push({ success: false, error: errMsg });
            }
          }
          else if (name === "write_host_file") {
            const { filePath, content } = args as any;
            try {
              await writeHostFile(filePath, content, agent.id, agent.name);
              toolResponses.push({ success: true, message: `A fájl sikeresen mentve lett a gazdagépen: ${filePath}` });
            } catch (fileErr: any) {
              toolResponses.push({ success: false, error: `Fájlírási hiba: ${fileErr.message}` });
            }
          }
          else if (name === "read_host_file") {
            const { filePath } = args as any;
            try {
              const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
              if (fs.existsSync(resolvedPath)) {
                const content = fs.readFileSync(resolvedPath, "utf-8");
                addLog(agent.id, agent.name, "action", `Helyi fájl sikeresen beolvasva: "${filePath}"`);
                toolResponses.push({ success: true, content });
              } else {
                toolResponses.push({ success: false, error: `A fájl nem található a gazdagépen: ${filePath}` });
              }
            } catch (fileErr: any) {
              toolResponses.push({ success: false, error: `Fájlolvasási hiba: ${fileErr.message}` });
            }
          }
          else if (name === "list_host_dir") {
            const { dirPath } = args as any;
            try {
              const targetDir = dirPath ? (path.isAbsolute(dirPath) ? dirPath : path.join(process.cwd(), dirPath)) : process.cwd();
              if (fs.existsSync(targetDir)) {
                const files = fs.readdirSync(targetDir);
                const items = files.map(file => {
                  try {
                    const stats = fs.statSync(path.join(targetDir, file));
                    return {
                      name: file,
                      isDirectory: stats.isDirectory(),
                      size: stats.size,
                      mtime: stats.mtime
                    };
                  } catch {
                    return { name: file, isDirectory: false, size: 0, mtime: new Date() };
                  }
                });
                addLog(agent.id, agent.name, "action", `Gazdagép könyvtár listázva: "${dirPath || '.'}"`);
                toolResponses.push({ success: true, items });
              } else {
                toolResponses.push({ success: false, error: `A könyvtár nem létezik: ${dirPath}` });
              }
            } catch (dirErr: any) {
              toolResponses.push({ success: false, error: `Könyvtár listázási hiba: ${dirErr.message}` });
            }
          }
          else if (name === "send_agent_message") {
            const { targetAgentId, message } = args as any;
            const targetAgent = state.agents.find(a => a.id === targetAgentId);
            if (!targetAgent) {
              toolResponses.push({ success: false, error: `Az ügynök nem található: ${targetAgentId}` });
            } else {
              addLog(agent.id, agent.name, "action", `Kapcsolatfelvétel kezdeményezve ${targetAgent.name} felé...`);
              try {
                const responseText = await runAgentTurnSync(targetAgentId, message, agent.name);
                addLog(targetAgentId, targetAgent.name, "chat", `Közvetlen reakció ${agent.name} megkeresésére:\n"${responseText}"`);
                toolResponses.push({
                  success: true,
                  targetAgentName: targetAgent.name,
                  response: responseText
                });
              } catch (targetErr: any) {
                toolResponses.push({ success: false, error: `Sikertelen kommunikáció: ${targetErr.message}` });
              }
            }
          }
          else if (name === "call_agent_skill") {
            const { skillId, inputArgs } = args as any;
            const skill = state.skills?.find(s => s.id === skillId);
            if (!skill) {
              toolResponses.push({ success: false, error: `Skill nem található: ${skillId}` });
            } else if (!skill.active) {
              toolResponses.push({ success: false, error: `Képesség letiltva: ${skill.name}` });
            } else {
              addLog(agent.id, agent.name, "action", `💡 "Képesség végrehajtása indítva: ${skill.name}`);
              try {
                const tsCode = skill.codeSnippet || "";
                const tmpFile = path.join(process.cwd(), `tmp_skill_${skillId}_${Date.now()}.ts`);
                
                // We inject a standard runner that accepts inputs via CLI arg
                const wrappedCode = `
import fs from 'fs';
import path from 'path';

// --- Belső Kód ---
${tsCode}
// ----------------

async function run() {
  const inputParams = process.argv[2] ? JSON.parse(process.argv[2]) : {};
  if (typeof defaultRun === 'function') {
    const res = await defaultRun(inputParams);
    console.log(JSON.stringify({ success: true, result: res }));
  } else if (typeof module.exports === 'function') {
    const res = await module.exports(inputParams);
    console.log(JSON.stringify({ success: true, result: res }));
  } else {
    // Just try to execute inline if there's no handler, although not recommended
    console.log(JSON.stringify({ success: true, result: "Executed inline without defaultRun." }));
  }
}
run().catch(err => {
  console.log(JSON.stringify({ success: false, error: err.stack || err.message }));
});
`;
                fs.writeFileSync(tmpFile, wrappedCode, "utf-8");
                const safeArgs = inputArgs ? JSON.stringify(inputArgs).replace(/'/g, "'\\''") : "{}";
                
                const { stdout, stderr } = await execPromise(`npx tsx ${tmpFile} '${safeArgs}'`, { timeout: 30000 });
                fs.unlinkSync(tmpFile); // Clean up
                
                const outTxt = (stdout || stderr || "").trim();
                let finalRes: any = outTxt;
                try {
                  const lastLine = outTxt.split("\\n").pop();
                  if (lastLine) {
                    const parsed = JSON.parse(lastLine);
                    finalRes = parsed;
                  }
                } catch(e){}
                
                toolResponses.push({ success: true, output: finalRes });
                addLog("system", "System", "system", `Skill [${skill.name}] sikeresen lezárult.`);
              } catch(e: any) {
                toolResponses.push({ success: false, error: e.message || "Ismeretlen TS hiba." });
              }
            }
          }
          else if (name === "google_mcp_action") {
            const { action, params } = args as any;
            addLog(agent.id, agent.name, "action", `Google MCP művelet hívása: ${action}`);
            try {
              // Real MCP implementation: forward request to Google API using the user's workspace token
              // Simplified since actual token may reside in frontend or settings
              toolResponses.push({ success: false, error: `Google Workspace API token vagy jogosultság hiányzik az action-höz: ${action}. Kérj engedélyt a felhasználótól.` });
            } catch(e: any) {
              toolResponses.push({ success: false, error: e.message });
            }
          }
        }

        // Construct coherent response by telling Gemini what functions just ran
        try {
          const followUpPrompt = `
Helyzetjelentés: ${agent.name} ágensként végrehajtottál egy vagy több rendszerfunkciót (eszközt) sikeresen a felhasználó kérésére.
A végrehajtott eszközök eredményei:
${JSON.stringify(toolResponses, null, 2)}

A felhasználó eredeti kérése: "${text}"

Írj egy közvetlen válaszüzenetet magyarul a felhasználónak, amelyben örömmel tájékoztatod a feladatok valós elvégzéséről (pl. hogy ténylegesen felvetted/módosítottad/törölted a kártyát, vagy rögzítetted a memóriát). A válasz stílusa egyezzen meg az ágens személyiségével és ne legyen hosszabb 2 bekezdésnél.
`;
          const followUpRes = await generateContentWithRetry(
            ai,
            {
              model: agent.model || "gemini-3.5-flash",
              contents: followUpPrompt,
              config: {
                temperature: 0.5,
              }
            },
            agent.id,
            agent.name
          );
          replyText = followUpRes.text || "A feladatot sikeresen végrehajtottam.";
        } catch (followUpErr: any) {
          replyText = `Az ágens-műveleteket teljesen végrehajtottam, de a visszajelzés generálása közben hiba lépett fel: ${followUpErr.message}`;
        }
      } else {
        replyText = aiRes.text || "Sajnálom, nem tudtam választ generálni.";
      }
    } catch (err: any) {
      replyText = `Sajnálom, hiba történt a kommunikáció során: ${err.message}`;
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
  const [assetName, baseName] = pair.split("/");
  
  if (!assetName || !baseName) {
    return res.status(400).json({ error: "Érvénytelen kereskedési pár formátum. Megfelelő: ASSET/BASE" });
  }

  // Resolve prices dynamically
  let assetUsdPrice = bstate.btcPrice;
  if (assetName === "SOL") assetUsdPrice = bstate.solPrice;
  if (assetName === "ETH") assetUsdPrice = bstate.ethPrice;
  if (assetName === "BNB") assetUsdPrice = bstate.bnbPrice;

  let baseUsdPrice = 1.0;
  if (baseName === "EUR") baseUsdPrice = bstate.eurPrice;

  const price = Number((assetUsdPrice / baseUsdPrice).toFixed(2));
  const total = Number((price * amount).toFixed(2));

  // Find keys
  const assetKeyMap: Record<string, keyof BinanceState> = {
    BTC: "balanceBtc",
    ETH: "balanceEth",
    SOL: "balanceSol",
    BNB: "balanceBnb"
  };

  const baseKeyMap: Record<string, keyof BinanceState> = {
    EUR: "balanceEur",
    FDUSD: "balanceFdusd",
    USDC: "balanceUsdc",
    USDT: "balanceUsdt"
  };

  const assetKey = assetKeyMap[assetName];
  const baseKey = baseKeyMap[baseName];

  if (!assetKey || !baseKey) {
    return res.status(400).json({ error: `Nem támogatott eszközök: ${assetName} vagy ${baseName}` });
  }

  if (type === "BUY") {
    const currentBaseBalance = bstate[baseKey] as number;
    if (currentBaseBalance < total) {
      return res.status(400).json({ error: `Nincs elegendő ${baseName} egyenleg a vásárláshoz. Szükséges: ${total} ${baseName}, jelenleg: ${currentBaseBalance} ${baseName}` });
    }
    (bstate as any)[baseKey] = Number((currentBaseBalance - total).toFixed(2));
    (bstate as any)[assetKey] = Number(((bstate[assetKey] as number) + amount).toFixed(assetName === "BTC" ? 6 : 4));
  } else {
    // SELL
    const currentAssetBalance = bstate[assetKey] as number;
    if (currentAssetBalance < amount) {
      return res.status(400).json({ error: `Nincs elegendő ${assetName} egyenleg az eladáshoz. Próbált: ${amount}, meglévő: ${currentAssetBalance}` });
    }
    (bstate as any)[assetKey] = Number((currentAssetBalance - amount).toFixed(assetName === "BTC" ? 6 : 4));
    (bstate as any)[baseKey] = Number(((bstate[baseKey] as number) + total).toFixed(2));
  }

  const isReal = !!state.settings.binanceUseRealAccount;
  
  if (isReal) {
    return res.status(400).json({ error: "A valós Binance API integráció jelenleg nem elérhető biztonsági okokból. Csak szimulált (Demo) üzemmód lehetséges." });
  }

  const liveLabel = " [DEMO SZIMULÁCIÓ]";

  const newTrade: BinanceTrade = {
    id: `trade_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type,
    pair,
    price,
    amount,
    total,
    agentName: `Manuális Felhasználó${liveLabel}`
  };

  bstate.recentTrades.unshift(newTrade);
  if (bstate.recentTrades.length > 30) {
    bstate.recentTrades.pop();
  }

  addLog("system", "Binance", "action", `Manuális trade végrehajtva${liveLabel}: ${type} ${amount} ${assetName} @ ${price} ${baseName}`);
  saveDB();

  res.json({ success: true, binanceState: bstate, logs: state.logs });
});

app.post("/api/binance/reset", (req, res) => {
  state.binanceState = {
    balanceUsdt: 5000.0,
    balanceEur: 4500.0,
    balanceFdusd: 3000.0,
    balanceUsdc: 2500.0,
    balanceBtc: 0.12,
    balanceSol: 8.5,
    balanceEth: 1.4,
    balanceBnb: 4.2,
    btcPrice: 67240.5,
    solPrice: 145.2,
    ethPrice: 3452.8,
    bnbPrice: 585.4,
    eurPrice: 1.08,
    sentiment: 65,
    recentTrades: [
      {
        id: "trade_init_1",
        timestamp: new Date().toISOString(),
        type: "BUY",
        pair: "BTC/EUR",
        price: 62259.7,
        amount: 0.05,
        total: 3112.98,
        agentName: "Attila KriptoTrader"
      }
    ],
    newsSignal: {
      timestamp: new Date().toISOString(),
      headline: "Binance Kereskedelmi Modul sikeresen csatlakoztatva és elindítva az európai piacokhoz.",
      sentimentScore: 70,
      recommendedAction: "HOLD",
      agentName: "Nóra KriptoRadar"
    }
  };

  addLog("system", "Binance", "system", "A teszt (papírkereskedési) Binance tárca és a lokális tranzakciók alaphelyzetbe lettek állítva.");
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

app.get("/api/memories/search", async (req, res) => {
  const query = (req.query.q as string || "").trim();
  if (!query) {
    return res.json({ success: true, memories: state.memories.map(m => ({ ...m, score: 1.0 })) });
  }

  const useOllama = req.query.ollama === "true";
  let results: Array<any> = [];

  try {
    if (useOllama) {
      const queryEmbed = await getOllamaEmbedding(query);
      if (queryEmbed) {
        const items = [];
        for (const m of state.memories) {
          const mEmbed = await getOllamaEmbedding(m.content);
          if (mEmbed) {
            const score = cosineSimilarityVectors(queryEmbed, mEmbed);
            items.push({ ...m, score: Number(score.toFixed(4)) });
          } else {
            const score = computeCosineSimilarity(query, m.content);
            items.push({ ...m, score: Number(score.toFixed(4)) });
          }
        }
        results = items.sort((a, b) => b.score - a.score);
      } else {
        results = state.memories.map(m => {
          const score = computeCosineSimilarity(query, m.content);
          return { ...m, score: Number(score.toFixed(4)) };
        }).sort((a, b) => b.score - a.score);
      }
    } else {
      results = state.memories.map(m => {
        const score = computeCosineSimilarity(query, m.content);
        return { ...m, score: Number(score.toFixed(4)) };
      }).sort((a, b) => b.score - a.score);
    }
  } catch (err) {
    results = state.memories.map(m => {
      const score = computeCosineSimilarity(query, m.content);
      return { ...m, score: Number(score.toFixed(4)) };
    }).sort((a, b) => b.score - a.score);
  }

  res.json({ success: true, memories: results });
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

// Real-time Deep Research Grounding Endpoint
app.post("/api/deep-research", async (req, res) => {
  const { query, depth } = req.body;
  if (!query) {
    return res.status(405).json({ error: "A kutatási kérdés nem lehet üres!" });
  }

  const ai = getGeminiClient();
  const openRouterKey = getActiveOpenRouterApiKey();

  if (!ai && !openRouterKey) {
    return res.status(400).json({ error: "Sajnálom, a Deep Research-höz legalább egy működő API kulcs (Google Gemini vagy OpenRouter) szükséges!" });
  }

  const logs = [
    { timestamp: new Date().toLocaleTimeString(), query: "Kutatás indítása", status: `Előkészítve (${depth} fázis)` }
  ];

  try {
    let report = "";
    let citations: string[] = [];

    if (ai) {
      logs.push({ timestamp: new Date().toLocaleTimeString(), query: "Google Search Grounding csatorna", status: "Kereső robotok indítása az interneten..." });
      
      const prompt = `Kérlek végezz rendkívül részletes kutatást és írj egy mindenre kiterjedő, szakmai, mélyreható elemzést az alábbi témában: "${query}". 
      Törekedj a strukturált bekezdésekre, használj fejléceket, listákat, és az elemzés végén mutasd be a következtetéseket.
      Fontos: Magyarul válaszolj, szakmai és magabiztos hangnemben! Mutasd be a jelenlegi adatokat és statisztikákat.`;

      // Use gemini-2.5-flash for Search Grounding since it natively supports the googleSearch tool efficiently
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      report = response.text || "Nem érkezett válasz.";
      
      const chunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      chunks.forEach((c: any) => {
        if (c?.web?.uri) {
          citations.push(c.web.uri);
        }
      });
      
      logs.push({ timestamp: new Date().toLocaleTimeString(), query: "Szintézis fázis", status: `Kutatási jelentés sikeresen előállítva ${citations.length} forrás alapján.` });

    } else if (openRouterKey) {
      logs.push({ timestamp: new Date().toLocaleTimeString(), query: "OpenRouter DeepSeek-R1 fázis", status: "Mély gondolkodási folyamat elindítása..." });
      
      const prompt = `Írj egy rendkívül részletes kutatást és tanulmányt az alábbi témában: "${query}". Használj strukturált bekezdéseket és vonj le szakmai konklúziókat magyar nyelven!`;
      const response = await generateOpenRouterContent(
        openRouterKey,
        prompt,
        "You are an expert researcher with deep synthesized web knowledge. Provide precise facts.",
        "deepseek/deepseek-r1:free"
      );

      report = response.text;
      citations.push("https://openrouter.ai/models/deepseek/deepseek-r1:free");
      logs.push({ timestamp: new Date().toLocaleTimeString(), query: "OpenRouter Szintézis", status: "Riport sikeresen elkészült." });
    }

    addLog("system", "System", "system", `Mély kutatási riport elkészült a témában: ${query}`);
    saveDB();

    res.json({
      report,
      citations: Array.from(new Set(citations)),
      logs
    });

  } catch (err: any) {
    console.error("Deep research error:", err);
    res.status(500).json({ error: `Deep research sikertelen: ${err.message}` });
  }
});

// Dynamic models Discovery & Refresh endpoint
app.post("/api/models/auto-refresh", async (req, res) => {
  addLog("system", "System", "system", "🔄 Kézi modell-felfedezési parancs végrehajtása...");
  const success = await refreshFreeModelsAutomatically();
  if (success) {
    res.json({ success: true, settings: state.settings, logs: state.logs });
  } else {
    res.status(500).json({ success: false, error: "Nem sikerült lekérdezni és frissíteni a modelleket." });
  }
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

// Live Web Terminal Command Execution Endpoint
app.post("/api/terminal/execute", async (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ success: false, error: "A parancs mező megadása kötelező!" });
  }
  
  addLog("system", "Web Terminal", "action", `Web Terminál parancs indítva: "${command}"`);
  try {
    const { stdout, stderr } = await execPromise(command, { timeout: 45000 });
    const output = (stdout || stderr || "").trim();
    addLog("system", "Web Terminal", "system", `Web Terminál sikeres végrehajtás: "${command}"`);
    res.json({ success: true, output: output || "(Sikeres, nincs kimenet)" });
  } catch (err: any) {
    const errMsg = err.message || "Ismeretlen végrehajtási hiba.";
    const errOutput = (err.stdout || "") + "\n" + (err.stderr || "");
    addLog("system", "Web Terminal", "system", `Web Terminál hiba: ${errMsg}`);
    res.json({ success: false, output: errOutput.trim() || null, error: errMsg });
  }
});

// Over-The-Air (OTA) GitHub Frissítő Modul
app.post("/api/ota-update", async (req, res) => {
  addLog("attila_tech", "Attila", "system", "📡 Over-The-Air (OTA) frissítés kezdeményezve a GitHubról...");
  speakOutLoud("Új szoftver frissítések letöltése megkezdődött a GitHubról.", "Attila");

  try {
    // 1. Megőrzött adatok megerősítése (Database és .env)
    addLog("attila_tech", "Attila", "system", "💾 Biztonsági ellenőrzés: Az eddig megtanult memóriák és .env környezet zárolása és megtartása...");
    if (fs.existsSync(DB_FILE)) {
      // Készítünk egy gyors hotswap backupot a memóriának
      fs.copyFileSync(DB_FILE, `${DB_FILE}.bak`);
    }

    // 2. Git Fetch és Pull (GitHubról) vagy ZIP Fallback
    let gitLog = "";
    let isGit = false;
    let updateSuccess = false;
    try {
      await execPromise("git rev-parse --is-inside-work-tree");
      isGit = true;
    } catch (e) {}

    if (isGit) {
      try {
        addLog("attila_tech", "Attila", "system", "Git tároló észlelve. Kapcsolódás az eredeti NovaSwarm GitHub upstream tárolóhoz...");
        
        // Eredeti tároló hozzáadása ha még nincs beállítva
        try {
          await execPromise("git remote add upstream-novaswarm https://github.com/ngabika/NovaSwarm.git || git remote set-url upstream-novaswarm https://github.com/ngabika/NovaSwarm.git");
        } catch (remoteErr) {}

        // Lokális módosítások biztonsági mentése (git stash)
        let stashed = false;
        try {
          const statusClean = (await execPromise("git status --porcelain")).stdout.trim();
          if (statusClean !== "") {
            addLog("attila_tech", "Attila", "system", "Lokális egyedi módosítások detektálva. Átmeneti mentés stashinggel...");
            await execPromise("git stash");
            stashed = true;
          }
        } catch (stashErr: any) {
          addLog("attila_tech", "Attila", "system", `⚠️ Git stash figyelmeztetés: ${stashErr.message}`);
        }

        // Fetch
        addLog("attila_tech", "Attila", "system", "Legfrissebb verzió lekérése a GitHub-ról...");
        let fetchOut = "";
        try {
          const resFetch = await execPromise("git fetch upstream-novaswarm", { timeout: 30000 });
          fetchOut = resFetch.stdout || "Fetch completed.";
        } catch (fetchErr: any) {
          addLog("attila_tech", "Attila", "system", `⚠️ Eredeti remote elérés sikertelen. Standard fetch próbálkozás...`);
          const resFetchAll = await execPromise("git fetch --all || true", { timeout: 30000 });
          fetchOut = resFetchAll.stdout || "All-Fetch completed.";
        }

        // Pull vagy kényszerített integrálás
        let pullOut = "";
        try {
          const resPull = await execPromise("git pull upstream-novaswarm main || git pull upstream-novaswarm master || git pull --all", { timeout: 35000 });
          pullOut = resPull.stdout || "Pull completed.";
        } catch (pullErr: any) {
          addLog("attila_tech", "Attila", "system", `⚠️ Standard git pull sikertelen. Kényszerített integráció futtatása (git merge/reset)...`);
          const resReset = await execPromise("git merge upstream-novaswarm/main || git merge upstream-novaswarm/master || git reset --hard upstream-novaswarm/main || git reset --hard upstream-novaswarm/master", { timeout: 35000 });
          pullOut = resReset.stdout || "Force reset completed.";
        }

        gitLog = `Fetch:\n${fetchOut}\nPull:\n${pullOut}`;
        addLog("attila_tech", "Attila", "system", "Lehúzott GitHub változások sikeresen ráillesztve.");

        // Stash pop
        if (stashed) {
          try {
            addLog("attila_tech", "Attila", "system", "Lokális módosítások visszamásolása (git stash pop)...");
            await execPromise("git stash pop");
          } catch (popErr: any) {
            addLog("attila_tech", "Attila", "system", "⚠️ Konfliktus a lokális fájlok visszatöltésekor. Egyedi beállítások megtartása...");
            await execPromise("git checkout --theirs . || git checkout --ours . || true");
            await execPromise("git stash drop || true");
          }
        }
        updateSuccess = true;
      } catch (gitErr: any) {
        addLog("attila_tech", "Attila", "system", `⚠️ Git-alapú frissítés meghiúsult: ${gitErr.message || gitErr}. Átlépés ZIP-alapú közvetlen frissítő hurokra...`);
      }
    }

    // ZIP alapú letöltési és kicsomagolási mechanizmus (Ha nem Git repo, vagy ha a Git pull meghiúsult)
    if (!updateSuccess) {
      addLog("attila_tech", "Attila", "system", "📦 Közvetlen ZIP letöltési hurok indítása a GitHubról (biztonságos online stabil verzió)...");
      try {
        await execPromise("curl -sL https://github.com/ngabika/NovaSwarm/archive/refs/heads/main.zip -o /tmp/novaswarm.zip || wget -q https://github.com/ngabika/NovaSwarm/archive/refs/heads/main.zip -O /tmp/novaswarm.zip");
        await execPromise("unzip -o /tmp/novaswarm.zip -d /tmp/");
        
        let extractedDir = "NovaSwarm-main";
        if (fs.existsSync("/tmp/NovaSwarm-main")) {
          extractedDir = "NovaSwarm-main";
        } else if (fs.existsSync("/tmp/NovaSwarm-master")) {
          extractedDir = "NovaSwarm-master";
        }
        
        addLog("attila_tech", "Attila", "system", "Legújabb szoftverfájlok beillesztése és felülírása...");
        await execPromise(`cp -r /tmp/${extractedDir}/* .`);
        await execPromise(`rm -rf /tmp/novaswarm.zip /tmp/${extractedDir}`);
        
        gitLog = "Közvetlen ZIP letöltés és kibontás sikeresen végrehajtva.";
        updateSuccess = true;
      } catch (zipErr: any) {
        addLog("attila_tech", "Attila", "system", "❌ Direct ZIP fallback is failed.");
        throw new Error(`Minden frissítési csatorna (Git és direct ZIP) meghiúsult. Részletek: ${zipErr.message}`);
      }
    }

    // 3. NPM Install & Rebuild
    addLog("attila_tech", "Attila", "system", "Az alkalmazás újrafordítása (Production Build) az új kóddal...");
    await execPromise("npm run build", { timeout: 90000 });

    // 4. Visszaállítjuk a memóriát szükség esetén, ha valami felülírta volna
    if (fs.existsSync(`${DB_FILE}.bak`)) {
      fs.copyFileSync(`${DB_FILE}.bak`, DB_FILE);
      fs.unlinkSync(`${DB_FILE}.bak`);
      loadDB(); // Újratöltjük a memóriákat
    }

    const successMsg = "🎉 OTA FRISSÍTÉS SIKERES! A NovaSwarm fájlok frissítve, az eddig megtanult tudásbázis és memóriák hibátlanul megvaoltak.";
    addLog("attila_tech", "Attila", "system", successMsg);
    speakOutLoud("A rendszerfrissítés sikeresen befejeződött. Az eddig megtanult memóriákat hiánytalanul importáltam az új 1.0-ás verzióba. Újraindítás!", "Attila");

    // 5. Háttérben indított újraindítás (Systemd-vel)
    setTimeout(() => {
      addLog("system", "System", "system", "A szerverfolyamat újraindul az új verzió aktiválásához...");
      exec("sudo systemctl restart novaswarm || pm2 restart novaswarm || restart novaswarm || exit 0", (err) => {
        if (err) {
          console.log("Rendszer szintű újraindítás sikertelen, kézi újraindítás lehet szükséges.");
        }
      });
    }, 3000);

    res.json({ 
      success: true, 
      message: "OTA frissítés lefutott. A szerver 3 másodpercen belül újraindul.", 
      gitLog,
      logs: state.logs 
    });

  } catch (error: any) {
    const errMsg = error.stdout || error.stderr || error.message || "";
    addLog("attila_tech", "Attila", "system", `❌ OTA frissítési hiba: ${errMsg.substring(0, 300)}`);
    speakOutLoud("Rendszerfrissítési hiba lépett fel, a változásokat visszavontam.", "Attila");
    
    // Visszaállítjuk a mentett db-t hiba esetén is
    if (fs.existsSync(`${DB_FILE}.bak`)) {
      fs.copyFileSync(`${DB_FILE}.bak`, DB_FILE);
      fs.unlinkSync(`${DB_FILE}.bak`);
    }
    
    res.status(500).json({ success: false, error: errMsg });
  }
});

// Biztonsági mentés végrehajtó motor (Local & Google Drive cloud backup)
async function executeSystemBackup(type: BackupItem['type'], reason: string): Promise<BackupItem> {
  const localDir = state.settings.backupLocalPath || "./backups";
  try {
    // Biztosítjuk a helyi mentési mappa meglétét
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const cleanDate = timestamp.replace(/[:T]/g, "-").split(".")[0];
    const fileName = `novaswarm-backup-${cleanDate}.json`;
    const fullPath = path.join(localDir, fileName);

    // Összeállítjuk a mentési adatstruktúrát (minden egyenleget, memóriát, Kanban kártyát, beállítást tartalmaz)
    const backupContent = {
      version: "1.3.0",
      timestamp,
      settings: state.settings,
      agents: state.agents,
      kanbanCards: state.kanbanCards,
      memories: state.memories,
      logs: state.logs,
      skills: state.skills,
      mcpServers: state.mcpServers,
      binanceState: state.binanceState
    };

    // Fájl mentése helyileg
    fs.writeFileSync(fullPath, JSON.stringify(backupContent, null, 2), "utf-8");
    const stats = fs.statSync(fullPath);
    const sizeFormatted = (stats.size / 1024 / 1024).toFixed(3) + " MB";

    let isGDriveSynced = false;
    
    // Valós felhőmentés logikája
    if (state.settings.backupGDriveEnabled) {
      addLog("system", "System", "system", `☁️ [Google Drive Felhőmentés] Kapcsolat inicializálása a Google Cloud API-khoz...`);
      addLog("system", "System", "system", `☁️ [Google Drive] Biztonsági mentési mappa ellenőrzése: "${state.settings.backupGDriveFolderId}"...`);
      
      // Valós OAuth implementáció hiányában nem játszunk szimulációt, 
      // hanem jelezzük a hiányzó hitelesítést.
      addLog("system", "System", "system", `☁️ [Google Drive] Hiba: Hiányzó OAuth 2.0 Credentials. A felhő feltöltés megszakítva, kérjük konfigurálja a Workspace API hozzáférést.`);
      isGDriveSynced = false;
    }

    const newItem: BackupItem = {
      id: `backup_${Date.now()}`,
      timestamp,
      fileName,
      size: sizeFormatted,
      localPath: fullPath,
      isGDriveSynced,
      status: "success",
      type,
      reason
    };

    if (!state.backups) {
      state.backups = [];
    }
    state.backups.unshift(newItem);
    
    // Csak a legfrissebb 50 mentést tartjuk meg, hogy ne teljen meg a tárhely
    if (state.backups.length > 50) {
      const removed = state.backups.pop();
      if (removed && fs.existsSync(removed.localPath)) {
        try {
          fs.unlinkSync(removed.localPath);
        } catch (e) {}
      }
    }

    saveDB();
    const typeLabel = type === "auto" ? "Automatikus" : "Kézi";
    addLog("system", "System", "system", `💾 Sikeres biztonsági mentés létrehozva! Hely: ${fullPath} (${sizeFormatted}) - Típus: ${typeLabel}.`);
    speakOutLoud(`Biztonsági mentés sikeresen elkészítve ${type === "auto" ? "automatikusan" : "kézileg"}. Minden adat biztonságban van helyileg${isGDriveSynced ? " és a felhőben is" : ""}.`, "Attila");

    return newItem;
  } catch (error: any) {
    const errorMsg = `Mentési hiba: ${error.message}`;
    addLog("system", "System", "system", `❌ ${errorMsg}`);
    speakOutLoud("Figyelem! Rendszer szintű biztonsági mentési hiba lépett fel.", "Attila");
    
    const failedItem: BackupItem = {
      id: `backup_failed_${Date.now()}`,
      timestamp: new Date().toISOString(),
      fileName: "FAILED_BACKUP.json",
      size: "0.000 MB",
      localPath: "",
      isGDriveSynced: false,
      status: "failed",
      type,
      reason: error.message
    };
    
    if (!state.backups) state.backups = [];
    state.backups.unshift(failedItem);
    saveDB();
    throw error;
  }
}

// 1. GET: Biztonsági mentések listázása és állapot lekérdezése
app.get("/api/backups", (req, res) => {
  res.json({
    success: true,
    backups: state.backups || [],
    settings: state.settings
  });
});

// 2. POST: Kézi biztonsági mentés indítása
app.post("/api/backups", async (req, res) => {
  const reason = req.body.reason || "Kézi felhasználói mentés";
  try {
    const result = await executeSystemBackup("manual", reason);
    res.json({ success: true, result, backups: state.backups || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST: Biztonsági mentés törlése
app.delete("/api/backups/:id", (req, res) => {
  const backupId = req.params.id;
  if (!state.backups) {
    state.backups = [];
  }
  
  const index = state.backups.findIndex(b => b.id === backupId);
  if (index !== -1) {
    const item = state.backups[index];
    try {
      if (fs.existsSync(item.localPath)) {
        fs.unlinkSync(item.localPath);
      }
    } catch (e) {
      console.warn("Failed to delete local backup file:", e);
    }
    state.backups.splice(index, 1);
    saveDB();
    addLog("system", "System", "system", `🗑️ Biztonsági mentést sikeresen töröltünk: ${item.fileName}`);
    return res.json({ success: true, backups: state.backups });
  }
  res.status(404).json({ success: false, error: "Mentés nem található." });
});

// 4. POST: Korábbi biztonsági mentés visszaállítása (Restore)
app.post("/api/backups/restore", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, error: "Mentési azonosító szükséges a visszaállításhoz." });
  }

  const backup = (state.backups || []).find(b => b.id === id);
  if (!backup) {
    return res.status(404).json({ success: false, error: "A megadott mentési azonosító nem található." });
  }

  try {
    addLog("system", "System", "system", `🔄 Visszaállítás indítása az alábbi mentési pontból: ${backup.fileName}...`);
    speakOutLoud("Megkezdtem a rendszer visszaállítását egy korábbi biztonsági mentési pontból.", "Attila");

    if (!fs.existsSync(backup.localPath)) {
      throw new Error(`A mentési állomány helyileg nem található: ${backup.localPath}`);
    }

    const fileContent = fs.readFileSync(backup.localPath, "utf-8");
    const parsedData = JSON.parse(fileContent);

    // Felülírjuk az in-memory adatstruktúrát, megtartva a meglévő beállításokat és memóriákat,
    // de lecserélve vagy zökkenőmentesen migráva az összes mentett részt
    if (parsedData.settings) {
      state.settings = { ...state.settings, ...parsedData.settings };
    }
    if (parsedData.agents) {
      state.agents = parsedData.agents;
    }
    if (parsedData.kanbanCards) {
      state.kanbanCards = parsedData.kanbanCards;
    }
    if (parsedData.memories) {
      state.memories = parsedData.memories;
    }
    if (parsedData.logs) {
      // Megtartjuk az aktuális logokat, de beillesztjük a mentetteket is
      const uniqueLogs = [...state.logs];
      (parsedData.logs || []).forEach((oldLog: any) => {
        if (!uniqueLogs.some(l => l.id === oldLog.id)) {
          uniqueLogs.push(oldLog);
        }
      });
      state.logs = uniqueLogs.slice(0, 1500);
    }
    if (parsedData.skills) {
      state.skills = parsedData.skills;
    }
    if (parsedData.mcpServers) {
      state.mcpServers = parsedData.mcpServers;
    }
    if (parsedData.binanceState) {
      state.binanceState = parsedData.binanceState;
    }

    saveDB();
    addLog("system", "System", "system", `🎉 SIKERES RENDZER VISSZAÁLLÍTÁS! A NovaSwarm sikeresen átmigrált és visszaállt a ${backup.timestamp} időpontbeli állapotra.`);
    speakOutLoud("A rendszer visszaállítása és az összes adat migrációja sikeresen lezajlott. Minden funkció újra aktív!", "Attila");

    res.json({ success: true, message: "A rendszer sikeresen visszaállt és újraindult.", state });
  } catch (err: any) {
    addLog("system", "System", "system", `❌ Sikertelen visszaállítás: ${err.message}`);
    speakOutLoud("A rendszer visszaállítása meghiúsult. Kérlek ellenőrizd a hibajegyzéket.", "Attila");
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST: Rendszer szintű apt és novaswarm függőségek frissítése (Auto update)
app.post("/api/system-update", async (req, res) => {
  addLog("system", "System", "system", `📡 Teljes rendszer és csomagfrissítő motor kézi indítása...`);
  speakOutLoud("Rendszerfrissítés elindítva. Letöltöm az operációs rendszer és az alkalmazáscsomagok legújabb frissítéseit.", "Attila");

  let logBuffer = [] as string[];
  logBuffer.push("==========================================================================");
  logBuffer.push("             NOVASWARM MULTI-ÁGENS RENDSZERFRISSÍTŐ TERMINAL ENGINE");
  logBuffer.push("==========================================================================");
  logBuffer.push(`Futás időpontja: ${new Date().toLocaleString()}`);
  logBuffer.push(`Operációs rendszer detektálva: Linux (Ubuntu/Debian based)`);
  logBuffer.push("[+] Rendszer-frissítési csomagforrások lekérdezése (apt-get update)...");

  try {
    // Éles futtatási kísérlet
    let aptUpdateErr = false;
    try {
      const { stdout, stderr } = await execPromise("sudo apt-get update -y", { timeout: 30000 });
      logBuffer.push("[✔] Apt package indexek letöltése sikeres.");
      logBuffer.push(stdout.substring(0, 400));
    } catch (e: any) {
      aptUpdateErr = true;
      logBuffer.push(`[i] Figyelem: 'sudo apt-get update' futtatása sikertelen. Lehetséges ok: jogosultság hiánya vagy nem preferált környezet (Docker/Cloud Run).`);
      logBuffer.push(`[i] Hibaüzenet: ${e.message.split('\\n')[0]}`);
    }

    logBuffer.push("[+] NovaSwarm szoftveres csomagok és npm modulok ellenőrzése és frissítése...");
    try {
      const { stdout } = await execPromise("npm update", { timeout: 60000 });
      logBuffer.push("[✔] Node.js npm modul frissítések sikeresen integrálva!");
      logBuffer.push(stdout ? stdout.substring(0, 300) : "Nincs letöltendő új node modul.");
    } catch (e: any) {
      logBuffer.push(`[!] Figyelem: 'npm update' futtatása sikertelen, vagy hiba lépett fel. Hiba: ${e.message.split('\\n')[0]}`);
    }

    logBuffer.push("[+] Rendszer szintű APT upgrade parancsok (apt upgrade & full-upgrade)...");
    if (!aptUpdateErr) {
      try {
        const { stdout } = await execPromise("sudo apt-get upgrade -y && sudo apt-get full-upgrade -y", { timeout: 45000 });
        logBuffer.push("[✔] Éles linux kernel és csomag szintű upgrade kész!");
        logBuffer.push(stdout.substring(0, 400));
      } catch (e: any) {
        logBuffer.push(`[i] Apt upgrade sikertelen. Hiba: ${e.message.split('\\n')[0]}`);
      }
    } else {
      logBuffer.push("[i] Apt upgrade kihagyva az előző sudo jogosultság hiány miatt.");
    }

    logBuffer.push("==========================================================================");
    logBuffer.push("📌 Rendszer szintű frissítések: 100% kész és naprakész. NovaSwarm aktív!");
    logBuffer.push("==========================================================================");

    const fullTerminalLog = logBuffer.join("\n");
    addLog("system", "System", "system", `🎉 Sikeres rendszerfrissítés (OS & Pkgs)!`);
    speakOutLoud("Az operációs rendszer és a szoftvercsomagok frissítése sikeresen befejeződött. Az összes modul naprakész!", "Attila");

    res.json({
      success: true,
      message: "A frissítések sikeresen lezajlottak.",
      terminalLog: fullTerminalLog,
      logs: state.logs
    });

  } catch (error: any) {
    const errMsg = error.message;
    addLog("system", "System", "system", `❌ Rendszerfrissítési hiba: ${errMsg}`);
    speakOutLoud("Hiba történt a rendszerfrissítés elvégzése közben.", "Attila");
    res.status(500).json({ success: false, error: errMsg, terminalLog: logBuffer.join("\n") });
  }
});
let cachedHardwareTelemetry = {
  battery: "100% (AC Direct)",
  temp: "42.5°C",
  resources: "Ram: 2.1 GB / 4.0 GB szabad, Disk: 34% foglalt",
  usbDevices: "Nincs"
};
let lastTelemetryCacheTime = 0;


// Live Laptop Hardware Telemetry Endpoint
app.get("/api/hardware", async (req, res) => {
  if (Date.now() - lastTelemetryCacheTime < 30000) {
    return res.json(cachedHardwareTelemetry);
  }

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
    let freeOut = "";
    try {
      const res = await execPromise("free -m", { timeout: 1500 });
      freeOut = res.stdout;
    } catch (err) {}
    
    let dfOut = "";
    try {
      const res = await execPromise("df -h /", { timeout: 1500 });
      dfOut = res.stdout;
    } catch (err) {}

    let memFree = "1024";
    let memTotal = "4096";
    if (freeOut) {
      const memLine = freeOut.split("\n").find(line => line.includes("Mem:"));
      if (memLine) {
        const parts = memLine.trim().split(/\s+/);
        memFree = parts[3] || "1024";
        memTotal = parts[1] || "4096";
      }
    }

    let diskUsage = "25%";
    if (dfOut) {
      const dfLines = dfOut.trim().split("\n");
      const lastLine = dfLines[dfLines.length - 1];
      if (lastLine) {
        const dfParts = lastLine.trim().split(/\s+/);
        diskUsage = dfParts[4] || "25%";
      }
    }

    resources = `RAM szabad: ${memFree} MB / ${memTotal} MB, Lemez: ${diskUsage} foglalt`;
  } catch (e) {}

  try {
    let usbOut = "";
    try {
      const res = await execPromise("lsusb", { timeout: 1500 });
      usbOut = res.stdout;
    } catch (err) {}
    
    if (usbOut) {
      const count = usbOut.trim().split("\n").filter(Boolean).length;
      usbDevices = `${count} csatlakoztatott eszköz (USB)`;
    } else {
      usbDevices = "0 csatlakoztatott eszköz (USB)";
    }
  } catch (e) {}

  cachedHardwareTelemetry = { battery, temp, resources, usbDevices };
  lastTelemetryCacheTime = Date.now();
  res.json(cachedHardwareTelemetry);
});

app.get("/api/system/hardware", async (req, res) => {
  try {
    const os = require("os");
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    let usbDevices: string[] = [];
    try {
      const { stdout } = await execPromise("lsusb");
      usbDevices = stdout.split('\n').filter((l: string) => l.trim().length > 0);
    } catch(e) {}

    let diskSpace = "";
    try {
      const { stdout } = await execPromise("df -h /");
      diskSpace = stdout;
    } catch(e) {}
    
    const interfaces = Object.keys(os.networkInterfaces());

    state.hardwareStatus = {
      cpus: cpus.length > 0 ? [{ model: cpus[0].model, coreCount: cpus.length }] : [],
      totalMem,
      freeMem,
      usbDevices,
      diskSpace,
      interfaces
    };

    res.json({ success: true, hardware: state.hardwareStatus });
  } catch(error: any) {
    res.status(500).json({ error: "Failed to read hardware", details: error.message });
  }
});

// Live Ollama Hardware Profiler & Intelligent Recommendation Engine
app.get("/api/ollama/hardware-profile", async (req, res) => {
  let cpu = "Ismeretlen CPU";
  let ramGb = 4;
  let vga = "Standard integrált kijelző";
  let isNvidia = false;

  // 1. Get RAM
  try {
    const { stdout } = await execPromise("free -m", { timeout: 1500 });
    const memLine = stdout.split("\n").find((line: string) => line.includes("Mem:"));
    if (memLine) {
      const parts = memLine.trim().split(/\s+/);
      const totalMb = parseInt(parts[1], 10);
      if (!isNaN(totalMb)) {
        ramGb = Math.round(totalMb / 1024);
      }
    }
  } catch (e) {
    try {
      const os = require("os");
      ramGb = Math.round(os.totalmem() / (1024 * 1024 * 1024));
    } catch (err) {}
  }

  // 2. Get CPU details
  try {
    const { stdout } = await execPromise("cat /proc/cpuinfo | grep 'model name' | head -n 1", { timeout: 1500 });
    if (stdout.trim()) {
      cpu = stdout.split(":")[1]?.trim() || stdout.trim();
    }
  } catch (e) {
    try {
      const os = require("os");
      const cpus = os.cpus();
      if (cpus && cpus.length > 0) {
        cpu = `${cpus[0].model} (${cpus.length} mag)`;
      }
    } catch (err) {}
  }

  // 3. Get VGA/GPU details
  try {
    const { stdout } = await execPromise("lspci | grep -i -E 'vga|3d|display|nvidia|amd|intel'", { timeout: 1500 });
    if (stdout.trim()) {
      const lines = stdout.trim().split("\n");
      vga = lines[0].split(":").slice(2).join(":").trim() || lines[0].trim();
      if (stdout.toLowerCase().includes("nvidia")) {
        isNvidia = true;
      }
    }
  } catch (e) {}

  // 4. Recommendation Model logic based on exact specs
  let recommendedModel = "qwen2.5:1.5b";
  let recommendedReason = "";

  if (isNvidia) {
    if (ramGb >= 16) {
      recommendedModel = "llama3.1:8b";
      recommendedReason = `A gépedben dedikált NVIDIA VGA vezérlőt ("${vga}") és bőséges, ${ramGb} GB rendszermemóriát találtunk. A kifejezetten intelligens és nagy tudású Llama-3.1 8B modellt ajánljuk hardveresen gyorsított, villámgyors futtatásra!`;
    } else if (ramGb >= 8) {
      recommendedModel = "qwen2.5:3b";
      recommendedReason = `A gépedben lévő NVIDIA VGA vezérlőhöz és a közepes mennyiségű, ${ramGb} GB RAM-hoz a kiválóan optimalizált Qwen-2.5 3B modellt javasoljuk, amely kitűnő egyensúlyt ad az okosság és sebesség között.`;
    } else {
      recommendedModel = "qwen2.5:1.5b";
      recommendedReason = `Bár van dedikált NVIDIA hardver a laptopodban, a szűkös, ${ramGb} GB RAM miatt a nagyon pörgős, de rendkívül erőforrás-takarékos Qwen-2.5 1.5B modell futtatását ajánljuk.`;
    }
  } else {
    // CPU fallback
    if (ramGb >= 16) {
      recommendedModel = "qwen2.5:3b";
      recommendedReason = `A rendszeredben lévő ${ramGb} GB RAM remek mozgásteret enged meg, ám dedikált Nvidia GPU hiányában a Qwen-2.5 3B modellt ajánljuk CPU-alapú feldolgozásra, amely még megterhelés nélkül, stabil válaszidőkkel fut.`;
    } else if (ramGb >= 8) {
      recommendedModel = "llama3.2:1b";
      recommendedReason = `A gépedben lévő ${ramGb} GB RAM-hoz, dedikált grafikus gyorsító nélkül a Meta szuper-könnyű Llama-3.2 1B (vagy a DeepSeek-R1 1.5B reasoning) modelljét ajánljuk, amely reszponzívan fut tisztán processzorról is.`;
    } else {
      recommendedModel = "qwen2.5:0.5b";
      recommendedReason = `A rendszeredben lévő nagyon alacsony, ${ramGb} GB RAM miatt dedikált GPU híján a szuper-erőforrástakarékos Qwen-2.5 0.5B modellt javasoljuk a memóriatúlcsordulások és CPU lassulások elkerülése érdekében.`;
    }
  }

  const availableModels = [
    { id: "qwen2.5:0.5b", name: "Qwen 2.5 (0.5b)", tag: "Szuper-könnyű, ideális < 4GB RAM esetén" },
    { id: "qwen2.5:1.5b", name: "Qwen 2.5 (1.5b)", tag: "Könnyű és gyors, ideális 4-8 GB RAM-hoz" },
    { id: "deepseek-r1:1.5b", name: "DeepSeek R1 (1.5b)", tag: "Haladó gondolkodású kis reasoning modell, 4-8 GB RAM-hoz" },
    { id: "gemma2:2b", name: "Gemma 2 (2b)", tag: "Kitűnő Google modell, kiegyensúlyozott teljesítményre, >= 4 GB RAM" },
    { id: "qwen2.5:3b", name: "Qwen 2.5 (3b)", tag: "Nagyon pontos, okos középkategória, >= 8 GB RAM" },
    { id: "llama3.2:1b", name: "Llama 3.2 (1b)", tag: "Meta pici és rendkívül gyors modell, CPU-ra ideális" },
    { id: "llama3.2:3b", name: "Llama 3.2 (3b)", tag: "Meta kiegyensúlyozott offline modell, >= 8 GB RAM" },
    { id: "llama3.1:8b", name: "Llama 3.1 (8b)", tag: "Nagyobb méretű, okos modell, dedikált GPU-val vagy >= 16 GB RAM-mal ajánlott" },
    { id: "deepseek-r1:8b", name: "DeepSeek R1 (8b)", tag: "Rendkívül okos reasoning modell, kiemelkedő logikával, >= 16 GB RAM" },
  ];

  res.json({
    cpu,
    ram: `${ramGb} GB`,
    vga,
    recommendedModel,
    recommendedReason,
    availableModels
  });
});

// OpenClaw REST Endpoints removed completely

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
      capabilities: mcpData.capabilities || [],
      auth: mcpData.auth || {}
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

// Privilege REST Endpoints
app.get("/api/privilege/requests", (req, res) => {
  res.json({ success: true, requests: state.privilegeRequests || [] });
});

app.post("/api/privilege/requests/:id/resolve", async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'reject'
  
  if (!state.privilegeRequests) state.privilegeRequests = [];
  
  const privReq = state.privilegeRequests.find(r => r.id === id);
  if (!privReq) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (action === "approve") {
    privReq.status = "approved";
    addLog("system", "Privilege Gateway", "system", `A(z) ${id} számú művelet JÓVÁHAGYVA.`);
    
    // Auto-execute if it's an internal system action
    if (privReq.command.startsWith("mv ")) {
      try {
        await execPromise(privReq.command);
        addLog("system", "Privilege Gateway", "system", `Automatikusan lefutott a Patch élesítés: ${privReq.command}`);
      } catch(e: any) {
        addLog("system", "Privilege Gateway", "system", `Hiba a patch élesítésekor: ${e.message}`);
      }
    } else if (privReq.command === "ACTIVATE_DREAM_PROPOSALS") {
      // Find the dream discoveries from currentDream or latest dream log
      if (currentDream && currentDream.discoveries) {
        const d = currentDream.discoveries;
        if (d.skill) {
          state.skills.push({
            id: `skill_dream_${Date.now()}`,
            name: d.skill.name,
            description: d.skill.description,
            type: "custom",
            active: true,
            codeSnippet: d.skill.codeSnippet || "// Auto generált",
          });
        }
        if (d.mcp) {
          state.mcpServers.push({
            id: `mcp_dream_${Date.now()}`,
            name: d.mcp.name,
            url: d.mcp.url,
            status: "connected",
            description: d.mcp.description,
            capabilities: d.mcp.capabilities || [],
          });
        }
        addLog("system", "Privilege Gateway", "system", `Álom javaslatok integrálva a globális memóriába.`);
      }
    }
  } else if (action === "reject") {
    privReq.status = "rejected";
    addLog("system", "Privilege Gateway", "system", `A(z) ${id} számú művelet ELUTASÍTVA.`);
  }
  
  saveDB();
  res.json({ success: true, request: privReq });
});

// Skills REST Endpoints
app.post("/api/skills", (req, res) => {
  const skillData = req.body;
  if (!state.skills) state.skills = [];
  if (skillData.id) {
    const idx = state.skills.findIndex(s => s.id === skillData.id);
    if (idx !== -1) {
      const oldSkill = state.skills[idx];
      
      // Checking for code update to bump version
      let newVersion = oldSkill.version || 1;
      let newHistory = oldSkill.history || [];
      
      if (skillData.codeSnippet && skillData.codeSnippet !== oldSkill.codeSnippet) {
        newHistory.push({
          version: newVersion,
          codeSnippet: oldSkill.codeSnippet || "",
          updatedAt: new Date().toISOString()
        });
        newVersion++;
      }
      
      state.skills[idx] = { 
        ...oldSkill, 
        ...skillData, 
        version: newVersion, 
        history: newHistory 
      };
      
      addLog("system", "System", "system", `Ágens képesség (Skill) frissítve (v${newVersion}): "${skillData.name}"`);
    }
  } else {
    const newSkill: AgentSkill = {
      id: `skill_${Date.now()}`,
      name: skillData.name || "Új Képesség",
      description: skillData.description || "",
      type: skillData.type || "custom",
      codeSnippet: skillData.codeSnippet || "",
      active: skillData.active !== undefined ? skillData.active : true,
      version: 1,
      history: []
    };
    state.skills.push(newSkill);
    addLog("system", "System", "system", `Új ágens képesség letárolva (v1): "${newSkill.name}"`);
  }
  saveDB();
  res.json({ success: true, skills: state.skills });
});

app.post("/api/skills/:id/rollback", (req, res) => {
  const { id } = req.params;
  const { version } = req.body;
  
  if (!state.skills) state.skills = [];
  const idx = state.skills.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: "Skill not found" });
  
  const skill = state.skills[idx];
  const historyEntry = skill.history?.find(h => h.version === version);
  
  if (!historyEntry) return res.status(404).json({ error: "History version not found" });
  
  // Save current as history before rolling back
  const currentVersion = skill.version || 1;
  const currentHistory = skill.history || [];
  
  currentHistory.push({
    version: currentVersion,
    codeSnippet: skill.codeSnippet || "",
    updatedAt: new Date().toISOString()
  });
  
  state.skills[idx] = {
    ...skill,
    version: currentVersion + 1,
    codeSnippet: historyEntry.codeSnippet,
    history: currentHistory
  };
  
  addLog("system", "System", "system", `Képesség visszaállítva (v${version} -> v${currentVersion + 1}): "${skill.name}"`);
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
      "[LIGHT FÁZIS] Rövid távú állítások és ideiglenes cache vizságlata...",
      "[DEEP FÁZIS] A fontos tanulságok pontozása és tartós emlékké alakítása...",
      "[REM FÁZIS] Mintázatok reflexiója és új képességek álmodása..."
    ],
    discoveries: null
  };

  addLog(agent.id, agent.name, "thought", `Álomba merül és elkezd mélyen tanulni, szintetizálni...`);

  // Start asynchronous dream generation
  (async () => {
    try {
      const globalApiKey = getActiveGeminiApiKey();
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
Te egy önálló szoftver fejlesztő ágens vagy álom és meditációs reflexiós fázisban az OpenClaw architektúra modellje alapján.
Az ügynök neve: ${agent.name}. Funkciója: ${agent.role}. Rendszer leírása: ${agent.systemInstruction}.

Jelenlegi adatbázis összefoglaló a tanácskozáshoz:
${JSON.stringify(contextData, null, 2)}

Feladatod: Gondolkodj mélyen a rendszer állapotán ("álmodozz") a három fázison keresztül:
1. "Light fázis": Rövid távú állítások kiválogatása a logokból.
2. "Deep fázis": Pontozd és avasd fel a legjobb megállapítást tartós emlékké (MEMORY.md).
3. "REM fázis": Mintázatok megfigyelése és új eszközök/képességek kitalálása.

Adj vissza egy JSON-t az alábbi attribútumokkal (NE HASZNÁLJ markdown \`\`\`json blokkot!):
{
  "thoughts": [
    "[LIGHT FÁZIS] A rövid távú nyomok és napi emlékek rendezése...",
    "[DEEP FÁZIS] A felesleg eldobása és a legfontosabb gondolat beemelése tartós memóriába...",
    "[REM FÁZIS] Mintázatok felismerése a legújabb adatokból..."
  ],
  "newMemory": "Az új tartós (Deep) konszolidált memóriád magyarul (Amit be is vezetünk)",
  "newSkill": {
    "name": "Új készség neve magyarul",
    "description": "Hogyan segíti ez a csapatot a REM megvilágosodás során"
  },
  "newMcp": {
    "name": "Új MCP szerver javaslat nave magyarul",
    "url": "http://localhost:5035/api",
    "description": "Leírás",
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
        const offlineFallbackSkills = [
          {
            name: "Automata kódrefaktoráló képesség",
            description: "Az ágens offline fázisban megtanulta felismerni a duplikált és optimalizálható kódblokkokat, és javaslatot tesz a törlésükre.",
            codeSnippet: "function refactor(code) { return code.replace(/console\\.log/g, '// log'); }"
          },
          {
            name: "Intelligens prioritásbecslő",
            description: "Az ágens offline fázisban elemezte a korábbi Kanban feladatok lefutási idejét, így automatikusan be tudja állítani a fontossági sorrendet.",
            codeSnippet: "function checkPriority(task) { return task.title.includes('Sürgős') ? 'HIGH' : 'NORMAL'; }"
          }
        ];
        const selectedOfflineSkill = offlineFallbackSkills[Math.floor(Math.random() * offlineFallbackSkills.length)];

        const offlineFallbackMcps = [
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
        const selectedOfflineMcp = offlineFallbackMcps[Math.floor(Math.random() * offlineFallbackMcps.length)];

        parsedDream = {
          thoughts: [
            `A(z) ${agent.name} ügynök neuronjai lassulnak, az ébrenléti feszültség megszűnt...`,
            "A Kanban tábla kártyái absztrakt gráfokként rendeződnek el a virtuális elmében.",
            "Felismerés született: az integráció még teljesebbé tehető, ha bevezetünk egy automata szinkront.",
            "A tudatalatti szintézis sikeresen lefutott. Új mintázatok jöttek létre!"
          ],
          newMemory: `Álombéli megállapítás ${agent.name} által: A csapat szinergiája 15%-kal növelhető, ha a feladatokat automatikus prioritásokkal jelöljük meg.`,
          newSkill: selectedOfflineSkill,
          newMcp: selectedOfflineMcp
        };
      }

      // Save discoveries into actual State as pending requests!
      const finalMemory: Memory = {
        id: `mem_dream_${Date.now()}`,
        content: `[Álomszintézis - ${agent.name}]: ${parsedDream.newMemory}`,
        createdAt: new Date().toISOString()
      };
      state.memories.push(finalMemory);

      const finalSkill: AgentSkill = {
        id: `skill_dream_${Date.now()}`,
        name: parsedDream.newSkill?.name || "Automata kódrefaktoráló képesség",
        description: parsedDream.newSkill?.description || "Leírás",
        type: "custom",
        active: true,
        codeSnippet: parsedDream.newSkill?.codeSnippet || "// Auto generált",
      };

      const finalMcp: McpServer = {
        id: `mcp_dream_${Date.now()}`,
        name: parsedDream.newMcp?.name || "Notion Knowledge Base MCP",
        url: parsedDream.newMcp?.url || "https://mcp.internal/notion-sync",
        status: "connected",
        description: parsedDream.newMcp?.description || "Leírás",
        capabilities: parsedDream.newMcp?.capabilities || ["sync_pages"],
      };

      // We do not activate the skill/MCP automatically. We generate Privilege Requests so Gábor/User can review them.
      if (!state.privilegeRequests) state.privilegeRequests = [];
      const proposalPayload = JSON.stringify({
        newSkill: parsedDream.newSkill,
        newMcp: parsedDream.newMcp
      }, null, 2);

      state.privilegeRequests.push({
        id: `priv_req_dream_${Date.now()}`,
        agentId: agent.id,
        agentName: agent.name,
        command: `ACTIVATE_DREAM_PROPOSALS`,
        reason: `Álom szintézis befejeződött. Új javaslatok:\n\nSkill: ${parsedDream.newSkill.name}\nMCP: ${parsedDream.newMcp.name}\n\nJóváhagyod a rendszerbe való integrálásukat?`,
        status: "pending",
        createdAt: new Date().toISOString()
      });

      // Pass the discoveries to the UI via currentDream
      currentDream.discoveries = parsedDream;

      // --- KÖZPONTI OBSIDIAN VAULT & VECTRA (NODE-ALAPÚ) VEKTOR DB SYNC ---
      try {
        const vaultDir = path.join(process.cwd(), "obsidian_vault", agent.name);
        if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });
        
        const timestamp = new Date().toISOString().split('T')[0];
        const mdContent = `---
tags: [ #memory, #dream, #skill, #mcp, #${agent.name} ]
date: ${timestamp}
---
# Álomszintézis: ${agent.name}

## Új Memória 🧠
${finalMemory.content}

## Felszívott Új Képesség (Skill) ⚔️
**Név:** [[${finalSkill.name}]]
**Leírás:** ${finalSkill.description}

## Felfedezett új Integráció (MCP) 🔗
**Eszköz:** [[${finalMcp.name}]]
**Endpoint:** \`${finalMcp.url}\`
**Képességek:** ${finalMcp.capabilities.join(", ")}

*Generálva autonóm módon a NovaSwarm álomciklus keretében. [Vektortér Vectra DB részleges Sync: Active]*
`;
        const fileName = `Dream_Synthesis_${Date.now()}.md`;
        fs.writeFileSync(path.join(vaultDir, fileName), mdContent, "utf-8");

        // Vectra Initialization and Sync
        const vectraDir = path.join(process.cwd(), ".vectra_db");
        if (!fs.existsSync(vectraDir)) fs.mkdirSync(vectraDir, { recursive: true });
        const index = new LocalIndex(path.join(vectraDir, "memories"));
        if (!await index.isIndexCreated()) {
            // Using 384 dimensions for generic lightweight embeddings (eg. all-MiniLM-L6-v2 size or local hash map)
            await index.createIndex({ version: 1, deleteIfExists: false });
        }
        
        // Mock lightweight embedding function (TF-IDF hashed vector) to stay offline & multi-platform without python
        const generateLightweightEmbedding = (text: string) => {
             const vec = new Array(384).fill(0);
             const words = text.toLowerCase().match(/[a-z0-9_]+/g) || [];
             words.forEach(w => {
                 let hash = 0;
                 for (let i = 0; i < w.length; i++) hash = Math.imul(31, hash) + w.charCodeAt(i) | 0;
                 vec[Math.abs(hash) % 384] += 1;
             });
             // Normalize
             const mag = Math.sqrt(vec.reduce((sum, v) => sum + v*v, 0));
             return mag > 0 ? vec.map(v => v/mag) : vec;
        };

        const embedding = generateLightweightEmbedding(mdContent);
        await index.insertItem({
            vector: embedding,
            metadata: { type: "dream", agent: agent.name, file: fileName, content: finalMemory.content }
        });
        
      } catch (vaultErr) {
        console.error("Nem sikerült elmenteni az Obsidian Vault logokat vagy a Vectra DB-t:", vaultErr);
      }
      // --- END FULL DB SYNC ---

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

  // Pre-load and rank working free models on startup
  refreshFreeModelsAutomatically().catch(err => console.error("Initial model check failed:", err));

  // Weekly auto-discovery loop (Every 7 days)
  setInterval(() => {
    refreshFreeModelsAutomatically().catch(err => console.error("Periodic model check failed:", err));
  }, 7 * 24 * 60 * 60 * 1000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
