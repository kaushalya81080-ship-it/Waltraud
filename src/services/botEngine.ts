import { Bot, InlineKeyboard, Context, GrammyError, HttpError } from 'grammy';
import { botStore } from './store';
import { BotSecrets, BotInfo } from '../types';

export class TelegramBotRunner {
  private bot: Bot | null = null;
  private isPolling: boolean = false;
  private abortController: AbortController | null = null;
  private pendingUserActions: Map<number, { action: string; meta?: any }> = new Map();
  private botInfo: BotInfo | null = null;

  constructor() {
    // Listen to secrets changes
    botStore.subscribe(() => {
      // If credentials changed while running, we can notify
    });
  }

  public isRunning(): boolean {
    return this.isPolling;
  }

  public getBotInfo(): BotInfo | null {
    return this.botInfo;
  }

  // --- Keyboard Builders (Strictly InlineKeyboard) ---

  public buildMainMenuKeyboard(isAdmin: boolean = false): InlineKeyboard {
    const kb = new InlineKeyboard()
      .text('💰 Balance & Profile', 'cb:balance')
      .text('👥 Refer & Earn', 'cb:referrals')
      .row()
      .text('🎰 Spin & Win', 'cb:spin')
      .text('📅 Daily Check-in', 'cb:checkin')
      .row()
      .text('🏆 Leaderboard', 'cb:leaderboard')
      .text('🎁 Redeem Points', 'cb:redeem_menu')
      .row()
      .text('💬 Customer Support', 'cb:support');

    if (isAdmin) {
      kb.row().text('⚡ Admin Control Panel', 'cb:admin_panel');
    }

    kb.row().text('🔄 Refresh Menu', 'cb:main_menu');
    return kb;
  }

  public buildForceSubscribeKeyboard(channelName: string): InlineKeyboard {
    const cleanChannel = channelName.replace(/^@/, '');
    return new InlineKeyboard()
      .url('📢 Join Official Channel', `https://t.me/${cleanChannel}`)
      .row()
      .text('✅ Joined / Verify Membership', 'cb:verify_sub');
  }

