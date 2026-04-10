export interface AvailabilityWindow {
  id: string;
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startMinutes: number; // minutes from midnight
  endMinutes: number;   // minutes from midnight
}

export interface DayOverride {
  date: string; // YYYY-MM-DD
  available: boolean;
  windows?: { startMinutes: number; endMinutes: number }[];
}

export interface Caregiver {
  id: string;
  name: string;
  initials: string;
  color: string;
  availabilityWindows: AvailabilityWindow[];
  maxDays: number;
  maxDaysPer: 'week' | 'month';
  overrides: DayOverride[];
}

export type SlotStatus = 'confirmed' | 'pending';

export interface SlotAssignment {
  caregiverId: string;
  status: SlotStatus;
}

export interface SlotRecord {
  id: string;
  date: string; // YYYY-MM-DD
  startMinutes: number;
  endMinutes: number;
  assignments: SlotAssignment[];
}

export interface DisplayBlock {
  slotIds: string[];
  date: string;
  startMinutes: number;
  endMinutes: number;
  assignments: SlotAssignment[];
  isPending: boolean;
}

export interface AppState {
  caregivers: Caregiver[];
  slots: SlotRecord[];
  currentView: 'week' | 'month';
  currentDate: string; // YYYY-MM-DD, the Monday of the current week
  hiddenCaregiverIds: string[];
}

export type AppAction =
  | { type: 'SET_VIEW'; view: 'week' | 'month' }
  | { type: 'SET_DATE'; date: string }
  | { type: 'ADD_CAREGIVER'; caregiver: Caregiver }
  | { type: 'UPDATE_CAREGIVER'; caregiver: Caregiver }
  | { type: 'DELETE_CAREGIVER'; id: string }
  | { type: 'TOGGLE_CAREGIVER_VISIBILITY'; id: string }
  | { type: 'ASSIGN_SLOTS'; slots: SlotRecord[] }
  | { type: 'CONFIRM_ASSIGNMENT'; slotIds: string[]; caregiverId: string }
  | { type: 'REMOVE_ASSIGNMENT'; slotIds: string[]; caregiverId: string }
  | { type: 'DELETE_BLOCK'; slotIds: string[] }
  | { type: 'ADD_ASSIGNMENT_TO_SLOTS'; slotIds: string[]; caregiverId: string }
  | { type: 'LOAD_STATE'; state: AppState }
  | { type: 'SYNC_CAREGIVERS'; caregivers: Caregiver[] }
  | { type: 'SYNC_SLOTS'; slots: SlotRecord[] };

// Color palette
export const CAREGIVER_COLORS = [
  '#0d9488', // teal
  '#7c3aed', // violet
  '#f97316', // coral/orange
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f43f5e', // rose
  '#6366f1', // indigo
  '#eab308', // yellow
  '#8b5cf6', // purple
  '#14b8a6', // teal-light
];

export const SCHEDULE_START = '2026-04-01';
export const SCHEDULE_END = '2027-03-31';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export const DEFAULT_CAREGIVERS: Caregiver[] = [
  {
    id: generateId(),
    name: 'Irina Anatolyevna',
    initials: 'IA',
    color: CAREGIVER_COLORS[0],
    availabilityWindows: [
      // Available all days except Tue night→Wed, Thu night→Fri
      // Mon, Sat, Sun: all day
      { id: generateId(), days: [0, 1, 6], startMinutes: 0, endMinutes: 1440 },
      // Wed: available from 11:00 onward (arrives half-day before shift)
      { id: generateId(), days: [3], startMinutes: 660, endMinutes: 1440 },
      // Tue: available until 22:00 (no Tue night)
      { id: generateId(), days: [2], startMinutes: 0, endMinutes: 1320 },
      // Thu: available until 22:00 (no Thu night)
      { id: generateId(), days: [4], startMinutes: 0, endMinutes: 1320 },
      // Fri: available from 11:00 onward
      { id: generateId(), days: [5], startMinutes: 660, endMinutes: 1440 },
    ],
    maxDays: 4,
    maxDaysPer: 'week',
    overrides: [],
  },
  {
    id: generateId(),
    name: 'Feven',
    initials: 'FE',
    color: CAREGIVER_COLORS[1],
    availabilityWindows: [
      // Available all days except Tue and Thu daytime
      { id: generateId(), days: [0, 1, 3, 5, 6], startMinutes: 0, endMinutes: 1440 },
      // Tue/Thu: nighttime only (22:00-06:00)
      { id: generateId(), days: [2, 4], startMinutes: 0, endMinutes: 360 },
      { id: generateId(), days: [2, 4], startMinutes: 1320, endMinutes: 1440 },
    ],
    maxDays: 3, // 2 days + 1 night
    maxDaysPer: 'week',
    overrides: [],
  },
  {
    id: generateId(),
    name: 'Ivan',
    initials: 'IV',
    color: CAREGIVER_COLORS[2],
    availabilityWindows: [
      // Every day 20:00-02:00 (next day handled as same-day end)
      // Representing as 20:00-24:00 on each day
      { id: generateId(), days: [0, 1, 2, 3, 4, 5, 6], startMinutes: 1200, endMinutes: 1440 },
      // And 00:00-02:00 each day (the continuation from previous night)
      { id: generateId(), days: [0, 1, 2, 3, 4, 5, 6], startMinutes: 0, endMinutes: 120 },
    ],
    maxDays: 7,
    maxDaysPer: 'week',
    overrides: [],
  },
];
