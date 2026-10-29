export interface BotSecrets {
  botToken: string;
  adminId: string;
  supportChatId: string;
  forceChannel: string;
  pointsPerReferral: number;
  dailyCheckinPoints: number;
  useProxy: boolean;
}

export interface UserRecord {
  id: number;
  username: string;
  firstName: string;
  lastName?: string;
  points: number;
  referralsCount: number;
  referredBy?: number;
  streak: number;
  lastCheckin?: number;
  lastSpin?: number;
  joinedAt: number;
  role: 'admin' | 'user';
  hasVerifiedChannel?: boolean;
}

export interface SupportTicket {
  id: string;
  userId: number;
  username: string;
  firstName: string;
  query: string;
  status: 'open' | 'resolved';
  createdAt: number;
  replies: {
    sender: 'user' | 'admin';
    text: string;
    timestamp: number;
  }[];
}

export interface RedeemCode {
  code: string;
  points: number;
  maxUses: number;
  usedCount: number;
  usedBy: number[];
  createdAt: number;
  createdBy: number;
}

export interface RedeemRequest {
  id: string;
  userId: number;
  username: string;
  points: number;
  payoutDetails: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'callback' | 'admin' | 'outbound';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: 'polling' | 'bot' | 'simulator' | 'system' | 'admin';
  message: string;
  details?: any;
}

export type BotStatus = 'STOPPED' | 'CONNECTING' | 'ONLINE' | 'ERROR';

export interface BotInfo {
  id: number;
  first_name: string;
  username: string;
  is_bot: boolean;
}

export interface SimulatedMessage {
  id: number;
  chatId: number;
  sender: 'bot' | 'user';
  text: string;
  timestamp: number;
  replyMarkup?: {
    inline_keyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  };
}
