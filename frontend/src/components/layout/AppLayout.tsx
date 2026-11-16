import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { useAuth } from '@/features/auth/AuthContext'
import { OnboardingAccountModal } from '@/features/accounts/OnboardingAccountModal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Account, AppNotification, PaginatedResponse } from '@/types/api'

const financeNavItems = [
  { to: '/', label: 'Dashboard', icon: 'fa-solid fa-gauge-high', end: true },
  { to: '/movements', label: 'Movimientos y Auditoría', icon: 'fa-solid fa-clock-rotate-left', end: false },
  { to: '/transfers', label: 'Transferencias', icon: 'fa-solid fa-right-left', end: false },
  { to: '/subscriptions', label: 'Suscripciones', icon: 'fa-solid fa-repeat', end: false },
  { to: '/debts', label: 'Deudas', icon: 'fa-solid fa-credit-card', end: false },
  { to: '/receipts', label: 'Comprobantes', icon: 'fa-solid fa-receipt', end: false },
  { to: '/reports', label: 'Reportes', icon: 'fa-solid fa-chart-pie', end: false },
]

const systemNavItems = [
  { to: '/notifications', label: 'Notificaciones', icon: 'fa-solid fa-bell', end: false },
  { to: '/security', label: 'Seguridad', icon: 'fa-solid fa-shield-halved', end: false },
  { to: '/settings', label: 'Configuración', icon: 'fa-solid fa-gear', end: false },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const renderNavContent = (onNavigate?: () => void) => (
    <nav className="p-2.5 space-y-3">
      <div className="flex flex-col gap-0.5">
        {financeNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-[#F8FAFC]'
              )
            }
          >
            <i className={`${item.icon} w-4 text-center text-sm shrink-0`} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-800/80">
        <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
          Sistema
        </p>
        <div className="flex flex-col gap-0.5">
          {systemNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-[#F8FAFC]'
                )
              }
            >
              <span className="flex items-center gap-2.5">
                <i className={`${item.icon} w-4 text-center text-sm shrink-0`} />
                <span>{item.label}</span>
              </span>
              {item.to === '/notifications' && unreadCount > 0 && (
                <span className="rounded-full bg-[#F59E0B] px-1.5 py-0.5 text-[10px] font-bold text-[#0F172A]">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {needsOnboarding && <OnboardingAccountModal />}

      {/* Mobile / Tablet Top Header (< lg) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-[#0F172A] px-4 py-3 text-[#F8FAFC]">
        <div className="flex items-center gap-2.5">
          <img
            src="/finova-icon.jpg"
            alt="Finova"
            className="h-8 w-8 rounded-lg object-cover shadow-sm"
          />
          <div>
            <span className="font-bold text-base tracking-tight text-[#F8FAFC]">Finova</span>
            <p className="text-[11px] text-[#F59E0B] leading-none">Finanzas personales</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <NavLink
              to="/notifications"
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800"
              aria-label="Notificaciones"
            >
              <i className="fa-solid fa-bell text-sm" />
              <span className="absolute -top-0.5 -right-0.5 rounded-full bg-[#F59E0B] px-1 text-[10px] font-bold text-[#0F172A]">
                {unreadCount}
              </span>
            </NavLink>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-[#F8FAFC] hover:bg-slate-800"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <i className="fa-solid fa-bars text-base" />
          </Button>
        </div>
      </header>

      {/* Mobile / Tablet Slide-over Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-[#0F172A]/70 backdrop-blur-xs flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-72 max-w-[85vw] h-full bg-[#0F172A] text-[#F8FAFC] border-r border-slate-800 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/finova-icon.jpg"
                    alt="Finova"
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                  <span className="font-bold text-base">Finova</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-300 hover:bg-slate-800"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Cerrar menú"
                >
                  <i className="fa-solid fa-xmark text-base" />
                </Button>
              </div>
              {renderNavContent(() => setMobileMenuOpen(false))}
            </div>

            <div className="p-4 border-t border-slate-800">
              <div className="mb-3">
                <p className="text-sm font-medium truncate text-[#F8FAFC]">
                  {user?.full_name || 'Usuario'}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start border-slate-700 bg-slate-800/60 text-[#F8FAFC] hover:bg-slate-800 hover:text-[#F59E0B]"
                onClick={logout}
              >
                <i className="fa-solid fa-right-from-bracket text-sm" />
                Cerrar sesión
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Fixed Sidebar (>= lg) */}
      <aside className="hidden lg:flex w-60 sticky top-0 h-screen overflow-y-auto shrink-0 border-r border-slate-800 bg-[#0F172A] text-[#F8FAFC] flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-800">
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
          {renderNavContent()}
        </div>

        <div className="p-3.5 border-t border-slate-800">
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
            <i className="fa-solid fa-right-from-bracket text-sm" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-6 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
