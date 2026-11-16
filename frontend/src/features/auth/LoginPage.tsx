import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, TrendingUp } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forgotNotice, setForgotNotice] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setForgotNotice(false)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 400) {
        setError('Correo o contraseña incorrectos.')
      } else {
        setError('No se pudo conectar con el servidor backend (http://localhost:8000).')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0F172A] text-[#F8FAFC] flex items-center justify-center">
      {/* Subtle Architectural Grid + Ambient Glows */}
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
        {/* Left Fintech Hero */}
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
              </div>
            </div>

            <h1 className="text-4xl xl:text-[44px] font-bold leading-[1.15] tracking-tight text-white">
              Control claro, organizado y{' '}
              <span className="bg-gradient-to-r from-[#10B981] to-[#F59E0B] bg-clip-text text-transparent">
                auditable
              </span>{' '}
              de tus finanzas
            </h1>

            <p className="text-slate-300 text-base max-w-xl leading-relaxed">
              Cada ingreso, gasto, transferencia y deuda queda registrado cronológicamente con saldo antes y después, reportes automáticos y comprobantes adjuntos.
            </p>
          </div>

          {/* Floating Interactive-Style Bento Preview */}
          <div className="grid grid-cols-2 gap-4 max-w-xl">
            <div className="col-span-2 rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">Saldo consolidado</p>
                  <p className="text-2xl font-bold text-white mt-0.5">$ 4.850.000,00</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/15 px-3 py-1 text-xs font-semibold text-[#10B981] ring-1 ring-[#10B981]/30">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +18.4% este mes
                </span>
              </div>
              <svg viewBox="0 0 420 72" fill="none" className="w-full h-16">
                <defs>
                  <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 58 C 55 52, 90 36, 145 40 C 200 44, 240 20, 300 24 C 345 27, 385 10, 420 6 L 420 72 L 0 72 Z"
                  fill="url(#heroArea)"
                />
                <path
                  d="M0 58 C 55 52, 90 36, 145 40 C 200 44, 240 20, 300 24 C 345 27, 385 10, 420 6"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="300" cy="24" r="4" fill="#F59E0B" />
                <circle cx="420" cy="6" r="4" fill="#10B981" />
              </svg>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl flex items-start gap-3">
              <div className="rounded-lg bg-[#10B981]/15 p-2 text-[#10B981]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Auditoría inmutable</p>
                <p className="text-xs text-slate-400 mt-0.5">Saldo antes y después por operación</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl flex items-start gap-3">
              <div className="rounded-lg bg-[#F59E0B]/15 p-2 text-[#F59E0B]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Reportes Excel (.xlsx)</p>
                <p className="text-xs text-slate-400 mt-0.5">Resumen ejecutivo semanal y mensual</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Crisp Dark-Glass Login Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-slate-900/80 shadow-[0_25px_70px_-15px_rgba(16,185,129,0.25)] backdrop-blur-2xl">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#10B981] via-emerald-400 to-[#F59E0B]" />
            <div className="p-7 sm:p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <img
                  src="/finova-icon.jpg"
                  alt="Finova"
                  className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/15 shadow-md mb-3 lg:hidden"
                />
                <h2 className="text-2xl font-bold tracking-tight text-white">¡Bienvenido de nuevo!</h2>
                <p className="text-sm text-slate-400 mt-1">Ingresa a tu panel financiero</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-3.5 py-2.5 text-sm text-rose-200">
                    {error}
                  </div>
                )}

                {forgotNotice && (
                  <div className="rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/40 px-3.5 py-2.5 text-xs text-amber-200">
                    Puedes actualizar tu contraseña en <strong>Sistema → Seguridad</strong> al iniciar sesión, o pedir restablecimiento al administrador.
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-medium text-slate-300">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="juangarcia@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-xs font-medium text-slate-300">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotNotice((prev) => !prev)}
                      className="text-xs text-[#F59E0B] hover:underline cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 transition-colors"
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
                  <span>{submitting ? 'Ingresando...' : 'Iniciar sesión'}</span>
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-400">
                ¿No tienes cuenta?{' '}
                <Link to="/register" className="font-semibold text-[#10B981] hover:underline">
                  Regístrate aquí
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
