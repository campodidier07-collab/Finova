import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { MovementsPage } from '@/features/movements/MovementsPage'
import { TransfersPage } from '@/features/transfers/TransfersPage'
import { SubscriptionsPage } from '@/features/subscriptions/SubscriptionsPage'
import { DebtsPage } from '@/features/debts/DebtsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { NotificationsPage } from '@/features/system/NotificationsPage'
import { SecurityPage } from '@/features/system/SecurityPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Cargando Finova...
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="movements" element={<MovementsPage />} />
              <Route path="transfers" element={<TransfersPage />} />
              <Route path="subscriptions" element={<SubscriptionsPage />} />
              <Route path="debts" element={<DebtsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="security" element={<SecurityPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
