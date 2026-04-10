import { useState, useCallback } from 'react';
import { useAppDispatch, useAppState } from '../contexts/AppContext';
import type { Caregiver, AvailabilityWindow } from '../lib/types';
import { CAREGIVER_COLORS } from '../lib/types';
import { X, Plus, Trash2 } from 'lucide-react';
import { minutesToTime, timeToMinutes } from '../lib/storage';

interface Props {
  caregiver: Caregiver | null; // null = add new
  onClose: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function genId() {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

function emptyWindow(): AvailabilityWindow {
  return { id: genId(), days: [], startMinutes: 480, endMinutes: 1020 };
}

export function CaregiverFormDialog({ caregiver, onClose }: Props) {
  const dispatch = useAppDispatch();
  const state = useAppState();

  const [name, setName] = useState(caregiver?.name ?? '');
  const [maxDays, setMaxDays] = useState(caregiver?.maxDays ?? 5);
  const [maxDaysPer, setMaxDaysPer] = useState<'week' | 'month'>(caregiver?.maxDaysPer ?? 'week');
  const [windows, setWindows] = useState<AvailabilityWindow[]>(
    caregiver?.availabilityWindows.length ? [...caregiver.availabilityWindows] : [emptyWindow()]
  );

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase()).join('').slice(0, 2);
    
    if (caregiver) {
      dispatch({
        type: 'UPDATE_CAREGIVER',
        caregiver: { ...caregiver, name: name.trim(), initials, maxDays, maxDaysPer, availabilityWindows: windows },
      });
    } else {
      const usedColors = new Set(state.caregivers.map(c => c.color));
      const color = CAREGIVER_COLORS.find(c => !usedColors.has(c)) ?? CAREGIVER_COLORS[state.caregivers.length % CAREGIVER_COLORS.length];

      dispatch({
        type: 'ADD_CAREGIVER',
        caregiver: {
          id: genId(),
          name: name.trim(),
          initials,
          color,
          availabilityWindows: windows,
          maxDays,
          maxDaysPer,
          overrides: [],
        },
      });
    }
    onClose();
  }, [name, maxDays, maxDaysPer, windows, caregiver, dispatch, onClose, state.caregivers]);

  const toggleDay = (winIndex: number, day: number) => {
    setWindows(prev => prev.map((w, i) => {
      if (i !== winIndex) return w;
      const days = w.days.includes(day) ? w.days.filter(d => d !== day) : [...w.days, day];
      return { ...w, days };
    }));
  };

  const updateWindow = (winIndex: number, field: 'startMinutes' | 'endMinutes', value: string) => {
    setWindows(prev => prev.map((w, i) => {
      if (i !== winIndex) return w;
      return { ...w, [field]: timeToMinutes(value) };
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">
            {caregiver ? 'Edit Caregiver' : 'Add Caregiver'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              placeholder="Full name"
              required
            />
          </div>

          {/* Max days */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Max days</label>
              <input
                type="number"
                min={1}
                value={maxDays}
                onChange={e => setMaxDays(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Per</label>
              <select
                value={maxDaysPer}
                onChange={e => setMaxDaysPer(e.target.value as 'week' | 'month')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          </div>

          {/* Availability windows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Availability Windows</label>
              <button
                type="button"
                onClick={() => setWindows(prev => [...prev, emptyWindow()])}
                className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <Plus size={14} /> Add window
              </button>
            </div>
            <div className="space-y-3">
              {windows.map((win, wi) => (
                <div key={win.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">Window {wi + 1}</span>
                    {windows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setWindows(prev => prev.filter((_, i) => i !== wi))}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {/* Days */}
                  <div className="flex gap-1 mb-2">
                    {DAYS.map((d, di) => (
                      <button
                        key={di}
                        type="button"
                        onClick={() => toggleDay(wi, di)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                          win.days.includes(di)
                            ? 'bg-amber-500 text-white'
                            : 'bg-white border border-slate-200 text-slate-500 hover:border-amber-300'
                        }`}
                      >
                        {d[0]}
                      </button>
                    ))}
                  </div>
                  {/* Time range */}
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={minutesToTime(win.startMinutes)}
                      onChange={e => updateWindow(wi, 'startMinutes', e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded text-sm font-mono"
                    />
                    <span className="text-slate-400">—</span>
                    <input
                      type="time"
                      value={minutesToTime(win.endMinutes)}
                      onChange={e => updateWindow(wi, 'endMinutes', e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded text-sm font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
            >
              {caregiver ? 'Save Changes' : 'Add Caregiver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
