import type { AppState, SlotRecord, DisplayBlock, Caregiver } from './types';
import { DEFAULT_CAREGIVERS, SCHEDULE_START, SCHEDULE_END } from './types';

const STORAGE_KEY = 'danis-friends-today';

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function saveState(state: AppState): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage might be full
    }
  }, 200);
}

export function loadState(): AppState | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as AppState;
      if (parsed.caregivers && parsed.slots) return parsed;
    }
  } catch {
    // corrupted data
  }
  return null;
}

export function getInitialState(): AppState {
  const saved = loadState();
  if (saved) return saved;
  
  const today = new Date();
  const monday = getMonday(today);
  
  return {
    caregivers: DEFAULT_CAREGIVERS,
    slots: [],
    currentView: 'week',
    currentDate: formatDate(monday),
    hiddenCaregiverIds: [],
  };
}

// Date utilities
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

export function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function getMonthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const monday = getMonday(first);
  const weeks: Date[][] = [];
  let current = new Date(monday);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function isInScheduleRange(dateStr: string): boolean {
  return dateStr >= SCHEDULE_START && dateStr <= SCHEDULE_END;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function roundToSlot(minutes: number): number {
  return Math.round(minutes / 30) * 30;
}

// Block merging algorithm
export function mergeSlots(slots: SlotRecord[], dateStr: string): DisplayBlock[] {
  const daySlots = slots
    .filter(s => s.date === dateStr)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  if (daySlots.length === 0) return [];

  const blocks: DisplayBlock[] = [];
  let current: DisplayBlock = {
    slotIds: [daySlots[0].id],
    date: dateStr,
    startMinutes: daySlots[0].startMinutes,
    endMinutes: daySlots[0].endMinutes,
    assignments: [...daySlots[0].assignments],
    isPending: daySlots[0].assignments.length > 1 || daySlots[0].assignments.some(a => a.status === 'pending'),
  };

  for (let i = 1; i < daySlots.length; i++) {
    const slot = daySlots[i];
    const sameCaregivers = areSameAssignments(current.assignments, slot.assignments);
    
    if (slot.startMinutes === current.endMinutes && sameCaregivers) {
      current.endMinutes = slot.endMinutes;
      current.slotIds.push(slot.id);
    } else {
      blocks.push(current);
      current = {
        slotIds: [slot.id],
        date: dateStr,
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
        assignments: [...slot.assignments],
        isPending: slot.assignments.length > 1 || slot.assignments.some(a => a.status === 'pending'),
      };
    }
  }
  blocks.push(current);
  return blocks;
}

function areSameAssignments(a: { caregiverId: string; status: string }[], b: { caregiverId: string; status: string }[]): boolean {
  if (a.length !== b.length) return false;
  const aIds = a.map(x => `${x.caregiverId}:${x.status}`).sort().join(',');
  const bIds = b.map(x => `${x.caregiverId}:${x.status}`).sort().join(',');
  return aIds === bIds;
}

// Availability check
export function isCaregiverAvailable(
  caregiver: Caregiver,
  dateStr: string,
  startMinutes: number,
  endMinutes: number
): boolean {
  const date = parseDate(dateStr);
  const dayOfWeek = date.getDay();

  // Check overrides first
  const override = caregiver.overrides.find(o => o.date === dateStr);
  if (override) {
    if (!override.available) return false;
    if (override.windows) {
      return override.windows.some(w => w.startMinutes <= startMinutes && w.endMinutes >= endMinutes);
    }
    return true;
  }

  // Check availability windows
  for (const window of caregiver.availabilityWindows) {
    if (!window.days.includes(dayOfWeek)) continue;
    if (window.startMinutes <= startMinutes && window.endMinutes >= endMinutes) {
      return true;
    }
  }
  return false;
}

export function isCaregiverAvailableForRange(
  caregiver: Caregiver,
  dateStr: string,
  startMinutes: number,
  endMinutes: number
): boolean {
  // Check every 30-minute slot in the range
  for (let t = startMinutes; t < endMinutes; t += 30) {
    if (!isCaregiverAvailable(caregiver, dateStr, t, t + 30)) {
      return false;
    }
  }
  return true;
}

// Usage counting
export function getCaregiverUsage(
  caregiver: Caregiver,
  slots: SlotRecord[],
  periodStart: string,
  periodEnd: string
): number {
  const dates = new Set<string>();
  for (const slot of slots) {
    if (slot.date < periodStart || slot.date > periodEnd) continue;
    if (slot.assignments.some(a => a.caregiverId === caregiver.id && a.status === 'confirmed')) {
      dates.add(slot.date);
    }
  }
  return dates.size;
}

export function getWeekRange(dateStr: string): [string, string] {
  const monday = getMonday(parseDate(dateStr));
  const sunday = addDays(monday, 6);
  return [formatDate(monday), formatDate(sunday)];
}

export function getMonthRange(dateStr: string): [string, string] {
  const d = parseDate(dateStr);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return [formatDate(first), formatDate(last)];
}

export function generateSlotId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export function getDayName(dayIndex: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex];
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
