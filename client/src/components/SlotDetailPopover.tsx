import { useState, useMemo, useCallback } from 'react';
import { useAppState, useAppDispatch } from '../contexts/AppContext';
import { minutesToTime } from '../lib/storage';
import type { DisplayBlock } from '../lib/types';
import { X, Check, Trash2, AlertTriangle, UserPlus, Pencil } from 'lucide-react';

interface Props {
  block: DisplayBlock;
  position: { top: number; left: number };
  onClose: () => void;
  onEdit: (block: DisplayBlock) => void;
}

export function SlotDetailPopover({ block, position, onClose, onEdit }: Props) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const caregiverMap = useMemo(() => {
    const m = new Map<string, (typeof state.caregivers)[0]>();
    for (const c of state.caregivers) m.set(c.id, c);
    return m;
  }, [state.caregivers]);

  const assignedIds = useMemo(() => new Set(block.assignments.map(a => a.caregiverId)), [block.assignments]);
  const unassignedCaregivers = useMemo(
    () => state.caregivers.filter(c => !assignedIds.has(c.id)),
    [state.caregivers, assignedIds]
  );

  const handleConfirm = useCallback((caregiverId: string) => {
    dispatch({ type: 'CONFIRM_ASSIGNMENT', slotIds: block.slotIds, caregiverId });
  }, [dispatch, block.slotIds]);

  const handleRemoveAssignment = useCallback((caregiverId: string) => {
    dispatch({ type: 'REMOVE_ASSIGNMENT', slotIds: block.slotIds, caregiverId });
  }, [dispatch, block.slotIds]);

  const handleDeleteBlock = useCallback(() => {
    dispatch({ type: 'DELETE_BLOCK', slotIds: block.slotIds });
    onClose();
  }, [dispatch, block.slotIds, onClose]);

  const handleAddCaregiver = useCallback((caregiverId: string) => {
    dispatch({ type: 'ADD_ASSIGNMENT_TO_SLOTS', slotIds: block.slotIds, caregiverId });
    setShowAddDropdown(false);
  }, [dispatch, block.slotIds]);

  const dateLabel = new Date(block.date + 'T00:00:00').toLocaleDateString('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeLabel = `${minutesToTime(block.startMinutes)} – ${minutesToTime(block.endMinutes)}`;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute bg-white rounded-xl shadow-xl border border-slate-200 w-80"
        style={{
          top: Math.min(position.top, window.innerHeight - 400),
          left: Math.min(position.left, window.innerWidth - 340),
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-slate-900">{dateLabel}</span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <span className="text-xs font-mono text-slate-500">{timeLabel}</span>
          {block.isPending && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
              <AlertTriangle size={12} />
              Decision pending — select a caregiver below
            </div>
          )}
        </div>

        <div className="p-3 space-y-2">
          {block.assignments.map(a => {
            const cg = caregiverMap.get(a.caregiverId);
            if (!cg) return null;
            return (
              <div key={a.caregiverId} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                  style={{ backgroundColor: cg.color }}
                >
                  {cg.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-800 truncate">{cg.name}</div>
                  <div className={`text-[10px] ${a.status === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {a.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleConfirm(a.caregiverId)}
                    className="p-1 rounded hover:bg-emerald-100 text-emerald-500"
                    title="Confirm"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleRemoveAssignment(a.caregiverId)}
                    className="p-1 rounded hover:bg-red-100 text-red-400"
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-3 pb-3 space-y-2">
          {/* Add another */}
          {unassignedCaregivers.length > 0 && (
            <div>
              <button
                onClick={() => setShowAddDropdown(!showAddDropdown)}
                className="w-full text-left text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 py-1"
              >
                <UserPlus size={12} /> Add another caregiver
              </button>
              {showAddDropdown && (
                <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden">
                  {unassignedCaregivers.map(cg => (
                    <button
                      key={cg.id}
                      onClick={() => handleAddCaregiver(cg.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-semibold"
                        style={{ backgroundColor: cg.color }}
                      >
                        {cg.initials}
                      </div>
                      <span className="text-sm text-slate-700">{cg.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Edit block */}
          <button
            onClick={() => { onEdit(block); onClose(); }}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 py-2 rounded-lg transition-colors"
          >
            <Pencil size={12} /> Edit this assignment
          </button>

          {/* Delete block */}
          <button
            onClick={handleDeleteBlock}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors"
          >
            <Trash2 size={12} /> Remove this assignment
          </button>
        </div>
      </div>
    </div>
  );
}
