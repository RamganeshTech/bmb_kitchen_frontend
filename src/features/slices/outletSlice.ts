import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store/store';

export interface CurrentOutlet {
  _id: string;
  name: string;
  code?: string;
}

interface OutletState {
  currentOutlet: CurrentOutlet | null;
}

const STORAGE_KEY = 'bmb_current_outlet';

const loadPersisted = (): CurrentOutlet | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CurrentOutlet) : null;
  } catch {
    return null;
  }
};

const persist = (outlet: CurrentOutlet | null) => {
  try {
    if (outlet) localStorage.setItem(STORAGE_KEY, JSON.stringify(outlet));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable - keep working in memory */
  }
};

const initialState: OutletState = { currentOutlet: loadPersisted() };

const outletSlice = createSlice({
  name: 'outlet',
  initialState,
  reducers: {
    setCurrentOutlet: (state, action: PayloadAction<CurrentOutlet>) => {
      state.currentOutlet = action.payload;
      persist(action.payload);
    },
    clearCurrentOutlet: (state) => {
      state.currentOutlet = null;
      persist(null);
    },
  },
});

export const { setCurrentOutlet, clearCurrentOutlet } = outletSlice.actions;
export const selectCurrentOutlet = (state: RootState) => state.outlet.currentOutlet;
export default outletSlice.reducer;