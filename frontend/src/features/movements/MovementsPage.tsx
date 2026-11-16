import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, Search } from 'lucide-react'
import { apiClient } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Account, Category, Movement, MovementType, PaginatedResponse } from '@/types/api'

const TYPE_LABELS: Record<MovementType, { label: string; variant: 'income' | 'expense' | 'neutral' | 'adjustment' }> = {
  INITIAL: { label: 'Saldo inicial', variant: 'neutral' },
  INCOME: { label: 'Ingreso', variant: 'income' },
  EXPENSE: { label: 'Gasto', variant: 'expense' },
  ADJUSTMENT: { label: 'Reversión', variant: 'adjustment' },
}

export function MovementsPage() {
  const queryClient = useQueryClient()

  // Form state
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [formError, setFormError] = useState<string | null>(null)

  // Filter state
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Account>>('/accounts/')
      return data
    },
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Category>>('/categories/?page_size=100')
      return data
    },
  })

  const primaryAccount = accountsData?.results?.[0]
  const filteredCategories = (categoriesData?.results || []).filter((c) => c.type === type)

  const { data: movementsData, isLoading } = useQuery({
    queryKey: ['movements', { search, filterType, filterCategory, dateFrom, dateTo }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (filterType) params.set('type', filterType)
      if (filterCategory) params.set('category', filterCategory)
      if (dateFrom) params.set('date_from', `${dateFrom}T00:00:00`)
      if (dateTo) params.set('date_to', `${dateTo}T23:59:59`)
      const { data } = await apiClient.get<PaginatedResponse<Movement>>(
        `/movements/?${params.toString()}`
      )
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!primaryAccount) throw new Error('No hay cuenta configurada')
      const { data } = await apiClient.post<Movement>('/movements/', {
        account: primaryAccount.id,
        category: categoryId ? Number(categoryId) : null,
        type,
        amount: Number(amount).toFixed(2),
        description,
        occurred_at: new Date(occurredAt).toISOString(),
      })
      return data
    },
    onSuccess: () => {
      setAmount('')
      setDescription('')
      setFormError(null)
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Error al registrar el movimiento. Verifica el monto y el saldo disponible.'
      setFormError(detail)
    },
  })

  const reverseMutation = useMutation({
    mutationFn: async (movementId: number) => {
      await apiClient.post(`/movements/${movementId}/reverse/`, {
        reason: 'Reversión manual desde auditoría',
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Movimientos y Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Registra ingresos o gastos y consulta el historial cronológico completo con saldos antes y después
        </p>
      </div>

      {/* Create Movement Form */}
      <Card>
        <CardHeader>
          <CardTitle>Nuevo movimiento</CardTitle>
          <CardDescription>
            {primaryAccount
              ? `Cuenta: ${primaryAccount.name} · Saldo actual: ${formatCurrency(primaryAccount.balance, primaryAccount.currency)}`
              : 'Cargando cuenta...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant={type === 'INCOME' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setType('INCOME')
                    setCategoryId('')
                  }}
                >
                  Ingreso
                </Button>
                <Button
                  type="button"
                  variant={type === 'EXPENSE' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setType('EXPENSE')
                    setCategoryId('')
                  }}
                >
                  Gasto
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mov-amount">Valor</Label>
              <Input
                id="mov-amount"
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
              <Label htmlFor="mov-category">Categoría</Label>
              <select
                id="mov-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
              >
                <option value="">Seleccionar categoría</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mov-date">Fecha y hora</Label>
              <Input
                id="mov-date"
                type="datetime-local"
                required
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <Label htmlFor="mov-desc">Descripción / Razón</Label>
              <Input
                id="mov-desc"
                required
                placeholder={type === 'INCOME' ? 'Ej. Pago nómina quincenal' : 'Ej. Compra supermercado'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={createMutation.isPending || !primaryAccount}>
              {createMutation.isPending ? 'Guardando...' : 'Registrar'}
            </Button>

            {formError && (
              <div className="sm:col-span-2 lg:col-span-5 rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                {formError}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Search & Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historial de Auditoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripción..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
            >
              <option value="">Todos los tipos</option>
              <option value="INCOME">Ingresos</option>
              <option value="EXPENSE">Gastos</option>
              <option value="INITIAL">Saldo inicial</option>
              <option value="ADJUSTMENT">Reversiones</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
            >
              <option value="">Todas las categorías</option>
              {(categoriesData?.results || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <Input
              type="date"
              aria-label="Fecha desde"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              aria-label="Fecha hasta"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Fecha / Hora</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">Saldo antes</th>
                  <th className="px-4 py-3 text-right">Saldo después</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-card">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Cargando movimientos...
                    </td>
                  </tr>
                ) : !movementsData?.results?.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No se encontraron movimientos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  movementsData.results.map((m) => {
                    const dt = formatDateTime(m.occurred_at)
                    const meta = TYPE_LABELS[m.type]
                    const canReverse =
                      (m.type === 'INCOME' || m.type === 'EXPENSE') && !m.is_reversed

                    return (
                      <tr key={m.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium">{dt.date}</div>
                          <div className="text-xs text-muted-foreground">{dt.time}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {m.category_name || '—'}
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate" title={m.description}>
                          {m.description}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                            m.type === 'EXPENSE' ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {m.type === 'EXPENSE' ? '-' : ''}
                          {formatCurrency(m.amount, m.account_currency)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                          {formatCurrency(m.balance_before, m.account_currency)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                          {formatCurrency(m.balance_after, m.account_currency)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {canReverse ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Crear movimiento de reversión"
                              onClick={() => reverseMutation.mutate(m.id)}
                              disabled={reverseMutation.isPending}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          ) : m.is_reversed ? (
                            <span className="text-xs text-muted-foreground">Revertido</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
