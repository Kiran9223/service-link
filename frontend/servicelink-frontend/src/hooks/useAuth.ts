import { useAppSelector } from './useAppDispatch'

export function useAuth() {
  const auth = useAppSelector((state) => state.auth)

  return {
    user: auth.user,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    isProvider: auth.user?.role === 'SERVICE_PROVIDER',
    isAdmin: auth.user?.role === 'ADMIN',
    isCustomer: auth.user?.role === 'USER',
  }
}
