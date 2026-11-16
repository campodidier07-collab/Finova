import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import type { Account, Category, PaginatedResponse, Subscription } from '@/types/api'

const CYCLE_LABELS = {
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
} as const

export function SubscriptionsPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [billingCycle, setBillingCycle] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [nextDate, setNextDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await apiClient.get<PaginatedResponse<Account>>('/accounts/')).data,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () =>
      (await apiClient.get<PaginatedResponse<Category>>('/categories/?type=EXPENSE&page_size=100'))
        .data,
  })

  const { data: subsData } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () =>
      (await apiClient.get<PaginatedResponse<Subscription>>('/subscriptions/')).data,
  })

  const accounts = accountsData?.results || []
  const selectedAccount = accounts.find((a) => String(a.id) === accountId) || accounts[0]
  const subscriptions = subsData?.results || []

  const monthlyTotal = subscriptions
    .filter((s) => s.is_active)
    .reduce((acc, s) => acc + Number(s.monthly_equivalent), 0)

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAccount) throw new Error('Crea una cuenta primero.')
      await apiClient.post('/subscriptions/', {
        account: selectedAccount.id,
        category: categoryId ? Number(categoryId) : null,
        name,
        amount: Number(amount).toFixed(2),
        billing_cycle: billingCycle,
        next_billing_date: nextDate,
      })
    },
    onSuccess: () => {
      setName('')
      setAmount('')
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
    onError: () => setError('No se pudo crear la suscripción.'),
  })

  const chargeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.post(`/subscriptions/${id}/charge/`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'No se pudo cobrar la suscripción.'
      setError(detail)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (sub: Subscription) => {
      await apiClient.patch(`/subscriptions/${sub.id}/`, { is_active: !sub.is_active })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/subscriptions/${id}/`)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suscripciones y Servicios</h1>
          <p className="text-sm text-muted-foreground">
            Controla Netflix, Spotify, internet y otros gastos recurrentes
          </p>
        </div>
        <Card className="bg-[#0F172A] text-[#F8FAFC] px-4 py-2.5">
          <div className="text-xs text-slate-300">Costo mensual estimado activo</div>
          <div className="text-lg font-bold text-[#10B981]">
            {formatCurrency(monthlyTotal, selectedAccount?.currency || 'COP')}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <i className="fa-solid fa-repeat text-primary" />
            Nueva suscripción
          </CardTitle>
          <CardDescription>Programa servicios recurrentes y regístralos con un clic</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="sub-name">Servicio</Label>
              <Input
                id="sub-name"
                required
                placeholder="Ej. Netflix, Spotify"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-amount">Valor</Label>
              <Input
                id="sub-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Frecuencia</Label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as 'WEEKLY' | 'MONTHLY' | 'YEARLY')}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
              >
                <option value="MONTHLY">Mensual</option>
                <option value="WEEKLY">Semanal</option>
                <option value="YEARLY">Anual</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-date">Próximo cobro</Label>
              <Input
                id="sub-date"
                type="date"
                required
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
              >
                <option value="">Sin categoría</option>
                {(categoriesData?.results || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {accounts.length > 1 && (
              <div className="space-y-1.5">
                <Label>Cuenta de cobro</Label>
                <select
                  value={selectedAccount?.id || ''}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2 lg:col-span-5 flex items-center justify-between">
              {error ? <p className="text-sm text-rose-600">{error}</p> : <span />}
              <Button type="submit" disabled={createMutation.isPending}>
                <i className="fa-solid fa-plus text-xs" />
                Agregar suscripción
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subscriptions.map((sub) => (
          <Card key={sub.id} className={!sub.is_active ? 'opacity-65' : ''}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{sub.name}</CardTitle>
                <CardDescription>
                  {sub.account_name} · {CYCLE_LABELS[sub.billing_cycle]}
                </CardDescription>
              </div>
              <Badge variant={sub.is_active ? 'income' : 'neutral'}>
                {sub.is_active ? 'Activa' : 'Pausada'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xl font-bold text-[#0F172A]">
                {formatCurrency(sub.amount, sub.account_currency)}
              </div>
              <p className="text-xs text-muted-foreground">
                Próximo cobro: <span className="font-medium">{sub.next_billing_date}</span>
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!sub.is_active || chargeMutation.isPending}
                  onClick={() => chargeMutation.mutate(sub.id)}
                >
                  <i className="fa-solid fa-bolt text-xs" />
                  Registrar cobro
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleMutation.mutate(sub)}
                  title={sub.is_active ? 'Pausar' : 'Reactivar'}
                >
                  {sub.is_active ? (
                    <i className="fa-solid fa-pause text-xs" />
                  ) : (
                    <i className="fa-solid fa-play text-xs" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(sub.id)}
                  title="Eliminar"
                >
                  <i className="fa-solid fa-trash text-xs text-rose-600" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