  public buildBalanceKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('🎰 Spin & Win', 'cb:spin')
      .text('👥 Refer & Earn', 'cb:referrals')
      .row()
      .text('🎁 Redeem Points', 'cb:redeem_menu')
      .text('🔙 Main Menu', 'cb:main_menu');
  }

  public buildReferralKeyboard(botUsername: string, userId: number): InlineKeyboard {
    const refLink = `https://t.me/${botUsername || 'GrammyBot'}?start=ref_${userId}`;
    const shareText = encodeURIComponent(`🚀 Join this awesome Telegram Bot to earn free points & daily streak rewards!\n\nUse my invite link: ${refLink}`);
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${shareText}`;

    return new InlineKeyboard()
      .url('📢 Share Invite Link', shareUrl)
      .row()
      .text('💰 View Balance', 'cb:balance')
      .text('🔙 Main Menu', 'cb:main_menu');
  }

  public buildSpinKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('🎰 Spin Again', 'cb:spin')
      .text('💰 My Balance', 'cb:balance')
      .row()
      .text('🔙 Main Menu', 'cb:main_menu');
  }

  public buildDailyCheckinKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('🎰 Try Spin & Win', 'cb:spin')
      .text('🏆 View Leaderboard', 'cb:leaderboard')
      .row()
      .text('🔙 Main Menu', 'cb:main_menu');
  }

  public buildRedeemMenuKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('💸 Request Withdrawal', 'cb:redeem_withdraw')
      .row()
      .text('🎟️ Claim Promo Voucher', 'cb:redeem_voucher')
      .row()
      .text('📋 My Withdrawal Tickets', 'cb:redeem_list')
      .row()
      .text('🔙 Main Menu', 'cb:main_menu');
  }

  public buildLeaderboardKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('🔄 Refresh Ranks', 'cb:leaderboard')
      .text('👥 Refer Friends', 'cb:referrals')
      .row()
      .text('🔙 Main Menu', 'cb:main_menu');
  }

  public buildAdminKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('📊 Bot Stats', 'cb:admin_stats')
      .text('📢 Broadcast Message', 'cb:admin_broadcast')
      .row()
      .text('➕ Manage Points', 'cb:admin_points')
      .text('🎫 Create Promo Code', 'cb:admin_code')
      .row()
      .text('📋 View Recent Users', 'cb:admin_users')
      .text('🎟️ Support Tickets', 'cb:admin_tickets')
      .row()
      .text('🔙 Back to User Menu', 'cb:main_menu');
  }

  public buildSupportKeyboard(ticketId: string): InlineKeyboard {
    return new InlineKeyboard()
      .text('✍️ Write Follow-up', `cb:ticket_reply_${ticketId}`)
      .text('🔙 Main Menu', 'cb:main_menu');
  }

  // --- Force Channel Subscribe Verification Helper ---
  private async checkChannelMembership(ctx: Context, secrets: BotSecrets): Promise<boolean> {
    if (!secrets.forceChannel) return true;
    const userId = ctx.from?.id;
    if (!userId) return true;

    // Check if user already verified in store
    const user = botStore.getUser(userId);
    if (user?.hasVerifiedChannel) return true;

    // If channel is configured, check Telegram API
    try {
      const channel = secrets.forceChannel.startsWith('@') ? secrets.forceChannel : `@${secrets.forceChannel}`;
      const member = await ctx.api.getChatMember(channel, userId);
      const isMember = ['creator', 'administrator', 'member', 'restricted'].includes(member.status);
      if (isMember) {
        botStore.setUserChannelVerified(userId, true);
        return true;
      }
      return false;
    } catch (e: any) {
      // If bot is not administrator in the force channel or channel not found, allow testing gracefully
      botStore.addLog('warn', 'bot', `Force Subscribe check notice: ${e.message || e}. Bypassing strict check for demo testing.`);
      return true;
    }
  }

  // --- Initialize Bot with GrammY ---
  public async setupBot(secrets: BotSecrets): Promise<Bot> {
    if (!secrets.botToken) {
      throw new Error('BOT_TOKEN is required. Please open Secrets modal to configure.');
    }

    botStore.addLog('info', 'system', `Initializing grammY instance (Token: ${secrets.botToken.substring(0, 8)}...)...`);

    // Determine API root:
    // If running in browser and proxy is enabled, route through '/tg-api' to eliminate CORS errors!
    let clientConfig: any = {};
    if (secrets.useProxy && typeof window !== 'undefined') {
      const origin = window.location.origin;
      clientConfig.apiRoot = `${origin}/tg-api`;
      botStore.addLog('info', 'system', `Configured reverse proxy: ${clientConfig.apiRoot}`);
    }

    const bot = new Bot(secrets.botToken, { client: clientConfig });

    // Install Outbound API Transformer for live terminal logging & simulator rendering
    bot.api.config.use(async (prev, method, payload: any, signal) => {
      const start = Date.now();
      botStore.addLog('outbound', 'bot', `API Request: ${method}`, {
        method,
        chat_id: payload?.chat_id,
        text: payload?.text,
        reply_markup: payload?.reply_markup ? 'InlineKeyboard' : undefined,
      });

      // Mirror outbound message to simulator chat view
      if (['sendMessage', 'sendPhoto'].includes(method) && payload?.text) {
        botStore.addSimulatedMessage({
          chatId: payload.chat_id,
          sender: 'bot',
          text: payload.text,
          replyMarkup: payload.reply_markup,
        });
      } else if (method === 'editMessageText' && payload?.text) {
        botStore.addSimulatedMessage({
          chatId: payload.chat_id,
          sender: 'bot',
          text: `[Edited] ${payload.text}`,
          replyMarkup: payload.reply_markup,
        });
      }

      // If simulated/test token without live Telegram connectivity, mock the API call response gracefully
      const isDemoToken = secrets.botToken.toLowerCase().includes('demo') || secrets.botToken.toLowerCase().includes('sandbox');
      if (isDemoToken) {
        return {
          ok: true,
          result: {
            message_id: Math.floor(Date.now() / 1000) % 100000,
            date: Math.floor(Date.now() / 1000),
            chat: { id: payload?.chat_id || 0, type: 'private' },
            text: payload?.text || 'OK',
          },
        } as any;
      }

      try {
        const response = await prev(method, payload, signal);
        const duration = Date.now() - start;
        botStore.addLog('success', 'bot', `API Response ${method} (${duration}ms) - OK`);
        return response;
      } catch (err: any) {
        const duration = Date.now() - start;
        botStore.addLog('error', 'bot', `API Error in ${method} (${duration}ms): ${err.message || err}`, err);
        throw err;
      }
    });

    // --- Middleware: Register / Update User Record ---
    bot.use(async (ctx, next) => {
      if (ctx.from) {
        const refMatch = ctx.message?.text?.match(/^\/start\s+ref_(\d+)/i);
        const referrerId = refMatch ? parseInt(refMatch[1], 10) : undefined;
        botStore.getOrCreateUser(ctx.from, referrerId);
      }
      return next();
    });

    // --- Bot Command: /start ---
    bot.command('start', async (ctx) => {
      const from = ctx.from;
      if (!from) return;

      const isAdmin = String(from.id) === String(secrets.adminId);
      botStore.addLog('info', 'bot', `Command /start by ${from.first_name} (@${from.username || from.id})`);

      // Check Force Channel Subscribe
      const isSubscribed = await this.checkChannelMembership(ctx, secrets);
      if (!isSubscribed && secrets.forceChannel) {
        return ctx.reply(
          `👋 Welcome to our Points & Rewards Bot!\n\n⚠️ **Channel Membership Required**\nTo unlock all features, please join our official channel: **${secrets.forceChannel}**`,
          {
            parse_mode: 'Markdown',
            reply_markup: this.buildForceSubscribeKeyboard(secrets.forceChannel),
          }
        );
      }

      const welcomeMsg =
        `👋 **Welcome, ${from.first_name}!**\n\n` +
        `Earn points, invite friends, spin the lucky wheel, and claim daily streak rewards! 🚀\n\n` +
        `• 🎰 **Spin & Win**: Random rewards every hour\n` +
        `• 👥 **Refer & Earn**: +${secrets.pointsPerReferral} points per friend\n` +
        `• 📅 **Daily Check-in**: +${secrets.dailyCheckinPoints} points every 24h\n` +
        `• 🎁 **Redeem Points**: Payouts & Promo Vouchers\n\n` +
        `Select an option below to get started:`;

      return ctx.reply(welcomeMsg, {
        parse_mode: 'Markdown',
        reply_markup: this.buildMainMenuKeyboard(isAdmin),
      });
    });

    // --- Bot Command: /admin ---
    bot.command('admin', async (ctx) => {
      const from = ctx.from;
      if (!from) return;

      if (String(from.id) !== String(secrets.adminId)) {
        botStore.addLog('warn', 'admin', `Unauthorized /admin attempt by ${from.first_name} [ID: ${from.id}]`);
        return ctx.reply('⛔ **Access Denied**: You are not authorized to access the Admin Panel.', {
          parse_mode: 'Markdown',
        });
      }

      botStore.addLog('admin', 'admin', `Admin Panel opened by ${from.first_name} [ID: ${from.id}]`);
      const stats = botStore.getStats();

      const adminMsg =
        `⚡ **Admin Control Panel**\n\n` +
        `• **Total Users**: ${stats.totalUsers}\n` +
        `• **Points Issued**: ${stats.totalPoints} pts\n` +
        `• **Total Referrals**: ${stats.totalReferrals}\n` +
        `• **Open Tickets**: ${stats.openTickets}\n` +
        `• **Active Promo Vouchers**: ${stats.activeCodes}\n\n` +
        `Choose an administrative tool below:`;

      return ctx.reply(adminMsg, {
        parse_mode: 'Markdown',
        reply_markup: this.buildAdminKeyboard(),
      });
    });

    // --- Bot Command: /help ---
    bot.command('help', async (ctx) => {
      const from = ctx.from;
      const isAdmin = String(from?.id) === String(secrets.adminId);
      const text =
        `📖 **Bot Help & Navigation**\n\n` +
        `• Use the inline buttons below to access your profile, spin the wheel, check in daily, or view top ranks.\n` +
        `• Share your unique referral link to earn +${secrets.pointsPerReferral} points for each friend that joins.\n` +
        `• Need help? Click **Customer Support** to chat with our staff.` +
        (isAdmin ? `\n\n👑 **Admin Commands**:\n• \`/admin\` - Open control dashboard\n• \`/addpoints <id> <amount>\` - Add points\n• \`/deductpoints <id> <amount>\` - Deduct points\n• \`/broadcast <message>\` - Broadcast to all users` : '');

      return ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: this.buildMainMenuKeyboard(isAdmin),
      });
    });

    // --- Admin Direct Commands ---
    bot.command('addpoints', async (ctx) => {
      const from = ctx.from;
      if (!from || String(from.id) !== String(secrets.adminId)) {
        return ctx.reply('⛔ Unauthorized.');
      }
      const parts = ctx.message?.text?.split(' ') || [];
      const targetId = parseInt(parts[1], 10);
      const amount = parseInt(parts[2], 10);

      if (isNaN(targetId) || isNaN(amount) || amount <= 0) {
        return ctx.reply('Usage: `/addpoints <userId> <amount>`\nExample: `/addpoints 1001001 250`', { parse_mode: 'Markdown' });
      }

      const res = botStore.modifyPoints(targetId, amount, 'Admin Manual Credit');
      if (res.success) {
        ctx.reply(`✅ Added +${amount} points to User ID ${targetId}. New Balance: ${res.newPoints} pts.`);
        // Try to notify the user
        try {
          await ctx.api.sendMessage(targetId, `🎁 **Good News!**\nAdmin credited +${amount} points to your account!\nNew Balance: ${res.newPoints} pts.`, { parse_mode: 'Markdown' });
        } catch (_) {}
      } else {
        ctx.reply(`❌ ${res.message}`);
      }
    });

    bot.command('deductpoints', async (ctx) => {
      const from = ctx.from;
      if (!from || String(from.id) !== String(secrets.adminId)) {
        return ctx.reply('⛔ Unauthorized.');
      }
      const parts = ctx.message?.text?.split(' ') || [];
      const targetId = parseInt(parts[1], 10);
      const amount = parseInt(parts[2], 10);

      if (isNaN(targetId) || isNaN(amount) || amount <= 0) {
        return ctx.reply('Usage: `/deductpoints <userId> <amount>`\nExample: `/deductpoints 1001001 50`', { parse_mode: 'Markdown' });
      }

      const res = botStore.modifyPoints(targetId, -amount, 'Admin Manual Deduction');
      if (res.success) {
        ctx.reply(`✅ Deducted -${amount} points from User ID ${targetId}. New Balance: ${res.newPoints} pts.`);
      } else {
        ctx.reply(`❌ ${res.message}`);
      }
    });

    bot.command('broadcast', async (ctx) => {
      const from = ctx.from;
      if (!from || String(from.id) !== String(secrets.adminId)) {
        return ctx.reply('⛔ Unauthorized.');
      }
      const broadcastText = ctx.message?.text?.replace(/^\/broadcast\s+/i, '').trim();
      if (!broadcastText) {
        return ctx.reply('Usage: `/broadcast <message to send to all users>`', { parse_mode: 'Markdown' });
      }

      const users = botStore.getUsers();
      let sentCount = 0;
      let failCount = 0;

      await ctx.reply(`📢 Starting broadcast to ${users.length} registered users...`);

      for (const u of users) {
        try {
          await ctx.api.sendMessage(u.id, `📢 **Broadcast Announcement**:\n\n${broadcastText}`, {
            parse_mode: 'Markdown',
          });
          sentCount++;
        } catch (e) {
          failCount++;
        }
      }

      botStore.addLog('admin', 'admin', `Broadcast finished: ${sentCount} delivered, ${failCount} failed.`);
      return ctx.reply(`✅ **Broadcast Complete**\n• Successfully Sent: ${sentCount}\n• Failed: ${failCount}`, {
        parse_mode: 'Markdown',
      });
    });

    bot.command('reply', async (ctx) => {
      const from = ctx.from;
      if (!from || String(from.id) !== String(secrets.adminId)) {
        return ctx.reply('⛔ Unauthorized.');
      }
      const match = ctx.message?.text?.match(/^\/reply\s+([A-Za-z0-9\-]+)\s+(.+)$/s);
      if (!match) {
        return ctx.reply('Usage: `/reply <ticketId> <response text>`\nExample: `/reply TICK-101 Hello! We have approved your payout.`', { parse_mode: 'Markdown' });
      }

      const ticketId = match[1];
      const replyText = match[2];
      const res = botStore.replySupportTicket(ticketId, replyText, 'admin');

      if (!res.success || !res.ticket) {
        return ctx.reply(`❌ Ticket ${ticketId} not found.`);
      }

      // Send to user
      try {
        await ctx.api.sendMessage(
          res.ticket.userId,
          `💬 **Staff Reply on Ticket #${ticketId}**:\n\n"${replyText}"\n\n_If you need more help, you can reply directly or open a new ticket._`,
          { parse_mode: 'Markdown' }
        );
        ctx.reply(`✅ Response sent to User ID ${res.ticket.userId} for ticket #${ticketId}.`);
      } catch (err: any) {
        ctx.reply(`⚠️ Ticket updated in store, but message delivery to Telegram user failed: ${err.message}`);
      }
    });

    // --- Handling Admin Reply to Forwarded Messages in Telegram ---
    bot.on('message', async (ctx, next) => {
      const from = ctx.from;
      if (!from) return next();

      // Check if admin is replying to a support query message forwarded in Telegram
      const replyToMsg = ctx.message?.reply_to_message;
      if (replyToMsg && String(from.id) === String(secrets.adminId)) {
        const ticketMatch = replyToMsg.text?.match(/Ticket #([A-Za-z0-9\-]+)/);
        const userMatch = replyToMsg.text?.match(/User ID: (\d+)/);

        if (ticketMatch && userMatch) {
          const ticketId = ticketMatch[1];
          const targetUserId = parseInt(userMatch[1], 10);
          const replyText = ctx.message.text || '';

          botStore.replySupportTicket(ticketId, replyText, 'admin');
          try {
            await ctx.api.sendMessage(
              targetUserId,
              `💬 **Staff Reply on Ticket #${ticketId}**:\n\n"${replyText}"`,
              { parse_mode: 'Markdown' }
            );
            return ctx.reply(`✅ Reply sent to User ${targetUserId} for ticket #${ticketId}!`);
          } catch (e: any) {
            return ctx.reply(`⚠️ Reply stored, but could not deliver to user: ${e.message}`);
          }
        }
      }

      // Check if user has an active conversational prompt (e.g. waiting for ticket message or promo code)
      const pending = this.pendingUserActions.get(from.id);
      if (pending && ctx.message.text) {
        const text = ctx.message.text.trim();
        this.pendingUserActions.delete(from.id);

        if (pending.action === 'SUPPORT_QUERY') {
          const ticketRes = botStore.createSupportTicket(from.id, text);
          const ticket = ticketRes.ticket;

          // Forward to Support Chat / Admin ID
          const forwardText =
            `🚨 **New Support Ticket #${ticket.id}**\n` +
            `• **From**: ${ticket.firstName} (@${ticket.username})\n` +
            `• **User ID**: \`${ticket.userId}\`\n\n` +
            `**User Query**:\n"${text}"\n\n` +
            `_Reply to this message or use \`/reply ${ticket.id} <text>\` to respond._`;

          try {
            const dest = secrets.supportChatId || secrets.adminId;
            if (dest) {
              await ctx.api.sendMessage(dest, forwardText, { parse_mode: 'Markdown' });
            }
          } catch (e) {
            botStore.addLog('warn', 'bot', `Could not notify support chat: ${e}`);
          }

          return ctx.reply(
            `✅ **Support Ticket #${ticket.id} Submitted!**\n\n` +
            `Our support staff has been notified. You will receive a message right here when an agent replies.`,
            {
              parse_mode: 'Markdown',
              reply_markup: this.buildSupportKeyboard(ticket.id),
            }
          );
        }

        if (pending.action === 'REDEEM_CODE') {
          const res = botStore.redeemCode(from.id, text);
          if (res.success) {
            return ctx.reply(
              `🎉 **Success!**\n${res.message}\nYour current balance is: **${res.newTotal} pts**.`,
              {
                parse_mode: 'Markdown',
                reply_markup: this.buildBalanceKeyboard(),
              }
            );
          } else {
            return ctx.reply(`❌ **Redemption Failed**\n${res.message}`, {
              parse_mode: 'Markdown',
              reply_markup: this.buildRedeemMenuKeyboard(),
            });
          }
        }

        if (pending.action === 'WITHDRAWAL_DETAILS') {
          const points = pending.meta?.points || 100;
          const res = botStore.createRedeemRequest(from.id, points, text);
          if (res.success) {
            return ctx.reply(
              `✅ **Withdrawal Request Submitted**\n\n` +
              `• **Ticket**: \`${res.request?.id}\`\n` +
              `• **Points Requested**: ${points} pts\n` +
              `• **Payout Info**: ${text}\n` +
              `• **Remaining Balance**: ${res.newTotal} pts\n\n` +
              `Our admin team will review and process your request within 24 hours.`,
              {
                parse_mode: 'Markdown',
                reply_markup: this.buildMainMenuKeyboard(String(from.id) === String(secrets.adminId)),
              }
            );
          } else {
            return ctx.reply(`❌ **Request Failed**: ${res.message}`, {
              parse_mode: 'Markdown',
              reply_markup: this.buildRedeemMenuKeyboard(),
            });
          }
        }

        if (pending.action === 'ADMIN_BROADCAST') {
          const users = botStore.getUsers();
          let sent = 0;
          for (const u of users) {
            try {
              await ctx.api.sendMessage(u.id, `📢 **Broadcast**:\n\n${text}`, { parse_mode: 'Markdown' });
              sent++;
            } catch (_) {}
          }
          return ctx.reply(`✅ Broadcast sent to ${sent} users!`, {
            reply_markup: this.buildAdminKeyboard(),
          });
        }
      }

      return next();
    });

    // --- Callback Query Handlers (Strictly Inline Keyboards) ---

    // 1. Main Menu
    bot.callbackQuery('cb:main_menu', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      const isAdmin = String(from.id) === String(secrets.adminId);
      const text =
        `👋 **Welcome to Points & Rewards Bot!**\n\n` +
        `Choose an action from the menu below:`;

      try {
        await ctx.editMessageText(text, {
          parse_mode: 'Markdown',
          reply_markup: this.buildMainMenuKeyboard(isAdmin),
        });
      } catch (_) {
        await ctx.reply(text, {
          parse_mode: 'Markdown',
          reply_markup: this.buildMainMenuKeyboard(isAdmin),
        });
      }
    });

    // 2. Force Subscribe Verification
    bot.callbackQuery('cb:verify_sub', async (ctx) => {
      const from = ctx.from;
      const isSubscribed = await this.checkChannelMembership(ctx, secrets);

      if (isSubscribed) {
        await ctx.answerCallbackQuery({ text: '✅ Verified! Welcome aboard.' });
        botStore.setUserChannelVerified(from.id, true);
        const isAdmin = String(from.id) === String(secrets.adminId);
        return ctx.editMessageText(
          `🎉 **Verification Successful!**\n\nThank you for joining ${secrets.forceChannel}! Your rewards menu is now fully unlocked.`,
          {
            parse_mode: 'Markdown',
            reply_markup: this.buildMainMenuKeyboard(isAdmin),
          }
        );
      } else {
        await ctx.answerCallbackQuery({
          text: '❌ Not detected in channel. Please click Join first!',
          show_alert: true,
        });
      }
    });

    // 3. Balance & Profile
    bot.callbackQuery('cb:balance', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      const user = botStore.getUser(from.id) || botStore.getOrCreateUser(from).user;
      const botUser = this.botInfo?.username || 'GrammyBot';
      const refLink = `https://t.me/${botUser}?start=ref_${user.id}`;

      const text =
        `💰 **Your Account Profile**\n\n` +
        `• **User**: ${user.firstName} (@${user.username})\n` +
        `• **Telegram ID**: \`${user.id}\`\n` +
        `• **Current Balance**: **${user.points.toLocaleString()} pts** 🪙\n` +
        `• **Total Referrals**: ${user.referralsCount} users 👥\n` +
        `• **Check-in Streak**: Day ${user.streak || 1} 🔥\n` +
        `• **Member Since**: ${new Date(user.joinedAt).toLocaleDateString()}\n\n` +
        `🔗 **Your Referral Link**:\n\`${refLink}\``;

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: this.buildBalanceKeyboard(),
      });
    });

    // 4. Refer & Earn
    bot.callbackQuery('cb:referrals', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      const user = botStore.getUser(from.id) || botStore.getOrCreateUser(from).user;
      const botUser = this.botInfo?.username || 'GrammyBot';
      const refLink = `https://t.me/${botUser}?start=ref_${user.id}`;

      const text =
        `👥 **Refer & Earn Program**\n\n` +
        `Invite friends to join our bot and earn passive bonus points!\n\n` +
        `🎁 **Rewards Guidelines**:\n` +
        `• You receive: **+${secrets.pointsPerReferral} points** per friend that starts the bot.\n` +
        `• Your friend receives: **+50 bonus points** upon joining.\n` +
        `• No referral limits: Invite as many users as you like!\n\n` +
        `📊 **Your Referral Stats**:\n` +
        `• Successful Invites: **${user.referralsCount}**\n` +
        `• Total Points Earned: **${user.referralsCount * secrets.pointsPerReferral} pts**\n\n` +
        `📋 **Copy your personal invite link**:\n\`${refLink}\``;

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: this.buildReferralKeyboard(botUser, user.id),
      });
    });

    // 5. Spin & Win
    bot.callbackQuery('cb:spin', async (ctx) => {
      const from = ctx.from;
      const result = botStore.spinWheel(from.id);

      if (!result.success) {
        const remainingMinutes = Math.ceil((result.cooldownRemainingMs || 0) / 60000);
        await ctx.answerCallbackQuery({
          text: `⏳ Cooldown active! You can spin again in ${remainingMinutes} min.`,
          show_alert: true,
        });

        const text =
          `🎰 **Spin & Win Lucky Wheel**\n\n` +
          `⏳ **Cooldown Active!**\n` +
          `You have already spun the wheel recently.\n` +
          `Please return in **${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}** for your next free spin!\n\n` +
          `Your balance: **${result.newTotal} pts**.`;

        return ctx.editMessageText(text, {
          parse_mode: 'Markdown',
          reply_markup: this.buildSpinKeyboard(),
        });
      }

      await ctx.answerCallbackQuery({ text: `🎉 WON +${result.pointsWon} POINTS!` });

      const text =
        `🎰 **Spin & Win Result!**\n\n` +
        `🎡 The wheel spun and landed on: **+${result.pointsWon} Points!** 💥\n\n` +
        `🎉 Congratulations! Points have been credited immediately.\n` +
        `• New Balance: **${result.newTotal} pts**\n` +
        `• Next Spin Available in: **1 hour**`;

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: this.buildSpinKeyboard(),
      });
    });

    // 6. Daily Check-in
    bot.callbackQuery('cb:checkin', async (ctx) => {
      const from = ctx.from;
      const result = botStore.claimDailyCheckin(from.id);

      if (!result.success) {
        const hours = Math.floor((result.cooldownRemainingMs || 0) / 3600000);
        const mins = Math.ceil(((result.cooldownRemainingMs || 0) % 3600000) / 60000);

        await ctx.answerCallbackQuery({
          text: `⏳ Already claimed today! Next claim in ${hours}h ${mins}m.`,
          show_alert: true,
        });

        const text =
          `📅 **Daily Streak Check-in**\n\n` +
          `⚠️ You have already claimed your daily reward today!\n\n` +
          `• Current Streak: **Day ${result.streak}** 🔥\n` +
          `• Next Check-in in: **${hours}h ${mins}m**\n` +
          `• Current Balance: **${result.newTotal} pts**`;

        return ctx.editMessageText(text, {
          parse_mode: 'Markdown',
          reply_markup: this.buildDailyCheckinKeyboard(),
        });
      }

      await ctx.answerCallbackQuery({ text: `🎉 Claimed +${result.pointsAwarded} points!` });

      const text =
        `📅 **Daily Streak Reward Claimed!**\n\n` +
        `✨ You received: **+${result.pointsAwarded} Points**!\n` +
        `🔥 Check-in Streak: **Day ${result.streak}**\n` +
        `🪙 New Balance: **${result.newTotal} pts**\n\n` +
        `_Check in again tomorrow to keep your multiplier streak active!_`;

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: this.buildDailyCheckinKeyboard(),
      });
    });

    // 7. Leaderboard
    bot.callbackQuery('cb:leaderboard', async (ctx) => {
      await ctx.answerCallbackQuery();
      const topUsers = botStore.getLeaderboard(10);
      const from = ctx.from;
      const user = botStore.getUser(from.id);

      let text = `🏆 **Top 10 Global Leaderboard**\n\n`;
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

      topUsers.forEach((u, idx) => {
        const medal = medals[idx] || `${idx + 1}.`;
        const name = u.firstName || u.username;
        const mask = name.length > 3 ? `${name.substring(0, 3)}***` : name;
        text += `${medal} **${mask}** — **${u.points.toLocaleString()} pts** (${u.referralsCount} refs)\n`;
      });

      if (user) {
        text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        text += `👤 **Your Rank**: **${user.points} pts** (#${user.streak} streak)`;
      }

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: this.buildLeaderboardKeyboard(),
      });
    });

    // 8. Redeem Menu
    bot.callbackQuery('cb:redeem_menu', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      const user = botStore.getUser(from.id) || botStore.getOrCreateUser(from).user;

      const text =
        `🎁 **Redeem & Payout Center**\n\n` +
        `• **Your Points**: **${user.points} pts**\n` +
        `• **Minimum Withdrawal**: 100 pts\n\n` +
        `Choose what you would like to do:`;

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: this.buildRedeemMenuKeyboard(),
      });
    });

    // 8a. Redeem: Request Withdrawal Prompt
    bot.callbackQuery('cb:redeem_withdraw', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      const user = botStore.getUser(from.id) || botStore.getOrCreateUser(from).user;

      if (user.points < 100) {
        return ctx.reply(
          `⚠️ **Insufficient Balance**\n\nYou need at least **100 points** to request a payout. Your current balance is **${user.points} pts**.\n\nInvite friends or check in daily to reach 100 points!`,
          {
            parse_mode: 'Markdown',
            reply_markup: this.buildMainMenuKeyboard(String(from.id) === String(secrets.adminId)),
          }
        );
      }

      // Prompt user for withdrawal details
      this.pendingUserActions.set(from.id, { action: 'WITHDRAWAL_DETAILS', meta: { points: 100 } });

      await ctx.reply(
        `💸 **Withdrawal Request (100 Points)**\n\n` +
        `Please send your payout method & account address in your next message.\n\n` +
        `_Example: USDT (TRC20): TXYZ123456789... or Telegram Stars / Gift Card details._\n\n` +
        `Type your message now:`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('❌ Cancel Request', 'cb:redeem_menu'),
        }
      );
    });

    // 8b. Redeem: Promo Voucher
    bot.callbackQuery('cb:redeem_voucher', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      this.pendingUserActions.set(from.id, { action: 'REDEEM_CODE' });

      await ctx.reply(
        `🎟️ **Redeem Promo Voucher**\n\n` +
        `Please send the voucher code in your next message (e.g. \`WELCOME100\` or \`VIP500\`).\n\n` +
        `Type your code now:`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('❌ Cancel', 'cb:redeem_menu'),
        }
      );
    });

    // 8c. Redeem: List Requests
    bot.callbackQuery('cb:redeem_list', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      const allReqs = botStore.getRedeemRequests().filter((r) => r.userId === from.id);

      if (allReqs.length === 0) {
        return ctx.editMessageText(
          `📋 **Your Withdrawal Tickets**\n\nYou have no past withdrawal requests yet.`,
          {
            reply_markup: this.buildRedeemMenuKeyboard(),
          }
        );
      }

      let text = `📋 **Your Withdrawal History**\n\n`;
      allReqs.slice(0, 5).forEach((r) => {
        const badge = r.status === 'approved' ? '✅ Approved' : r.status === 'pending' ? '⏳ Pending' : '❌ Rejected';
        text += `• **#${r.id}** — ${r.points} pts [${badge}]\n  _${r.payoutDetails}_\n`;
      });

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: this.buildRedeemMenuKeyboard(),
      });
    });

    // 9. Customer Support
    bot.callbackQuery('cb:support', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      this.pendingUserActions.set(from.id, { action: 'SUPPORT_QUERY' });

      const text =
        `💬 **Customer Support & Ticket Desk**\n\n` +
        `Have a question, feedback, or need assistance?\n\n` +
        `Please type your question or issue in your next message. Our support team will receive it and reply directly to you!\n\n` +
        `_Send your message now:_`;

      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('❌ Cancel', 'cb:main_menu'),
      });
    });

    // 10. Admin Panel Callbacks
    bot.callbackQuery('cb:admin_panel', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      if (String(from.id) !== String(secrets.adminId)) {
        return ctx.reply('⛔ Access Denied.');
      }

      const stats = botStore.getStats();
      const text =
        `⚡ **Admin Control Panel**\n\n` +
        `• **Total Users**: ${stats.totalUsers}\n` +
        `• **Points Issued**: ${stats.totalPoints} pts\n` +
        `• **Total Referrals**: ${stats.totalReferrals}\n` +
        `• **Open Tickets**: ${stats.openTickets}\n` +
        `• **Active Promo Vouchers**: ${stats.activeCodes}\n\n` +
        `Select an administrative action:`;

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: this.buildAdminKeyboard(),
      });
    });

    bot.callbackQuery('cb:admin_stats', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      if (String(from.id) !== String(secrets.adminId)) return;

      const stats = botStore.getStats();
      const text =
        `📊 **Detailed Bot Statistics**\n\n` +
        `• **Registered Users**: ${stats.totalUsers}\n` +
        `• **Points in Circulation**: ${stats.totalPoints.toLocaleString()} pts\n` +
        `• **Completed Referrals**: ${stats.totalReferrals}\n` +
        `• **Open Support Tickets**: ${stats.openTickets}\n` +
        `• **Pending Withdrawals**: ${stats.pendingWithdrawals}\n` +
        `• **Active Promo Codes**: ${stats.activeCodes}\n` +
        `• **Engine Version**: grammY 1.46 (ESM / Web Worker ready)\n\n` +
        `Status: 🟢 **ONLINE**`;

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('🔄 Refresh', 'cb:admin_stats')
          .row()
          .text('🔙 Admin Menu', 'cb:admin_panel'),
      });
    });

    bot.callbackQuery('cb:admin_broadcast', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      if (String(from.id) !== String(secrets.adminId)) return;

      this.pendingUserActions.set(from.id, { action: 'ADMIN_BROADCAST' });

      await ctx.reply(
        `📢 **Broadcast to All Users**\n\n` +
        `Please send the broadcast message text in your next message, or use command:\n\`/broadcast <your message>\`\n\n` +
        `_Tip: Markdown formatting is supported._`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('❌ Cancel', 'cb:admin_panel'),
        }
      );
    });

    bot.callbackQuery('cb:admin_points', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      if (String(from.id) !== String(secrets.adminId)) return;

      const users = botStore.getUsers().slice(0, 5);
      const kb = new InlineKeyboard();
      users.forEach((u) => {
        kb.text(`+100 to ${u.username || u.id}`, `cb:quick_add_${u.id}`).row();
      });
      kb.text('🔙 Admin Menu', 'cb:admin_panel');

      await ctx.reply(
        `➕ **Manage User Points**\n\n` +
        `Use commands in chat to adjust any user's balance:\n` +
        `• \`/addpoints <userId> <amount>\`\n` +
        `• \`/deductpoints <userId> <amount>\`\n\n` +
        `Or tap a quick shortcut below:`,
        {
          parse_mode: 'Markdown',
          reply_markup: kb,
        }
      );
    });

    // Quick add points callback
    bot.callbackQuery(/^cb:quick_add_(\d+)$/, async (ctx) => {
      const from = ctx.from;
      if (String(from.id) !== String(secrets.adminId)) return;

      const targetId = parseInt(ctx.match[1], 10);
      const res = botStore.modifyPoints(targetId, 100, 'Admin Quick Button');
      await ctx.answerCallbackQuery({ text: `+100 pts added to ${targetId}!` });

      await ctx.reply(`✅ Added +100 points to user ${targetId}. Balance: ${res.newPoints} pts.`);
    });

    bot.callbackQuery('cb:admin_code', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      if (String(from.id) !== String(secrets.adminId)) return;

      // Generate a randomized sample promo code
      const randomCode = `PROMO${Math.floor(100 + Math.random() * 900)}`;
      const res = botStore.createRedeemCode(randomCode, 150, 20, from.id);

      await ctx.reply(
        `🎫 **Promo Code Created!**\n\n` +
        `• **Code**: \`${randomCode}\`\n` +
        `• **Points Reward**: 150 pts\n` +
        `• **Max Uses**: 20 users\n\n` +
        `Users can redeem this via "Redeem Points" -> "Claim Promo Voucher".\n\n` +
        `_You can also manage codes from the Web Dashboard tabs above._`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('🔙 Admin Menu', 'cb:admin_panel'),
        }
      );
    });

    bot.callbackQuery('cb:admin_users', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      if (String(from.id) !== String(secrets.adminId)) return;

      const users = botStore.getUsers().slice(0, 8);
      let text = `📋 **Recent User Registrations** (${users.length} shown)\n\n`;

      users.forEach((u) => {
        text += `• \`${u.id}\` | **@${u.username}** | ${u.points} pts | ${u.referralsCount} refs\n`;
      });

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('🔄 Refresh', 'cb:admin_users')
          .row()
          .text('🔙 Admin Menu', 'cb:admin_panel'),
      });
    });

    bot.callbackQuery('cb:admin_tickets', async (ctx) => {
      await ctx.answerCallbackQuery();
      const from = ctx.from;
      if (String(from.id) !== String(secrets.adminId)) return;

      const tickets = botStore.getTickets();
      if (tickets.length === 0) {
        return ctx.reply('🎟️ No support tickets in database.', {
          reply_markup: this.buildAdminKeyboard(),
        });
      }

      let text = `🎟️ **Support Tickets** (${tickets.length} total)\n\n`;
      tickets.slice(0, 5).forEach((t) => {
        const badge = t.status === 'open' ? '🔴 OPEN' : '🟢 RESOLVED';
        text += `• **#${t.id}** [${badge}] from @${t.username} (\`${t.userId}\`):\n  "${t.query}"\n`;
      });

      text += `\n_To respond, use \`/reply <ticketId> <text>\`._`;

      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔙 Admin Menu', 'cb:admin_panel'),
      });
    });

    // --- Error Catching (Mandatory bot.catch) ---
    bot.catch((err) => {
      const ctx = err.ctx;
      botStore.addLog('error', 'bot', `Error while handling update ${ctx.update.update_id}: ${err.error}`);
      const e = err.error;
      if (e instanceof GrammyError) {
        botStore.addLog('error', 'bot', `Telegram API GrammyError: ${e.description} (code ${e.error_code})`);
      } else if (e instanceof HttpError) {
        botStore.addLog('error', 'bot', `Could not contact Telegram servers: ${e.message}`);
      } else {
        botStore.addLog('error', 'bot', `Unknown runtime error: ${e}`);
      }
    });

    this.bot = bot;
    return bot;
  }

  // --- Start Long Polling ---
  public async startPolling(): Promise<void> {
    const secrets = botStore.getSecrets();
    if (!secrets.botToken) {
      throw new Error('Please configure BOT_TOKEN in Secrets settings first.');
    }

    if (this.isPolling) {
      botStore.addLog('warn', 'polling', 'Bot is already polling.');
      return;
    }

    try {
      botStore.setBotStatus('CONNECTING');
      botStore.addLog('info', 'polling', 'Initiating grammY long polling...');

      // Re-setup bot instance
      const bot = await this.setupBot(secrets);

      // Check if demo token
      const isDemo = secrets.botToken.toLowerCase().includes('demo') || secrets.botToken.toLowerCase().includes('sandbox');
      if (isDemo) {
        const mockBotInfo: BotInfo = {
          id: 999888777,
          first_name: 'Grammy Demo Bot',
          username: 'GrammyDemoBot',
          is_bot: true,
        };
        this.botInfo = mockBotInfo;
        botStore.setBotInfo(mockBotInfo);
        this.isPolling = true;
        botStore.setBotStatus('ONLINE');
        botStore.addLog('success', 'polling', 'Demo Bot online and listening for simulator events! (No real token needed)');
        return;
      }

      // Start real polling
      botStore.addLog('info', 'polling', 'Connecting to Telegram servers via getMe()...');
      
      this.abortController = new AbortController();

      // Launch long-polling
      bot.start({
        onStart: (info) => {
          this.botInfo = info;
          botStore.setBotInfo(info);
          this.isPolling = true;
          botStore.setBotStatus('ONLINE');
          botStore.addLog('success', 'polling', `Bot @${info.username} is now ONLINE & actively polling Telegram!`);
        },
        drop_pending_updates: true,
      }).catch((err) => {
        botStore.addLog('error', 'polling', `Polling stopped due to error: ${err.message || err}`);
        this.isPolling = false;
        botStore.setBotStatus('ERROR');
      });

    } catch (err: any) {
      this.isPolling = false;
      botStore.setBotStatus('ERROR');
      botStore.addLog('error', 'polling', `Failed to start bot: ${err.message || err}`);
      throw err;
    }
  }

  // --- Stop Long Polling ---
  public async stopPolling(): Promise<void> {
    if (!this.bot || !this.isPolling) {
      this.isPolling = false;
      botStore.setBotStatus('STOPPED');
      return;
    }

    botStore.addLog('info', 'polling', 'Stopping long polling loop...');
    try {
      if (this.abortController) {
        this.abortController.abort();
      }
      await this.bot.stop();
      this.isPolling = false;
      botStore.setBotStatus('STOPPED');
      botStore.addLog('warn', 'polling', 'Bot long polling has STOPPED.');
    } catch (err: any) {
      this.isPolling = false;
      botStore.setBotStatus('STOPPED');
      botStore.addLog('error', 'polling', `Error stopping bot: ${err.message || err}`);
    }
  }

  // --- Restart Bot ---
  public async restartPolling(): Promise<void> {
    await this.stopPolling();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await this.startPolling();
  }

  // --- Dispatch Simulator Update ---
  // Allows the built-in Telegram Simulator to feed real Update objects to grammY!
  public async dispatchUpdate(update: any): Promise<void> {
    if (!this.bot) {
      const secrets = botStore.getSecrets();
      await this.setupBot(secrets);
    }

    if (this.bot) {
      botStore.addLog(
        'info',
        'simulator',
        `Simulator dispatched update (ID: ${update.update_id || 'sim'})`,
        update
      );
      try {
        await this.bot.handleUpdate(update);
      } catch (e: any) {
        botStore.addLog('error', 'simulator', `Error processing simulated update: ${e.message || e}`);
      }
    }
  }
}

export const botRunner = new TelegramBotRunner();
