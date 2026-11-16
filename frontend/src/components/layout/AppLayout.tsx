import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  Repeat,
  Settings,
  Shield,
} from 'lucide-react'
import { apiClient } from '@/api/client'
import { useAuth } from '@/features/auth/AuthContext'
import { OnboardingAccountModal } from '@/features/accounts/OnboardingAccountModal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Account, AppNotification, PaginatedResponse } from '@/types/api'

const financeNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/movements', label: 'Movimientos y Auditoría', icon: History, end: false },
  { to: '/transfers', label: 'Transferencias', icon: ArrowLeftRight, end: false },
  { to: '/subscriptions', label: 'Suscripciones', icon: Repeat, end: false },
  { to: '/debts', label: 'Deudas', icon: CreditCard, end: false },
  { to: '/reports', label: 'Reportes', icon: BarChart3, end: false },
]

const systemNavItems = [
  { to: '/notifications', label: 'Notificaciones', icon: Bell, end: false },
  { to: '/security', label: 'Seguridad', icon: Shield, end: false },
  { to: '/settings', label: 'Configuración', icon: Settings, end: false },
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

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AppNotification>>(
        '/system/notifications/'
      )
      return data
    },
  })

  const unreadCount = (notifData?.results || []).filter((n) => !n.is_read).length
  const needsOnboarding = !loadingAccounts && (accountsData?.results?.length ?? 0) === 0

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {needsOnboarding && <OnboardingAccountModal />}

      <aside className="w-full md:w-60 md:sticky md:top-0 md:h-screen md:overflow-y-auto shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-[#0F172A] text-[#F8FAFC] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <img
                src="/finova-icon.jpg"
                alt="Finova"
                className="h-9 w-9 rounded-lg object-cover shadow-sm"
              />
              <div>
                <span className="font-bold text-lg tracking-tight text-[#F8FAFC]">Finova</span>
                <p className="text-xs text-[#F59E0B]">Finanzas personales</p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-300 hover:text-[#F59E0B]"
                onClick={logout}
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <nav className="p-2.5 space-y-3">
            <div className="flex md:flex-col gap-0.5 overflow-x-auto">
              {financeNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
                        isActive
                          ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-[#F8FAFC]'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>

            <div className="hidden md:block pt-2 border-t border-slate-800/80">
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                Sistema
              </p>
              <div className="flex flex-col gap-0.5">
                {systemNavItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center justify-between rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
                          isActive
                            ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-[#F8FAFC]'
                        )
                      }
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                      {item.to === '/notifications' && unreadCount > 0 && (
                        <span className="rounded-full bg-[#F59E0B] px-1.5 py-0.5 text-[10px] font-bold text-[#0F172A]">
                          {unreadCount}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          </nav>
        </div>

        <div className="p-3.5 border-t border-slate-800 hidden md:block">
          <div className="mb-3">
            <p className="text-sm font-medium truncate text-[#F8FAFC]">{user?.full_name || 'Usuario'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start border-slate-700 bg-slate-800/60 text-[#F8FAFC] hover:bg-slate-800 hover:text-[#F59E0B]"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
