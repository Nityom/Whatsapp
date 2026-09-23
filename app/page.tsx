'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  Send, 
  MapPin, 
  RotateCcw, 
  Copy, 
  Check, 
  Smartphone, 
  Server, 
  ShieldCheck,
  Database,
  Map as MapIcon,
  Info
} from 'lucide-react';
import type { LocationItem } from '@/components/LocationMap';

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-medium">
      Loading OpenStreetMap...
    </div>
  ),
});

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
  selectedVehicleId?: string;
  pickupLocationId?: string;
  bookingDraft?: {
    startDate?: string;
    pickupTime?: string;
    returnDate?: string;
    returnTime?: string;
    customerName?: string;
    customerLatitude?: number;
    customerLongitude?: number;
    distanceKm?: number;
    locationName?: string;
    locationAddress?: string;
    vehicleName?: string;
    vehiclePrice?: number;
  };
  lastUpdated?: number;
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('919876543210');
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load initial session and Pune locations
  useEffect(() => {
    fetchSession();
    fetchMapLocations();
  }, [phoneNumber]);

  async function fetchMapLocations() {
    try {
      const res = await fetch('/api/whatsapp/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error('Failed to load locations for map', err);
    }
  }

  async function fetchSession() {
    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_session', phoneNumber }),
      });
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
      }
    } catch (e) {
      console.error('Error fetching session:', e);
    }
  }

  async function handleSendMessage(customText?: string, isLoc = false, lat?: number, lon?: number) {
    const textToSend = customText ?? inputText;
    if (!textToSend.trim() && !isLoc) return;

    const userMsgId = `usr_${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add user message to UI
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: isLoc ? `📍 Shared Location (${lat}, ${lon})` : textToSend,
        timestamp,
        isLocation: isLoc,
      },
    ];
    setMessages(newMessages);
    if (!customText && !isLoc) setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          text: isLoc ? undefined : textToSend,
          type: isLoc ? 'location' : 'text',
          latitude: lat,
          longitude: lon,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: 'bot',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }

      if (data.nativeLocation) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_loc_${Date.now()}`,
            sender: 'bot',
            text: `📍 [Native WhatsApp Location Pin]\n${data.nativeLocation.name}\n${data.nativeLocation.address}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isLocation: true,
          },
        ]);
      }

      if (data.session) {
        setSession(data.session);
      }
    } catch (e) {
      console.error('Error sending simulated message:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSession() {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', phoneNumber }),
      });
      const data = await res.json();
      setSession(data.session);
      setMessages([]);
    } catch (e) {
      console.error('Error resetting session:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleShareLocation() {
    // Demo Pune customer location (Baner vicinity: 18.5620, 73.7900)
    handleSendMessage(undefined, true, 18.5620, 73.7900);
  }

  function copyToClipboard(text: string, isUrl: boolean) {
    navigator.clipboard.writeText(text);
    if (isUrl) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  }

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://YOUR-APP.vercel.app';
  const webhookUrl = `${currentOrigin}/api/whatsapp/webhook`;
  const verifyToken = 'scooty_ai_verify_2026';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Banner */}
      <header className="bg-[#008069] text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛵</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ScootyGo Rentals — Pune</h1>
              <p className="text-xs text-teal-100">
                Official WhatsApp Business Chatbot • Powered by Convex Database
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-100 border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Convex Database Connected
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive WhatsApp Light Simulator */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[740px]">
            {/* WhatsApp App Header (Authentic Light Style) */}
            <div className="bg-[#008069] text-white px-4 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-800/40 border border-white/20 flex items-center justify-center font-bold text-lg text-white">
                  🛵
                </div>
                <div>
                  <h2 className="font-semibold text-sm leading-tight">ScootyGo Rentals</h2>
                  <p className="text-[11px] text-teal-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-300"></span> Verified Business
                  </p>
                </div>
              </div>
              <button
                onClick={handleResetSession}
                title="Restart Chat Session"
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>

            {/* Quick Flow Presets */}
            <div className="bg-[#f0f2f5] px-3 py-2 border-b border-gray-200 flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-gray-500 font-medium whitespace-nowrap text-[11px]">Quick Tests:</span>
              <button
                onClick={() => handleSendMessage('Hi')}
                className="px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 rounded-md border border-gray-300 shadow-2xs whitespace-nowrap transition-all font-medium"
              >
                👋 "Hi"
              </button>
              <button
                onClick={() => handleSendMessage('1')}
                className="px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 rounded-md border border-gray-300 shadow-2xs whitespace-nowrap transition-all font-medium"
              >
                1️⃣ Book
              </button>
              <button
                onClick={() => handleSendMessage('20 October')}
                className="px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 rounded-md border border-gray-300 shadow-2xs whitespace-nowrap transition-all font-medium"
              >
                📅 20 October
              </button>
              <button
                onClick={handleShareLocation}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 shadow-2xs whitespace-nowrap transition-all font-medium flex items-center gap-1"
              >
                <MapPin className="w-3 h-3 text-emerald-600" /> Share Location
              </button>
              <button
                onClick={() => handleSendMessage('YES')}
                className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-2xs whitespace-nowrap transition-all font-medium"
              >
                ✅ YES
              </button>
            </div>

            {/* Authentic WhatsApp Chat Wallpaper */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-3"
              style={{
                backgroundColor: '#efeae2',
                backgroundImage: 'radial-gradient(#d1d7db 0.75px, transparent 0.75px)',
                backgroundSize: '16px 16px',
              }}
            >
              {messages.length === 0 && (
                <div className="text-center my-8">
                  <div className="inline-block bg-[#fff9c4] text-[#856404] text-xs px-3 py-1.5 rounded-lg shadow-2xs border border-[#fff3cd] font-medium">
                    🔒 Messages are end-to-end simulated. Click <strong>"Hi"</strong> or type below.
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-2xs relative whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none'
                        : 'bg-white text-[#111b21] rounded-tl-none border border-gray-100'
                    }`}
                  >
                    {msg.text}
                    <div className="text-[10px] text-gray-500 text-right mt-1 font-sans">
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-500 rounded-lg px-4 py-2 text-xs shadow-2xs italic flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    ScootyGo is processing...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="bg-[#f0f2f5] p-3 border-t border-gray-200 flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareLocation}
                title="Send Demo WhatsApp Location (Baner)"
                className="p-2.5 text-gray-600 hover:text-emerald-700 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center bg-white border border-gray-300"
              >
                <MapPin className="w-4 h-4 text-emerald-600" />
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex-1 flex gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message (e.g. 1, 20 October, 10:00 AM)..."
                  className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] focus:border-transparent text-gray-800"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-[#008069] hover:bg-[#00705a] disabled:opacity-50 text-white rounded-full p-2.5 transition-colors flex items-center justify-center shadow-2xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: OpenStreetMap & Convex Real-time Inspector */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Section 26: Leaflet + OpenStreetMap Rental Hubs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-[#008069]" /> Pune Rental Hubs Map (OpenStreetMap)
              </h2>
              <span className="text-xs text-gray-500 font-medium">
                {locations.length} Active Hubs
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Click any location pin to see address and available scooters/bikes stored in Convex.
            </p>
            <LocationMap locations={locations} />
          </div>

          {/* Convex In-Session Inspector */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" /> Persistent Convex Session Inspector
              </h2>
              <span className="text-[11px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                Table: whatsappSessions
              </span>
            </div>

            <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto shadow-inner">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                <span className="text-emerald-400 font-semibold">Active State Machine Step:</span>
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                  {session?.currentStep || 'WELCOME'}
                </span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div><span className="text-slate-500">Phone:</span> {session?.phoneNumber || phoneNumber}</div>
                <div><span className="text-slate-500">Pickup Date:</span> {session?.bookingDraft?.startDate || '—'}</div>
                <div><span className="text-slate-500">Pickup Time:</span> {session?.bookingDraft?.pickupTime || '—'}</div>
                <div><span className="text-slate-500">Return Time:</span> {session?.bookingDraft?.returnTime || '—'}</div>
                <div><span className="text-slate-500">Nearest Hub:</span> {session?.bookingDraft?.locationName ? `${session.bookingDraft.locationName} (${session.bookingDraft.distanceKm} km)` : '—'}</div>
                <div><span className="text-slate-500">Selected Ride:</span> {session?.bookingDraft?.vehicleName ? `${session.bookingDraft.vehicleName} (₹${session.bookingDraft.vehiclePrice}/day)` : '—'}</div>
                <div><span className="text-slate-500">Customer:</span> {session?.bookingDraft?.customerName || '—'}</div>
              </div>
            </div>
          </div>

          {/* Meta Developer Webhook Configuration Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#008069]" /> Meta Cloud API Webhook Settings
            </h2>
            <p className="text-xs text-gray-600 mb-4">
              Configure these in <strong>Meta Developer Dashboard &gt; WhatsApp &gt; Configuration &gt; Webhook</strong>:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Callback URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-800"
                  />
                  <button
                    onClick={() => copyToClipboard(webhookUrl, true)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1 border border-gray-300 transition-colors"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUrl ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Verify Token</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={verifyToken}
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-800"
                  />
                  <button
                    onClick={() => copyToClipboard(verifyToken, false)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1 border border-gray-300 transition-colors"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedToken ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
