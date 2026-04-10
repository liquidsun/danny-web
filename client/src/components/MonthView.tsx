import { memo, useMemo, useCallback } from 'react';
import { useAppState, useAppDispatch } from '../contexts/AppContext';
import { getMonthGrid, formatDate, parseDate, isSameDay, mergeSlots } from '../lib/storage';
import type { Caregiver } from '../lib/types';

export const MonthView = memo(function MonthView() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const currentDate = useMemo(() => parseDate(state.currentDate), [state.currentDate]);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const weeks = useMemo(() => getMonthGrid(year, month), [year, month]);
  const today = useMemo(() => new Date(), []);

  const caregiverMap = useMemo(() => {
    const m = new Map<string, Caregiver>();
    for (const c of state.caregivers) m.set(c.id, c);
    return m;
  }, [state.caregivers]);

  const daySummaries = useMemo(() => {
    const map = new Map<string, { caregiverIds: string[]; totalSlots: number; coveredSlots: number }>();
    for (const week of weeks) {
      for (const day of week) {
        const ds = formatDate(day);
        const blocks = mergeSlots(state.slots, ds);
        const caregiverIds = new Set<string>();
        let coveredMinutes = 0;
        for (const b of blocks) {
          for (const a of b.assignments) {
            if (!state.hiddenCaregiverIds.includes(a.caregiverId)) {
              caregiverIds.add(a.caregiverId);
            }
          }
          coveredMinutes += b.endMinutes - b.startMinutes;
        }
        map.set(ds, {
          caregiverIds: Array.from(caregiverIds),
          totalSlots: 48,
          coveredSlots: Math.round(coveredMinutes / 30),
        });
      }
    }
    return map;
  }, [weeks, state.slots, state.hiddenCaregiverIds]);

  const goToWeek = useCallback((d: Date) => {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(monday.getDate() + diff);
    dispatch({ type: 'SET_DATE', date: formatDate(monday) });
    dispatch({ type: 'SET_VIEW', view: 'week' });
  }, [dispatch]);

  return (
    <div className="flex flex-col h-full p-4">
      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
        {/* Day headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="bg-slate-50 text-center py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
            {d}
          </div>
        ))}
        {/* Day cells */}
        {weeks.flat().map((day, i) => {
          const ds = formatDate(day);
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const summary = daySummaries.get(ds);
          const coveragePct = summary ? Math.round((summary.coveredSlots / summary.totalSlots) * 100) : 0;

          return (
            <div
              key={i}
              className={`bg-white min-h-24 p-2 cursor-pointer hover:bg-slate-50 transition-colors ${
                !isCurrentMonth ? 'opacity-40' : ''
              } ${isToday ? 'ring-2 ring-inset ring-amber-400' : ''}`}
              onClick={() => goToWeek(day)}
            >
              <div className={`text-sm font-medium mb-1 ${isToday ? 'text-amber-700' : 'text-slate-700'}`}>
                {day.getDate()}
              </div>
              {/* Caregiver color bars */}
              <div className="space-y-0.5">
                {summary?.caregiverIds.slice(0, 4).map(id => {
                  const cg = caregiverMap.get(id);
                  if (!cg) return null;
                  return (
                    <div
                      key={id}
                      className="h-1.5 rounded-full"
                      style={{ backgroundColor: cg.color + '60' }}
                    />
                  );
                })}
              </div>
              {coveragePct > 0 && (
                <div className="mt-1 text-[10px] font-mono text-slate-400">
                  {coveragePct}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
