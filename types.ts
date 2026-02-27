
export interface Instance {
  id: string;
  botName: string;
  targetUid: string;
  
  // Status now includes pending states for Admin approval
  status: 'active' | 'removing' | 'error' | 'stopped' | 'restarting' | 'pending_start' | 'pending_stop' | 'pending_restart' | 'pending_delete';
  
  startedAt: string;
  startedTimestamp?: number; // Accurate duration counting
  safeMode: boolean;
  safeModeStartTime?: number | null; // Timestamp when safe mode was turned on
  
  // Login Details
  loginMethod: 'guest' | 'facebook' | 'google';
  email?: string;       // FB/Google
  password?: string;    // FB/Google
  twoFactorCode?: string; // FB/Google
  guestUid?: string;    // Guest
  guestPassword?: string; // Guest

  // Persistence Fields
  initialSessionExp?: number; // Stores the XP value when the instance was first loaded/launched
  lastKnownRate?: string; // Stores the last calculated speed to show immediately on reload
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
  displayName?: string;
  instances?: Instance[]; // For Admin view mapping
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
  twoFactorTutorialLink?: string; // New: Link for 2FA tutorial
  dashboardInstructions?: string;
  levelApiUrl?: string; // New: Configurable Level API
  bannerApiUrl?: string; // New: Configurable Banner API
  safeModeDurationMinutes?: number; // New: Duration for Safe Mode
}

export interface LevelInfo {
  // Common Fields
  current_exp?: string | number;
  curr_exp?: string | number;
  
  next_exp?: string | number;
  exp_for_next_level?: string | number;
  
  level?: string | number;
  
  percent?: string | number;
  percentage?: string | number;

  nickname?: string;
  name?: string;
  user_name?: string;
  
  xp_per_min?: string | number;
  exp_per_min?: string | number;
  
  eta?: string;
  
  // Start Point Fields
  exp_for_current_level?: string | number;
  start_exp?: string | number; 
  start_point?: string | number;
  
  [key: string]: any; // Allow loose indexing
}

export interface ProfileInfo {
  Avatar: string;
  Banner: string;
  Nickname: string;
}

export type CurrentUser = User | Admin;
