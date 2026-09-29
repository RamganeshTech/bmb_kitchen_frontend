import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Define the roles available in your multi-tenant system
export type UserRole = "admin" | "owner" | "staff" | "cto" | null;

export interface AuthState {
  _id: string | null;
  userName: string | null; // Renamed for clarity
  organizationId: string | null;
  role: UserRole;
  // token: string | null;
  profileImageUrl: string | null
  isAuthenticated: boolean;

  isPlatformAdmin: boolean
  organizationName: string | null
  organizationUrl: string | null
}

const initialState: AuthState = {
  _id: null,
  userName: null,
  profileImageUrl: null,
  organizationId: null,
  role: null,
  // token: null,
  isAuthenticated: false,
  isPlatformAdmin: false,
  organizationName: null,
  organizationUrl: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthCredentials: (
      state,
      action: PayloadAction<{
        _id: string;
        userName: string;
        organizationId: string | null;
        role: UserRole;
        // token: string;
        profileImageUrl: string | null;
        isPlatformAdmin: boolean;
        organizationName: string | null;
        organizationUrl: string | null;
      }>
    ) => {
      state._id = action.payload._id;
      state.userName = action.payload.userName;
      state.organizationId = action.payload.organizationId;
      state.role = action.payload.role;
      // state.token = action.payload.token;
      state.profileImageUrl = action.payload.profileImageUrl;
      state.isAuthenticated = true;
      state.isPlatformAdmin = action.payload.isPlatformAdmin;
      state.organizationName = action.payload.organizationName;
      state.organizationUrl = action.payload.organizationUrl;
    },
    setOrganization: (
      state,
      action: PayloadAction<{
        organizationId: string | null;
        organizationName: string | null;
        organizationUrl: string | null;
      }>
    ) => {
      state.organizationId = action.payload.organizationId;
      state.organizationName = action.payload.organizationName;
      state.organizationUrl = action.payload.organizationUrl;
    },
    updateProfileImage: (state, action: PayloadAction<string | null>) => {
      state.profileImageUrl = action.payload;
    },
    logout: () => initialState,
  },
});

export const { 
  setAuthCredentials, 
  setOrganization, 
  updateProfileImage, 
  logout 
} = authSlice.actions;

export default authSlice.reducer;