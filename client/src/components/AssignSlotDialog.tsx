import { useState, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppState } from '../contexts/AppContext';
import { minutesToTime, timeToMinutes, roundToSlot, isCaregiverAvailableForRange, generateSlotId } from '../lib/storage';
import type { SlotRecord, DisplayBlock } from '../lib/types';
import { X, AlertTriangle, Check } from 'lucide-react';

interface Props {
  date: string;
  initialStartMinutes: number;
  onClose: () => void;
  editBlock?: DisplayBlock;
}

export function AssignSlotDialog({ date, initialStartMinutes, onClose, editBlock }: Props) {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const roundedStart = editBlock ? editBlock.startMinutes : roundToSlot(initialStartMinutes);
  const defaultEnd = editBlock ? editBlock.endMinutes : Math.min(roundToSlot(initialStartMinutes) + 120, 1440);
  const [startTime, setStartTime] = useState(minutesToTime(roundedStart));
  const [endTime, setEndTime] = useState(minutesToTime(defaultEnd));
  const defaultCgId = editBlock
    ? (editBlock.assignments.find(a => a.status === 'confirmed')?.caregiverId ?? editBlock.assignments[0]?.caregiverId ?? null)
    : null;
  const [selectedCgId, setSelectedCgId] = useState<string | null>(defaultCgId);

  const startMin = useMemo(() => timeToMinutes(startTime), [startTime]);
  const endMin = useMemo(() => timeToMinutes(endTime), [endTime]);

  const caregiverAvailability = useMemo(() => {
    return state.caregivers.map(cg => ({
      caregiver: cg,
      available: isCaregiverAvailableForRange(cg, date, startMin, endMin),
    }));
  }, [state.caregivers, date, startMin, endMin]);

  const handleAssign = useCallback(() => {
    if (!selectedCgId || endMin <= startMin) return;

    // If editing, remove old slots first
    if (editBlock) {
      dispatch({ type: 'DELETE_BLOCK', slotIds: editBlock.slotIds });
    }

    const slots: SlotRecord[] = [];
    for (let t = startMin; t < endMin; t += 30) {
      slots.push({
        id: generateSlotId(),
        date,
        startMinutes: t,
        endMinutes: t + 30,
        assignments: [{ caregiverId: selectedCgId, status: 'confirmed' }],
      });
    }
    dispatch({ type: 'ASSIGN_SLOTS', slots });
    onClose();
  }, [selectedCgId, startMin, endMin, date, dispatch, onClose, editBlock]);

  const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{editBlock ? 'Edit Assignment' : 'Assign Caregiver'}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{dayLabel}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Time range */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
              <input
                type="time"
                step="1800"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
              <input
                type="time"
                step="1800"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Caregiver list */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Select caregiver</label>
            <div className="space-y-2">
              {caregiverAvailability.map(({ caregiver, available }) => (
                <div
                  key={caregiver.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedCgId === caregiver.id
                      ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedCgId(caregiver.id)}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                    style={{ backgroundColor: caregiver.color }}
                  >
                    {caregiver.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{caregiver.name}</div>
                    {available ? (
                      <div className="text-xs text-emerald-600 flex items-center gap-1">
                        <Check size={12} /> Available in schedule
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle size={12} /> Not in usual schedule
                      </div>
                    )}
                  </div>
                  {selectedCgId === caregiver.id && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleAssign}
            disabled={!selectedCgId || endMin <= startMin}
            className="w-full py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-colors"
          >
            {editBlock ? 'Save Changes' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}
