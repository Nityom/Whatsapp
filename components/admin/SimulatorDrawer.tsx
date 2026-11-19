'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  RotateCcw,
  Smartphone,
  Sparkles,
  MapPin,
  Bot,
  User,
  CheckCheck,
  AlertTriangle,
} from 'lucide-react';

interface SimulatorDrawerProps {
  onRefreshSessions?: () => void;
}

interface SimMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  interactive?: any;
}

export const SimulatorDrawer: React.FC<SimulatorDrawerProps> = ({ onRefreshSessions }) => {
  const [phoneNumber, setPhoneNumber] = useState('919373280505');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<SimMessage[]>([
    {
      id: 'init-1',
      sender: 'bot',
      text: '👋 *Welcome to Svaasth Connect*\n\nPlease select your preferred language / भाषा चुनें:',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      interactive: {
        kind: 'buttons',
        buttons: [
          { id: 'lang_en', title: '1. English' },
          { id: 'lang_hi', title: '2. हिन्दी' },
          { id: 'lang_mr', title: '3. मराठी' },
        ],
      },
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendToSimulator = async (payloadOrText: string, type = 'text', displayLabel?: string) => {
    if (!payloadOrText.trim() && type === 'text') return;
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    const userMsg: SimMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: displayLabel || payloadOrText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          phoneNumber: cleanPhone,
          text: payloadOrText,
          type,
        }),
      });

      const data = await res.json();
      if (data.success && data.reply) {
        const botMsg: SimMessage = {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          interactive: data.interactive,
        };
        setMessages((prev) => [...prev, botMsg]);
      }
      onRefreshSessions?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          phoneNumber: phoneNumber.replace(/\D/g, ''),
        }),
      });
      setMessages([
        {
          id: `reset-${Date.now()}`,
          sender: 'bot',
          text: '👋 *Welcome to Svaasth Connect*\n\nPlease select your preferred language / भाषा चुनें:',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          interactive: {
            kind: 'buttons',
            buttons: [
              { id: 'lang_en', title: '1. English' },
              { id: 'lang_hi', title: '2. हिन्दी' },
              { id: 'lang_mr', title: '3. मराठी' },
            ],
          },
        },
      ]);
      onRefreshSessions?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendLocation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          text: 'Patient shared live location',
          type: 'location',
          latitude: 20.7453,
          longitude: 78.5992,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `loc-${Date.now()}`,
            sender: 'user',
            text: '📍 Shared Location Pin (Wardha)',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          {
            id: `rep-${Date.now()}`,
            sender: 'bot',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
      onRefreshSessions?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#e2ece6]">
        <div>
          <h2 className="text-base font-semibold text-[#173d37]">
            Interactive WhatsApp simulator
          </h2>
          <p className="text-xs text-[#55776d] mt-0.5">
            Test the live WhatsApp AI state machine directly in the browser as a simulated patient.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#f8faf8] border border-[#dbe9e0] text-xs font-mono tabular-nums">
            <span className="text-[#77a193]">+</span>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="bg-transparent text-[#173d37] font-medium w-28 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="h-8 flex items-center gap-1.5 px-3 rounded-lg bg-white hover:bg-[#f8faf8] text-[#173d37] text-xs font-medium transition-colors border border-[#dbe9e0] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#55776d]" />
            <span>Reset chat</span>
          </button>
        </div>
      </div>

      {/* Simulator Device Frame */}
      <div className="max-w-md mx-auto bg-white border border-[#dbe9e0] rounded-2xl shadow-sm overflow-hidden flex flex-col h-[640px]">
        {/* Device Status Bar */}
        <div className="bg-[#176e56] text-white px-4 py-1.5 flex items-center justify-between text-[11px] font-medium">
          <span className="tabular-nums">9:41</span>
          <div className="flex items-center gap-1.5">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* WhatsApp Chat Header */}
        <div className="bg-[#176e56] text-white p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#f0f5f2] text-[#176e56] font-medium text-xs flex items-center justify-center">
            SC
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium truncate leading-tight">Svaasth Connect</h3>
            <p className="text-[11px] text-[#77d1a5] leading-tight">
              Virtual assistant • Online
            </p>
          </div>
        </div>

        {/* Quick Test Chips */}
        <div className="bg-[#f8faf8] px-3 py-1.5 border-b border-[#e2ece6] flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-[#55776d] shrink-0 font-medium">Quick:</span>
          <button
            type="button"
            onClick={() => sendToSimulator('lang_hi', 'interactive', '2. हिन्दी')}
            className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 font-semibold shrink-0 cursor-pointer shadow-2xs"
          >
            2. हिन्दी
          </button>
          <button
            type="button"
            onClick={() => sendToSimulator('lang_mr', 'interactive', '3. मराठी')}
            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 font-semibold shrink-0 cursor-pointer shadow-2xs"
          >
            3. मराठी
          </button>
          <button
            type="button"
            onClick={() => sendToSimulator('lang_en', 'interactive', '1. English')}
            className="px-2 py-0.5 rounded bg-white text-[#176e56] border border-[#dbe9e0] hover:bg-[#f0f5f2] shrink-0 cursor-pointer"
          >
            1. English
          </button>
          <button
            type="button"
            onClick={() => sendToSimulator('menu')}
            className="px-2 py-0.5 rounded bg-white text-[#176e56] border border-[#dbe9e0] hover:bg-[#f0f5f2] shrink-0 cursor-pointer"
          >
            Menu
          </button>
          <button
            type="button"
            onClick={() => sendToSimulator('menu_1', 'interactive', '1. अपॉइंटमेंट')}
            className="px-2 py-0.5 rounded bg-white text-[#176e56] border border-[#dbe9e0] hover:bg-[#f0f5f2] shrink-0 cursor-pointer"
          >
            1. Book
          </button>
          <button
            type="button"
            onClick={() => sendToSimulator('menu_3', 'interactive', '5. पर्चा')}
            className="px-2 py-0.5 rounded bg-white text-[#176e56] border border-[#dbe9e0] hover:bg-[#f0f5f2] shrink-0 cursor-pointer"
          >
            5. Prescription
          </button>
          <button
            type="button"
            onClick={handleSendLocation}
            className="px-2 py-0.5 rounded bg-white text-[#176e56] border border-[#dbe9e0] hover:bg-[#f0f5f2] flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <MapPin className="w-3 h-3" />
            <span>Location</span>
          </button>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#f8faf8]">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                    isUser
                      ? 'bg-[#dcf8c6] text-[#111b21] rounded-tr-xs shadow-2xs'
                      : 'bg-white text-[#111b21] border border-[#e2ece6] rounded-tl-xs shadow-2xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-500 tabular-nums">
                    <span>{m.timestamp}</span>
                    {isUser && <CheckCheck className="w-3 h-3 text-[#176e56]" />}
                  </div>
                </div>

                {/* Interactive buttons */}
                {m.interactive?.kind === 'buttons' && (
                  <div className="space-y-1 mt-1.5 max-w-[85%] w-full">
                    {m.interactive.buttons?.map((b: any) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => sendToSimulator(b.id || b.title, 'interactive', b.title)}
                        className="w-full py-1.5 px-3 rounded-lg bg-white border border-[#176e56] text-[#176e56] text-xs font-semibold hover:bg-[#f0f5f2] transition-colors text-center cursor-pointer shadow-2xs"
                      >
                        {b.title}
                      </button>
                    ))}
                  </div>
                )}

                {/* Interactive List Menu */}
                {m.interactive?.kind === 'list' && (
                  <div className="mt-2 space-y-1.5 max-w-[90%] w-full animate-in fade-in">
                    {m.interactive.buttonText && (
                      <div className="text-[11px] font-semibold text-[#176e56] bg-[#eaf5ef] px-2.5 py-1 rounded-md border border-[#cde3d6] flex items-center gap-1.5">
                        <span>📋</span>
                        <span>{m.interactive.buttonText}</span>
                      </div>
                    )}
                    {m.interactive.sections?.map((section: any, sIdx: number) => (
                      <div key={sIdx} className="space-y-1">
                        {section.title && (
                          <div className="text-[10px] font-medium text-[#55776d] px-1 uppercase tracking-wider">
                            {section.title}
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-1">
                          {section.rows?.map((row: any) => (
                            <button
                              key={row.id}
                              type="button"
                              onClick={() => sendToSimulator(row.id || row.title, 'interactive', row.title)}
                              className="w-full text-left p-2 rounded-lg bg-white border border-[#dbe9e0] hover:border-[#176e56] hover:bg-[#f0f5f2] transition-colors group cursor-pointer shadow-2xs"
                            >
                              <div className="text-xs font-semibold text-[#173d37] group-hover:text-[#176e56]">
                                {row.title}
                              </div>
                              {row.description && (
                                <div className="text-[11px] text-[#55776d] mt-0.5 leading-snug">
                                  {row.description}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div className="text-[11px] text-[#77a193] italic">
              Typing response...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendToSimulator(inputText);
          }}
          className="p-2.5 bg-white border-t border-[#e2ece6] flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Reply as patient..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 h-9 px-3 rounded-lg bg-[#f8faf8] border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#176e56]"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="h-9 w-9 rounded-lg bg-[#176e56] text-white flex items-center justify-center disabled:opacity-40 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

