import {
  BotSecrets,
  UserRecord,
  SupportTicket,
  RedeemCode,
  RedeemRequest,
  LogEntry,
  LogLevel,
  BotStatus,
  BotInfo,
  SimulatedMessage,
} from '../types';

const SECRETS_KEY = 'grammy_bot_secrets_v1';
const USERS_KEY = 'grammy_bot_users_v1';
const TICKETS_KEY = 'grammy_bot_tickets_v1';
const CODES_KEY = 'grammy_bot_codes_v1';
const REQUESTS_KEY = 'grammy_bot_requests_v1';
const SIMULATOR_MESSAGES_KEY = 'grammy_sim_msgs_v1';

export const DEFAULT_SECRETS: BotSecrets = {
  botToken: '',
  adminId: '8838351233',
  supportChatId: '8838351233',
  forceChannel: '@GrammyRewardsChannel',
  pointsPerReferral: 100,
  dailyCheckinPoints: 50,
  useProxy: true,
};

// Seed users for instant realistic testing
const INITIAL_USERS: UserRecord[] = [
  {
    id: 8838351233,
    username: 'super_admin',
    firstName: 'System',
    lastName: 'Admin',
    points: 10000,
    referralsCount: 42,
    streak: 15,
    joinedAt: Date.now() - 30 * 86400000,
    role: 'admin',
    hasVerifiedChannel: true,
  },
  {
    id: 1001001,
    username: 'crypto_whale',
    firstName: 'Elena',
    lastName: 'Rostova',
    points: 2450,
    referralsCount: 18,
    streak: 6,
    lastCheckin: Date.now() - 4000000,
    joinedAt: Date.now() - 14 * 86400000,
    role: 'user',
    hasVerifiedChannel: true,
  },
  {
    id: 1001002,
    username: 'satoshi_fan',
    firstName: 'Marcus',
    lastName: 'Vance',
    points: 1820,
    referralsCount: 12,
    streak: 4,
    lastCheckin: Date.now() - 86400000 * 2,
    joinedAt: Date.now() - 10 * 86400000,
    role: 'user',
    hasVerifiedChannel: true,
  },
  {
    id: 1001003,
    username: 'node_ninja',
    firstName: 'David',
    lastName: 'K',
    points: 1250,
    referralsCount: 7,
    streak: 2,
    joinedAt: Date.now() - 7 * 86400000,
    role: 'user',
    hasVerifiedChannel: true,
  },
  {
    id: 1001004,
    username: 'bot_tester',
    firstName: 'Sarah',
    points: 850,
    referralsCount: 5,
    streak: 3,
    joinedAt: Date.now() - 4 * 86400000,
    role: 'user',
    hasVerifiedChannel: false,
  },
];

const INITIAL_CODES: RedeemCode[] = [
  {
    code: 'WELCOME100',
    points: 100,
    maxUses: 50,
    usedCount: 3,
    usedBy: [1001001, 1001002, 1001003],
    createdAt: Date.now() - 86400000 * 2,
    createdBy: 8838351233,
  },
  {
    code: 'VIP500',
    points: 500,
    maxUses: 10,
    usedCount: 1,
    usedBy: [1001001],
    createdAt: Date.now() - 86400000,
    createdBy: 8838351233,
  },
];

const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'TICK-101',
    userId: 1001004,
    username: 'bot_tester',
    firstName: 'Sarah',
    query: 'How do I redeem points for Telegram Stars or USDT?',
    status: 'open',
    createdAt: Date.now() - 1000 * 60 * 35,
    replies: [
      {
        sender: 'user',
        text: 'How do I redeem points for Telegram Stars or USDT?',
        timestamp: Date.now() - 1000 * 60 * 35,
      },
    ],
  },
];

type Listener = () => void;

class BotStore {
  private secrets: BotSecrets = DEFAULT_SECRETS;
  private users: Map<number, UserRecord> = new Map();
  private tickets: Map<string, SupportTicket> = new Map();
  private codes: Map<string, RedeemCode> = new Map();
  private requests: Map<string, RedeemRequest> = new Map();
  private logs: LogEntry[] = [];
  private botStatus: BotStatus = 'STOPPED';
  private botInfo: BotInfo | null = null;
  private simulatedMessages: SimulatedMessage[] = [];
  private listeners: Set<Listener> = new Set();
  private isConfigured: boolean = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedSecrets = localStorage.getItem(SECRETS_KEY);
      if (storedSecrets) {
        this.secrets = { ...DEFAULT_SECRETS, ...JSON.parse(storedSecrets) };
        this.isConfigured = Boolean(this.secrets.botToken && this.secrets.adminId);
      } else {
        this.isConfigured = false;
      }

