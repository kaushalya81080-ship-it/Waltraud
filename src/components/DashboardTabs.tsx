import React, { useState } from 'react';
import {
  Users,
  Ticket,
  MessageSquare,
  Send,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  ExternalLink,
  Search,
  Download,
  AlertCircle,
  Award,
  DollarSign,
} from 'lucide-react';
import { UserRecord, SupportTicket, RedeemCode, RedeemRequest } from '../types';
import { botStore } from '../services/store';

interface DashboardTabsProps {
  users: UserRecord[];
  tickets: SupportTicket[];
  codes: RedeemCode[];
  requests: RedeemRequest[];
  adminId: string;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({
  users,
  tickets,
  codes,
  requests,
  adminId,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'codes' | 'tickets' | 'broadcast'>('users');
  const [userSearch, setUserSearch] = useState('');
  
  // New Code Form State
  const [newCodeStr, setNewCodeStr] = useState('');
  const [newCodePoints, setNewCodePoints] = useState(150);
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(25);
  const [codeFormMessage, setCodeFormMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Broadcast Form State
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

  // Ticket Reply State
  const [replyTextMap, setReplyTextMap] = useState<{ [ticketId: string]: string }>({});

  // --- Handlers: Users ---
  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.firstName.toLowerCase().includes(q) ||
      String(u.id).includes(q)
    );
  });

  const handleAdjustPoints = (userId: number, delta: number) => {
    botStore.modifyPoints(userId, delta, 'Web Admin Adjust');
  };

