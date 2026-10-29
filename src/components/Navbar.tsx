import React from 'react';
import {
  Play,
  Square,
  RotateCw,
  Settings,
  Smartphone,
  Bot,
  Database,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { BotStatus, BotInfo } from '../types';

interface NavbarProps {
  status: BotStatus;
  botInfo: BotInfo | null;
  isSimulatorOpen: boolean;
  onToggleSimulator: () => void;
  onOpenSecrets: () => void;
  onStartBot: () => void;
  onStopBot: () => void;
  onRestartBot: () => void;
  onResetDatabase: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  botInfo,
  isSimulatorOpen,
  onToggleSimulator,
  onOpenSecrets,
  onStartBot,
  onStopBot,
  onRestartBot,
  onResetDatabase,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Bot Info */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
            <Bot className="w-5 h-5" />
            {status === 'ONLINE' && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-100 tracking-tight">
                GrammY Bot Runner
              </h1>
              {/* Status Badge */}
              {status === 'ONLINE' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  ONLINE
                </span>
              )}
              {status === 'CONNECTING' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <RotateCw className="w-3 h-3 animate-spin" />
                  CONNECTING
                </span>
              )}
              {status === 'STOPPED' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  STOPPED
                </span>
              )}
              {status === 'ERROR' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                  ERROR
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              {botInfo?.username ? (
                <a
                  href={`https://t.me/${botInfo.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-400 transition-colors flex items-center gap-1 font-mono"
                >
                  @{botInfo.username}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-500">Long Polling Dashboard</span>
              )}
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 font-mono text-[11px]">grammY v1.46</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Polling Start/Stop Toggles */}
          {status === 'ONLINE' ? (
            <button
              onClick={onStopBot}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-300 bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/50 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
              title="Stop Telegram Long-Polling"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Bot
            </button>
          ) : (
            <button
              onClick={onStartBot}
              disabled={status === 'CONNECTING'}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              title="Start Telegram Long-Polling"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Bot
            </button>
          )}

          <button
            onClick={onRestartBot}
            className="p-2 rounded-xl text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-700/80 hover:bg-slate-800 transition-colors"
            title="Restart Bot Engine"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Toggle Simulator */}
          <button
            onClick={onToggleSimulator}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
              isSimulatorOpen
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Chat Simulator</span>
          </button>

          {/* Edit Secrets */}
          <button
            onClick={onOpenSecrets}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 transition-all flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-blue-400" />
            <span>⚙️ Edit Secrets</span>
          </button>

          {/* Reset DB */}
          <button
            onClick={onResetDatabase}
            className="p-2 rounded-xl text-xs text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 hover:border-rose-800 transition-colors"
            title="Reset Database to Seed State"
          >
            <Database className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
