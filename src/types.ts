// Made by AI for AI with Google AI Studio prompted by ngabika
export interface Agent {
  id: string;
  name: string;
  avatar: string;
  role: 'boss' | 'tech_lead' | 'analyst' | 'writer' | 'legal' | 'trader' | 'news_analyst' | 'system_operator' | 'auditor';
  systemInstruction: string;
  model: string;
  active: boolean;
  lastActive?: string;
  bossId?: string | null; // ID of the agent's boss
  internetSearchEnabled?: boolean; // Enable real-time Google Search Grounding for the agent
}

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  assignedTo: string | null; // Agent ID or null
  createdAt: string;
  updatedAt: string;
}

export interface Memory {
  id: string;
  content: string;
  entity?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  type: 'thought' | 'action' | 'telegram' | 'memory' | 'kanban' | 'system' | 'chat';
  message: string;
  data?: any;
}

export interface ModelRateLimit {
  model: string;
  name: string;
  maxRequests: number;
  remainingRequests: number;
  resetTimeSec: number;
  reliability: number;
  latency: string;
}

export interface Settings {
  geminiApiKey: string;
  geminiApiKeysPool?: string[];
  openRouterApiKey?: string;
  openRouterApiKeysPool?: string[];
  dailyCostLimitUsd?: number;
  currentDailyCostUsd?: number;
  costResetDate?: string;
  telegramBotToken: string;
  telegramChatId: string;
  setupCompleted?: boolean;
  userName?: string;
  userBio?: string;
  isBotActive: boolean;
  teamActive: boolean;
  checkIntervalSeconds: number;
  lastRunTime?: string;
  globalModelMode?: string;
  geminiModelPriority?: string;
  openRouterModelPriority?: string;
  autoReorderModels?: boolean;
  binanceEnabled?: boolean;
  isWizardCompleted?: boolean;
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

export interface BackupItem {
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

export interface McpServerAuth {
  username?: string;
  password?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  token?: string;
  email?: string;
  authType?: 'none' | 'oauth2' | 'apikey' | 'basic' | 'password';
}

export interface McpServer {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  description: string;
  capabilities: string[];
  auth?: McpServerAuth;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  type: 'system' | 'custom';
  codeSnippet?: string;
  active: boolean;
}

export interface DreamState {
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

export interface BinanceTrade {
  id: string;
  timestamp: string;
  type: 'BUY' | 'SELL';
  pair: string;
  price: number;
  amount: number;
  total: number;
  agentName: string;
}

export interface BinanceState {
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
  eurPrice: number; // 1 EUR in USD (e.g. 1.08)
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

export interface KeepNote {
  id: string;
  title: string;
  content: string;
  color?: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardState {
  agents: Agent[];
  kanbanCards: KanbanCard[];
  memories: Memory[];
  logs: AuditLog[];
  settings: Settings;
  systemRunning: boolean;
  telegramConnected: boolean;
  mcpServers: McpServer[];
  skills: AgentSkill[];
  currentDream?: DreamState;
  modelLimits?: ModelRateLimit[];
  binanceState?: BinanceState;
  backups?: BackupItem[];
  otaUpdateAvailable?: boolean;
  otaLatestCommitInfo?: string;
  keepNotes?: KeepNote[];
}
