import { ref, set, onValue, type Unsubscribe } from 'firebase/database';
import { db } from './firebase';
import type { Caregiver, SlotRecord } from './types';

// Firebase paths
const CAREGIVERS_PATH = 'caregivers';
const SLOTS_PATH = 'slots';

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// Save caregivers to Firebase (debounced)
export function saveCaregivers(caregivers: Caregiver[]): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const caregiversRef = ref(db, CAREGIVERS_PATH);
    // Store as object keyed by ID for efficient Firebase operations
    const data: Record<string, Caregiver> = {};
    for (const cg of caregivers) {
      data[cg.id] = cg;
    }
    set(caregiversRef, data).catch(console.error);
  }, 300);
}

let slotSaveTimeout: ReturnType<typeof setTimeout> | null = null;

// Save slots to Firebase (debounced)
export function saveSlots(slots: SlotRecord[]): void {
  if (slotSaveTimeout) clearTimeout(slotSaveTimeout);
  slotSaveTimeout = setTimeout(() => {
    const slotsRef = ref(db, SLOTS_PATH);
    const data: Record<string, SlotRecord> = {};
    for (const slot of slots) {
      data[slot.id] = slot;
    }
    set(slotsRef, data).catch(console.error);
  }, 300);
}

// Sanitize caregiver data from Firebase (arrays may be lost as undefined)
function sanitizeCaregiver(cg: Caregiver): Caregiver {
  return {
    ...cg,
    availabilityWindows: Array.isArray(cg.availabilityWindows)
      ? cg.availabilityWindows.map(w => ({
          ...w,
          days: Array.isArray(w.days) ? w.days : [],
        }))
      : [],
    overrides: Array.isArray(cg.overrides) ? cg.overrides : [],
  };
}

// Sanitize slot data from Firebase
function sanitizeSlot(slot: SlotRecord): SlotRecord {
  return {
    ...slot,
    assignments: Array.isArray(slot.assignments) ? slot.assignments : [],
  };
}

// Subscribe to caregivers changes
export function subscribeCaregivers(callback: (caregivers: Caregiver[]) => void): Unsubscribe {
  const caregiversRef = ref(db, CAREGIVERS_PATH);
  return onValue(caregiversRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const caregivers = (Object.values(data) as Caregiver[]).map(sanitizeCaregiver);
      callback(caregivers);
    }
    // If null (empty DB), don't call back — keep defaults
  });
}

// Subscribe to slots changes
export function subscribeSlots(callback: (slots: SlotRecord[]) => void): Unsubscribe {
  const slotsRef = ref(db, SLOTS_PATH);
  return onValue(slotsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const slots = (Object.values(data) as SlotRecord[]).map(sanitizeSlot);
      callback(slots);
    }
    // If null (empty DB), don't call back — keep defaults
  });
}
