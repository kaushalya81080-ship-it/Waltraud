import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Trash2,
  Download,
  Search,
  Filter,
  ArrowDown,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { LogEntry, LogLevel } from '../types';

interface ConsoleViewProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({ logs, onClear }) => {
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all') {
      if (filterLevel === 'callbacks' && log.level !== 'callback') return false;
      if (filterLevel === 'admin' && log.level !== 'admin') return false;
      if (filterLevel === 'outbound' && log.level !== 'outbound') return false;
      if (filterLevel === 'errors' && log.level !== 'error') return false;
      if (filterLevel === 'info' && log.level !== 'info' && log.level !== 'success') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchSource = log.source.toLowerCase().includes(q);
      const matchDetails = log.details ? JSON.stringify(log.details).toLowerCase().includes(q) : false;
      if (!matchMsg && !matchSource && !matchDetails) return false;
    }

    return true;
  });

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `grammy-bot-logs-${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getBadgeStyle = (level: LogLevel) => {
    switch (level) {
      case 'success':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'error':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'warn':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'callback':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'admin':
        return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30';
      case 'outbound':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Console Top Toolbar */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">
            Streaming Console &amp; Activity Log
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            ({filteredLogs.length}/{logs.length} events)
          </span>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-36 sm:w-44 font-mono"
            />
          </div>

          {/* Level Filter Dropdown */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700/80 text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="callbacks">Callbacks Only</option>
            <option value="outbound">Outbound API</option>
            <option value="admin">Admin Events</option>
            <option value="errors">Errors Only</option>
          </select>

          {/* Auto-scroll button */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
              autoScroll
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-700'
            }`}
            title="Auto-scroll to latest"
          >
            <ArrowDown className="w-3 h-3" />
            Auto
          </button>

          {/* Export */}
          <button
            onClick={handleExportLogs}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-700/80 hover:bg-slate-800 transition-colors"
            title="Export JSON Logs"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear */}
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-950 border border-slate-700/80 hover:bg-slate-800 transition-colors"
            title="Clear Console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 p-3.5 font-mono text-xs overflow-y-auto space-y-2 custom-scrollbar min-h-[320px] max-h-[500px] select-text">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 space-y-2">
            <Terminal className="w-8 h-8 opacity-40" />
            <span>No log events match your filter</span>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString();
            const isExpanded = expandedLogId === log.id;

            return (
              <div
                key={log.id}
                className="group flex flex-col p-2 rounded-lg bg-slate-900/50 hover:bg-slate-900/90 border border-slate-800/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-500">{timeStr}</span>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getBadgeStyle(
                        log.level
                      )}`}
                    >
                      {log.level.toUpperCase()}
                    </span>

                    <span className="text-[10px] text-slate-400 px-1 py-0.5 rounded bg-slate-800/80">
                      {log.source}
                    </span>

                    <span className="text-slate-200 break-words">{log.message}</span>
                  </div>

                  {log.details && (
                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {log.details && isExpanded && (
                  <div className="mt-2 p-2.5 rounded bg-black/60 border border-slate-800 overflow-x-auto text-[11px] text-slate-300">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
};
