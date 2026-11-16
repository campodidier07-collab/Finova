import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { apiClient } from '@/api/client'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { PeriodSummary } from '@/types/api'

export function ReportsPage() {
  const { user } = useAuth()
  const [periodType, setPeriodType] = useState<'WEEKLY' | 'MONTHLY'>('MONTHLY')
  const currency = user?.default_currency || 'COP'

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', periodType],
    queryFn: async () => {
      const { data } = await apiClient.get<PeriodSummary>(
        `/reports/period/?period_type=${periodType}`
      )
      return data
    },
  })

  const [exporting, setExporting] = useState(false)

  const exportExcel = async () => {
    if (!report) return
    setExporting(true)
    try {
      const { data } = await apiClient.get<Blob>(
        `/reports/export-xlsx/?period_type=${periodType}`,
        { responseType: 'blob' }
      )
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `finova-reporte-${periodType.toLowerCase()}-${report.period_start}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const pieData = (report?.top_expense_categories || []).map((c) => ({
    name: c.category_name,
    value: Number(c.total),
    color: c.category_color,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes Financieros</h1>
          <p className="text-sm text-muted-foreground">
            Análisis automático semanal y mensual de ingresos, gastos y capacidad de ahorro
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={periodType === 'WEEKLY' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodType('WEEKLY')}
          >
            Semanal
          </Button>
          <Button
            variant={periodType === 'MONTHLY' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodType('MONTHLY')}
          >
            Mensual
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!report || exporting}>
            <Download className="h-4 w-4" />
            {exporting ? 'Generando...' : 'Exportar Excel (.xlsx)'}
          </Button>
        </div>
      </div>

      {isLoading || !report ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Generando reporte...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total ingresado</CardDescription>
                <CardTitle className="text-xl text-emerald-600">
                  +{formatCurrency(report.total_income, currency)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {report.period_start} al {report.period_end}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total gastado</CardDescription>
                <CardTitle className="text-xl text-rose-600">
                  -{formatCurrency(report.total_expense, currency)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {report.movement_count} operaciones en el período
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Balance del período</CardDescription>
                <CardTitle className="text-xl">
                  {formatCurrency(report.net_balance, currency)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Diferencia neta ingresos - gastos
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Capacidad de ahorro</CardDescription>
                <CardTitle className="text-xl">{report.savings_rate_pct}%</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Porcentaje retenido sobre ingresos
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribución de gastos por categoría</CardTitle>
                <CardDescription>Principales rubros donde invertiste tu dinero</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {pieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Sin gastos registrados en este período.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        label
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top categorías de gasto</CardTitle>
                <CardDescription>Detalle ordenado de mayor a menor impacto</CardDescription>
              </CardHeader>
              <CardContent>
                {report.top_expense_categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay datos en este período.</p>
                ) : (
                  <ul className="divide-y">
                    {report.top_expense_categories.map((cat) => (
                      <li key={cat.category_name} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: cat.category_color }}
                          />
                          <div>
                            <p className="text-sm font-medium">{cat.category_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {cat.count} movimiento(s)
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatCurrency(cat.total, currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
