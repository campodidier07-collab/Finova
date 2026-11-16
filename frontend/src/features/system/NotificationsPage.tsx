import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import type { AppNotification, PaginatedResponse } from '@/types/api'

export function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () =>
      (await apiClient.get<PaginatedResponse<AppNotification>>('/system/notifications/')).data,
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/system/notifications/sync/')
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const readMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.post(`/system/notifications/${id}/read/`)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const readAllMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/system/notifications/read-all/')
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications = notifData?.results || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Alertas de suscripciones próximas, vencimientos de deudas y actividad de tu cuenta
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <i className="fa-solid fa-arrows-rotate text-xs" />
            Buscar alertas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => readAllMutation.mutate()}
            disabled={readAllMutation.isPending || notifications.length === 0}
          >
            <i className="fa-solid fa-check-double text-xs" />
            Marcar todo leído
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <i className="fa-solid fa-bell text-[#F59E0B]" />
            Centro de alertas
          </CardTitle>
          <CardDescription>
            {notifications.filter((n) => !n.is_read).length} sin leer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando notificaciones...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tienes notificaciones pendientes. Haz clic en "Buscar alertas" para revisar próximos vencimientos.
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const dt = formatDateTime(n.created_at)
                return (
                  <li
                    key={n.id}
                    className={`py-3 flex items-start justify-between gap-3 ${
                      n.is_read ? 'opacity-65' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            n.level === 'WARNING'
                              ? 'adjustment'
                              : n.level === 'SUCCESS'
                              ? 'income'
                              : 'neutral'
                          }
                        >
                          {n.level === 'WARNING' ? 'Alerta' : n.level === 'SUCCESS' ? 'Éxito' : 'Info'}
                        </Badge>
                        <span className="font-medium text-sm">{n.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {dt.date} · {dt.time}
                      </p>
                    </div>
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => readMutation.mutate(n.id)}
                        disabled={readMutation.isPending}
                      >
                        <i className="fa-solid fa-check text-xs" />
                      </Button>
                    )}
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
