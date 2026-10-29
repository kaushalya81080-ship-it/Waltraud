import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Key, Shield, HelpCircle, Check, RotateCcw, Play, Zap } from 'lucide-react';
import { BotSecrets } from '../types';
import { botStore, DEFAULT_SECRETS } from '../services/store';

interface SecretsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndLaunch: (secrets: BotSecrets) => void;
}

export const SecretsModal: React.FC<SecretsModalProps> = ({
  isOpen,
  onClose,
  onSaveAndLaunch,
}) => {
  const [showToken, setShowToken] = useState(false);
  const [form, setForm] = useState<BotSecrets>(DEFAULT_SECRETS);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      const current = botStore.getSecrets();
      setForm(current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!form.botToken.trim()) {
      errs.botToken = 'Bot Token is required to start the Telegram bot.';
    }

    if (!form.adminId.trim() || isNaN(Number(form.adminId))) {
      errs.adminId = 'Admin ID must be a numeric Telegram User ID (e.g., 8838351233).';
    }

    if (!form.supportChatId.trim()) {
      errs.supportChatId = 'Support Chat ID is required (use your Admin ID or a Group ID).';
    }

    if (form.pointsPerReferral <= 0) {
      errs.pointsPerReferral = 'Points per referral must be greater than 0.';
    }

    if (form.dailyCheckinPoints <= 0) {
      errs.dailyCheckinPoints = 'Daily check-in points must be greater than 0.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    botStore.saveSecrets(form);
    onSaveAndLaunch(form);
    onClose();
  };

  const handleResetDefaults = () => {
    setForm(DEFAULT_SECRETS);
    setErrors({});
  };

  const handleQuickSandboxDemo = () => {
    setForm({
      botToken: 'demo_token_sandbox_preview_bot',
      adminId: '8838351233',
      supportChatId: '8838351233',
      forceChannel: '@GrammyRewardsChannel',
      pointsPerReferral: 100,
      dailyCheckinPoints: 50,
      useProxy: true,
    });
    setErrors({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                Bot Secrets &amp; Credentials
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/50">
                  Local Storage Only
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sensitive tokens are stored only in your browser localStorage and never committed or logged.
              </p>
            </div>
          </div>
          {botStore.getIsConfigured() && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-sm px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Quick Sandbox Banner */}
          <div className="p-3.5 bg-blue-950/40 border border-blue-500/20 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-200">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>
                Don't have a live Telegram Bot Token right now? Use our zero-token instant simulator mode!
              </span>
            </div>
            <button
              type="button"
              onClick={handleQuickSandboxDemo}
              className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
            >
              Fill Demo Secrets
            </button>
          </div>

          {/* 1. BOT_TOKEN */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              1. BOT_TOKEN <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.botToken}
                onChange={(e) => setForm({ ...form, botToken: e.target.value })}
                placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ (from @BotFather)"
                className={`w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-950 border ${
                  errors.botToken ? 'border-red-500/80 focus:ring-red-500' : 'border-slate-700 focus:border-blue-500'
                } text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono`}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.botToken ? (
              <p className="mt-1 text-xs text-red-400">{errors.botToken}</p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Obtain a free token by messaging <span className="text-slate-300">@BotFather</span> on Telegram.
              </p>
            )}
          </div>

          {/* 2 & 3: ADMIN_ID & SUPPORT_CHAT_ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                2. ADMIN_ID <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.adminId}
                  onChange={(e) => setForm({ ...form, adminId: e.target.value })}
                  placeholder="8838351233"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border ${
                    errors.adminId ? 'border-red-500/80' : 'border-slate-700'
                  } text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono`}
                />
              </div>
              {errors.adminId ? (
                <p className="mt-1 text-xs text-red-400">{errors.adminId}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">Your numeric Telegram ID (from @userinfobot).</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                3. SUPPORT_CHAT_ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.supportChatId}
                onChange={(e) => setForm({ ...form, supportChatId: e.target.value })}
                placeholder="8838351233 or -100123456789"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border ${
                  errors.supportChatId ? 'border-red-500/80' : 'border-slate-700'
                } text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono`}
              />
              {errors.supportChatId ? (
                <p className="mt-1 text-xs text-red-400">{errors.supportChatId}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">Admin ID or Support Group ID to forward user tickets.</p>
              )}
            </div>
          </div>

          {/* 4. FORCE_CHANNEL */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              4. FORCE_CHANNEL (Optional)
            </label>
            <input
              type="text"
              value={form.forceChannel}
              onChange={(e) => setForm({ ...form, forceChannel: e.target.value })}
              placeholder="@MyChannel"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Users must join this channel before accessing features. Leave empty or set channel name.
            </p>
          </div>

          {/* 5 & 6: POINTS_PER_REFERRAL & DAILY_CHECKIN_POINTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                5. POINTS_PER_REFERRAL
              </label>
              <input
                type="number"
                min="1"
                value={form.pointsPerReferral}
                onChange={(e) => setForm({ ...form, pointsPerReferral: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-500">Default: 100 points per invited user.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                6. DAILY_CHECKIN_POINTS
              </label>
              <input
                type="number"
                min="1"
                value={form.dailyCheckinPoints}
                onChange={(e) => setForm({ ...form, dailyCheckinPoints: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-500">Default: 50 points per 24 hours.</p>
            </div>
          </div>

          {/* Reverse Proxy Option */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Browser CORS Proxy Support
              </div>
              <p className="text-[11px] text-slate-400">
                Routes Telegram API requests through <code>/tg-api</code> to bypass browser CORS limits.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.useProxy}
                onChange={(e) => setForm({ ...form, useProxy: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>

            <div className="flex items-center gap-2">
              {botStore.getIsConfigured() && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Save &amp; Launch Bot
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
