import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, LogOut, ShieldCheck } from 'lucide-react'
import { apiClient } from '@/api/client'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SecurityPage() {
  const { user, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('Las contraseñas nuevas no coinciden.')
      }
      await apiClient.post('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      })
    },
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage({ type: 'ok', text: 'Contraseña actualizada correctamente.' })
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { current_password?: string[]; new_password?: string[] } } })
          ?.response?.data?.current_password?.[0] ||
        (err as { response?: { data?: { new_password?: string[] } } })?.response?.data
          ?.new_password?.[0] ||
        (err as Error)?.message ||
        'No se pudo actualizar la contraseña.'
      setMessage({ type: 'err', text: detail })
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    mutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Seguridad</h1>
        <p className="text-sm text-muted-foreground">
          Protege el acceso a tu cuenta financiera y gestiona tu contraseña
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Cambiar contraseña
            </CardTitle>
            <CardDescription>Usa una contraseña segura de al menos 8 caracteres</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {message && (
                <div
                  className={`rounded-md border px-3 py-2 text-sm ${
                    message.type === 'ok'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  {message.text}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="sec-curr">Contraseña actual</Label>
                <Input
                  id="sec-curr"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sec-new">Nueva contraseña</Label>
                <Input
                  id="sec-new"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sec-conf">Confirmar nueva contraseña</Label>
                <Input
                  id="sec-conf"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Actualizando...' : 'Actualizar contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#10B981]" />
              Estado de la sesión
            </CardTitle>
            <CardDescription>Autenticación activa mediante JWT</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border p-3 bg-muted/40 space-y-1">
              <p className="font-medium">Cuenta conectada: {user?.email}</p>
              <p className="text-xs text-muted-foreground">
                Tokens JWT con rotación automática y libro mayor inmutable (append-only).
              </p>
            </div>
            <Button variant="destructive" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Cerrar sesión en este dispositivo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
