import { memo, useCallback, useMemo, useState } from 'react';
import { useAppState, useAppDispatch } from '../contexts/AppContext';
import { getCaregiverUsage, getWeekRange, getMonthRange, DAY_LABELS } from '../lib/storage';
import type { Caregiver } from '../lib/types';
import { Pencil, Trash2, AlertTriangle, Plus } from 'lucide-react';

interface Props {
  onEditCaregiver: (c: Caregiver) => void;
  onAddCaregiver: () => void;
}

export const CaregiverSidebar = memo(function CaregiverSidebar({ onEditCaregiver, onAddCaregiver }: Props) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const usageMap = useMemo(() => {
    const map = new Map<string, { used: number; max: number }>();
    for (const cg of state.caregivers) {
      let range: [string, string];
      if (cg.maxDaysPer === 'week') {
        range = getWeekRange(state.currentDate);
      } else {
        range = getMonthRange(state.currentDate);
      }
      const used = getCaregiverUsage(cg, state.slots, range[0], range[1]);
      map.set(cg.id, { used, max: cg.maxDays });
    }
    return map;
  }, [state.caregivers, state.slots, state.currentDate]);

  const handleToggle = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_CAREGIVER_VISIBILITY', id });
  }, [dispatch]);

  const handleDelete = useCallback((id: string) => {
    if (deleteConfirm === id) {
      dispatch({ type: 'DELETE_CAREGIVER', id });
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
    }
  }, [dispatch, deleteConfirm]);

  return (
    <aside className="w-72 min-w-72 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 text-sm">Caregivers</h2>
        <button
          onClick={onAddCaregiver}
          className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
          title="Add caregiver"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {state.caregivers.map(cg => {
          const hidden = state.hiddenCaregiverIds.includes(cg.id);
          const usage = usageMap.get(cg.id);
          const overLimit = usage && usage.used > usage.max;
          const pct = usage ? Math.min((usage.used / usage.max) * 100, 100) : 0;
          
          return (
            <div
              key={cg.id}
              className={`rounded-xl border p-3 cursor-pointer transition-all ${
                hidden ? 'opacity-50 border-slate-200 bg-slate-50' : 'border-slate-200 bg-white hover:shadow-sm'
              }`}
              onClick={() => handleToggle(cg.id)}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ backgroundColor: cg.color }}
                >
                  {cg.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-slate-900 truncate">{cg.name}</span>
                    {overLimit && <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {[0, 1, 2, 3, 4, 5, 6].map(day => {
                      const hasDay = cg.availabilityWindows.some(w => w.days.includes(day));
                      return (
                        <span
                          key={day}
                          className="text-[10px] w-4 h-4 rounded flex items-center justify-center font-medium"
                          style={{
                            backgroundColor: hasDay ? cg.color + '20' : '#f1f5f9',
                            color: hasDay ? cg.color : '#94a3b8',
                          }}
                        >
                          {DAY_LABELS[day]}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    onClick={() => onEditCaregiver(cg)}
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className={`p-1 rounded hover:bg-red-50 ${deleteConfirm === cg.id ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-500'}`}
                    onClick={() => handleDelete(cg.id)}
                    title={deleteConfirm === cg.id ? 'Click again to confirm' : 'Delete'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {/* Usage bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-slate-500 font-mono">
                    {usage?.used ?? 0}/{usage?.max ?? 0} days/{cg.maxDaysPer}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: overLimit ? '#f59e0b' : cg.color,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
});
