'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Send,
  MapPin,
  RotateCcw,
  Copy,
  Check,
  ShieldAlert,
  Calendar,
  FileText,
  CreditCard,
  UserCheck,
  Headphones,
  Stethoscope,
  Activity,
  HeartHandshake,
  Clock,
  PhoneCall,
  User,
  Sparkles,
} from 'lucide-react';
import type { LocationItem } from '@/components/LocationMap';
import { DEFAULT_WELCOME_MESSAGE } from '@/lib/cortexConfig';

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-medium">
      Loading Cortex Hospital Map...
    </div>
  ),
});

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  isLocation?: boolean;
  locationDetails?: {
    name: string;
    address: string;
    latitude: number | string;
    longitude: number | string;
  };
}

interface SessionState {
  phoneNumber: string;
  currentStep: string;
  language?: string;
  patientId?: string;
  patientReference?: string;
  patientName?: string;
  isVerified?: boolean;
  verificationOtp?: string;
  isHandedOver?: boolean;
  handoverReason?: string;
  bookingDraft?: {
    doctorName?: string;
    specialty?: string;
    date?: string;
    slot?: string;
    patientName?: string;
    patientAge?: string;
    patientPhone?: string;
    patientAddress?: string;
    complaint?: string;
  };
  lastUpdated?: number;
}

interface PatientRecord {
  _id: string;
  name: string;
  age: string;
  sex: string;
  phone_number: string;
  reference_number?: string;
  address?: string;
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('919373280505');
  const [session, setSession] = useState<SessionState | null>(null);
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load initial session, patient, and locations
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
      console.error('Failed to load Cortex Hospital location', err);
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
      if (data.patient) {
        setPatient(data.patient);
      } else {
        setPatient(null);
      }

