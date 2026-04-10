import { useState, useCallback } from 'react';
import { useAppState } from '../contexts/AppContext';
import { formatDate, parseDate, mergeSlots, minutesToTime } from '../lib/storage';
import { SCHEDULE_START, SCHEDULE_END } from '../lib/types';
import type { Caregiver } from '../lib/types';
import { X, FileText } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function ExportDialog({ onClose }: Props) {
  const state = useAppState();

  const [startDate, setStartDate] = useState(SCHEDULE_START);
  const [endDate, setEndDate] = useState(SCHEDULE_END);
  const [selectedCgIds, setSelectedCgIds] = useState<Set<string>>(new Set(state.caregivers.map(c => c.id)));

  const toggleCaregiver = (id: string) => {
    setSelectedCgIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = useCallback(() => {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const caregiverMap = new Map<string, Caregiver>();
    for (const c of state.caregivers) caregiverMap.set(c.id, c);

    // Build export HTML
    const days: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      days.push(formatDate(current));
      current.setDate(current.getDate() + 1);
    }

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Dani's Friends Today - Schedule Export</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'DM Sans', sans-serif; padding: 24px; color: #0f172a; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      .subtitle { font-size: 12px; color: #64748b; margin-bottom: 24px; }
      .day { margin-bottom: 16px; page-break-inside: avoid; }
      .day-header { font-size: 14px; font-weight: 600; margin-bottom: 6px; padding: 4px 8px; background: #f8fafc; border-radius: 6px; }
      .assignment { display: flex; align-items: center; gap: 8px; padding: 4px 8px; font-size: 12px; }
      .avatar { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: 600; }
      .time { font-family: 'DM Mono', monospace; color: #64748b; min-width: 100px; }
      .name { font-weight: 500; }
      .no-assignments { font-size: 12px; color: #94a3b8; padding: 4px 8px; font-style: italic; }
      @media print { body { padding: 12px; } @page { size: A4; margin: 16mm; } }
    </style></head><body>
    <h1>Dani's Friends Today</h1>
    <div class="subtitle">Schedule: ${startDate} to ${endDate}</div>`;

    for (const dateStr of days) {
      const blocks = mergeSlots(state.slots, dateStr).filter(b =>
        b.assignments.some(a => selectedCgIds.has(a.caregiverId))
      );

      if (blocks.length === 0) continue;

      const dayName = new Date(dateStr + 'T00:00:00').toLocaleDateString('en', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      html += `<div class="day"><div class="day-header">${dayName}</div>`;

      for (const block of blocks) {
        for (const a of block.assignments) {
          if (!selectedCgIds.has(a.caregiverId)) continue;
          const cg = caregiverMap.get(a.caregiverId);
          if (!cg) continue;
          html += `<div class="assignment">
            <div class="avatar" style="background:${cg.color}">${cg.initials}</div>
            <span class="time">${minutesToTime(block.startMinutes)} – ${minutesToTime(block.endMinutes)}</span>
            <span class="name">${cg.name}</span>
          </div>`;
        }
      }

      html += `</div>`;
    }

    html += `</body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
    onClose();
  }, [startDate, endDate, selectedCgIds, state.caregivers, state.slots, onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FileText size={20} /> Export PDF
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Date range */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                min={SCHEDULE_START}
                max={SCHEDULE_END}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">End date</label>
              <input
                type="date"
                value={endDate}
                min={SCHEDULE_START}
                max={SCHEDULE_END}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Caregiver filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Include caregivers</label>
            <div className="space-y-1.5">
              {state.caregivers.map(cg => (
                <label key={cg.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedCgIds.has(cg.id)}
                    onChange={() => toggleCaregiver(cg.id)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  />
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-semibold"
                    style={{ backgroundColor: cg.color }}
                  >
                    {cg.initials}
                  </div>
                  <span className="text-sm text-slate-700">{cg.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleExport}
            className="w-full py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
