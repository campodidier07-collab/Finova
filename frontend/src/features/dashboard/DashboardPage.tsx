import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Plus, Wallet } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { apiClient } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { DashboardSummary, Movement, PaginatedResponse } from '@/types/api'

export function DashboardPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardSummary>('/reports/dashboard/')
      return data
    },
  })

  const { data: recentIncomes } = useQuery({
    queryKey: ['movements', 'recent-income'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Movement>>(
        '/movements/?type=INCOME&page_size=5'
      )
      return data.results.slice(0, 5)
    },
  })

  const { data: recentExpenses } = useQuery({
    queryKey: ['movements', 'recent-expense'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Movement>>(
        '/movements/?type=EXPENSE&page_size=5'
      )
      return data.results.slice(0, 5)
    },
  })

  const currency = summary?.currency || 'COP'

  const chartData = summary
    ? [
        {
          periodo: 'Hoy',
          Ingresos: Number(summary.summaries.today.total_income),
          Gastos: Number(summary.summaries.today.total_expense),
        },
        {
          periodo: 'Semana',
          Ingresos: Number(summary.summaries.week.total_income),
          Gastos: Number(summary.summaries.week.total_expense),
        },
        {
          periodo: 'Mes',
          Ingresos: Number(summary.summaries.month.total_income),
          Gastos: Number(summary.summaries.month.total_expense),
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel Principal</h1>
          <p className="text-sm text-muted-foreground">
            Resumen inmediato de tu saldo disponible y comportamiento financiero
          </p>
        </div>
        <Link to="/movements">
          <Button>
            <Plus className="h-4 w-4" />
            Registrar movimiento
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-100 flex items-center justify-between">
              <span>Saldo disponible actual</span>
              <Wallet className="h-4 w-4 text-emerald-100" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-white">
              {loadingSummary ? '...' : formatCurrency(summary?.total_balance || '0', currency)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-100">Actualizado automáticamente con cada operación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resumen de hoy</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(summary?.summaries.today.net_balance || '0', currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Ingresos:</span>
              <span className="text-emerald-600 font-medium">
                +{formatCurrency(summary?.summaries.today.total_income || '0', currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Gastos:</span>
              <span className="text-rose-600 font-medium">
                -{formatCurrency(summary?.summaries.today.total_expense || '0', currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resumen semanal</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(summary?.summaries.week.net_balance || '0', currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Ingresos:</span>
              <span className="text-emerald-600 font-medium">
                +{formatCurrency(summary?.summaries.week.total_income || '0', currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Gastos:</span>
              <span className="text-rose-600 font-medium">
                -{formatCurrency(summary?.summaries.week.total_expense || '0', currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resumen mensual</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(summary?.summaries.month.net_balance || '0', currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Tasa de ahorro:</span>
              <Badge variant="income">{summary?.summaries.month.savings_rate_pct || '0'}%</Badge>
            </div>
            <div className="flex justify-between">
              <span>Movimientos:</span>
              <span className="font-medium text-foreground">
                {summary?.summaries.month.movement_count ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparative Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo de Ingresos vs. Gastos</CardTitle>
          <CardDescription>Comportamiento financiero del día, la semana y el mes actual</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="periodo" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Ingresos" fill="#059669" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Gastos" fill="#e11d48" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Incomes & Expenses */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <ArrowUpRight className="h-4 w-4" />
              Ingresos recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentIncomes?.length ? (
              <p className="text-sm text-muted-foreground">Aún no hay ingresos registrados.</p>
            ) : (
              <ul className="divide-y">
                {recentIncomes.map((m) => {
                  const dt = formatDateTime(m.occurred_at)
                  return (
                    <li key={m.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{m.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.category_name || 'Sin categoría'} · {dt.date} {dt.time}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">
                        +{formatCurrency(m.amount, m.account_currency)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <ArrowDownRight className="h-4 w-4" />
              Gastos recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentExpenses?.length ? (
              <p className="text-sm text-muted-foreground">Aún no hay gastos registrados.</p>
            ) : (
              <ul className="divide-y">
                {recentExpenses.map((m) => {
                  const dt = formatDateTime(m.occurred_at)
                  return (
                    <li key={m.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{m.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.category_name || 'Sin categoría'} · {dt.date} {dt.time}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-rose-600">
                        -{formatCurrency(m.amount, m.account_currency)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
