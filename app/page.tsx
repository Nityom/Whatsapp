'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  MapPin, 
  RotateCcw, 
  Copy, 
  Check, 
  Smartphone, 
  Server, 
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  isLocation?: boolean;
}

interface SessionState {
  phoneNumber: string;
  currentStep: string;
  date?: string;
  pickupTime?: string;
  returnTime?: string;
  latitude?: number;
  longitude?: number;
  selectedScooter?: string;
  scooterPrice?: string;
  customerName?: string;
  lastUpdated?: number;
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('919876543210');
  const [session, setSession] = useState<SessionState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [origin, setOrigin] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const copyToClipboard = (text: string, type: 'token' | 'url') => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const sendMessage = async (
    textToSend?: string, 
    type: 'text' | 'location' = 'text', 
    locationCoords?: { latitude: number; longitude: number }
  ) => {
    const content = textToSend !== undefined ? textToSend : inputText;
    if (!content.trim() && type === 'text') return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: type === 'location' ? '📍 Shared Location: Pune, Maharashtra (18.5590° N, 73.7868° E)' : content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isLocation: type === 'location',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (type === 'text') {
      setInputText('');
    }
    setIsLoading(true);

    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          type,
          text: type === 'text' ? content : undefined,
          latitude: locationCoords?.latitude,
          longitude: locationCoords?.longitude,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
        setSession(data.session);
      }
    } catch (err) {
      console.error('Failed to simulate message', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', phoneNumber }),
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to reset session', err);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: '👋 Hi', text: 'Hi' },
    { label: '1️⃣ Book (Option 1)', text: '1' },
    { label: '📅 25 September', text: '25 September' },
    { label: '🕙 10 AM', text: '10 AM' },
    { label: '🕙 8 PM', text: '8 PM' },
    { 
      label: '📍 Share Location (Baner)', 
      isLoc: true, 
      lat: 18.5590, 
      lng: 73.7868 
    },
    { label: '🛵 Select Activa 6G (1)', text: '1' },
    { label: '👤 Rahul Sharma', text: 'Rahul Sharma' },
    { label: '✅ CONFIRM', text: 'CONFIRM' },
  ];

  const otherMenuActions = [
    { label: '💰 Check Prices (2)', text: '2' },
    { label: '📋 My Booking (3)', text: '3' },
    { label: '👨💼 Support (4)', text: '4' },
  ];

  const callbackUrl = `${origin || 'https://YOUR-DOMAIN'}/api/whatsapp/webhook`;
  const verifyToken = 'scooty_ai_verify_2026';

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xl shadow-xs">
              🛵
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">ScootyGo Rentals</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium border border-emerald-200">
                  Pune, MH
                </span>
              </div>
              <p className="text-xs text-slate-500">WhatsApp Business Cloud API Webhook Integration Demo</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-[11px] sm:text-xs">/api/whatsapp/webhook</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Token: {verifyToken}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left: WhatsApp Chat Simulator */}
        <section className="lg:col-span-7 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* WhatsApp Chat Top Header */}
          <div className="bg-[#008069] px-4 py-3 flex items-center justify-between text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-base shadow-inner">
                🛵
              </div>
              <div>
                <h2 className="font-semibold text-sm leading-tight">ScootyGo Rentals</h2>
                <p className="text-xs text-emerald-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                  Official WhatsApp Business Account
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors border border-white/20"
              title="Reset conversation state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Chat</span>
            </button>
          </div>

          {/* Quick Demo Step Buttons */}
          <div className="bg-slate-50 border-b border-slate-200 p-2.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium px-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Flow Steps:
            </span>
            {quickActions.map((qa, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => {
                  if (qa.isLoc) {
                    sendMessage('', 'location', { latitude: qa.lat!, longitude: qa.lng! });
                  } else {
                    sendMessage(qa.text);
                  }
                }}
                className="px-2.5 py-1 rounded-md bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition-colors shadow-2xs font-medium disabled:opacity-50"
              >
                {qa.label}
              </button>
            ))}
          </div>

          {/* Secondary Menu Buttons */}
          <div className="bg-slate-100/70 border-b border-slate-200 px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium px-1 text-[11px]">Menu Shortcuts:</span>
            {otherMenuActions.map((oa, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => sendMessage(oa.text)}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-[11px] transition-colors"
              >
                {oa.label}
              </button>
            ))}
          </div>

          {/* WhatsApp Authentic Chat Body */}
          <div 
            className="flex-1 p-4 overflow-y-auto min-h-[380px] max-h-[500px] flex flex-col gap-3 bg-[#efeae2]"
            style={{
              backgroundImage: 'radial-gradient(#00000009 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          >
            {messages.length === 0 ? (
              <div className="m-auto text-center p-6 max-w-sm bg-white/80 backdrop-blur-xs rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3 text-2xl">
                  💬
                </div>
                <h3 className="font-semibold text-slate-800 mb-1 text-sm">WhatsApp Chat Simulator</h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Start by clicking <span className="text-emerald-700 font-semibold">&ldquo;Hi&rdquo;</span> or use the quick buttons above to walk through the complete 9-step booking demo.
                </p>
                <button
                  onClick={() => sendMessage('Hi')}
                  className="px-4 py-2 rounded-xl bg-[#008069] hover:bg-[#00705c] text-white text-xs font-medium shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Start with &ldquo;Hi&rdquo;</span>
                </button>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3.5 py-2 text-sm whitespace-pre-line shadow-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none'
                        : 'bg-white text-[#111b21] rounded-tl-none border border-slate-100'
                    }`}
                  >
                    {m.text}
                    <div
                      className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${
                        m.sender === 'user' ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      <span>{m.timestamp}</span>
                      {m.sender === 'user' && (
                        <span className="text-[#53bdeb] font-bold">✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-center gap-1.5 text-slate-500 text-xs py-1.5 px-3 bg-white rounded-full w-fit shadow-2xs border border-slate-100">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]"></div>
                <span className="ml-1 text-[11px] text-slate-600">ScootyGo is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-[#f0f2f5] border-t border-slate-200 flex items-center gap-2">
            <button
              onClick={() => sendMessage('', 'location', { latitude: 18.5590, longitude: 73.7868 })}
              title="Simulate WhatsApp Location Attachment"
              className="p-2.5 rounded-lg bg-white hover:bg-slate-50 text-emerald-700 border border-slate-200 transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer shadow-2xs"
            >
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Location</span>
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type message (e.g. Hi, 1, 25 September, CONFIRM)..."
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 shadow-2xs"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 rounded-lg bg-[#008069] hover:bg-[#00705c] text-white disabled:opacity-40 transition-colors shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Right: Session Inspector & Meta Configuration */}
        <section className="lg:col-span-5 flex flex-col gap-5">
          {/* Session State Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                In-Memory Session State
              </h2>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Demo Only (No DB)
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs font-mono space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Current Step:</span>
                <span className="text-emerald-700 font-bold">{session?.currentStep || 'WELCOME'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Phone:</span>
                <span className="text-slate-800 font-medium">+{phoneNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Selected Scooter:</span>
                <span className="text-slate-800">{session?.selectedScooter || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Date:</span>
                <span className="text-slate-800">{session?.date || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Pickup Time:</span>
                <span className="text-slate-800">{session?.pickupTime || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Return Time:</span>
                <span className="text-slate-800">{session?.returnTime || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Location:</span>
                <span className="text-slate-800">
                  {session?.latitude ? `${session.latitude}, ${session.longitude}` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Name:</span>
                <span className="text-slate-800">{session?.customerName || '—'}</span>
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-between text-xs">
              <span className="text-slate-500">Simulate Phone:</span>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-right text-xs font-mono text-slate-800 w-36 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Meta Developer Webhook Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <Server className="w-4 h-4 text-emerald-600" />
                <h2 className="font-semibold text-sm text-slate-900">Meta Webhook Configuration</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Callback URL (Webhook URL):</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      readOnly
                      value={callbackUrl}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-emerald-800 text-[11px] truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(callbackUrl, 'url')}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                      title="Copy Callback URL"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Verify Token:</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      readOnly
                      value={verifyToken}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-amber-800 text-[11px] font-semibold"
                    />
                    <button
                      onClick={() => copyToClipboard(verifyToken, 'token')}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                      title="Copy Verify Token"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Meta Instructions */}
              <div className="mt-4 pt-4 border-t border-slate-200 text-xs space-y-2">
                <p className="font-semibold text-slate-800">Meta Developer Portal Steps:</p>
                <ol className="list-decimal list-inside text-slate-600 space-y-1.5 text-[11px] leading-relaxed">
                  <li>Go to <span className="font-medium text-slate-900">developers.facebook.com → WhatsApp → Configuration</span></li>
                  <li>Click <span className="font-medium text-slate-900">Edit</span> in the Webhooks box</li>
                  <li>Enter the <span className="text-emerald-700 font-mono font-medium">Callback URL</span></li>
                  <li>Enter Verify Token: <code className="bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded font-mono font-semibold">scooty_ai_verify_2026</code></li>
                  <li>Click <span className="font-medium text-slate-900">Verify and Save</span></li>
                  <li>Under Webhook fields, click <span className="font-medium text-slate-900">Manage</span> and subscribe to <code className="text-emerald-700 font-mono">messages</code></li>
                </ol>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" /> No AI • No DB • Pure Fixed Flow
              </span>
              <span className="text-emerald-700 font-semibold">GET & POST Ready</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
