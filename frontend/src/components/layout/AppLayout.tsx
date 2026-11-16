import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, History, LayoutDashboard, LogOut, Settings, Wallet } from 'lucide-react'
import { apiClient } from '@/api/client'
import { useAuth } from '@/features/auth/AuthContext'
import { OnboardingAccountModal } from '@/features/accounts/OnboardingAccountModal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Account, PaginatedResponse } from '@/types/api'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/movements', label: 'Movimientos y Auditoría', icon: History, end: false },
  { to: '/reports', label: 'Reportes', icon: BarChart3, end: false },
  { to: '/settings', label: 'Cuentas y Categorías', icon: Settings, end: false },
]

export function AppLayout() {
  const { user, logout } = useAuth()

  const { data: accountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Account>>('/accounts/')
      return data
    },
  })

  const needsOnboarding = !loadingAccounts && (accountsData?.results?.length ?? 0) === 0

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {needsOnboarding && <OnboardingAccountModal />}

      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r bg-card flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 px-5 py-4 border-b">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">Finova</span>
              <p className="text-xs text-muted-foreground">Finanzas personales</p>
            </div>
          </div>

          <nav className="p-3 flex md:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="p-4 border-t hidden md:block">
          <div className="mb-3">
            <p className="text-sm font-medium truncate">{user?.full_name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
