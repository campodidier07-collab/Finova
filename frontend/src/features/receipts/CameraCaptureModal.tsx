import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface CameraCaptureModalProps {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

export function CameraCaptureModal({ open, onClose, onCapture }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const startCamera = async () => {
      setError(null)
      setReady(false)
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Tu navegador no soporta acceso a la cámara.')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setReady(true)
        }
      } catch {
        setError('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [open])

  if (!open) return null

  const handleCapture = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `comprobante-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })
        onCapture(file)
        onClose()
      },
      'image/jpeg',
      0.9
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <i className="fa-solid fa-camera text-primary" />
              Tomar foto del comprobante
            </CardTitle>
            <CardDescription>Enfoca la factura o recibo y presiona Capturar</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar cámara">
            <i className="fa-solid fa-xmark text-base" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl bg-slate-950 aspect-video flex items-center justify-center">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              {!ready && (
                <span className="absolute text-xs text-slate-300">Iniciando cámara...</span>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" disabled={!ready || !!error} onClick={handleCapture}>
              <i className="fa-solid fa-camera text-xs" />
              Capturar foto
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
