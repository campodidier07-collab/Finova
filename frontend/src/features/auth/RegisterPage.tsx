import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react'
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
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className="pointer-events-none absolute -top-40 -left-24 h-[520px] w-[520px] rounded-full bg-[#10B981]/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[480px] w-[480px] rounded-full bg-[#F59E0B]/10 blur-[140px]" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-12 gap-10 items-center">
        {/* Left Branding */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-between gap-8 pr-6">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <img
                src="/finova-icon.jpg"
                alt="Finova"
                className="h-11 w-11 rounded-2xl object-cover ring-1 ring-white/15 shadow-lg shadow-[#10B981]/20"
              />
              <div>
                <span className="text-2xl font-bold tracking-tight text-white">Finova</span>
                <span className="ml-2.5 inline-flex items-center rounded-full bg-[#F59E0B]/15 px-2.5 py-0.5 text-xs font-semibold text-[#F59E0B] ring-1 ring-[#F59E0B]/30">
                  Finanzas Inteligentes
                </span>
              </div>
            </div>

            <h1 className="text-4xl xl:text-[44px] font-bold leading-[1.15] tracking-tight text-white">
              Empieza a tomar decisiones con{' '}
              <span className="bg-gradient-to-r from-[#10B981] to-[#F59E0B] bg-clip-text text-transparent">
                claridad total
              </span>
            </h1>

            <p className="text-slate-300 text-base max-w-xl leading-relaxed">
              Configura tu saldo inicial, controla cuentas, suscripciones, deudas y descarga reportes ejecutivos en segundos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-xl">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl flex items-start gap-3">
              <div className="rounded-lg bg-[#10B981]/15 p-2 text-[#10B981]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Comprobantes adjuntos</p>
                <p className="text-xs text-slate-400 mt-0.5">Respalda cada gasto con su factura</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl flex items-start gap-3">
              <div className="rounded-lg bg-[#F59E0B]/15 p-2 text-[#F59E0B]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Seguridad JWT</p>
                <p className="text-xs text-slate-400 mt-0.5">Datos aislados y protegidos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Register Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-slate-900/80 shadow-[0_25px_70px_-15px_rgba(16,185,129,0.25)] backdrop-blur-2xl">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#10B981] via-emerald-400 to-[#F59E0B]" />
            <div className="p-7 sm:p-8">
              <div className="flex flex-col items-center text-center mb-5">
                <img
                  src="/finova-icon.jpg"
                  alt="Finova"
                  className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/15 shadow-md mb-3 lg:hidden"
                />
                <h2 className="text-2xl font-bold tracking-tight text-white">Crea tu cuenta</h2>
                <p className="text-sm text-slate-400 mt-1">Comienza gratis en menos de 1 minuto</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {error && (
                  <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-3.5 py-2 text-sm text-rose-200">
                    {error}
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="fullName" className="block text-xs font-medium text-slate-300">
                    Nombre completo
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      id="fullName"
                      required
                      placeholder="Ej. Jean Campo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="email" className="block text-xs font-medium text-slate-300">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="ejemplo@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="currency" className="block text-xs font-medium text-slate-300">
                    Moneda principal
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 text-sm text-white focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
                  >
                    <option value="COP">COP — Peso Colombiano</option>
                    <option value="USD">USD — Dólar Estadounidense</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="MXN">MXN — Peso Mexicano</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="password" className="block text-xs font-medium text-slate-300">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-[#10B981] to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-[#10B981]/25 hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{submitting ? 'Creando cuenta...' : 'Crear cuenta'}</span>
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-slate-400">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="font-semibold text-[#10B981] hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
