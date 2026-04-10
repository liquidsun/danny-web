import { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useAppState, useAppDispatch } from '../contexts/AppContext';
import { CaregiverSidebar } from '../components/CaregiverSidebar';
import { WeekView } from '../components/WeekView';
import { MonthView } from '../components/MonthView';
import { formatDate, parseDate, addDays, getMonday, isInScheduleRange, MONTH_NAMES } from '../lib/storage';
import type { Caregiver, DisplayBlock } from '../lib/types';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, FileText, Baby } from 'lucide-react';

const CaregiverFormDialog = lazy(() =>
  import('../components/CaregiverFormDialog').then(m => ({ default: m.CaregiverFormDialog }))
);
const AssignSlotDialog = lazy(() =>
  import('../components/AssignSlotDialog').then(m => ({ default: m.AssignSlotDialog }))
);
const SlotDetailPopover = lazy(() =>
  import('../components/SlotDetailPopover').then(m => ({ default: m.SlotDetailPopover }))
);
const ExportDialog = lazy(() =>
  import('../components/ExportDialog').then(m => ({ default: m.ExportDialog }))
);

export default function Home() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  // Dialog states
  const [editingCaregiver, setEditingCaregiver] = useState<Caregiver | null | 'new'>(null);
  const [assignSlot, setAssignSlot] = useState<{ date: string; startMinutes: number } | null>(null);
  const [blockDetail, setBlockDetail] = useState<{ block: DisplayBlock; position: { top: number; left: number } } | null>(null);
  const [showExport, setShowExport] = useState(false);

  const currentDate = useMemo(() => parseDate(state.currentDate), [state.currentDate]);

  const headerLabel = useMemo(() => {
    if (state.currentView === 'week') {
      const monday = currentDate;
      const sunday = addDays(monday, 6);
      const mMonth = MONTH_NAMES[monday.getMonth()];
      const sMonth = MONTH_NAMES[sunday.getMonth()];
      if (mMonth === sMonth) {
        return `${monday.getDate()} – ${sunday.getDate()} ${mMonth} ${monday.getFullYear()}`;
      }
      return `${monday.getDate()} ${mMonth} – ${sunday.getDate()} ${sMonth} ${monday.getFullYear()}`;
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [state.currentView, currentDate]);

  const navigate = useCallback((dir: number) => {
    let newDate: Date;
    if (state.currentView === 'week') {
      newDate = addDays(currentDate, dir * 7);
    } else {
      newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1);
    }
    const ds = formatDate(newDate);
    if (isInScheduleRange(ds)) {
      dispatch({ type: 'SET_DATE', date: ds });
    }
  }, [state.currentView, currentDate, dispatch]);

  const goToday = useCallback(() => {
    const today = new Date();
    const monday = getMonday(today);
    const ds = formatDate(monday);
    if (isInScheduleRange(ds)) {
      dispatch({ type: 'SET_DATE', date: ds });
    }
  }, [dispatch]);

  const handleSlotClick = useCallback((date: string, startMinutes: number) => {
    setAssignSlot({ date, startMinutes });
  }, []);

  const handleBlockClick = useCallback((block: DisplayBlock, rect: DOMRect) => {
    setBlockDetail({ block, position: { top: rect.top, left: rect.right + 8 } });
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <CaregiverSidebar
        onEditCaregiver={c => setEditingCaregiver(c)}
        onAddCaregiver={() => setEditingCaregiver('new')}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-800">
              <Baby size={22} className="text-amber-500" />
              <span className="font-semibold text-base">Dani's Friends Today</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View tabs */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => dispatch({ type: 'SET_VIEW', view: 'week' })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  state.currentView === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Calendar size={14} /> Week
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_VIEW', view: 'month' })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  state.currentView === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <CalendarDays size={14} /> Month
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-slate-800 min-w-48 text-center">{headerLabel}</span>
              <button
                onClick={() => navigate(1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              onClick={goToday}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors ml-1"
            >
              Today
            </button>

            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <FileText size={14} /> Export PDF
            </button>
          </div>
        </header>

        {/* Calendar view */}
        <div className="flex-1 overflow-hidden">
          {state.currentView === 'week' ? (
            <WeekView onSlotClick={handleSlotClick} onBlockClick={handleBlockClick} />
          ) : (
            <MonthView />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Suspense fallback={null}>
        {editingCaregiver !== null && (
          <CaregiverFormDialog
            caregiver={editingCaregiver === 'new' ? null : editingCaregiver}
            onClose={() => setEditingCaregiver(null)}
          />
        )}
        {assignSlot && (
          <AssignSlotDialog
            date={assignSlot.date}
            initialStartMinutes={assignSlot.startMinutes}
            onClose={() => setAssignSlot(null)}
          />
        )}
        {blockDetail && (
          <SlotDetailPopover
            block={blockDetail.block}
            position={blockDetail.position}
            onClose={() => setBlockDetail(null)}
          />
        )}
        {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      </Suspense>
    </div>
  );
}
