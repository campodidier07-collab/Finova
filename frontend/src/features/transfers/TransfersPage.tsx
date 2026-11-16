import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Account, Movement, PaginatedResponse } from '@/types/api'

export function TransfersPage() {
  const queryClient = useQueryClient()
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Account>>('/accounts/')
      return data
    },
  })

  const { data: transfersData } = useQuery({
    queryKey: ['movements', 'transfers'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Movement>>(
        '/movements/?type=TRANSFER_OUT'
      )
      return data
    },
  })

  const accounts = accountsData?.results || []
  const sourceAcc = accounts.find((a) => String(a.id) === fromId) || accounts[0]
  const targetAcc =
    accounts.find((a) => String(a.id) === toId) ||
    accounts.find((a) => a.id !== sourceAcc?.id)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!sourceAcc || !targetAcc) {
        throw new Error('Necesitas al menos 2 cuentas para realizar transferencias.')
      }
      await apiClient.post('/movements/transfer/', {
        from_account: sourceAcc.id,
        to_account: targetAcc.id,
        amount: Number(amount).toFixed(2),
        description,
      })
    },
    onSuccess: () => {
      setAmount('')
      setDescription('')
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        'No se pudo realizar la transferencia.'
      setError(detail)
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    mutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transferencias entre Cuentas</h1>
        <p className="text-sm text-muted-foreground">
          Mueve dinero entre tus cuentas propias manteniendo intactos tus reportes de ingresos y gastos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <i className="fa-solid fa-right-left text-primary" />
            Nueva transferencia
          </CardTitle>
          <CardDescription>
            {accounts.length < 2
              ? 'Crea una segunda cuenta en Configuración para habilitar transferencias.'
              : 'Selecciona la cuenta de origen, destino y el monto a transferir.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-1.5">
              <Label>Cuenta origen</Label>
              <select
                value={sourceAcc?.id || ''}
                onChange={(e) => setFromId(e.target.value)}
                disabled={accounts.length < 2}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.balance, a.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Cuenta destino</Label>
              <select
                value={targetAcc?.id || ''}
                onChange={(e) => setToId(e.target.value)}
                disabled={accounts.length < 2}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
              >
                {accounts
                  .filter((a) => a.id !== sourceAcc?.id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.balance, a.currency)})
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tr-amount">Valor</Label>
              <Input
                id="tr-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                disabled={accounts.length < 2}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tr-desc">Nota (opcional)</Label>
              <Input
                id="tr-desc"
                disabled={accounts.length < 2}
                placeholder="Ej. Ahorro mensual"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between gap-3">
              {error ? <p className="text-sm text-rose-600">{error}</p> : <span />}
              <Button type="submit" disabled={accounts.length < 2 || mutation.isPending}>
                {mutation.isPending ? 'Transfiriendo...' : 'Transferir dinero'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de transferencias</CardTitle>
        </CardHeader>
        <CardContent>
          {!transfersData?.results?.length ? (
            <p className="text-sm text-muted-foreground">No has realizado transferencias aún.</p>
          ) : (
            <ul className="divide-y">
              {transfersData.results.map((m) => {
                const dt = formatDateTime(m.occurred_at)
                return (
                  <li key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{m.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.account_name} · {dt.date} {dt.time}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="neutral">{formatCurrency(m.amount, m.account_currency)}</Badge>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
