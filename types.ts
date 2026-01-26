export interface Instance {
  id: string;
  botName: string;
  targetUid: string;
  status: 'active' | 'removing' | 'error';
  startedAt: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface BotConfig {
  name: string;
  addApiUrl: string;
  removeApiUrl: string;
}

export interface User {
  username: string;
  password: string;
  expiryDate: number; // Timestamp
  maxInstances: number;
  allowedBots: BotConfig[];
  role: 'user';
  config?: {
    botName: string;
    addApiUrl: string;
    removeApiUrl: string;
    maxInstances?: number;
  };
}

export interface Admin {
  username: string;
  role: 'admin';
}

export interface AppConfig {
  contactLink: string;
  youtubeLink?: string;
  dashboardInstructions?: string;
}

export type CurrentUser = User | Admin;