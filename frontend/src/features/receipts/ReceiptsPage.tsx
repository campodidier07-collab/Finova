import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CameraCaptureModal } from '@/features/receipts/CameraCaptureModal'
import { ReceiptPreviewModal } from '@/features/receipts/ReceiptPreviewModal'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Movement, PaginatedResponse } from '@/types/api'

export function ReceiptsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedMovementId, setSelectedMovementId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [previewMovement, setPreviewMovement] = useState<Movement | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: withReceipts, isLoading } = useQuery({
    queryKey: ['movements', 'with-receipts', search],
    queryFn: async () => {
      const params = new URLSearchParams({ has_receipt: 'true', page_size: '60' })
      if (search.trim()) params.set('search', search.trim())
      return (await apiClient.get<PaginatedResponse<Movement>>(`/movements/?${params.toString()}`))
        .data
    },
  })

  const { data: withoutReceipts } = useQuery({
    queryKey: ['movements', 'without-receipts'],
    queryFn: async () =>
      (
        await apiClient.get<PaginatedResponse<Movement>>(
          '/movements/?has_receipt=false&page_size=50'
        )
      ).data,
  })

  const attachMutation = useMutation({
    mutationFn: async () => {
      const targetId = selectedMovementId || String(withoutReceipts?.results?.[0]?.id || '')
      if (!targetId) throw new Error('Selecciona un movimiento.')
      if (!file) throw new Error('Selecciona o toma una foto del comprobante.')
      const formData = new FormData()
      formData.append('receipt', file)
      await apiClient.post(`/movements/${targetId}/attach-receipt/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      setFile(null)
      setSelectedMovementId('')
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
    },
    onError: (err: unknown) => {
      setError((err as Error)?.message || 'No se pudo guardar el comprobante.')
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    attachMutation.mutate()
  }

  const pendingMovements = withoutReceipts?.results || []
  const gallery = withReceipts?.results || []

  return (
    <div className="space-y-6">
      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(captured) => setFile(captured)}
      />
      <ReceiptPreviewModal movement={previewMovement} onClose={() => setPreviewMovement(null)} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comprobantes y Facturas</h1>
        <p className="text-sm text-muted-foreground">
          Guarda fotografías o archivos de tus facturas y consúltalos al instante
        </p>
      </div>

      {/* Attach Receipt to Existing Movement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <i className="fa-solid fa-camera text-primary" />
            Adjuntar comprobante a un movimiento
          </CardTitle>
          <CardDescription>
            Sube una imagen/PDF o toma una foto directamente con tu cámara
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Movimiento</Label>
              <select
                value={selectedMovementId || pendingMovements[0]?.id || ''}
                onChange={(e) => setSelectedMovementId(e.target.value)}
                disabled={pendingMovements.length === 0}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
              >
                {pendingMovements.length === 0 ? (
                  <option value="">Todos los movimientos ya tienen comprobante</option>
                ) : (
                  pendingMovements.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.description} — {formatCurrency(m.amount, m.account_currency)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-file">Archivo o foto</Label>
              <div className="flex gap-2">
                <Input
                  id="rec-file"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Tomar foto con cámara"
                  onClick={() => setCameraOpen(true)}
                >
                  <i className="fa-solid fa-camera text-sm" />
                </Button>
              </div>
              {file && (
                <p className="text-xs text-emerald-600 truncate">
                  <i className="fa-solid fa-check mr-1" />
                  {file.name}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={attachMutation.isPending || pendingMovements.length === 0 || !file}
            >
              <i className="fa-solid fa-upload text-xs" />
              {attachMutation.isPending ? 'Subiendo...' : 'Guardar comprobante'}
            </Button>

            {error && (
              <p className="sm:col-span-2 lg:col-span-4 text-sm text-rose-600">{error}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Gallery */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Archivo de Comprobantes ({gallery.length})</CardTitle>
            <CardDescription>Haz clic en cualquier comprobante para ampliarlo</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <i className="fa-solid fa-magnifying-glass text-xs absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Buscar comprobante..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando comprobantes...</p>
          ) : gallery.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aún no hay comprobantes guardados.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((m) => {
                const dt = formatDateTime(m.occurred_at)
                const isPdf = m.receipt?.toLowerCase().endsWith('.pdf')
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPreviewMovement(m)}
                    className="group text-left rounded-xl border bg-card overflow-hidden hover:border-primary transition-all shadow-xs cursor-pointer"
                  >
                    <div className="h-40 bg-slate-100 flex items-center justify-center overflow-hidden">
                      {isPdf ? (
                        <div className="flex flex-col items-center gap-1 text-slate-500">
                          <i className="fa-solid fa-file-pdf text-3xl text-rose-600" />
                          <span className="text-xs font-medium">Documento PDF</span>
                        </div>
                      ) : (
                        <img
                          src={m.receipt || ''}
                          alt={m.description}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                    </div>
                    <div className="p-3.5 space-y-1">
                      <p className="font-medium text-sm truncate">{m.description}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{dt.date}</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(m.amount, m.account_currency)}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
