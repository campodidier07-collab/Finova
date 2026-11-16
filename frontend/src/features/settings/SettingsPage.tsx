import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { apiClient } from '@/api/client'
import { useAuth } from '@/features/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import type { Account, Category, PaginatedResponse } from '@/types/api'

export function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const queryClient = useQueryClient()

  // New Account state
  const [accName, setAccName] = useState('')
  const [accCurrency, setAccCurrency] = useState(user?.default_currency || 'COP')
  const [accInitial, setAccInitial] = useState('0')
  const [accOverdraft, setAccOverdraft] = useState(false)

  // New Category state
  const [catName, setCatName] = useState('')
  const [catType, setCatType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [catColor, setCatColor] = useState('#059669')

  // Profile state
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [defaultCurrency, setDefaultCurrency] = useState(user?.default_currency || 'COP')
  const [profileSaved, setProfileSaved] = useState(false)

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

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/accounts/', {
        name: accName,
        currency: accCurrency,
        initial_balance: Number(accInitial || 0).toFixed(2),
        allow_overdraft: accOverdraft,
      })
    },
    onSuccess: () => {
      setAccName('')
      setAccInitial('0')
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/categories/', {
        name: catName,
        type: catType,
        color: catColor,
      })
    },
    onSuccess: () => {
      setCatName('')
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/categories/${id}/`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/auth/me/', {
        full_name: fullName,
        default_currency: defaultCurrency,
      })
    },
    onSuccess: async () => {
      await refreshUser()
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    },
  })

  const handleAccountSubmit = (e: FormEvent) => {
    e.preventDefault()
    createAccountMutation.mutate()
  }

  const handleCategorySubmit = (e: FormEvent) => {
    e.preventDefault()
    createCategoryMutation.mutate()
  }

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Administra tus cuentas, categorías personalizadas y preferencias de perfil
        </p>
      </div>

      {/* Accounts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mis Cuentas</CardTitle>
            <CardDescription>Cuentas activas y sus saldos disponibles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="divide-y rounded-lg border">
              {(accountsData?.results || []).map((acc) => (
                <li key={acc.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Moneda: {acc.currency} · {acc.allow_overdraft ? 'Permite sobregiro' : 'Sin sobregiro'}
                    </p>
                  </div>
                  <span className="font-semibold text-sm">
                    {formatCurrency(acc.balance, acc.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <form onSubmit={handleAccountSubmit} className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium">Agregar nueva cuenta</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  required
                  placeholder="Ej. Ahorros"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                />
                <select
                  value={accCurrency}
                  onChange={(e) => setAccCurrency(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                >
                  <option value="COP">COP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="MXN">MXN</option>
                </select>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Saldo inicial"
                  value={accInitial}
                  onChange={(e) => setAccInitial(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={accOverdraft}
                  onChange={(e) => setAccOverdraft(e.target.checked)}
                />
                Permitir saldo negativo (sobregiro)
              </label>
              <Button type="submit" size="sm" disabled={createAccountMutation.isPending}>
                <Plus className="h-4 w-4" />
                Crear cuenta
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil de Usuario</CardTitle>
            <CardDescription>Actualiza tu nombre y moneda predeterminada</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="prof-email">Correo</Label>
                <Input id="prof-email" value={user?.email || ''} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prof-name">Nombre completo</Label>
                <Input
                  id="prof-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prof-curr">Moneda por defecto</Label>
                <select
                  id="prof-curr"
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                >
                  <option value="COP">COP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="MXN">MXN</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" size="sm" disabled={updateProfileMutation.isPending}>
                  Guardar cambios
                </Button>
                {profileSaved && (
                  <span className="text-xs text-emerald-600 font-medium">
                    Perfil actualizado correctamente
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categorías de Ingresos y Gastos</CardTitle>
          <CardDescription>
            Las categorías del sistema están disponibles por defecto; puedes crear tus propias categorías personalizadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCategorySubmit} className="grid gap-3 sm:grid-cols-4 items-end">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cat-name">Nueva categoría</Label>
              <Input
                id="cat-name"
                required
                placeholder="Ej. Mascotas, Gimnasio, Bonos..."
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-type">Tipo</Label>
              <select
                id="cat-type"
                value={catType}
                onChange={(e) => setCatType(e.target.value as 'INCOME' | 'EXPENSE')}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
              >
                <option value="EXPENSE">Gasto</option>
                <option value="INCOME">Ingreso</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                aria-label="Color"
                value={catColor}
                onChange={(e) => setCatColor(e.target.value)}
                className="w-12 p-1 h-9"
              />
              <Button type="submit" size="sm" className="flex-1" disabled={createCategoryMutation.isPending}>
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </div>
          </form>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(categoriesData?.results || []).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 bg-card"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-sm font-medium">{c.name}</span>
                  <Badge variant={c.type === 'INCOME' ? 'income' : 'expense'}>
                    {c.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                  </Badge>
                </div>
                {!c.is_default && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteCategoryMutation.mutate(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
