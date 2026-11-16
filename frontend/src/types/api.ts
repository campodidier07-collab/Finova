export interface UserProfile {
  id: number
  email: string
  full_name: string
  timezone: string
  default_currency: string
  date_joined: string
}

export interface Account {
  id: number
  name: string
  currency: string
  initial_balance: string
  balance: string
  allow_overdraft: boolean
  created_at: string
}

export interface Category {
  id: number
  name: string
  type: 'INCOME' | 'EXPENSE'
  color: string
  icon: string
  is_default: boolean
}

export type MovementType =
  | 'INITIAL'
  | 'INCOME'
  | 'EXPENSE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT'

export interface Movement {
  id: number
  account: number
  account_name: string
  account_currency: string
  category: number | null
  category_name: string | null
  category_color: string | null
  type: MovementType
  amount: string
  balance_before: string
  balance_after: string
  description: string
  occurred_at: string
  recorded_at: string
  reversed_movement: number | null
  is_reversed: boolean
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface CategoryBreakdown {
  category_id: number | null
  category_name: string
  category_color: string
  total: string
  count: number
}

export interface PeriodSummary {
  period_type?: 'WEEKLY' | 'MONTHLY'
  period_start: string
  period_end: string
  total_income: string
  total_expense: string
  net_balance: string
  savings_rate_pct: string
  movement_count: number
  top_expense_categories: CategoryBreakdown[]
}

export interface DashboardSummary {
  total_balance: string
  currency: string
  summaries: {
    today: PeriodSummary
    week: PeriodSummary
    month: PeriodSummary
  }
}

export interface BalanceTrendPoint {
  date: string
  balance: string
  income: string
  expense: string
}
