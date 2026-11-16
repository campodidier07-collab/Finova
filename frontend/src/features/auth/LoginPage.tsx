import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
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
      {/* Ambient Emerald & Navy Glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-[#10B981]/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[420px] w-[420px] rounded-full bg-[#10B981]/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Branding & Growth Visual */}
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

          {/* Stylized Growth Chart Illustration */}
          <div className="relative mt-8">
            <svg
              viewBox="0 0 460 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full max-w-md drop-shadow-[0_0_30px_rgba(16,185,129,0.25)]"
            >
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#0F172A" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
              <rect x="24" y="140" width="38" height="75" rx="6" fill="url(#barGrad)" opacity="0.45" />
              <rect x="82" y="115" width="38" height="100" rx="6" fill="url(#barGrad)" opacity="0.55" />
              <rect x="140" y="130" width="38" height="85" rx="6" fill="url(#barGrad)" opacity="0.5" />
              <rect x="198" y="88" width="38" height="127" rx="6" fill="url(#barGrad)" opacity="0.7" />
              <rect x="256" y="72" width="38" height="143" rx="6" fill="url(#barGrad)" opacity="0.8" />
              <rect x="314" y="42" width="38" height="173" rx="6" fill="url(#barGrad)" opacity="0.9" />
              <rect x="372" y="18" width="38" height="197" rx="6" fill="url(#barGrad)" />
              <path
                d="M20 175 C 95 168, 125 110, 185 118 C 245 125, 290 55, 415 24"
                stroke="url(#lineGrad)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M398 16 L422 22 L412 44"
                stroke="#34D399"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Right Glassmorphism Login Card */}
        <div className="flex justify-center lg:justify-end">
          <div className="relative w-full max-w-[410px] rounded-3xl border border-white/20 bg-gradient-to-b from-slate-800/75 via-slate-800/60 to-slate-200/90 p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="flex items-center gap-2.5 mb-3">
                <img
                  src="/finova-icon.jpg"
                  alt="Finova"
                  className="h-9 w-9 rounded-xl object-cover shadow-md"
                />
                <span className="text-2xl font-bold tracking-tight text-white">Finova</span>
              </div>
              <h2 className="text-xl font-semibold text-white">¡Bienvenido de nuevo!</h2>
              <p className="text-sm text-slate-200/90 mt-0.5">Iniciar sesión</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-rose-500/20 border border-rose-400/50 px-3.5 py-2.5 text-sm text-rose-100">
                  {error}
                </div>
              )}

              {forgotNotice && (
                <div className="rounded-xl bg-[#F59E0B]/20 border border-[#F59E0B]/50 px-3.5 py-2.5 text-xs text-amber-100">
                  Puedes cambiar tu contraseña desde <strong>Sistema → Seguridad</strong> una vez dentro, o solicitar restablecimiento al administrador.
                </div>
              )}

              <div className="space-y-1.5">
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

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-slate-200">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
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
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => setForgotNotice((prev) => !prev)}
                    className="text-xs text-[#0F172A]/80 hover:underline font-medium cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-full bg-gradient-to-r from-[#10B981] to-teal-500 text-white font-semibold text-sm shadow-lg shadow-[#10B981]/30 hover:opacity-95 transition-opacity disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Ingresando...' : 'Iniciar sesión'}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-[#0F172A]/85 font-medium">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="font-bold text-emerald-700 hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
