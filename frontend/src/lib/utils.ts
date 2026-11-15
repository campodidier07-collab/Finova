import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: string | number, currency = 'COP'): string {
  const numeric = typeof amount === 'string' ? Number(amount) : amount
  if (Number.isNaN(numeric)) return `0 ${currency}`
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric)
}

export function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }),
    time: d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}