      const storedUsers = localStorage.getItem(USERS_KEY);
      if (storedUsers) {
        const parsed: UserRecord[] = JSON.parse(storedUsers);
        parsed.forEach((u) => this.users.set(u.id, u));
      } else {
        INITIAL_USERS.forEach((u) => this.users.set(u.id, u));
        this.saveUsers();
      }

      const storedTickets = localStorage.getItem(TICKETS_KEY);
      if (storedTickets) {
        const parsed: SupportTicket[] = JSON.parse(storedTickets);
        parsed.forEach((t) => this.tickets.set(t.id, t));
      } else {
        INITIAL_TICKETS.forEach((t) => this.tickets.set(t.id, t));
        this.saveTickets();
      }

      const storedCodes = localStorage.getItem(CODES_KEY);
      if (storedCodes) {
        const parsed: RedeemCode[] = JSON.parse(storedCodes);
        parsed.forEach((c) => this.codes.set(c.code.toUpperCase(), c));
      } else {
        INITIAL_CODES.forEach((c) => this.codes.set(c.code.toUpperCase(), c));
        this.saveCodes();
      }

      const storedRequests = localStorage.getItem(REQUESTS_KEY);
      if (storedRequests) {
        const parsed: RedeemRequest[] = JSON.parse(storedRequests);
        parsed.forEach((r) => this.requests.set(r.id, r));
      }

      const storedSimMsgs = localStorage.getItem(SIMULATOR_MESSAGES_KEY);
      if (storedSimMsgs) {
        this.simulatedMessages = JSON.parse(storedSimMsgs);
      }

