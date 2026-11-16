import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [currency, setCurrency] = useState('COP')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register({
        email,
        full_name: fullName,
        password,
        default_currency: currency,
      })
      navigate('/')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { email?: string[]; password?: string[] } } })?.response
          ?.data?.email?.[0] ||
        (err as { response?: { data?: { password?: string[] } } })?.response?.data
          ?.password?.[0] ||
        'No se pudo completar el registro. Verifica tus datos.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0F172A] text-[#F8FAFC] flex items-center justify-center">
      <div className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-[#10B981]/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[420px] w-[420px] rounded-full bg-[#10B981]/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Branding */}
        <div className="hidden lg:flex flex-col justify-between min-h-[540px] pr-6">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <img
                src="/finova-icon.jpg"
                alt="Finova"
                className="h-12 w-12 rounded-2xl object-cover shadow-lg shadow-[#10B981]/20"
              />
              <span className="text-3xl font-bold tracking-tight text-white">Finova</span>
            </div>
            <h1 className="text-4xl xl:text-[42px] font-bold leading-tight tracking-tight text-white max-w-md">
              Control claro, organizado y auditable de tus finanzas
            </h1>
          </div>
          <p className="text-sm text-slate-300 max-w-md">
            Registra tu saldo inicial, controla ingresos, gastos, suscripciones, deudas y obtén reportes ejecutivos automáticos.
          </p>
        </div>

        {/* Right Glassmorphism Register Card */}
        <div className="flex justify-center lg:justify-end">
          <div className="relative w-full max-w-[420px] rounded-3xl border border-white/20 bg-gradient-to-b from-slate-800/75 via-slate-800/60 to-slate-200/90 p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="flex items-center gap-2.5 mb-2">
                <img
                  src="/finova-icon.jpg"
                  alt="Finova"
                  className="h-9 w-9 rounded-xl object-cover shadow-md"
                />
                <span className="text-2xl font-bold tracking-tight text-white">Finova</span>
              </div>
              <h2 className="text-xl font-semibold text-white">Crea tu cuenta</h2>
              <p className="text-xs text-slate-200/90 mt-0.5">Empieza a auditar tus finanzas personales</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="rounded-xl bg-rose-500/20 border border-rose-400/50 px-3.5 py-2 text-sm text-rose-100">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="fullName" className="block text-xs font-medium text-slate-200">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    id="fullName"
                    required
                    placeholder="Ej. Jean Campo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/30 bg-white/85 pl-10 pr-3 text-sm text-[#0F172A] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="email" className="block text-xs font-medium text-slate-200">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/30 bg-white/85 pl-10 pr-3 text-sm text-[#0F172A] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="currency" className="block text-xs font-medium text-slate-200">
                  Moneda principal
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/30 bg-white/85 px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                >
                  <option value="COP">COP — Peso Colombiano</option>
                  <option value="USD">USD — Dólar Estadounidense</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="MXN">MXN — Peso Mexicano</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="password" className="block text-xs font-medium text-slate-200">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/30 bg-white/85 pl-10 pr-10 text-sm text-[#0F172A] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-600 hover:text-[#0F172A] cursor-pointer"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-full bg-gradient-to-r from-[#10B981] to-teal-500 text-white font-semibold text-sm shadow-lg shadow-[#10B981]/30 hover:opacity-95 transition-opacity disabled:opacity-60 cursor-pointer mt-2"
              >
                {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-[#0F172A]/85 font-medium">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-bold text-emerald-700 hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
