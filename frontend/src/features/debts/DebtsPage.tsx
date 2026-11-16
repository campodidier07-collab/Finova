import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CreditCard, Plus } from 'lucide-react'
import { apiClient } from '@/api/client'
import { useAuth } from '@/features/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import type { Account, Debt, PaginatedResponse } from '@/types/api'

export function DebtsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const currency = user?.default_currency || 'COP'

  const [direction, setDirection] = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE')
  const [counterparty, setCounterparty] = useState('')
  const [description, setDescription] = useState('')
  const [principal, setPrincipal] = useState('')
  const [interestRate, setInterestRate] = useState('0')
  const [installments, setInstallments] = useState('1')
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [payAmounts, setPayAmounts] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await apiClient.get<PaginatedResponse<Account>>('/accounts/')).data,
  })

  const { data: debtsData } = useQuery({
    queryKey: ['debts'],
    queryFn: async () => (await apiClient.get<PaginatedResponse<Debt>>('/debts/')).data,
  })

  const primaryAccount = accountsData?.results?.[0]
  const debts = debtsData?.results || []

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/debts/', {
        direction,
        counterparty,
        description,
        principal_amount: Number(principal).toFixed(2),
        interest_rate: Number(interestRate || 0).toFixed(2),
        total_installments: Number(installments || 1),
        next_due_date: dueDate,
      })
    },
    onSuccess: () => {
      setCounterparty('')
      setDescription('')
      setPrincipal('')
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['debts'] })
    },
    onError: () => setError('No se pudo registrar la deuda.'),
  })

  const payMutation = useMutation({
    mutationFn: async ({ debtId, amount }: { debtId: number; amount: string }) => {
      await apiClient.post(`/debts/${debtId}/pay/`, {
        account: primaryAccount?.id || null,
        amount: Number(amount).toFixed(2),
        notes: 'Pago de cuota',
      })
    },
    onSuccess: () => {
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['debts'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'No se pudo registrar el pago.'
      setError(detail)
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deudas y Préstamos</h1>
        <p className="text-sm text-muted-foreground">
          Registra préstamos, cuotas, intereses, fechas de pago y abonos vinculados a tus cuentas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#F59E0B]" />
            Registrar deuda o préstamo
          </CardTitle>
          <CardDescription>Controla tanto lo que debes como el dinero que te deben</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'PAYABLE' | 'RECEIVABLE')}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
              >
                <option value="PAYABLE">Debo (Préstamo recibido)</option>
                <option value="RECEIVABLE">Me deben (Préstamo otorgado)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="debt-party">Banco / Persona</Label>
              <Input
                id="debt-party"
                required
                placeholder="Ej. Banco, Carlos"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="debt-principal">Monto capital</Label>
              <Input
                id="debt-principal"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="debt-rate">Interés (%)</Label>
              <Input
                id="debt-rate"
                type="number"
                step="0.01"
                min="0"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="debt-inst">Cuotas totales</Label>
              <Input
                id="debt-inst"
                type="number"
                min="1"
                required
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="debt-due">Próxima fecha de pago</Label>
              <Input
                id="debt-due"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="debt-desc">Descripción</Label>
              <Input
                id="debt-desc"
                placeholder="Ej. Crédito vehículo"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between">
              {error ? <p className="text-sm text-rose-600">{error}</p> : <span />}
              <Button type="submit" disabled={createMutation.isPending}>
                <Plus className="h-4 w-4" />
                Registrar deuda
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {debts.map((debt) => {
          const pct = Math.min(
            100,
            Math.round((debt.paid_installments / Math.max(1, debt.total_installments)) * 100)
          )
          const suggested = (
            Number(debt.remaining_balance) /
            Math.max(1, debt.total_installments - debt.paid_installments)
          ).toFixed(2)
          const inputVal = payAmounts[debt.id] ?? suggested

          return (
            <Card key={debt.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{debt.counterparty}</CardTitle>
                  <CardDescription>
                    {debt.direction === 'PAYABLE' ? 'Debo' : 'Me deben'} · {debt.description || 'Sin detalle'}
                  </CardDescription>
                </div>
                <Badge variant={debt.status === 'PAID' ? 'income' : 'adjustment'}>
                  {debt.status === 'PAID' ? 'Pagada' : 'Activa'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saldo pendiente:</span>
                  <span className="font-bold">{formatCurrency(debt.remaining_balance, currency)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Cuotas: {debt.paid_installments}/{debt.total_installments} · Interés: {debt.interest_rate}%
                  </span>
                  <span>Vence: {debt.next_due_date}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-[#10B981]" style={{ width: `${pct}%` }} />
                </div>

                {debt.status === 'ACTIVE' && (
                  <div className="flex items-center gap-2 pt-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={inputVal}
                      onChange={(e) =>
                        setPayAmounts((prev) => ({ ...prev, [debt.id]: e.target.value }))
                      }
                      className="h-8"
                    />
                    <Button
                      size="sm"
                      disabled={payMutation.isPending}
                      onClick={() => payMutation.mutate({ debtId: debt.id, amount: inputVal })}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Abonar cuota
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
