'use client';

import React, { useState } from 'react';
import {
  Edit2,
  Copy,
  Check,
  ChevronRight,
  Calendar,
  FileText,
  CreditCard,
  Bell,
  Plus,
  Save,
  Tag,
  UserCheck,
  ListPlus,
  X,
} from 'lucide-react';
import { WhatsAppSession } from './types';

interface PatientDetailColumnProps {
  session?: WhatsAppSession | null;
  onOpenQuickAction: (action: 'appointment' | 'prescription' | 'bill' | 'reminder') => void;
  onUpdateNotes: (notes: string) => Promise<void>;
  onAddTag: (tag: string) => Promise<void>;
  onClose?: () => void;
}

export const PatientDetailColumn: React.FC<PatientDetailColumnProps> = ({
  session,
  onOpenQuickAction,
  onUpdateNotes,
  onAddTag,
  onClose,
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(session?.notes || '');
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // Sync state if session changes
  React.useEffect(() => {
    setNotesText(session?.notes || '');
    setEditingNotes(false);
    setShowTagInput(false);
  }, [session?.phoneNumber, session?.notes]);

  if (!session) {
    return (
      <div className="w-full lg:w-80 bg-white border border-[#dbe9e0] rounded-2xl p-6 h-[740px] flex items-center justify-center text-center text-xs text-[#55776d] shadow-xs">
        <p>Select a chat to see patient details</p>
      </div>
    );
  }

  const initials = session.patientName
    ? session.patientName.slice(0, 2).toUpperCase()
    : session.phoneNumber.slice(-2);

  const tags = session.tags || ['Patient', 'Lead'];

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(`+${session.phoneNumber}`);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await onUpdateNotes(notesText);
    setSavingNotes(false);
    setEditingNotes(false);
  };

  const handleSaveTag = async () => {
    if (!newTagInput.trim()) return;
    await onAddTag(newTagInput.trim());
    setNewTagInput('');
    setShowTagInput(false);
  };

  return (
    <div className="w-full lg:w-80 bg-white border border-[#dbe9e0] rounded-2xl h-[740px] flex flex-col shadow-xs overflow-y-auto animate-in slide-in-from-right-2 duration-150 shrink-0">
      {/* Top Patient Profile Header */}
      <div className="p-5 border-b border-[#dbe9e0] flex flex-col items-center text-center relative">
        <div className="absolute top-3.5 right-3.5 flex items-center gap-1">
          <button
            title="Edit Patient Details"
            className="p-1.5 rounded-lg text-[#55776d] hover:text-[#176e56] hover:bg-[#f3f9f5] transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Profile Panel"
              className="p-1.5 rounded-lg text-[#55776d] hover:text-[#b91c1c] hover:bg-[#fff5f5] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Large Avatar */}
        <div className="w-16 h-16 rounded-full bg-[#ede9fe] text-[#6d28d9] font-bold text-lg flex items-center justify-center shadow-xs">
          {initials}
        </div>

        <h3 className="text-base font-bold text-[#173d37] mt-3">
          {session.patientName || `+${session.phoneNumber}`}
        </h3>

        <div className="flex items-center gap-1.5 mt-1 text-xs text-[#55776d]">
          <span>+{session.phoneNumber}</span>
          <button
            onClick={handleCopyPhone}
            title="Copy phone number"
            className="text-[#77a193] hover:text-[#176e56]"
          >
            {copiedPhone ? (
              <Check className="w-3.5 h-3.5 text-[#176e56]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                tag.toLowerCase() === 'patient'
                  ? 'bg-[#eaf5ef] text-[#176e56] border border-[#cbe4d5]'
                  : 'bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Directory Links List */}
      <div className="p-3 border-b border-[#dbe9e0] divide-y divide-[#f0f6f2] text-xs">
        <button className="w-full flex items-center justify-between py-2 px-2 text-[#173d37] hover:bg-[#f8faf8] rounded-lg transition-colors font-medium">
          <div className="flex items-center gap-2">
            <ListPlus className="w-4 h-4 text-[#77a193]" />
            <span>Add to List</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#77a193]" />
        </button>

        <button className="w-full flex items-center justify-between py-2 px-2 text-[#173d37] hover:bg-[#f8faf8] rounded-lg transition-colors font-medium">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#77a193]" />
            <span>Assign to Team</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#77a193]" />
        </button>

        <div className="py-1 px-2">
          {showTagInput ? (
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                placeholder="Tag name (e.g. VIP)"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                className="flex-1 px-2 py-1 rounded bg-[#f8faf8] border border-[#dbe9e0] text-xs text-[#173d37]"
              />
              <button
                onClick={handleSaveTag}
                className="px-2 py-1 bg-[#176e56] text-white rounded text-[11px] font-bold"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              className="w-full flex items-center justify-between py-1 text-[#173d37] hover:bg-[#f8faf8] rounded transition-colors font-medium"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#77a193]" />
                <span>Add Tag</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#77a193]" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-[#dbe9e0]">
        <h4 className="text-xs font-bold text-[#173d37] uppercase tracking-wider mb-2.5">
          Quick Actions
        </h4>
        <div className="space-y-2">
          <button
            onClick={() => onOpenQuickAction('appointment')}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#eaf5ef] hover:bg-[#d9efe2] text-[#176e56] text-xs font-semibold transition-all border border-[#cce3d4]"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>

          <button
            onClick={() => onOpenQuickAction('prescription')}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#eaf5ef] hover:bg-[#d9efe2] text-[#176e56] text-xs font-semibold transition-all border border-[#cce3d4]"
          >
            <FileText className="w-4 h-4" />
            <span>Send Prescription</span>
          </button>

          <button
            onClick={() => onOpenQuickAction('bill')}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#eaf5ef] hover:bg-[#d9efe2] text-[#176e56] text-xs font-semibold transition-all border border-[#cce3d4]"
          >
            <CreditCard className="w-4 h-4" />
            <span>Send Bill</span>
          </button>

          <button
            onClick={() => onOpenQuickAction('reminder')}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#eaf5ef] hover:bg-[#d9efe2] text-[#176e56] text-xs font-semibold transition-all border border-[#cce3d4]"
          >
            <Bell className="w-4 h-4" />
            <span>Send Reminder</span>
          </button>
        </div>
      </div>

      {/* Notes Section */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-[#173d37] uppercase tracking-wider">Notes</h4>
          {!editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="flex items-center gap-1 text-xs font-bold text-[#176e56] hover:text-[#125643]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{notesText ? 'Edit' : 'Add'}</span>
            </button>
          )}
        </div>

        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              rows={3}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Write a clinical or administrative note..."
              className="w-full p-2.5 rounded-xl bg-[#f8faf8] border border-[#54a987] text-xs text-[#173d37] focus:outline-none focus:bg-white resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingNotes(false)}
                className="px-2.5 py-1 text-xs text-[#55776d] hover:text-[#173d37]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="px-3 py-1 bg-[#176e56] hover:bg-[#125643] text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#f8faf8] border border-[#dbe9e0] text-xs">
            <p className="text-[#173d37] leading-relaxed">
              {session.notes || 'No notes added yet for this contact.'}
            </p>
            <p className="text-[10px] text-[#77a193] mt-2">
              By {session.assignedTo || 'Staff'} •{' '}
              {new Date(session.updatedAt || Date.now()).toLocaleDateString([], {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
