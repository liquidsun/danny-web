import { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode, type Dispatch } from 'react';
import type { AppState, AppAction, SlotRecord } from '../lib/types';
import { getInitialState } from '../lib/storage';
import { saveCaregivers, saveSlots, subscribeCaregivers, subscribeSlots } from '../lib/firebaseStorage';

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.view };
    case 'SET_DATE':
      return { ...state, currentDate: action.date };
    case 'ADD_CAREGIVER':
      return { ...state, caregivers: [...state.caregivers, action.caregiver] };
    case 'UPDATE_CAREGIVER':
      return {
        ...state,
        caregivers: state.caregivers.map(c => c.id === action.caregiver.id ? action.caregiver : c),
      };
    case 'DELETE_CAREGIVER':
      return {
        ...state,
        caregivers: state.caregivers.filter(c => c.id !== action.id),
        slots: state.slots.map(slot => ({
          ...slot,
          assignments: slot.assignments.filter(a => a.caregiverId !== action.id),
        })).filter(slot => slot.assignments.length > 0),
        hiddenCaregiverIds: state.hiddenCaregiverIds.filter(id => id !== action.id),
      };
    case 'TOGGLE_CAREGIVER_VISIBILITY': {
      const isHidden = state.hiddenCaregiverIds.includes(action.id);
      if (isHidden) {
        return { ...state, hiddenCaregiverIds: state.hiddenCaregiverIds.filter(id => id !== action.id) };
      }
      // Don't hide if it's the last visible one
      const visibleCount = state.caregivers.length - state.hiddenCaregiverIds.length;
      if (visibleCount <= 1) return state;
      return { ...state, hiddenCaregiverIds: [...state.hiddenCaregiverIds, action.id] };
    }
    case 'ASSIGN_SLOTS': {
      const newSlotDates = new Map<string, SlotRecord>();
      for (const slot of action.slots) {
        newSlotDates.set(`${slot.date}-${slot.startMinutes}`, slot);
      }
      // Remove existing slots that overlap
      const filtered = state.slots.filter(s => !newSlotDates.has(`${s.date}-${s.startMinutes}`));
      return { ...state, slots: [...filtered, ...action.slots] };
    }
    case 'CONFIRM_ASSIGNMENT':
      return {
        ...state,
        slots: state.slots.map(slot => {
          if (!action.slotIds.includes(slot.id)) return slot;
          return {
            ...slot,
            assignments: slot.assignments.map(a => ({
              ...a,
              status: a.caregiverId === action.caregiverId ? 'confirmed' as const : 'pending' as const,
            })),
          };
        }),
      };
    case 'REMOVE_ASSIGNMENT':
      return {
        ...state,
        slots: state.slots.map(slot => {
          if (!action.slotIds.includes(slot.id)) return slot;
          return {
            ...slot,
            assignments: slot.assignments.filter(a => a.caregiverId !== action.caregiverId),
          };
        }).filter(slot => slot.assignments.length > 0),
      };
    case 'DELETE_BLOCK':
      return {
        ...state,
        slots: state.slots.filter(s => !action.slotIds.includes(s.id)),
      };
    case 'ADD_ASSIGNMENT_TO_SLOTS':
      return {
        ...state,
        slots: state.slots.map(slot => {
          if (!action.slotIds.includes(slot.id)) return slot;
          if (slot.assignments.some(a => a.caregiverId === action.caregiverId)) return slot;
          return {
            ...slot,
            assignments: [
              ...slot.assignments.map(a => ({ ...a, status: 'pending' as const })),
              { caregiverId: action.caregiverId, status: 'pending' as const },
            ],
          };
        }),
      };
    case 'LOAD_STATE':
      return action.state;
    case 'SYNC_CAREGIVERS':
      return { ...state, caregivers: action.caregivers };
    case 'SYNC_SLOTS':
      return { ...state, slots: action.slots };
    default:
      return state;
  }
}

const StateContext = createContext<AppState | null>(null);
const DispatchContext = createContext<Dispatch<AppAction> | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, null, getInitialState);
  const isRemoteUpdate = useRef(false);
  const prevCaregiversRef = useRef<string>('');
  const prevSlotsRef = useRef<string>('');

  // Subscribe to Firebase real-time updates
  useEffect(() => {
    const unsubCaregivers = subscribeCaregivers((caregivers) => {
      if (caregivers.length > 0) {
        isRemoteUpdate.current = true;
        dispatch({ type: 'SYNC_CAREGIVERS', caregivers });
      }
    });
    const unsubSlots = subscribeSlots((slots) => {
      isRemoteUpdate.current = true;
      dispatch({ type: 'SYNC_SLOTS', slots });
    });
    return () => {
      unsubCaregivers();
      unsubSlots();
    };
  }, []);

  // Save to Firebase when state changes (skip if it was a remote update)
  useEffect(() => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      prevCaregiversRef.current = JSON.stringify(state.caregivers);
      prevSlotsRef.current = JSON.stringify(state.slots);
      return;
    }
    const cgJson = JSON.stringify(state.caregivers);
    const slotJson = JSON.stringify(state.slots);
    if (cgJson !== prevCaregiversRef.current) {
      saveCaregivers(state.caregivers);
      prevCaregiversRef.current = cgJson;
    }
    if (slotJson !== prevSlotsRef.current) {
      saveSlots(state.slots);
      prevSlotsRef.current = slotJson;
    }
  }, [state.caregivers, state.slots]);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}

export function useAppDispatch(): Dispatch<AppAction> {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error('useAppDispatch must be used within AppProvider');
  return ctx;
}

export function useAppActions() {
  const dispatch = useAppDispatch();
  return {
    setView: useCallback((view: 'week' | 'month') => dispatch({ type: 'SET_VIEW', view }), [dispatch]),
    setDate: useCallback((date: string) => dispatch({ type: 'SET_DATE', date }), [dispatch]),
    dispatch,
  };
}
