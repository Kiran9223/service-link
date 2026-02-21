import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { authApi } from '@/api/authApi'
import { tokenUtils } from '@/utils/tokenUtils'
import type { AuthState, LoginRequest, RegisterUserRequest, RegisterProviderRequest, User } from '@/types/auth.types'

const storedToken = tokenUtils.getToken()

const initialState: AuthState = {
  token: storedToken,
  user: tokenUtils.getUser(),
  provider: null,
  isAuthenticated: !!storedToken && !tokenUtils.isExpired(storedToken),
  isLoading: false,
  error: null,
}

// ── Async thunks ─────────────────────────────────────────────────────────────

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials)
      // Backend returns "accessToken" — store it
      tokenUtils.setToken(response.accessToken)
      tokenUtils.setUser(response.user)
      return response
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Invalid email or password')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (payload: RegisterUserRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.registerUser(payload)
      tokenUtils.setToken(response.accessToken)
      tokenUtils.setUser(response.user)
      return response
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Registration failed')
    }
  }
)

export const registerProvider = createAsyncThunk(
  'auth/registerProvider',
  async (payload: RegisterProviderRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.registerProvider(payload)
      tokenUtils.setToken(response.accessToken)
      tokenUtils.setUser(response.user)
      return response
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Provider registration failed')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null
      state.user = null
      state.provider = null
      state.isAuthenticated = false
      state.error = null
      tokenUtils.clearAll()
    },
    clearError(state) {
      state.error = null
    },
    updateUser(state, action: PayloadAction<User>) {
      state.user = action.payload
      tokenUtils.setUser(action.payload)
    },
  },
  extraReducers: (builder) => {
    const handlePending = (state: AuthState) => {
      state.isLoading = true
      state.error = null
    }
    const handleFulfilled = (state: AuthState, action: { payload: { accessToken: string; user: User; provider?: AuthState['provider'] } }) => {
      state.isLoading = false
      state.token = action.payload.accessToken
      state.user = action.payload.user
      state.provider = action.payload.provider ?? null
      state.isAuthenticated = true
    }
    const handleRejected = (state: AuthState, action: { payload: unknown }) => {
      state.isLoading = false
      state.error = action.payload as string
    }

    builder
      .addCase(login.pending, handlePending)
      .addCase(login.fulfilled, handleFulfilled)
      .addCase(login.rejected, handleRejected)
      .addCase(registerUser.pending, handlePending)
      .addCase(registerUser.fulfilled, handleFulfilled)
      .addCase(registerUser.rejected, handleRejected)
      .addCase(registerProvider.pending, handlePending)
      .addCase(registerProvider.fulfilled, handleFulfilled)
      .addCase(registerProvider.rejected, handleRejected)
  },
})

export const { logout, clearError, updateUser } = authSlice.actions
export default authSlice.reducer
