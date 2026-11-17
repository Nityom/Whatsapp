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
      <div className="w-full lg:w-80 bg-white border border-[#e2ece6] rounded-xl p-6 h-[740px] flex items-center justify-center text-center text-xs text-[#55776d]">
        <p>Select a conversation to see patient details</p>
      </div>
    );
  }

  const initials = session.patientName
    ? session.patientName.slice(0, 2).toUpperCase()
    : session.phoneNumber.slice(-2);

  const tags = session.tags || ['Patient'];

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
    <div className="w-full lg:w-80 bg-white border border-[#e2ece6] rounded-xl h-[740px] flex flex-col overflow-y-auto shrink-0">
      {/* Top Patient Profile Header */}
      <div className="p-4 border-b border-[#e2ece6] flex flex-col items-center text-center relative">
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <button
            type="button"
            title="Edit patient details"
            className="p-1 rounded-md text-[#55776d] hover:text-[#173d37] hover:bg-[#f0f5f2] transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close profile panel"
              className="p-1 rounded-md text-[#55776d] hover:text-[#b91c1c] hover:bg-[#fff5f5] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-[#f0f5f2] border border-[#dbe9e0] text-[#176e56] font-medium text-sm flex items-center justify-center">
          {initials}
        </div>

        <h3 className="text-sm font-semibold text-[#173d37] mt-2.5">
          {session.patientName || `+${session.phoneNumber}`}
        </h3>

        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#55776d]">
          <span className="font-mono tabular-nums">+{session.phoneNumber}</span>
          <button
            type="button"
            onClick={handleCopyPhone}
            title="Copy phone number"
            className="text-[#77a193] hover:text-[#176e56]"
          >
            {copiedPhone ? (
              <Check className="w-3 h-3 text-[#176e56]" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center justify-center gap-1 mt-2.5">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#f0f5f2] text-[#176e56] border border-[#dbe9e0]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Directory Links List */}
      <div className="p-2 border-b border-[#e2ece6] divide-y divide-[#f0f6f2] text-xs">
        <button
          type="button"
          className="w-full flex items-center justify-between py-2 px-2 text-[#173d37] hover:bg-[#f8faf8] rounded-md transition-colors"
        >
          <div className="flex items-center gap-2">
            <ListPlus className="w-3.5 h-3.5 text-[#77a193]" />
            <span>Add to list</span>
          </div>
          <ChevronRight className="w-3 h-3 text-[#77a193]" />
        </button>

        <button
          type="button"
          className="w-full flex items-center justify-between py-2 px-2 text-[#173d37] hover:bg-[#f8faf8] rounded-md transition-colors"
        >
          <div className="flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-[#77a193]" />
            <span>Assign to staff</span>
          </div>
          <ChevronRight className="w-3 h-3 text-[#77a193]" />
        </button>

        <div className="py-1 px-2">
          {showTagInput ? (
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                placeholder="Tag name..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                className="flex-1 h-7 px-2 rounded bg-[#f8faf8] border border-[#dbe9e0] text-xs text-[#173d37]"
              />
              <button
                type="button"
                onClick={handleSaveTag}
                className="h-7 px-2.5 bg-[#176e56] text-white rounded text-xs font-medium"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowTagInput(true)}
              className="w-full flex items-center justify-between py-1 text-[#173d37] hover:bg-[#f8faf8] rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-[#77a193]" />
                <span>Add tag</span>
              </div>
              <ChevronRight className="w-3 h-3 text-[#77a193]" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3.5 border-b border-[#e2ece6]">
        <h4 className="text-xs font-medium text-[#55776d] mb-2">
          Clinical actions
        </h4>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => onOpenQuickAction('appointment')}
            className="w-full h-9 flex items-center gap-2.5 px-3 rounded-lg bg-white hover:bg-[#f8faf8] text-[#173d37] text-xs font-medium transition-colors border border-[#dbe9e0]"
          >
            <Calendar className="w-3.5 h-3.5 text-[#176e56]" />
            <span>Book appointment</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickAction('prescription')}
            className="w-full h-9 flex items-center gap-2.5 px-3 rounded-lg bg-white hover:bg-[#f8faf8] text-[#173d37] text-xs font-medium transition-colors border border-[#dbe9e0]"
          >
            <FileText className="w-3.5 h-3.5 text-[#176e56]" />
            <span>Send prescription</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickAction('bill')}
            className="w-full h-9 flex items-center gap-2.5 px-3 rounded-lg bg-white hover:bg-[#f8faf8] text-[#173d37] text-xs font-medium transition-colors border border-[#dbe9e0]"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#176e56]" />
            <span>Send bill</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickAction('reminder')}
            className="w-full h-9 flex items-center gap-2.5 px-3 rounded-lg bg-white hover:bg-[#f8faf8] text-[#173d37] text-xs font-medium transition-colors border border-[#dbe9e0]"
          >
            <Bell className="w-3.5 h-3.5 text-[#176e56]" />
            <span>Send reminder</span>
          </button>
        </div>
      </div>

      {/* Notes Section */}
      <div className="p-3.5 flex-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-[#55776d]">Clinical notes</h4>
          {!editingNotes && (
            <button
              type="button"
              onClick={() => setEditingNotes(true)}
              className="flex items-center gap-1 text-xs font-medium text-[#176e56] hover:underline"
            >
              <Plus className="w-3 h-3" />
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
              placeholder="Write a clinical note..."
              className="w-full p-2.5 rounded-lg bg-[#f8faf8] border border-[#176e56] text-xs text-[#173d37] focus:outline-none focus:bg-white resize-none"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setEditingNotes(false)}
                className="h-7 px-2.5 text-xs text-[#55776d] hover:text-[#173d37]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="h-7 px-3 bg-[#176e56] hover:bg-[#125643] text-white rounded-md text-xs font-medium flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-[#f8faf8] border border-[#e2ece6] text-xs">
            <p className="text-[#173d37] leading-relaxed">
              {session.notes || 'No notes added yet for this contact.'}
            </p>
            <p className="text-[11px] text-[#77a193] mt-2">
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
