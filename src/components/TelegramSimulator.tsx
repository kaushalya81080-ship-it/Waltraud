import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  User,
  ShieldCheck,
  Bot as BotIcon,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { botStore } from '../services/store';
import { botRunner } from '../services/botEngine';
import { SimulatedMessage, BotInfo } from '../types';

interface TelegramSimulatorProps {
  adminId: string;
  botInfo: BotInfo | null;
}

interface SimUser {
  id: number;
  username: string;
  firstName: string;
  role: 'user' | 'admin';
}

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({
  adminId,
  botInfo,
}) => {
  const adminIdNum = parseInt(adminId, 10) || 8838351233;

  const SIM_USERS: SimUser[] = [
    { id: 1001001, username: 'cryptofan', firstName: 'Elena', role: 'user' },
    { id: 2002002, username: 'alex_crypto', firstName: 'Alex', role: 'user' },
    { id: adminIdNum, username: 'super_admin', firstName: 'Chief Admin', role: 'admin' },
  ];

  const [activeUser, setActiveUser] = useState<SimUser>(SIM_USERS[0]);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<SimulatedMessage[]>(botStore.getSimulatedMessages());
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = botStore.subscribe(() => {
      setMessages([...botStore.getSimulatedMessages()]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message from simulated user to bot
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    if (!textToSend) {
      setInputText('');
    }

    // Add user message to simulator
    botStore.addSimulatedMessage({
      chatId: activeUser.id,
      sender: 'user',
      text,
    });

    // Package real Telegram Update object for grammY
    const update = {
      update_id: Date.now() % 1000000,
      message: {
        message_id: Math.floor(Math.random() * 10000),
        from: {
          id: activeUser.id,
          is_bot: false,
          first_name: activeUser.firstName,
          username: activeUser.username,
        },
        chat: {
          id: activeUser.id,
          type: 'private',
          first_name: activeUser.firstName,
          username: activeUser.username,
        },
        date: Math.floor(Date.now() / 1000),
        text,
      },
    };

    await botRunner.dispatchUpdate(update);
  };

  // Handle inline keyboard button click
  const handleCallbackClick = async (callbackData: string, btnText: string) => {
    if (callbackData.includes('spin') || callbackData.includes('checkin')) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    }

    // Add click event in console
    botStore.addLog('callback', 'simulator', `Inline Button Click: "${btnText}" [${callbackData}] by User ${activeUser.id}`);

    // Package Telegram callback_query update
    const update = {
      update_id: Date.now() % 1000000,
      callback_query: {
        id: `cbq_${Date.now()}`,
        from: {
          id: activeUser.id,
          is_bot: false,
          first_name: activeUser.firstName,
          username: activeUser.username,
        },
        message: {
          message_id: Math.floor(Math.random() * 10000),
          chat: {
            id: activeUser.id,
            type: 'private',
            first_name: activeUser.firstName,
            username: activeUser.username,
          },
          date: Math.floor(Date.now() / 1000),
          text: `[Active Menu]`,
        },
        data: callbackData,
      },
    };

    await botRunner.dispatchUpdate(update);
  };

  return (
    <div className="flex flex-col h-[700px] w-full max-w-md mx-auto bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden">
      {/* Telegram Phone Header */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-md">
            <BotIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-100">
                {botInfo?.first_name || 'Grammy Bot'}
              </h3>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              @{botInfo?.username || 'GrammyRewardsBot'} · bot
            </p>
          </div>
        </div>

        {/* User Identity Switcher */}
        <div className="flex items-center gap-1.5">
          <select
            value={activeUser.id}
            onChange={(e) => {
              const u = SIM_USERS.find((x) => String(x.id) === e.target.value) || SIM_USERS[0];
              setActiveUser(u);
            }}
            className="text-[11px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
          >
            {SIM_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.role === 'admin' ? '👑 Admin' : '👤 User'}: {u.firstName}
              </option>
            ))}
          </select>

          <button
            onClick={() => botStore.clearSimulatedMessages()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Simulator Quick Action Pills */}
      <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] custom-scrollbar">
        <span className="text-slate-500 text-[10px] uppercase font-semibold">Test:</span>
        <button
          onClick={() => handleSendMessage('/start')}
          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors whitespace-nowrap"
        >
          /start
        </button>
        <button
          onClick={() => handleSendMessage('/start ref_1001001')}
          className="px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/40 font-mono transition-colors whitespace-nowrap"
        >
          Invite /ref_1001001
        </button>
        <button
          onClick={() => handleSendMessage('/admin')}
          className="px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 font-mono transition-colors whitespace-nowrap"
        >
          /admin
        </button>
        <button
          onClick={() => handleSendMessage('/help')}
          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors whitespace-nowrap"
        >
          /help
        </button>
      </div>

      {/* Chat Messages Body */}
      <div
        ref={chatScrollRef}
        className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-gradient-to-b from-slate-950 to-slate-900 custom-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <Sparkles className="w-8 h-8 text-blue-400 opacity-60" />
            <div className="text-xs font-semibold text-slate-300">Telegram Web Simulator</div>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Click <code>/start</code> above or type a message below to test the bot's inline keyboards and logic right in your browser!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-md text-xs ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-800/95 text-slate-100 rounded-bl-none border border-slate-700/60'
                  }`}
                >
                  {/* Message Text with markdown formatting support */}
                  <div className="whitespace-pre-wrap leading-relaxed select-text">
                    {msg.text}
                  </div>

                  <div
                    className={`mt-1 text-[10px] text-right font-mono ${
                      isUser ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {timeStr}
                  </div>
                </div>

                {/* Inline Keyboards Rendering */}
                {msg.replyMarkup?.inline_keyboard && (
                  <div className="mt-2 w-full max-w-[85%] space-y-1.5">
                    {msg.replyMarkup.inline_keyboard.map((row, rIdx) => (
                      <div key={rIdx} className="flex gap-1.5">
                        {row.map((btn, bIdx) => {
                          if (btn.url) {
                            return (
                              <a
                                key={bIdx}
                                href={btn.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/90 text-blue-400 hover:text-blue-300 border border-slate-700 text-xs font-medium text-center transition-all flex items-center justify-center gap-1 shadow-sm"
                              >
                                <span>{btn.text}</span>
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              </a>
                            );
                          }

                          return (
                            <button
                              key={bIdx}
                              onClick={() => handleCallbackClick(btn.callback_data || '', btn.text)}
                              className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-blue-600/30 active:bg-blue-600 text-slate-200 hover:text-white border border-slate-700/80 hover:border-blue-500/50 text-xs font-medium text-center transition-all shadow-sm"
                            >
                              {btn.text}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Chat Input Bar */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message as @${activeUser.username}...`}
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