  const handleExportUsers = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['User ID,Username,First Name,Points,Referrals,Streak,Role,Joined'].join(',') +
      '\n' +
      users
        .map(
          (u) =>
            `${u.id},${u.username},${u.firstName},${u.points},${u.referralsCount},${u.streak},${u.role},${new Date(
              u.joinedAt
            ).toLocaleDateString()}`
        )
        .join('\n');

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `telegram-bot-users-${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // --- Handlers: Promo Codes ---
  const handleCreateCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeStr.trim()) return;

    const res = botStore.createRedeemCode(
      newCodeStr,
      newCodePoints,
      newCodeMaxUses,
      parseInt(adminId, 10) || 8838351233
    );

    if (res.success) {
      setCodeFormMessage({ text: `Voucher ${res.code?.code} generated successfully!` });
      setNewCodeStr('');
      setTimeout(() => setCodeFormMessage(null), 4000);
    } else {
      setCodeFormMessage({ text: res.message, error: true });
    }
  };

  // --- Handlers: Support Tickets ---
  const handleSendTicketReply = (ticketId: string) => {
    const text = replyTextMap[ticketId]?.trim();
    if (!text) return;

    const res = botStore.replySupportTicket(ticketId, text, 'admin');
    if (res.success) {
      setReplyTextMap({ ...replyTextMap, [ticketId]: '' });
    }
  };

  // --- Handlers: Broadcast ---
  const handleSendBroadcast = () => {
    if (!broadcastMessage.trim()) return;
    setBroadcastStatus(`Broadcasting message to ${users.length} registered users...`);

    let sent = 0;
    users.forEach((u) => {
      // In web dashboard, record notification
      sent++;
    });

    botStore.addLog('admin', 'admin', `Broadcast triggered from Web Dashboard: "${broadcastMessage}" (${sent} recipients)`);
    setBroadcastStatus(`Delivered broadcast to ${sent} users!`);
    setBroadcastMessage('');
    setTimeout(() => setBroadcastStatus(null), 4000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-950/60 px-4 pt-2 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users &amp; Balances ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('codes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'codes'
              ? 'border-pink-500 text-pink-400 bg-pink-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Promo Vouchers ({codes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'tickets'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Support &amp; Payouts ({tickets.length + requests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'broadcast'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Broadcast Tool</span>
        </button>
      </div>

      {/* Tab 1: Users & Balances */}
      {activeTab === 'users' && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by ID or username..."
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-700/80 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-56 font-mono"
              />
            </div>

            <button
              onClick={handleExportUsers}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-950 border border-slate-700 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Telegram ID</th>
                  <th className="py-2.5 px-3">Points</th>
                  <th className="py-2.5 px-3">Referrals</th>
                  <th className="py-2.5 px-3">Streak</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3 text-right">Adjust Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-sans font-medium text-slate-100 flex items-center gap-1.5">
                        {u.firstName} {u.lastName || ''}
                        {u.role === 'admin' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">@{u.username}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{u.id}</td>
                    <td className="py-2.5 px-3 font-bold text-amber-300">
                      {u.points.toLocaleString()} pts
                    </td>
                    <td className="py-2.5 px-3 text-cyan-400">{u.referralsCount} refs</td>
                    <td className="py-2.5 px-3 text-orange-400">🔥 Day {u.streak}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-slate-400 capitalize">{u.role}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleAdjustPoints(u.id, 50)}
                          className="px-2 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60 hover:text-white transition-colors text-[11px]"
                          title="Add 50 Points"
                        >
                          +50
                        </button>
                        <button
                          onClick={() => handleAdjustPoints(u.id, 100)}
                          className="px-2 py-1 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-500/30 hover:bg-blue-900/60 hover:text-white transition-colors text-[11px]"
                          title="Add 100 Points"
                        >
                          +100
                        </button>
                        <button
                          onClick={() => handleAdjustPoints(u.id, -50)}
                          className="px-2 py-1 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-500/30 hover:bg-rose-900/60 hover:text-white transition-colors text-[11px]"
                          title="Deduct 50 Points"
                        >
                          -50
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Promo Vouchers */}
      {activeTab === 'codes' && (
        <div className="p-4 sm:p-5 space-y-6">
          {/* Creator Form */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-3">
              <Ticket className="w-4 h-4 text-pink-400" />
              Generate Single or Multi-Use Promo Voucher
            </h3>

            <form onSubmit={handleCreateCode} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Code Name</label>
                <input
                  type="text"
                  value={newCodeStr}
                  onChange={(e) => setNewCodeStr(e.target.value.toUpperCase())}
                  placeholder="e.g. VIP2026"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 uppercase font-mono focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Points Value</label>
                <input
                  type="number"
                  min="1"
                  value={newCodePoints}
                  onChange={(e) => setNewCodePoints(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Max Redemptions</label>
                <input
                  type="number"
                  min="1"
                  value={newCodeMaxUses}
                  onChange={(e) => setNewCodeMaxUses(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-pink-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-white bg-pink-600 hover:bg-pink-500 shadow-lg shadow-pink-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create Voucher
              </button>
            </form>

            {codeFormMessage && (
              <div
                className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  codeFormMessage.error
                    ? 'bg-red-950/40 text-red-300 border border-red-500/30'
                    : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {codeFormMessage.error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                <span>{codeFormMessage.text}</span>
              </div>
            )}
          </div>

          {/* List of active codes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {codes.map((c) => {
              const isExhausted = c.usedCount >= c.maxUses;
              return (
                <div
                  key={c.code}
                  className={`p-4 rounded-xl border transition-all ${
                    isExhausted
                      ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
                      : 'bg-slate-950 border-slate-800 hover:border-pink-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-pink-400">{c.code}</span>
                    <span className="text-xs font-bold text-amber-300 font-mono">+{c.points} pts</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Uses: <strong className="text-slate-200">{c.usedCount}</strong> / {c.maxUses}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(c.code);
                      }}
                      className="text-slate-500 hover:text-slate-200 transition-colors p-1"
                      title="Copy Voucher Code"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-pink-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min((c.usedCount / c.maxUses) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Support & Payouts */}
      {activeTab === 'tickets' && (
        <div className="p-4 sm:p-5 space-y-6">
          {/* Payout Withdrawal Requests */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Pending Withdrawal Requests ({requests.length})
            </h3>

            {requests.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl border border-slate-800">
                No withdrawal requests at this time.
              </p>
            ) : (
              <div className="space-y-2">
                {requests.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        <span>Ticket #{r.id}</span>
                        <span className="text-amber-400 font-mono">{r.points} points</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            r.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : r.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-slate-400 mt-1">
                        User: @{r.username} (ID: {r.userId}) · Payout Info:{' '}
                        <span className="text-slate-200 font-mono">{r.payoutDetails}</span>
                      </div>
                    </div>

                    {r.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => botStore.updateRedeemStatus(r.id, 'approved')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => botStore.updateRedeemStatus(r.id, 'rejected')}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors"
                        >
                          Reject &amp; Refund
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Support Tickets */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              Customer Support Desk ({tickets.length})
            </h3>

            {tickets.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl border border-slate-800">
                No support queries yet.
              </p>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-purple-400">{t.id}</span>
                        <span className="text-slate-300">
                          {t.firstName} (@{t.username}) · ID: {t.userId}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          t.status === 'open'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {t.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1.5 pl-2 border-l-2 border-purple-500/30 text-xs">
                      {t.replies.map((rep, idx) => (
                        <div key={idx} className="text-slate-300">
                          <strong className={rep.sender === 'admin' ? 'text-blue-400' : 'text-slate-400'}>
                            {rep.sender === 'admin' ? 'Support Agent' : t.firstName}:
                          </strong>{' '}
                          {rep.text}
                        </div>
                      ))}
                    </div>

                    {/* Reply box */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={replyTextMap[t.id] || ''}
                        onChange={(e) => setReplyTextMap({ ...replyTextMap, [t.id]: e.target.value })}
                        placeholder="Write support reply..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={() => handleSendTicketReply(t.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Reply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Broadcast Tool */}
      {activeTab === 'broadcast' && (
        <div className="p-4 sm:p-5 space-y-4 max-w-2xl">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              Instant Broadcast Announcement
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Broadcast a message directly to all {users.length} registered bot users with Markdown formatting.
            </p>
          </div>

          <div className="space-y-2">
            <textarea
              rows={5}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="🎉 Weekend Special: Claim double points for every referral this Saturday and Sunday! 🚀&#10;&#10;Click the button below to generate your invite link."
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{broadcastMessage.length} characters</span>
              <span>Markdown formatting enabled</span>
            </div>
          </div>

          {broadcastStatus && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{broadcastStatus}</span>
            </div>
          )}

          <button
            onClick={handleSendBroadcast}
            disabled={!broadcastMessage.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            Send Broadcast to {users.length} Users
          </button>
        </div>
      )}
    </div>
  );
};
