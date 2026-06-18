export interface Agent {
  id: string;
  name: string;
  avatar: string;
  role: 'boss' | 'tech_lead' | 'analyst' | 'writer' | 'legal' | 'trader' | 'news_analyst';
  systemInstruction: string;
  model: string;
  active: boolean;
  lastActive?: string;
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
  telegramBotToken: string;
  telegramChatId: string;
  isBotActive: boolean;
  teamActive: boolean;
  checkIntervalSeconds: number;
  lastRunTime?: string;
  globalModelMode?: string; // "auto" | "gemini-3.5-flash" | "gemini-3.1-pro-preview" | etc.
}

export interface McpServer {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  description: string;
  capabilities: string[];
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
}
