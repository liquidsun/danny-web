import { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useAppState } from '../contexts/AppContext';
import { mergeSlots, formatDate, getWeekDays, parseDate, minutesToTime, isSameDay } from '../lib/storage';
import type { DisplayBlock, Caregiver } from '../lib/types';

interface Props {
  onSlotClick: (date: string, startMinutes: number) => void;
  onBlockClick: (block: DisplayBlock, rect: DOMRect) => void;
}

const HOUR_HEIGHT = 48;
const SLOT_HEIGHT = HOUR_HEIGHT / 2; // 30 min
const TIME_COL_WIDTH = 56;

export const WeekView = memo(function WeekView({ onSlotClick, onBlockClick }: Props) {
  const state = useAppState();
  const gridRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const monday = useMemo(() => parseDate(state.currentDate), [state.currentDate]);
  const days = useMemo(() => getWeekDays(monday), [monday]);
  const today = useMemo(() => new Date(), []);

  const caregiverMap = useMemo(() => {
    const m = new Map<string, Caregiver>();
    for (const c of state.caregivers) m.set(c.id, c);
    return m;
  }, [state.caregivers]);

  const blocksByDay = useMemo(() => {
    const map = new Map<string, DisplayBlock[]>();
    for (const d of days) {
      const ds = formatDate(d);
      const blocks = mergeSlots(state.slots, ds).filter(b =>
        b.assignments.some(a => !state.hiddenCaregiverIds.includes(a.caregiverId))
      );
      map.set(ds, blocks);
    }
    return map;
  }, [days, state.slots, state.hiddenCaregiverIds]);

  useEffect(() => {
    if (gridRef.current && !hasScrolled) {
      gridRef.current.scrollTop = 8 * HOUR_HEIGHT; // scroll to 08:00
      setHasScrolled(true);
    }
  }, [hasScrolled]);

  const handleGridClick = useCallback((dayIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + (gridRef.current?.scrollTop ?? 0);
    const minutes = Math.floor(y / SLOT_HEIGHT) * 30;
    const dateStr = formatDate(days[dayIndex]);
    onSlotClick(dateStr, Math.max(0, Math.min(minutes, 1410)));
  }, [days, onSlotClick]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="flex border-b border-slate-200 bg-white shrink-0" style={{ paddingLeft: TIME_COL_WIDTH }}>
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div
              key={i}
              className={`flex-1 text-center py-2.5 text-xs font-medium border-l border-slate-100 ${
                isToday ? 'bg-amber-50 text-amber-700' : 'text-slate-600'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider">{d.toLocaleDateString('en', { weekday: 'short' })}</div>
              <div className={`text-lg font-semibold ${isToday ? 'text-amber-700' : 'text-slate-900'}`}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={gridRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="flex" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Time labels */}
          <div className="shrink-0" style={{ width: TIME_COL_WIDTH }}>
            {hours.map(h => (
              <div
                key={h}
                className="text-[11px] text-slate-400 font-mono text-right pr-2 relative"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2 right-2">{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, dayIndex) => {
            const dateStr = formatDate(d);
            const blocks = blocksByDay.get(dateStr) ?? [];
            const isToday = isSameDay(d, today);

            return (
              <div
                key={dayIndex}
                className={`flex-1 relative border-l border-slate-100 cursor-pointer ${isToday ? 'bg-amber-50/30' : ''}`}
                onClick={(e) => handleGridClick(dayIndex, e)}
              >
                {/* Hour lines */}
                {hours.map(h => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-slate-100"
                    style={{ top: h * HOUR_HEIGHT }}
                  />
                ))}
                {/* Half hour lines */}
                {hours.map(h => (
                  <div
                    key={`half-${h}`}
                    className="absolute w-full border-t border-slate-50"
                    style={{ top: h * HOUR_HEIGHT + SLOT_HEIGHT }}
                  />
                ))}

                {/* Now indicator */}
                {isToday && (
                  <div
                    className="absolute w-full h-0.5 bg-red-400 z-20 pointer-events-none"
                    style={{
                      top: (today.getHours() * 60 + today.getMinutes()) / 30 * SLOT_HEIGHT,
                    }}
                  >
                    <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-red-400" />
                  </div>
                )}

                {/* Assignment blocks */}
                {blocks.map((block, bi) => {
                  const confirmedAssignment = block.assignments.find(a => a.status === 'confirmed');
                  const primaryCgId = confirmedAssignment?.caregiverId ?? block.assignments[0]?.caregiverId;
                  const cg = primaryCgId ? caregiverMap.get(primaryCgId) : undefined;

                  const top = (block.startMinutes / 30) * SLOT_HEIGHT;
                  const height = ((block.endMinutes - block.startMinutes) / 30) * SLOT_HEIGHT;
                  const timeLabel = `${minutesToTime(block.startMinutes)}–${minutesToTime(block.endMinutes)}`;

                  return (
                    <div
                      key={bi}
                      className="absolute left-0.5 right-0.5 rounded-[0.4rem] overflow-hidden cursor-pointer z-10 group transition-shadow hover:shadow-md"
                      style={{
                        top: top + 1,
                        height: height - 2,
                        backgroundColor: block.isPending ? 'transparent' : (cg?.color ?? '#94a3b8') + '20',
                        borderLeft: `3px solid ${cg?.color ?? '#94a3b8'}`,
                        background: block.isPending
                          ? `repeating-linear-gradient(45deg, ${cg?.color ?? '#94a3b8'}15, ${cg?.color ?? '#94a3b8'}15 4px, ${cg?.color ?? '#94a3b8'}08 4px, ${cg?.color ?? '#94a3b8'}08 8px)`
                          : undefined,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        onBlockClick(block, rect);
                      }}
                    >
                      <div className="px-1.5 py-0.5 h-full flex flex-col justify-start">
                        <span className="text-[11px] font-semibold truncate" style={{ color: cg?.color ?? '#475569' }}>
                          {cg?.initials ?? '?'}
                          {block.assignments.length > 1 && ` +${block.assignments.length - 1}`}
                        </span>
                        {height > 28 && (
                          <span className="text-[9px] font-mono text-slate-500 truncate">{timeLabel}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
