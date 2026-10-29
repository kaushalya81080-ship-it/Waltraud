import React, { useState, useEffect } from 'react';
import { botStore } from './services/store';
import { botRunner } from './services/botEngine';
import { Navbar } from './components/Navbar';
import { MetricsBar } from './components/MetricsBar';
import { ConsoleView } from './components/ConsoleView';
import { DashboardTabs } from './components/DashboardTabs';
import { TelegramSimulator } from './components/TelegramSimulator';
import { SecretsModal } from './components/SecretsModal';
import { BotSecrets } from './types';

export default function App() {
  const [secretsModalOpen, setSecretsModalOpen] = useState<boolean>(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(true);
  const [storeState, setStoreState] = useState(() => ({
    secrets: botStore.getSecrets(),
    status: botStore.getBotStatus(),
    botInfo: botStore.getBotInfo(),
    logs: botStore.getLogs(),
    stats: botStore.getStats(),
    users: botStore.getUsers(),
    tickets: botStore.getTickets(),
    codes: botStore.getRedeemCodes(),
    requests: botStore.getRedeemRequests(),
    isConfigured: botStore.getIsConfigured(),
  }));

  // Synchronize with BotStore events
  useEffect(() => {
    const unsubscribe = botStore.subscribe(() => {
      setStoreState({
        secrets: botStore.getSecrets(),
        status: botStore.getBotStatus(),
        botInfo: botStore.getBotInfo(),
        logs: [...botStore.getLogs()],
        stats: botStore.getStats(),
        users: [...botStore.getUsers()],
        tickets: [...botStore.getTickets()],
        codes: [...botStore.getRedeemCodes()],
        requests: [...botStore.getRedeemRequests()],
        isConfigured: botStore.getIsConfigured(),
      });
    });

    // Check if secrets are not set in localStorage:
    // If not set, requirement: "automatically pop up a dedicated 'Bot Secrets & Credentials' Modal immediately upon loading"
    if (!botStore.getIsConfigured()) {
      setSecretsModalOpen(true);
    } else {
      // If already configured, try starting the bot
      botRunner.startPolling().catch((e) => {
        console.warn('Auto start polling note:', e);
      });
    }

    return () => {
      unsubscribe();
      botRunner.stopPolling();
    };
  }, []);

  const handleSaveAndLaunch = async (secrets: BotSecrets) => {
    try {
      await botRunner.stopPolling();
      await botRunner.startPolling();
    } catch (e: any) {
      botStore.addLog('error', 'system', `Launch failure: ${e.message || e}`);
    }
  };

  const handleStartBot = async () => {
    if (!botStore.getIsConfigured()) {
      setSecretsModalOpen(true);
      return;
    }
    try {
      await botRunner.startPolling();
    } catch (e: any) {
      botStore.addLog('error', 'system', `Start failure: ${e.message || e}`);
    }
  };

  const handleStopBot = async () => {
    await botRunner.stopPolling();
  };

  const handleRestartBot = async () => {
    await botRunner.restartPolling();
  };

  const handleResetDatabase = () => {
    if (window.confirm('Reset all user balances, tickets, and promo vouchers to demo state?')) {
      botStore.resetAllData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Navbar */}
      <Navbar
        status={storeState.status}
        botInfo={storeState.botInfo}
        isSimulatorOpen={isSimulatorOpen}
        onToggleSimulator={() => setIsSimulatorOpen(!isSimulatorOpen)}
        onOpenSecrets={() => setSecretsModalOpen(true)}
        onStartBot={handleStartBot}
        onStopBot={handleStopBot}
        onRestartBot={handleRestartBot}
        onResetDatabase={handleResetDatabase}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* 2. Top Metrics Bar */}
        <MetricsBar stats={storeState.stats} status={storeState.status} />

        {/* 3. Main Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Console & Management Tabs */}
          <div
            className={`space-y-6 transition-all ${
              isSimulatorOpen ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'
            }`}
          >
            {/* Live Streaming Console */}
            <ConsoleView
              logs={storeState.logs}
              onClear={() => botStore.clearLogs()}
            />

            {/* Dashboard Tabs (Users, Codes, Support, Broadcast) */}
            <DashboardTabs
              users={storeState.users}
              tickets={storeState.tickets}
              codes={storeState.codes}
              requests={storeState.requests}
              adminId={storeState.secrets.adminId}
            />
          </div>

          {/* Right Column: Telegram Web Simulator */}
          {isSimulatorOpen && (
            <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
              <TelegramSimulator
                adminId={storeState.secrets.adminId}
                botInfo={storeState.botInfo}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          GrammY Bot Runner &amp; Live Activity Dashboard · Powered by ESM grammY &amp; Telegram Bot API · All credentials stored securely in browser localStorage
        </p>
      </footer>

      {/* 4. Interactive Secrets Popup Modal */}
      <SecretsModal
        isOpen={secretsModalOpen}
        onClose={() => setSecretsModalOpen(false)}
        onSaveAndLaunch={handleSaveAndLaunch}
      />
    </div>
  );
}
