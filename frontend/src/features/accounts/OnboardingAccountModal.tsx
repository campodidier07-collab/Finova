import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function OnboardingAccountModal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState('Cuenta Principal')
  const [initialBalance, setInitialBalance] = useState('0')
  const [currency, setCurrency] = useState(user?.default_currency || 'COP')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/accounts/', {
        name,
        currency,
        initial_balance: Number(initialBalance || 0).toFixed(2),
      })
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
    },
    onError: () => {
      setError('No se pudo crear la cuenta. Verifica el saldo inicial.')
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle>Configura tu cuenta inicial</CardTitle>
          <CardDescription>
            Registra tu saldo inicial para empezar a llevar el control cronológico de tu dinero.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Nombre de la cuenta</Label>
              <Input
                id="acc-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="acc-currency">Moneda</Label>
                <select
                  id="acc-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                >
                  <option value="COP">COP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="MXN">MXN</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-balance">Saldo inicial</Label>
                <Input
                  id="acc-balance"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creando cuenta...' : 'Comenzar con Finova'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
