import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../slices/authSlice';
import outletReducer from '../slices/outletSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    outlet: outletReducer
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;