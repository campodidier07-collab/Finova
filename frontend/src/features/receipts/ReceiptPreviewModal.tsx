import { useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Movement } from '@/types/api'

interface ReceiptPreviewModalProps {
  movement: Movement | null
  onClose: () => void
}

export function ReceiptPreviewModal({ movement, onClose }: ReceiptPreviewModalProps) {
  useEffect(() => {
    if (!movement) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [movement, onClose])

  if (!movement || !movement.receipt) return null

  const dt = formatDateTime(movement.occurred_at)
  const isPdf = movement.receipt.toLowerCase().endsWith('.pdf')
  const isExpense = movement.type === 'EXPENSE' || movement.type === 'TRANSFER_OUT'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/80 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b bg-[#0F172A] px-5 py-3.5 text-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <i className="fa-solid fa-receipt text-[#10B981]" />
            <span className="font-semibold text-sm">Comprobante adjunto</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar"
            className="h-8 w-8 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <i className="fa-solid fa-xmark text-base" />
          </Button>
        </div>

        <div className="bg-slate-950/95 flex items-center justify-center max-h-[60vh] overflow-auto p-3">
          {isPdf ? (
            <iframe
              src={movement.receipt}
              title={movement.description}
              className="w-full h-[52vh] rounded-lg bg-white"
            />
          ) : (
            <img
              src={movement.receipt}
              alt={movement.description}
              className="max-h-[55vh] w-auto rounded-lg object-contain shadow-md"
            />
          )}
        </div>

        <div className="p-5 space-y-2 bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-base text-foreground">{movement.description}</p>
            <span
              className={`text-base font-bold ${
                isExpense ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {isExpense ? '-' : ''}
              {formatCurrency(movement.amount, movement.account_currency)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={isExpense ? 'expense' : 'income'}>
              {movement.category_name || movement.type}
            </Badge>
            <span>
              {movement.account_name} · {dt.date} {dt.time}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