      // If chat is empty, greet with default welcome
      if (messages.length === 0) {
        setMessages([
          {
            id: 'init-1',
            sender: 'bot',
            text: DEFAULT_WELCOME_MESSAGE,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch session', err);
    }
  }

  async function sendMessage(textToSend?: string) {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
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
          phoneNumber,
          text: text.trim(),
          type: 'text',
        }),
      });

      const data = await res.json();
      if (data.success) {
        const botMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isLocation: !!data.nativeLocation,
          locationDetails: data.nativeLocation,
        };
        setMessages((prev) => [...prev, botMsg]);
        if (data.session) setSession(data.session);
        if (data.patient) setPatient(data.patient);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: 'bot',
            text: `⚠️ Error: ${data.error || 'Server error'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'bot',
          text: '⚠️ Network connection failure. Please retry.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function sendLocationPin() {
    if (loading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: '📍 Shared Location (Wardha)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isLocation: true,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          type: 'location',
          latitude: 20.7453,
          longitude: 78.5992,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: 'bot',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isLocation: !!data.nativeLocation,
            locationDetails: data.nativeLocation,
          },
        ]);
        if (data.session) setSession(data.session);
      }
    } finally {
      setLoading(false);
    }
  }

  async function resetSession() {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', phoneNumber }),
      });
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
      }
      setMessages([
        {
          id: `rst_${Date.now()}`,
          sender: 'bot',
          text: `🔄 *Session Reset.*\n\n${DEFAULT_WELCOME_MESSAGE}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleHandover() {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_handover', phoneNumber }),
      });
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
      }
      const isNowHanded = data.isHandedOver;
      setMessages((prev) => [
        ...prev,
        {
          id: `hnd_${Date.now()}`,
          sender: 'bot',
          text: isNowHanded
            ? '☎️ *Staff Handover Active:* Hospital receptionist is now connected to this conversation. Automated replies paused.'
            : '🤖 *Assistant Resumed:* Virtual Assistant is now active and handling patient queries.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/whatsapp/webhook`
      : 'https://your-domain.com/api/whatsapp/webhook';

  const testPrompts = [
    { label: '🏥 Book Appointment (Dr. Vipeen Raut)', text: 'I want to see Dr. Vipeen Raut tomorrow' },
    { label: '🌸 Book Appointment (Dr. Shillpa Raut)', text: 'Dr. Shillpa Raut se appointment leni hai' },
    { label: '👨‍⚕️ Doctor Availability & Timings', text: '6' },
    { label: '💊 My Prescriptions (Secure OTP)', text: '3' },
    { label: '🧾 Check Pending Bill', text: '4' },
    { label: '🔔 Check Next Follow-up', text: '5' },
    { label: '🧪 Laboratory Reports', text: '7' },
    { label: '📍 Hospital Address & Location', text: '8' },
    { label: '🗣️ Marathi: मला डॉ. राऊत यांची वेळ हवी आहे', text: 'मला डॉ. राऊत यांची वेळ हवी आहे' },
    { label: '🗣️ Hindi: कल डॉक्टर साहब बैठेंगे क्या?', text: 'कल डॉक्टर साहब बैठेंगे क्या?' },
    { label: '🚨 Emergency: Chest Pain', text: 'I have severe chest pain and breathing problem' },
    { label: '☎️ Human Handover (Reception)', text: '9' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7B1828] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-[#7B1828]/30">
            🏥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                Cortex Hospital
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#7B1828]/30 text-rose-300 border border-[#7B1828]/50">
                Official AI WhatsApp Assistant
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Aarti Chowk, Nagpur Road, Wardha • 24/7 Virtual Receptionist
            </p>
          </div>
        </div>

        {/* Live Backend Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium">Cortex PMS Connected (DEV Environment)</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="bg-transparent text-white font-mono text-xs w-28 focus:outline-none focus:ring-1 focus:ring-rose-500 rounded px-1"
              title="Test WhatsApp Number"
            />
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Hospital Details & Quick Prompts (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Hospital Overview Card */}
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm mb-3">
              <Stethoscope className="w-4 h-4" />
              <span>Specialist Doctors & Timings</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                <div className="font-bold text-white text-sm">Dr. Vipeen Raut</div>
                <div className="text-slate-400">M.B.B.S., Dip.Ortho., DNB Ortho</div>
                <div className="text-rose-300 font-medium mt-1">
                  Orthopaedic & Joint Replacement Surgeon
                </div>
                <div className="text-slate-400 text-[11px] mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  Mon–Fri: 10am–1pm & 6pm–8pm | Sat: 10am–1pm
                </div>
                <div className="text-emerald-400 text-[11px] mt-1 font-mono">
                  Fee: ₹400 (First) / ₹200 (Follow-up)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                <div className="font-bold text-white text-sm">Dr. Shillpa Raut</div>
                <div className="text-slate-400">M.B.B.S., M.D. (Gynecology & Obstetrics)</div>
                <div className="text-rose-300 font-medium mt-1">
                  Gynecologist, Obstetrician & Infertility Specialist
                </div>
                <div className="text-slate-400 text-[11px] mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  Mon–Fri: 10am–1pm & 6pm–8pm | Sat: 10am–1pm
                </div>
                <div className="text-emerald-400 text-[11px] mt-1 font-mono">
                  Fee: ₹200 (First) / ₹100 (Follow-up)
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/30 text-[11px] text-amber-200 flex items-start gap-2">
                <span className="text-base leading-none">🦴</span>
                <div>
                  <span className="font-semibold">Hip & Knee Joint Clinic:</span> Every Thursday 6:00 PM – 8:00 PM
                </div>
              </div>
            </div>
          </div>

          {/* Quick Test Actions */}
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm mb-3">
              <Sparkles className="w-4 h-4" />
              <span>Quick Simulator Prompts</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Click any button below to test natural language understanding, multilingual responses, and PMS functions:
            </p>

            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
              {testPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(p.text)}
                  disabled={loading}
                  className="text-left px-3 py-2 text-xs rounded-xl bg-slate-900/80 hover:bg-[#7B1828]/20 border border-slate-700/80 hover:border-[#7B1828]/50 text-slate-200 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate mr-2">{p.label}</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-rose-400 font-mono">
                    Send ↗
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Emergency Safety Notice */}
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-600/30 text-xs text-rose-200">
            <div className="flex items-center gap-2 font-bold text-rose-300 mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Medical Safety Protocol</span>
            </div>
            <p className="text-[11px] text-rose-200/80 leading-relaxed">
              Virtual Assistant strictly operates as an administrative receptionist. It never provides medical diagnoses, prescribes drugs, or modifies doses. Severe emergency queries trigger casualty triage to 112 & Cortex Emergency.
            </p>
          </div>
        </div>

        {/* CENTER COLUMN: WhatsApp Mobile Chat Simulator (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          {/* Phone Mockup Frame */}
          <div className="bg-slate-950 rounded-[36px] p-3 shadow-2xl border-4 border-slate-800 flex-1 flex flex-col h-[740px] max-w-md mx-auto w-full overflow-hidden">
            {/* Phone Top Speaker & Camera Notch */}
            <div className="h-5 flex items-center justify-center">
              <div className="w-20 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-2" />
                <div className="w-8 h-1 bg-slate-800 rounded-full" />
              </div>
            </div>

            {/* WhatsApp App Container */}
            <div className="flex-1 bg-[#0b141a] rounded-[26px] overflow-hidden flex flex-col border border-slate-800">
              {/* WhatsApp Chat Header */}
              <div className="bg-[#1f2c34] text-white px-4 py-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#7B1828] flex items-center justify-center text-white text-base font-bold shadow">
                    🏥
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                      Cortex Hospital
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {session?.isHandedOver ? (
                        <span className="text-amber-400 font-medium">Staff Handover Active</span>
                      ) : (
                        'Virtual Receptionist • Online 24/7'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={resetSession}
                    title="Reset Session"
                    className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-700/50 transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={toggleHandover}
                    title={session?.isHandedOver ? 'Resume AI Assistant' : 'Handover to Reception'}
                    className={`p-1.5 rounded-full transition cursor-pointer ${
                      session?.isHandedOver
                        ? 'text-amber-400 hover:bg-amber-900/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <Headphones className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.15) 0%, transparent 100%)',
                }}
              >
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-md text-xs relative ${
                          isUser
                            ? 'bg-[#005c4b] text-white rounded-br-xs'
                            : 'bg-[#202c33] text-slate-200 rounded-bl-xs'
                        }`}
                      >
                        <div className="whitespace-pre-wrap leading-relaxed break-words">
                          {msg.text}
                        </div>

                        {/* Native Location Pin Card */}
                        {msg.locationDetails && (
                          <div className="mt-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-700/50 flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-[11px]">
                              <MapPin className="w-3.5 h-3.5 text-rose-400" />
                              <span>{msg.locationDetails.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              {msg.locationDetails.address}
                            </p>
                            <a
                              href={`https://maps.google.com/?q=${msg.locationDetails.latitude},${msg.locationDetails.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-rose-400 font-semibold hover:underline flex items-center gap-1 mt-0.5"
                            >
                              Open in Google Maps ↗
                            </a>
                          </div>
                        )}

                        <div
                          className={`text-[9px] mt-1 text-right ${
                            isUser ? 'text-emerald-200/60' : 'text-slate-400'
                          }`}
                        >
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-[#202c33] rounded-2xl rounded-bl-xs px-4 py-2 text-xs text-slate-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Menu Shortcut Bar */}
              <div className="bg-[#182229] border-t border-slate-800/80 px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
                <button
                  onClick={() => sendMessage('1')}
                  className="px-2 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 whitespace-nowrap cursor-pointer"
                >
                  🏥 1: Book Slot
                </button>
                <button
                  onClick={() => sendMessage('3')}
                  className="px-2 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 whitespace-nowrap cursor-pointer"
                >
                  💊 3: Prescriptions
                </button>
                <button
                  onClick={() => sendMessage('4')}
                  className="px-2 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 whitespace-nowrap cursor-pointer"
                >
                  🧾 4: Bills
                </button>
                <button
                  onClick={() => sendMessage('6')}
                  className="px-2 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 whitespace-nowrap cursor-pointer"
                >
                  👨‍⚕️ 6: Timings
                </button>
                <button
                  onClick={() => sendMessage('8')}
                  className="px-2 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 whitespace-nowrap cursor-pointer"
                >
                  📍 8: Location
                </button>
                <button
                  onClick={() => sendMessage('9')}
                  className="px-2 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 whitespace-nowrap cursor-pointer"
                >
                  ☎️ 9: Reception
                </button>
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="bg-[#202c33] px-3 py-2 flex items-center gap-2 border-t border-slate-800"
              >
                <button
                  type="button"
                  onClick={sendLocationPin}
                  title="Send Location Pin"
                  className="text-slate-400 hover:text-rose-400 transition p-1 cursor-pointer"
                >
                  <MapPin className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type message in English, हिन्दी, मराठी..."
                  className="flex-1 bg-[#2a3942] text-slate-100 placeholder-slate-400 text-xs px-3.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />

                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="w-8 h-8 rounded-full bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition shadow cursor-pointer"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Cortex PMS Live Sync & Session Inspector (3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Active Patient Card */}
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <UserCheck className="w-4 h-4" />
                <span>Patient Profile</span>
              </div>
              {patient ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-[10px] text-emerald-300 font-mono">
                  {patient.reference_number || 'Registered'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-700 text-[10px] text-slate-300">
                  New Patient
                </span>
              )}
            </div>

            {patient ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">Name:</span>
                  <span className="font-semibold text-white">{patient.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">UHID Ref:</span>
                  <span className="font-mono text-rose-300">{patient.reference_number}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">Age / Sex:</span>
                  <span className="text-slate-200">
                    {patient.age} yrs • {patient.sex}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-mono text-slate-300">{patient.phone_number}</span>
                </div>
                {patient.address && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">City/Area:</span>
                    <span className="text-slate-200">{patient.address}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900/50 text-xs text-slate-400 border border-slate-700/50 text-center">
                Phone <span className="font-mono text-slate-300">+{phoneNumber}</span> is not registered in Cortex PMS yet.
                <div className="mt-2 text-[11px] text-rose-300">
                  The assistant will automatically register new patients during appointment booking!
                </div>
              </div>
            )}
          </div>

          {/* Conversation State Inspector */}
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm mb-3">
              <Activity className="w-4 h-4" />
              <span>Session State Machine</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-700/60">
                <span className="text-slate-400">Current Step:</span>
                <span className="font-mono font-semibold text-rose-300">
                  {session?.currentStep || 'IDLE'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-700/60">
                <span className="text-slate-400">OTP Verified:</span>
                <span
                  className={`font-semibold ${
                    session?.isVerified ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {session?.isVerified ? '✅ Yes' : '🔒 Protected'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-700/60">
                <span className="text-slate-400">Handover:</span>
                <span
                  className={`font-semibold ${
                    session?.isHandedOver ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
                  {session?.isHandedOver ? '☎️ Staff Active' : '🤖 AI Active'}
                </span>
              </div>

              {session?.bookingDraft?.doctorName && (
                <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-[11px] space-y-1">
                  <div className="text-rose-300 font-semibold">Active Booking Draft:</div>
                  <div>👨‍⚕️ {session.bookingDraft.doctorName}</div>
                  {session.bookingDraft.date && <div>📅 {session.bookingDraft.date}</div>}
                  {session.bookingDraft.slot && <div>⏰ {session.bookingDraft.slot}</div>}
                  {session.bookingDraft.patientName && (
                    <div>👤 {session.bookingDraft.patientName}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hospital Map Pin */}
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <MapPin className="w-4 h-4" />
                <span>Wardha Hospital Pin</span>
              </div>
              <span className="text-[10px] text-slate-400">Aarti Chowk</span>
            </div>
            <LocationMap locations={locations} />
          </div>

          {/* Webhook Endpoint Info */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
            <div className="font-semibold text-slate-300 flex items-center justify-between">
              <span>Meta Webhook Endpoint</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  setCopiedWebhook(true);
                  setTimeout(() => setCopiedWebhook(false), 2000);
                }}
                className="text-rose-400 hover:text-rose-300 text-[10px] flex items-center gap-1 cursor-pointer"
              >
                {copiedWebhook ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedWebhook ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="font-mono text-[11px] text-slate-400 break-all bg-slate-950 p-2 rounded-lg border border-slate-800">
              {webhookUrl}
            </div>
            <div className="text-[11px] text-slate-500">
              Verify Token: <code className="text-rose-300">scooty_ai_verify_2026</code>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
