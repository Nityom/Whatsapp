'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  UserPlus,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Phone,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Send,
  Stethoscope,
  MapPin,
  X,
  Check,
  UserCheck,
  Activity,
  Flame,
  Trash2,
} from 'lucide-react';

interface OpdItem {
  _id?: string;
  id: string;
  queue_id?: string;
  token: string;
  uhid?: string;
  patientId?: string;
  appointmentId?: string;
  name: string;
  age: string;
  ageUnit?: string;
  sex: 'Male' | 'Female' | 'Other' | string;
  phone: string;
  address?: string;
  doctor: string;
  department?: string;
  priority: 'Normal' | 'Urgent' | 'Emergency' | string;
  visitType?: string;
  status: 'Waiting' | 'In Consultation' | 'Completed' | 'Cancelled' | string;
  registeredAt?: string;
  time?: string;
}

const DOCTORS = [
  { name: 'Dr. Vipeen Raut', department: 'Orthopaedics & Joint Replacement' },
  { name: 'Dr. Shillpa Raut', department: 'Obstetrics & Gynaecology' },
];

export const OpdQueueView: React.FC = () => {
  // Calendar & Date State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedDoctor, setSelectedDoctor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Queue Data
  const [queue, setQueue] = useState<OpdItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Walk-in Modal State
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState<boolean>(false);
  const [walkInSubmitting, setWalkInSubmitting] = useState<boolean>(false);
  const [walkInForm, setWalkInForm] = useState({
    name: '',
    phone: '',
    age: '',
    sex: 'Male',
    doctor: 'Dr. Vipeen Raut',
    priority: 'Normal',
    visitType: 'New Registration',
    address: '',
    sendWhatsApp: true,
  });

  // Slot availability state for walk-in scheduling
  const [slotData, setSlotData] = useState<{
    availableSlots: string[];
    bookedSlots: string[];
    morningSlots: Array<{ slot: string; display: string; isBooked: boolean }>;
    eveningSlots: Array<{ slot: string; display: string; isBooked: boolean }>;
  } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [timeMode, setTimeMode] = useState<'immediate' | 'slot'>('immediate');

  // Action status state
  const [callingPatientId, setCallingPatientId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Helper: Shift date by delta days
  const shiftDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Fetch Queue from API
  const fetchQueue = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        doctor: selectedDoctor,
        status: selectedStatus,
      });
      const res = await fetch(`/api/admin/opd?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.queue)) {
        setQueue(data.queue);
      }
    } catch (err) {
      console.error('[OPD Queue Fetch Error]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, selectedDoctor, selectedStatus]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Polling every 5 seconds for real-time queue updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueue(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // Load slot availability when modal opens or doctor/date changes
  useEffect(() => {
    if (!isWalkInModalOpen) return;
    const loadSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await fetch(
          `/api/admin/opd?action=slots&date=${selectedDate}&doctor=${encodeURIComponent(
            walkInForm.doctor
          )}`
        );
        const data = await res.json();
        if (data.success && data.slotData) {
          setSlotData(data.slotData);
          if (data.slotData.availableSlots?.length > 0) {
            setSelectedSlot(data.slotData.availableSlots[0]);
          }
        }
      } catch (err) {
        console.error('[Load Slots Error]', err);
      } finally {
        setLoadingSlots(false);
      }
    };
    loadSlots();
  }, [isWalkInModalOpen, selectedDate, walkInForm.doctor]);

  // Status Counts
  const stats = useMemo(() => {
    const total = queue.length;
    const waiting = queue.filter((q) => q.status === 'Waiting').length;
    const inConsultation = queue.filter((q) => q.status === 'In Consultation').length;
    const completed = queue.filter((q) => q.status === 'Completed').length;
    const cancelled = queue.filter((q) => q.status === 'Cancelled').length;
    return { total, waiting, inConsultation, completed, cancelled };
  }, [queue]);

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    let list = queue;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const name = (item.name || '').toLowerCase();
        const phone = (item.phone || '').toLowerCase();
        const token = (item.token || '').toLowerCase();
        const uhid = (item.uhid || '').toLowerCase();
        return (
          name.includes(q) ||
          phone.includes(q) ||
          token.includes(q) ||
          uhid.includes(q)
        );
      });
    }
    return list;
  }, [queue, searchQuery]);

  // Handle Status Update
  const handleUpdateStatus = async (item: OpdItem, newStatus: string) => {
    const queueId = item.id || item.queue_id;
    if (!queueId) return;

    // Optimistic UI update
    setQueue((prev) =>
      prev.map((q) => ((q.id || q.queue_id) === queueId ? { ...q, status: newStatus } : q))
    );

    try {
      const res = await fetch('/api/admin/opd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          queueId,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Token #${item.token} status updated to ${newStatus}`);
        setTimeout(() => setActionSuccessMsg(null), 3000);
      } else {
        console.error('[Update Status Failed]', data.error);
        fetchQueue(true);
      }
    } catch (err) {
      console.error('[Update Status Error]', err);
      fetchQueue(true);
    }
  };

  // Handle Delete Queue Item
  const handleDeleteQueueItem = async (item: OpdItem) => {
    const queueId = item.id || item.queue_id;
    if (!queueId) return;

    if (!confirm(`Are you sure you want to remove Token #${item.token} (${item.name}) from the OPD queue?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/opd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          queueId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQueue((prev) => prev.filter((q) => (q.id || q.queue_id) !== queueId));
        setActionSuccessMsg(`Token #${item.token} (${item.name}) removed from queue.`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      } else {
        alert('Failed to delete item from queue.');
      }
    } catch (err) {
      console.error('[Delete Item Error]', err);
      alert('Network error while deleting item.');
    }
  };

  // Handle Call Patient via WhatsApp
  const handleCallPatient = async (item: OpdItem) => {
    setCallingPatientId(item.id);
    try {
      const res = await fetch('/api/admin/opd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'call_patient',
          queueId: item.id,
          phone: item.phone,
          name: item.name,
          token: item.token,
          doctor: item.doctor,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`WhatsApp alert sent to ${item.name} (Token #${item.token})`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'In Consultation' } : q))
        );
      }
    } catch (err) {
      console.error('[Call Patient Error]', err);
    } finally {
      setCallingPatientId(null);
    }
  };

  // Handle Walk-in Submission
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInForm.name.trim() || !walkInForm.phone.trim()) {
      alert('Please fill patient name and mobile number.');
      return;
    }

    setWalkInSubmitting(true);
    try {
      const slotTime = timeMode === 'slot' && selectedSlot ? selectedSlot : undefined;
      const res = await fetch('/api/admin/opd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'walkin',
          name: walkInForm.name,
          phone: walkInForm.phone,
          age: walkInForm.age,
          sex: walkInForm.sex,
          doctor: walkInForm.doctor,
          priority: walkInForm.priority,
          visitType: walkInForm.visitType,
          address: walkInForm.address,
          date: selectedDate,
          time: slotTime,
          sendWhatsApp: walkInForm.sendWhatsApp,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.whatsappStatus === 'sent') {
          setActionSuccessMsg(
            `Walk-in confirmed! Token #${data.token} assigned & WhatsApp confirmation sent.`
          );
        } else if (data.whatsappStatus === 'failed') {
          setActionSuccessMsg(
            `Walk-in confirmed! Token #${data.token} assigned. (Note: WhatsApp dispatch pending customer reply).`
          );
        } else {
          setActionSuccessMsg(`Walk-in confirmed! Token #${data.token} assigned.`);
        }

        setTimeout(() => setActionSuccessMsg(null), 5000);
        setIsWalkInModalOpen(false);
        setWalkInForm({
          name: '',
          phone: '',
          age: '',
          sex: 'Male',
          doctor: 'Dr. Vipeen Raut',
          priority: 'Normal',
          visitType: 'New Registration',
          address: '',
          sendWhatsApp: true,
        });
        setTimeMode('immediate');
        fetchQueue();
      } else {
        alert(data.error || 'Failed to create walk-in entry.');
      }
    } catch (err) {
      console.error('[Walk-in Error]', err);
      alert('Network error while creating walk-in.');
    } finally {
      setWalkInSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Bar: Calendar Date Selector & Walk-in Action */}
      <div className="bg-white rounded-2xl border border-[#dbe9e0] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Navigation & Calendar UI */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-[#f8faf8] border border-[#dbe9e0] rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => shiftDate(-1)}
              title="Previous Day"
              className="p-1.5 hover:bg-white rounded-lg text-[#173d37] hover:text-[#176e56] transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1">
              <CalendarDays className="w-4 h-4 text-[#176e56]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-[#173d37] focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => shiftDate(1)}
              title="Next Day"
              className="p-1.5 hover:bg-white rounded-lg text-[#173d37] hover:text-[#176e56] transition-all cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              isToday
                ? 'bg-[#176e56] text-white border-[#176e56] shadow-xs'
                : 'bg-white text-[#55776d] border-[#dbe9e0] hover:bg-[#f3f9f5] hover:text-[#173d37]'
            }`}
          >
            Today
          </button>

          <button
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setSelectedDate(tomorrow.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white text-[#55776d] border border-[#dbe9e0] hover:bg-[#f3f9f5] hover:text-[#173d37] transition-all cursor-pointer"
          >
            Tomorrow
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchQueue()}
            disabled={refreshing}
            title="Refresh OPD Queue"
            className="p-2.5 rounded-xl border border-[#dbe9e0] bg-[#f8faf8] hover:bg-white text-[#55776d] hover:text-[#176e56] transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#176e56]' : ''}`} />
          </button>

          <button
            onClick={() => setIsWalkInModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#176e56] hover:bg-[#125643] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Walk-in Entry</span>
          </button>
        </div>
      </div>

      {/* Doctor Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-[#dbe9e0] pb-2 overflow-x-auto">
        <button
          onClick={() => setSelectedDoctor('ALL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            selectedDoctor === 'ALL'
              ? 'bg-[#176e56] text-white shadow-xs'
              : 'bg-white text-[#55776d] border border-[#dbe9e0] hover:bg-[#f3f9f5] hover:text-[#173d37]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>All Doctors</span>
        </button>

        {DOCTORS.map((doc) => {
          const isSelected = selectedDoctor === doc.name;
          return (
            <button
              key={doc.name}
              onClick={() => setSelectedDoctor(doc.name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-[#176e56] text-white shadow-xs'
                  : 'bg-white text-[#55776d] border border-[#dbe9e0] hover:bg-[#f3f9f5] hover:text-[#173d37]'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>{doc.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#eaf5ef] text-[#176e56]'
                }`}
              >
                {doc.name.includes('Vipeen') ? 'Ortho' : 'Gynae'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#dbe9e0] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#55776d]">Total Tokens</span>
            <div className="w-8 h-8 rounded-xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#173d37] mt-2">{stats.total}</div>
          <p className="text-[11px] text-[#77a193] mt-0.5 font-medium">Scheduled + Walk-ins</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#fde68a] bg-gradient-to-br from-white to-[#fffbeb] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#92400e]">Waiting</span>
            <div className="w-8 h-8 rounded-xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#92400e] mt-2">{stats.waiting}</div>
          <p className="text-[11px] text-[#b45309] mt-0.5 font-medium">In waiting room</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#a3e2c3] bg-gradient-to-br from-white to-[#f0fdf4] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#166534]">In Consultation</span>
            <div className="w-8 h-8 rounded-xl bg-[#dcfce7] text-[#15803d] flex items-center justify-center">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#166534] mt-2">{stats.inConsultation}</div>
          <p className="text-[11px] text-[#15803d] mt-0.5 font-medium">Active with doctor</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#dbe9e0] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#55776d]">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#173d37] mt-2">{stats.completed}</div>
          <p className="text-[11px] text-[#77a193] mt-0.5 font-medium">Consulted & done</p>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="p-3 rounded-xl bg-[#dcfce7] border border-[#86efac] text-[#166534] text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-[#166534] shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Search & Status Filters Bar */}
      <div className="bg-white rounded-2xl border border-[#dbe9e0] p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#77a193] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name, phone, token #..."
            className="w-full pl-9.5 pr-4 py-2 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-xs text-[#173d37] placeholder-[#77a193] focus:outline-none focus:border-[#54a987] focus:bg-white transition-all font-medium"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'Waiting', 'In Consultation', 'Completed', 'Cancelled'].map((st) => {
            const isSel = selectedStatus === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSel
                    ? 'bg-[#176e56] text-white shadow-xs'
                    : 'bg-[#f8faf8] text-[#55776d] border border-[#dbe9e0] hover:bg-[#eaf5ef] hover:text-[#176e56]'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* OPD Queue Table / Cards */}
      <div className="bg-white rounded-2xl border border-[#dbe9e0] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="w-6 h-6 text-[#176e56] animate-spin" />
            <p className="text-xs font-medium text-[#77a193]">Loading OPD queue from Cortex PMS...</p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-center">
            <Users className="w-10 h-10 text-[#dbe9e0]" />
            <p className="text-sm font-bold text-[#173d37]">No patients found for this selection</p>
            <p className="text-xs text-[#77a193]">
              There are no appointments or walk-in entries for {selectedDate}
            </p>
            <button
              onClick={() => setIsWalkInModalOpen(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-[#176e56] text-white text-xs font-bold hover:bg-[#125643] transition-all cursor-pointer"
            >
              + Register First Walk-in
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8faf8] border-b border-[#dbe9e0] text-[#55776d] font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-16">Token</th>
                  <th className="py-3 px-4">Patient Details</th>
                  <th className="py-3 px-4">Doctor & Department</th>
                  <th className="py-3 px-4">Time / Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dbe9e0]">
                {filteredQueue.map((item) => {
                  const isWaiting = item.status === 'Waiting';
                  const isInConsult = item.status === 'In Consultation';
                  const isDone = item.status === 'Completed';
                  const isCalling = callingPatientId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#f8faf8] transition-colors ${
                        isInConsult ? 'bg-[#f0fdf4]' : ''
                      }`}
                    >
                      {/* Token Column */}
                      <td className="py-3 px-4 font-black text-sm text-[#176e56]">
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-[#eaf5ef] border border-[#a3e2c3] text-[#176e56] font-mono shadow-2xs">
                          #{item.token}
                        </span>
                      </td>

                      {/* Patient Details */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#173d37] text-sm">{item.name}</div>
                        <div className="text-[11px] text-[#55776d] flex items-center gap-2 mt-0.5">
                          <span>
                            {item.age} {item.sex}
                          </span>
                          {item.uhid && (
                            <span className="font-mono text-[#77a193]">({item.uhid})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#77a193] font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#77a193]" />
                          <span>+{item.phone}</span>
                          {item.address && (
                            <span className="text-[#55776d] truncate max-w-[120px]">
                              • {item.address}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Doctor & Dept */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#173d37]">{item.doctor}</div>
                        <div className="text-[11px] text-[#77a193]">{item.department}</div>
                      </td>

                      {/* Time / Type */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#173d37] font-mono">
                          {item.time || '10:30'}
                        </div>
                        <div className="text-[10px] inline-block px-1.5 py-0.5 rounded bg-[#f3f9f5] text-[#176e56] font-medium mt-0.5">
                          {item.visitType || 'Appointment'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isWaiting
                              ? 'bg-[#fffbeb] text-[#92400e] border border-[#fef3c7]'
                              : isInConsult
                              ? 'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]'
                              : isDone
                              ? 'bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]'
                              : 'bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isWaiting
                                ? 'bg-[#f59e0b]'
                                : isInConsult
                                ? 'bg-[#22c55e] animate-pulse'
                                : isDone
                                ? 'bg-[#9ca3af]'
                                : 'bg-[#ef4444]'
                            }`}
                          />
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Alert Patient via WhatsApp */}
                          <button
                            onClick={() => handleCallPatient(item)}
                            disabled={isCalling}
                            title="Send WhatsApp Alert: Your Turn to Enter OPD Room"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] text-[11px] font-bold border border-[#25D366]/30 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                          >
                            <Send className="w-3 h-3 text-[#25D366]" />
                            <span>{isCalling ? 'Sending...' : 'Call WhatsApp'}</span>
                          </button>

                          {/* Status Progression dropdown */}
                          <select
                            value={item.status}
                            onChange={(e) => handleUpdateStatus(item, e.target.value)}
                            className="px-2 py-1 rounded-lg bg-[#f8faf8] border border-[#dbe9e0] text-[11px] font-semibold text-[#173d37] focus:outline-none focus:border-[#54a987] cursor-pointer"
                          >
                            <option value="Waiting">Waiting</option>
                            <option value="In Consultation">In Consultation</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>

                          {/* Delete Queue Entry Button */}
                          <button
                            onClick={() => handleDeleteQueueItem(item)}
                            title="Delete this token entry from OPD queue"
                            className="p-1.5 rounded-lg text-[#9ca3af] hover:text-[#dc2626] hover:bg-[#fee2e2] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Walk-in Registration Modal */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#dbe9e0] max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsWalkInModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-[#77a193] hover:text-[#173d37] hover:bg-[#f3f9f5] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#dbe9e0] pb-4">
              <div className="w-11 h-11 rounded-2xl bg-[#eaf5ef] text-[#176e56] flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#173d37]">New Walk-in Registration</h3>
                <p className="text-xs text-[#77a193]">
                  Assigns next sequential token for {selectedDate}
                </p>
              </div>
            </div>

            <form onSubmit={handleWalkInSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-[#173d37] mb-1">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  value={walkInForm.name}
                  onChange={(e) => setWalkInForm({ ...walkInForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#54a987] bg-[#f8faf8] font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#173d37] mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10 digit number"
                    value={walkInForm.phone}
                    onChange={(e) => setWalkInForm({ ...walkInForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#54a987] bg-[#f8faf8] font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[#173d37] mb-1">Age</label>
                    <input
                      type="number"
                      placeholder="e.g. 35"
                      value={walkInForm.age}
                      onChange={(e) => setWalkInForm({ ...walkInForm, age: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#54a987] bg-[#f8faf8] font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#173d37] mb-1">Gender</label>
                    <select
                      value={walkInForm.sex}
                      onChange={(e) => setWalkInForm({ ...walkInForm, sex: e.target.value })}
                      className="w-full px-2 py-2.5 rounded-xl border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#54a987] bg-[#f8faf8] font-medium cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#173d37] mb-1">
                  Consulting Doctor *
                </label>
                <select
                  value={walkInForm.doctor}
                  onChange={(e) => setWalkInForm({ ...walkInForm, doctor: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#54a987] bg-[#f8faf8] font-semibold cursor-pointer"
                >
                  <option value="Dr. Vipeen Raut">
                    Dr. Vipeen Raut (Orthopaedics & Joint Replacement)
                  </option>
                  <option value="Dr. Shillpa Raut">
                    Dr. Shillpa Raut (Obstetrics & Gynaecology)
                  </option>
                </select>
              </div>

              {/* Consultation Time Slot Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#173d37] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#176e56]" />
                    <span>OPD Consultation Slot *</span>
                  </label>
                  <div className="flex items-center gap-1 bg-[#f3f9f5] border border-[#dbe9e0] rounded-lg p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setTimeMode('immediate')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                        timeMode === 'immediate'
                          ? 'bg-[#176e56] text-white shadow-2xs'
                          : 'text-[#55776d] hover:text-[#173d37]'
                      }`}
                    >
                      Immediate Walk-in
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeMode('slot')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                        timeMode === 'slot'
                          ? 'bg-[#176e56] text-white shadow-2xs'
                          : 'text-[#55776d] hover:text-[#173d37]'
                      }`}
                    >
                      Choose Slot
                    </button>
                  </div>
                </div>

                {timeMode === 'immediate' ? (
                  <div className="p-3 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-xs text-[#55776d] flex items-center justify-between">
                    <span>Assigned upon current arrival</span>
                    <span className="font-mono font-bold text-[#176e56] bg-white px-2.5 py-1 rounded-lg border border-[#a3e2c3] shadow-2xs">
                      Immediate Turn
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {loadingSlots ? (
                      <div className="p-4 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-center text-xs text-[#77a193] flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#176e56]" />
                        <span>Checking doctor availability for {selectedDate}...</span>
                      </div>
                    ) : !slotData ||
                      (slotData.morningSlots.length === 0 && slotData.eveningSlots.length === 0) ? (
                      <div className="p-3 rounded-xl bg-[#fffbeb] border border-[#fef3c7] text-xs text-[#92400e]">
                        OPD closed on this date (Sunday or Holiday). Walk-in will be placed in immediate queue.
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] space-y-2.5 max-h-48 overflow-y-auto">
                        {/* Morning Slots */}
                        {slotData.morningSlots.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-[#77a193] uppercase tracking-wider block mb-1">
                              Morning OPD (10:30 AM – 1:00 PM)
                            </span>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                              {slotData.morningSlots.map((s) => (
                                <button
                                  key={s.slot}
                                  type="button"
                                  disabled={s.isBooked}
                                  onClick={() => setSelectedSlot(s.slot)}
                                  className={`px-2 py-1.5 rounded-lg text-xs font-mono font-medium transition-all text-center ${
                                    s.isBooked
                                      ? 'bg-[#fee2e2]/60 text-[#991b1b] line-through cursor-not-allowed opacity-60'
                                      : selectedSlot === s.slot
                                      ? 'bg-[#176e56] text-white font-bold ring-2 ring-[#54a987] shadow-2xs'
                                      : 'bg-white hover:bg-[#eaf5ef] text-[#173d37] border border-[#dbe9e0]'
                                  }`}
                                  title={s.isBooked ? 'Slot already booked' : 'Available'}
                                >
                                  {s.slot}
                                  {s.isBooked ? (
                                    <span className="block text-[8px] no-underline font-sans text-[#b91c1c]">
                                      Booked
                                    </span>
                                  ) : (
                                    <span className="block text-[8px] font-sans text-[#10b981]">
                                      Available
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Evening Slots */}
                        {slotData.eveningSlots.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-[#77a193] uppercase tracking-wider block mb-1">
                              Evening OPD (6:00 PM – 7:30 PM)
                            </span>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                              {slotData.eveningSlots.map((s) => (
                                <button
                                  key={s.slot}
                                  type="button"
                                  disabled={s.isBooked}
                                  onClick={() => setSelectedSlot(s.slot)}
                                  className={`px-2 py-1.5 rounded-lg text-xs font-mono font-medium transition-all text-center ${
                                    s.isBooked
                                      ? 'bg-[#fee2e2]/60 text-[#991b1b] line-through cursor-not-allowed opacity-60'
                                      : selectedSlot === s.slot
                                      ? 'bg-[#176e56] text-white font-bold ring-2 ring-[#54a987] shadow-2xs'
                                      : 'bg-white hover:bg-[#eaf5ef] text-[#173d37] border border-[#dbe9e0]'
                                  }`}
                                  title={s.isBooked ? 'Slot already booked' : 'Available'}
                                >
                                  {s.slot}
                                  {s.isBooked ? (
                                    <span className="block text-[8px] no-underline font-sans text-[#b91c1c]">
                                      Booked
                                    </span>
                                  ) : (
                                    <span className="block text-[8px] font-sans text-[#10b981]">
                                      Available
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#173d37] mb-1">Priority</label>
                  <select
                    value={walkInForm.priority}
                    onChange={(e) => setWalkInForm({ ...walkInForm, priority: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#54a987] bg-[#f8faf8] font-medium cursor-pointer"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#173d37] mb-1">Visit Type</label>
                  <select
                    value={walkInForm.visitType}
                    onChange={(e) => setWalkInForm({ ...walkInForm, visitType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#54a987] bg-[#f8faf8] font-medium cursor-pointer"
                  >
                    <option value="New Registration">New Registration</option>
                    <option value="Routine Follow-up">Routine Follow-up</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#173d37] mb-1">Address / City</label>
                <input
                  type="text"
                  placeholder="e.g. Wardha / Nagpur"
                  value={walkInForm.address}
                  onChange={(e) => setWalkInForm({ ...walkInForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dbe9e0] text-xs text-[#173d37] focus:outline-none focus:border-[#54a987] bg-[#f8faf8] font-medium"
                />
              </div>

              {/* Instant WhatsApp dispatch checkbox */}
              <div className="p-3.5 rounded-2xl bg-[#eaf5ef] border border-[#a3e2c3] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#173d37]">Send Instant WhatsApp Token</p>
                    <p className="text-[11px] text-[#55776d]">
                      Patient receives token # and waiting instructions
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={walkInForm.sendWhatsApp}
                  onChange={(e) =>
                    setWalkInForm({ ...walkInForm, sendWhatsApp: e.target.checked })
                  }
                  className="w-5 h-5 accent-[#176e56] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWalkInModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#dbe9e0] text-xs font-bold text-[#55776d] hover:bg-[#f8faf8] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={walkInSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#176e56] hover:bg-[#125643] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{walkInSubmitting ? 'Registering...' : 'Confirm Walk-in'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
