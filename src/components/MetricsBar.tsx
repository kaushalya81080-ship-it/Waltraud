import React from 'react';
import { Users, UserPlus, Coins, MessageSquare, Ticket, Activity } from 'lucide-react';
import { BotStatus } from '../types';

interface MetricsBarProps {
  stats: {
    totalUsers: number;
    totalPoints: number;
    totalReferrals: number;
    openTickets: number;
    activeCodes: number;
    pendingWithdrawals: number;
  };
  status: BotStatus;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ stats, status }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Polling Status */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Bot Status
          </span>
          <div className="mt-1 flex items-center gap-1.5 font-bold text-sm">
            {status === 'ONLINE' && <span className="text-emerald-400">ONLINE</span>}
            {status === 'CONNECTING' && <span className="text-amber-400">SYNCING</span>}
            {status === 'STOPPED' && <span className="text-rose-400">STOPPED</span>}
            {status === 'ERROR' && <span className="text-red-400">ERROR</span>}
          </div>
        </div>
        <div
          className={`p-2 rounded-lg ${
            status === 'ONLINE'
              ? 'bg-emerald-500/10 text-emerald-400'
              : status === 'CONNECTING'
              ? 'bg-amber-500/10 text-amber-400'
              : 'bg-rose-500/10 text-rose-400'
          }`}
        >
          <Activity className="w-4 h-4" />
        </div>
      </div>

      {/* 2. Total Users */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Total Users
          </span>
          <div className="mt-1 font-bold text-base text-slate-100 font-mono">
            {stats.totalUsers.toLocaleString()}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
          <Users className="w-4 h-4" />
        </div>
      </div>

      {/* 3. Total Referrals */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Referrals
          </span>
          <div className="mt-1 font-bold text-base text-cyan-400 font-mono">
            {stats.totalReferrals.toLocaleString()}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
          <UserPlus className="w-4 h-4" />
        </div>
      </div>

      {/* 4. Total Points */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Points Issued
          </span>
          <div className="mt-1 font-bold text-base text-amber-300 font-mono">
            {stats.totalPoints.toLocaleString()}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
          <Coins className="w-4 h-4" />
        </div>
      </div>

      {/* 5. Open Tickets */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Open Tickets
          </span>
          <div className="mt-1 font-bold text-base text-purple-400 font-mono">
            {stats.openTickets}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
          <MessageSquare className="w-4 h-4" />
        </div>
      </div>

      {/* 6. Active Promo Vouchers */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Promo Codes
          </span>
          <div className="mt-1 font-bold text-base text-pink-400 font-mono">
            {stats.activeCodes}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
          <Ticket className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
