import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import type { Account, Category, PaginatedResponse } from '@/types/api'

interface QuickMovementModalProps {
  open: boolean
  onClose: () => void
}

export function QuickMovementModal({ open, onClose }: QuickMovementModalProps) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE')
  const [accountId, setAccountId] = useState<string>('')
  const [toAccountId, setToAccountId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Account>>('/accounts/')
      return data
    },
    enabled: open,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Category>>('/categories/?page_size=100')
      return data
    },
    enabled: open,
  })

  const accounts = accountsData?.results || []
  const selectedAccount = accounts.find((a) => String(a.id) === accountId) || accounts[0]
  const targetAccount =
    accounts.find((a) => String(a.id) === toAccountId) ||
    accounts.find((a) => a.id !== selectedAccount?.id)
  const filteredCategories = (categoriesData?.results || []).filter((c) => c.type === mode)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedAccount) throw new Error('No hay cuenta disponible')
      if (mode === 'TRANSFER') {
        if (!targetAccount) throw new Error('Necesitas al menos 2 cuentas para transferir')
        await apiClient.post('/movements/transfer/', {
          from_account: selectedAccount.id,
          to_account: targetAccount.id,
          amount: Number(amount).toFixed(2),
          description,
        })
      } else {
        await apiClient.post('/movements/', {
          account: selectedAccount.id,
          category: categoryId ? Number(categoryId) : null,
          type: mode,
          amount: Number(amount).toFixed(2),
          description,
        })
      }
    },
    onSuccess: () => {
      setAmount('')
      setDescription('')
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['balance-trend'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['reports'] })
      onClose()
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'No se pudo registrar la operación. Verifica los datos.'
      setError(detail)
    },
  })

  if (!open) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4 backdrop-blur-xs">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Registro rápido</CardTitle>
            <CardDescription>
              {selectedAccount
                ? `${selectedAccount.name} · ${formatCurrency(selectedAccount.balance, selectedAccount.currency)}`
                : 'Selecciona una cuenta'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={`grid gap-2 ${accounts.length > 1 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <Button
                type="button"
                size="sm"
                variant={mode === 'INCOME' ? 'default' : 'outline'}
                onClick={() => {
                  setMode('INCOME')
                  setCategoryId('')
                }}
              >
                Ingreso
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'EXPENSE' ? 'destructive' : 'outline'}
                onClick={() => {
                  setMode('EXPENSE')
                  setCategoryId('')
                }}
              >
                Gasto
              </Button>
              {accounts.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'TRANSFER' ? 'secondary' : 'outline'}
                  onClick={() => setMode('TRANSFER')}
                >
                  Transferir
                </Button>
              )}
            </div>

            {accounts.length > 1 && (
              <div className="space-y-1.5">
                <Label>{mode === 'TRANSFER' ? 'Cuenta origen' : 'Cuenta'}</Label>
                <select
                  value={selectedAccount?.id || ''}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.balance, a.currency)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mode === 'TRANSFER' && targetAccount ? (
              <div className="space-y-1.5">
                <Label>Cuenta destino</Label>
                <select
                  value={targetAccount.id}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                >
                  {accounts
                    .filter((a) => a.id !== selectedAccount?.id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.balance, a.currency)})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                >
                  <option value="">Sin categoría</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="qm-amount">Valor</Label>
              <Input
                id="qm-amount"
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
              <Label htmlFor="qm-desc">Descripción</Label>
              <Input
                id="qm-desc"
                required={mode !== 'TRANSFER'}
                placeholder={
                  mode === 'TRANSFER' ? 'Ej. Ahorro mensual' : 'Ej. Almuerzo o pago cliente'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Guardando...' : 'Confirmar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