      this.addLog('info', 'system', 'In-memory state and localStorage store initialized successfully');
    } catch (e) {
      console.error('Failed to load from storage:', e);
      INITIAL_USERS.forEach((u) => this.users.set(u.id, u));
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // --- Secrets & Configuration ---
  public getSecrets(): BotSecrets {
    return { ...this.secrets };
  }

  public getIsConfigured(): boolean {
    return this.isConfigured;
  }

  public saveSecrets(secrets: BotSecrets) {
    this.secrets = { ...secrets };
    this.isConfigured = Boolean(secrets.botToken && secrets.adminId);
    localStorage.setItem(SECRETS_KEY, JSON.stringify(this.secrets));
    
    // Ensure admin user exists in store with admin role
    const adminNum = parseInt(secrets.adminId, 10);
    if (!isNaN(adminNum)) {
      const existing = this.users.get(adminNum);
      if (existing) {
        existing.role = 'admin';
        this.users.set(adminNum, existing);
      } else {
        this.users.set(adminNum, {
          id: adminNum,
          username: 'admin',
          firstName: 'Administrator',
          points: 10000,
          referralsCount: 0,
          streak: 1,
          joinedAt: Date.now(),
          role: 'admin',
          hasVerifiedChannel: true,
        });
      }
      this.saveUsers();
    }

    this.addLog('info', 'system', `Bot secrets updated. Admin ID: ${secrets.adminId}, Force Channel: ${secrets.forceChannel || 'None'}`);
    this.notify();
  }

  public resetSecrets() {
    this.secrets = { ...DEFAULT_SECRETS };
    this.isConfigured = false;
    localStorage.removeItem(SECRETS_KEY);
    this.addLog('warn', 'system', 'Bot secrets reset to empty defaults');
    this.notify();
  }

  // --- Bot Status & Info ---
  public setBotStatus(status: BotStatus) {
    this.botStatus = status;
    this.notify();
  }

  public getBotStatus(): BotStatus {
    return this.botStatus;
  }

  public setBotInfo(info: BotInfo | null) {
    this.botInfo = info;
    this.notify();
  }

  public getBotInfo(): BotInfo | null {
    return this.botInfo;
  }

  // --- Users & Balance ---
  private saveUsers() {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(Array.from(this.users.values())));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  public getUsers(): UserRecord[] {
    return Array.from(this.users.values()).sort((a, b) => b.points - a.points);
  }

  public getUser(id: number): UserRecord | undefined {
    return this.users.get(id);
  }

  public getOrCreateUser(
    from: { id: number; first_name: string; last_name?: string; username?: string },
    referrerId?: number
  ): { user: UserRecord; isNew: boolean } {
    let user = this.users.get(from.id);
    let isNew = false;

    if (!user) {
      isNew = true;
      const isAdmin = String(from.id) === String(this.secrets.adminId);
      let validReferrer: number | undefined = undefined;

      // Validate referrer: cannot refer oneself, and referrer must exist
      if (referrerId && referrerId !== from.id && this.users.has(referrerId)) {
        validReferrer = referrerId;
        const refUser = this.users.get(referrerId)!;
        refUser.referralsCount = (refUser.referralsCount || 0) + 1;
        refUser.points += this.secrets.pointsPerReferral;
        this.users.set(referrerId, refUser);

        this.addLog(
          'success',
          'bot',
          `Referral reward: User ${refUser.username || refUser.id} earned +${this.secrets.pointsPerReferral} pts for referring ${from.username || from.id}`
        );
      }

      user = {
        id: from.id,
        username: from.username || `user_${from.id}`,
        firstName: from.first_name || 'Anonymous',
        lastName: from.last_name,
        points: validReferrer ? 50 : 0, // 50 welcome points if joined via referral
        referralsCount: 0,
        referredBy: validReferrer,
        streak: 1,
        joinedAt: Date.now(),
        role: isAdmin ? 'admin' : 'user',
        hasVerifiedChannel: !this.secrets.forceChannel,
      };

      this.users.set(from.id, user);
      this.saveUsers();
      this.addLog(
        'info',
        'bot',
        `New user registered: ${user.firstName} (@${user.username}) [ID: ${user.id}]`
      );
      this.notify();
    } else {
      // Update name/username in case changed
      let changed = false;
      if (from.username && user.username !== from.username) {
        user.username = from.username;
        changed = true;
      }
      if (from.first_name && user.firstName !== from.first_name) {
        user.firstName = from.first_name;
        changed = true;
      }
      if (String(from.id) === String(this.secrets.adminId) && user.role !== 'admin') {
        user.role = 'admin';
        changed = true;
      }
      if (changed) {
        this.saveUsers();
        this.notify();
      }
    }

    return { user, isNew };
  }

  public setUserChannelVerified(id: number, verified: boolean) {
    const user = this.users.get(id);
    if (user) {
      user.hasVerifiedChannel = verified;
      this.saveUsers();
      this.notify();
    }
  }

  public modifyPoints(
    id: number,
    delta: number,
    reason: string
  ): { success: boolean; newPoints: number; message: string } {
    const user = this.users.get(id);
    if (!user) {
      return { success: false, newPoints: 0, message: `User ID ${id} not found.` };
    }

    if (delta < 0 && user.points + delta < 0) {
      return {
        success: false,
        newPoints: user.points,
        message: `Insufficient points balance (${user.points} pts). Cannot deduct ${Math.abs(delta)}.`,
      };
    }

    user.points += delta;
    this.saveUsers();
    this.addLog(
      delta >= 0 ? 'success' : 'warn',
      'admin',
      `Points adjusted for ${user.username || user.id}: ${delta > 0 ? '+' : ''}${delta} pts (${reason}). New balance: ${user.points} pts`
    );
    this.notify();
    return { success: true, newPoints: user.points, message: `Updated points to ${user.points}` };
  }

  // --- Spin & Win ---
  public spinWheel(id: number): {
    success: boolean;
    pointsWon: number;
    cooldownRemainingMs?: number;
    newTotal: number;
  } {
    const user = this.users.get(id);
    if (!user) {
      return { success: false, pointsWon: 0, newTotal: 0 };
    }

    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();

    if (user.lastSpin && now - user.lastSpin < ONE_HOUR) {
      const remaining = ONE_HOUR - (now - user.lastSpin);
      return {
        success: false,
        pointsWon: 0,
        cooldownRemainingMs: remaining,
        newTotal: user.points,
      };
    }

    // Randomized reward between 10 and 100 points
    // Distribution: 10, 15, 20, 25, 30, 40, 50, 75, 100
    const possible = [10, 15, 20, 25, 30, 40, 50, 75, 100];
    const pointsWon = possible[Math.floor(Math.random() * possible.length)];

    user.points += pointsWon;
    user.lastSpin = now;
    this.saveUsers();

    this.addLog('success', 'bot', `🎰 Spin & Win: User ${user.username || user.id} won ${pointsWon} points!`);
    this.notify();

    return {
      success: true,
      pointsWon,
      newTotal: user.points,
    };
  }

  // --- Daily Check-in ---
  public claimDailyCheckin(id: number): {
    success: boolean;
    pointsAwarded: number;
    streak: number;
    cooldownRemainingMs?: number;
    newTotal: number;
  } {
    const user = this.users.get(id);
    if (!user) {
      return { success: false, pointsAwarded: 0, streak: 0, newTotal: 0 };
    }

    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    const now = Date.now();

    if (user.lastCheckin && now - user.lastCheckin < TWENTY_FOUR_HOURS) {
      const remaining = TWENTY_FOUR_HOURS - (now - user.lastCheckin);
      return {
        success: false,
        pointsAwarded: 0,
        streak: user.streak || 1,
        cooldownRemainingMs: remaining,
        newTotal: user.points,
      };
    }

    // Streak calculation: if claimed within 48 hours, increment; else reset to 1
    if (user.lastCheckin && now - user.lastCheckin <= FORTY_EIGHT_HOURS) {
      user.streak = (user.streak || 1) + 1;
    } else {
      user.streak = 1;
    }

    // Base daily points + streak multiplier bonus (e.g. +5 pts per streak day capped at +50)
    const streakBonus = Math.min((user.streak - 1) * 5, 50);
    const pointsAwarded = this.secrets.dailyCheckinPoints + streakBonus;

    user.points += pointsAwarded;
    user.lastCheckin = now;
    this.saveUsers();

    this.addLog(
      'success',
      'bot',
      `📅 Daily Check-in: User ${user.username || user.id} claimed +${pointsAwarded} pts! (Streak: Day ${user.streak})`
    );
    this.notify();

    return {
      success: true,
      pointsAwarded,
      streak: user.streak,
      newTotal: user.points,
    };
  }

  // --- Redeem Codes ---
  private saveCodes() {
    try {
      localStorage.setItem(CODES_KEY, JSON.stringify(Array.from(this.codes.values())));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  public getRedeemCodes(): RedeemCode[] {
    return Array.from(this.codes.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public createRedeemCode(
    codeStr: string,
    points: number,
    maxUses: number = 1,
    adminId: number
  ): { success: boolean; message: string; code?: RedeemCode } {
    const cleanCode = codeStr.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 3) {
      return { success: false, message: 'Voucher code must be at least 3 characters long.' };
    }
    if (points <= 0) {
      return { success: false, message: 'Points must be greater than 0.' };
    }
    if (this.codes.has(cleanCode)) {
      return { success: false, message: `Voucher code '${cleanCode}' already exists.` };
    }

    const newCode: RedeemCode = {
      code: cleanCode,
      points,
      maxUses,
      usedCount: 0,
      usedBy: [],
      createdAt: Date.now(),
      createdBy: adminId,
    };

    this.codes.set(cleanCode, newCode);
    this.saveCodes();
    this.addLog('admin', 'admin', `New Promo Voucher created: ${cleanCode} (+${points} pts, max ${maxUses} uses)`);
    this.notify();
    return { success: true, message: `Created code ${cleanCode}`, code: newCode };
  }

  public redeemCode(
    userId: number,
    codeStr: string
  ): { success: boolean; pointsAwarded: number; message: string; newTotal: number } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, pointsAwarded: 0, message: 'User not registered.', newTotal: 0 };
    }

    const cleanCode = codeStr.trim().toUpperCase();
    const codeObj = this.codes.get(cleanCode);

    if (!codeObj) {
      return { success: false, pointsAwarded: 0, message: `Invalid voucher code '${cleanCode}'.`, newTotal: user.points };
    }

    if (codeObj.usedBy.includes(userId)) {
      return {
        success: false,
        pointsAwarded: 0,
        message: `You have already redeemed voucher code '${cleanCode}'.`,
        newTotal: user.points,
      };
    }

    if (codeObj.usedCount >= codeObj.maxUses) {
      return {
        success: false,
        pointsAwarded: 0,
        message: `Voucher code '${cleanCode}' has reached maximum usage limit (${codeObj.maxUses}/${codeObj.maxUses}).`,
        newTotal: user.points,
      };
    }

    // Award points
    codeObj.usedCount += 1;
    codeObj.usedBy.push(userId);
    this.codes.set(cleanCode, codeObj);
    this.saveCodes();

    user.points += codeObj.points;
    this.saveUsers();

    this.addLog(
      'success',
      'bot',
      `🎫 Code Redeemed: User ${user.username || user.id} claimed voucher ${cleanCode} for +${codeObj.points} pts!`
    );
    this.notify();

    return {
      success: true,
      pointsAwarded: codeObj.points,
      message: `Successfully redeemed ${cleanCode}! +${codeObj.points} points added.`,
      newTotal: user.points,
    };
  }

  // --- Redeem / Withdrawal Requests ---
  private saveRequests() {
    try {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(Array.from(this.requests.values())));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  public getRedeemRequests(): RedeemRequest[] {
    return Array.from(this.requests.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public createRedeemRequest(
    userId: number,
    points: number,
    payoutDetails: string
  ): { success: boolean; message: string; request?: RedeemRequest; newTotal: number } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'User not found.', newTotal: 0 };
    }

    const MIN_REDEEM = 100;
    if (points < MIN_REDEEM) {
      return {
        success: false,
        message: `Minimum withdrawal is ${MIN_REDEEM} points. You entered ${points} points.`,
        newTotal: user.points,
      };
    }

    if (user.points < points) {
      return {
        success: false,
        message: `Insufficient points! Your balance is ${user.points} points.`,
        newTotal: user.points,
      };
    }

    // Deduct points and create ticket
    user.points -= points;
    this.saveUsers();

    const reqId = `REQ-${Date.now().toString().slice(-6)}`;
    const request: RedeemRequest = {
      id: reqId,
      userId,
      username: user.username,
      points,
      payoutDetails: payoutDetails.trim(),
      status: 'pending',
      createdAt: Date.now(),
    };

    this.requests.set(reqId, request);
    this.saveRequests();

    this.addLog(
      'warn',
      'bot',
      `💸 Withdrawal Ticket #${reqId}: User ${user.username || user.id} requested ${points} pts payout (${payoutDetails}). Remaining: ${user.points} pts`
    );
    this.notify();

    return {
      success: true,
      message: `Withdrawal request #${reqId} submitted for ${points} points! Admin will review shortly.`,
      request,
      newTotal: user.points,
    };
  }

  public updateRedeemStatus(requestId: string, status: 'approved' | 'rejected') {
    const req = this.requests.get(requestId);
    if (req) {
      req.status = status;
      // If rejected, refund points to user
      if (status === 'rejected') {
        const user = this.users.get(req.userId);
        if (user) {
          user.points += req.points;
          this.saveUsers();
        }
      }
      this.saveRequests();
      this.addLog('admin', 'admin', `Withdrawal #${requestId} marked as ${status.toUpperCase()}`);
      this.notify();
    }
  }

  // --- Customer Support Tickets ---
  private saveTickets() {
    try {
      localStorage.setItem(TICKETS_KEY, JSON.stringify(Array.from(this.tickets.values())));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  public getTickets(): SupportTicket[] {
    return Array.from(this.tickets.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getTicket(id: string): SupportTicket | undefined {
    return this.tickets.get(id);
  }

  public createSupportTicket(
    userId: number,
    query: string
  ): { success: boolean; ticket: SupportTicket } {
    const user = this.users.get(userId);
    const username = user?.username || `user_${userId}`;
    const firstName = user?.firstName || 'User';

    const ticketId = `TICK-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticket: SupportTicket = {
      id: ticketId,
      userId,
      username,
      firstName,
      query,
      status: 'open',
      createdAt: Date.now(),
      replies: [
        {
          sender: 'user',
          text: query,
          timestamp: Date.now(),
        },
      ],
    };

    this.tickets.set(ticketId, ticket);
    this.saveTickets();

    this.addLog(
      'info',
      'bot',
      `💬 Support Ticket #${ticketId} opened by ${firstName} (@${username}) [ID: ${userId}]: "${query}"`
    );
    this.notify();

    return { success: true, ticket };
  }

  public replySupportTicket(
    ticketId: string,
    text: string,
    sender: 'user' | 'admin'
  ): { success: boolean; ticket?: SupportTicket; userToNotify?: number } {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      return { success: false };
    }

    ticket.replies.push({
      sender,
      text,
      timestamp: Date.now(),
    });

    if (sender === 'admin') {
      ticket.status = 'resolved';
    }

    this.saveTickets();
    this.addLog(
      'admin',
      'admin',
      `Support reply on Ticket #${ticketId} by ${sender}: "${text}"`
    );
    this.notify();

    return { success: true, ticket, userToNotify: ticket.userId };
  }

  // --- Leaderboard ---
  public getLeaderboard(limit = 10): UserRecord[] {
    return Array.from(this.users.values())
      .filter((u) => u.role !== 'admin' || u.points < 5000) // Exclude system admin from leaderboard if bloated
      .sort((a, b) => b.points - a.points || b.referralsCount - a.referralsCount)
      .slice(0, limit);
  }

  // --- Stats Summary ---
  public getStats() {
    const usersArr = Array.from(this.users.values());
    const totalUsers = usersArr.length;
    const totalPoints = usersArr.reduce((sum, u) => sum + (u.points || 0), 0);
    const totalReferrals = usersArr.reduce((sum, u) => sum + (u.referralsCount || 0), 0);
    const openTickets = Array.from(this.tickets.values()).filter((t) => t.status === 'open').length;
    const activeCodes = Array.from(this.codes.values()).filter((c) => c.usedCount < c.maxUses).length;
    const pendingWithdrawals = Array.from(this.requests.values()).filter((r) => r.status === 'pending').length;

    return {
      totalUsers,
      totalPoints,
      totalReferrals,
      openTickets,
      activeCodes,
      pendingWithdrawals,
    };
  }

  // --- Console Logs ---
  public addLog(
    level: LogLevel,
    source: LogEntry['source'],
    message: string,
    details?: any
  ) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      level,
      source,
      message,
      details,
    };

    this.logs.unshift(entry);
    if (this.logs.length > 500) {
      this.logs.pop();
    }
    this.notify();
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }

  public clearLogs() {
    this.logs = [];
    this.addLog('info', 'system', 'Console logs cleared by user');
    this.notify();
  }

  // --- Simulator Messages ---
  public getSimulatedMessages(): SimulatedMessage[] {
    return this.simulatedMessages;
  }

  public addSimulatedMessage(msg: Omit<SimulatedMessage, 'id' | 'timestamp'>) {
    const newMsg: SimulatedMessage = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
      ...msg,
    };
    this.simulatedMessages.push(newMsg);
    // Keep last 100 messages
    if (this.simulatedMessages.length > 100) {
      this.simulatedMessages.shift();
    }
    try {
      localStorage.setItem(SIMULATOR_MESSAGES_KEY, JSON.stringify(this.simulatedMessages));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
    this.notify();
    return newMsg;
  }

  public clearSimulatedMessages() {
    this.simulatedMessages = [];
    localStorage.removeItem(SIMULATOR_MESSAGES_KEY);
    this.notify();
  }

  // --- Complete Reset ---
  public resetAllData() {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(TICKETS_KEY);
    localStorage.removeItem(CODES_KEY);
    localStorage.removeItem(REQUESTS_KEY);
    localStorage.removeItem(SIMULATOR_MESSAGES_KEY);

    this.users.clear();
    this.tickets.clear();
    this.codes.clear();
    this.requests.clear();
    this.simulatedMessages = [];

    INITIAL_USERS.forEach((u) => this.users.set(u.id, u));
    INITIAL_TICKETS.forEach((t) => this.tickets.set(t.id, t));
    INITIAL_CODES.forEach((c) => this.codes.set(c.code.toUpperCase(), c));

    this.addLog('warn', 'system', 'All local database records reset to factory demo state');
    this.notify();
  }
}

export const botStore = new BotStore();
