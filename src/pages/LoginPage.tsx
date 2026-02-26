import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../contexts/AuthContext'
import { BookOpen, Play, FileText, BarChart3, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        if (!res.ok) throw new Error('userinfo failed')
        const userInfo = await res.json()
        login(tokenResponse.access_token, {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        })
      } catch {
        setError('Erro ao buscar informações do usuário. Tente novamente.')
        setLoading(false)
      }
    },
    onError: () => {
      setError('Login cancelado ou falhou. Tente novamente.')
      setLoading(false)
    },
    scope: 'openid email profile https://www.googleapis.com/auth/drive.readonly',
  })


  const features = [
    { icon: Play, label: 'Vídeos com progresso salvo', color: 'text-blue-400' },
    { icon: FileText, label: 'PDFs com página salva', color: 'text-red-400' },
    { icon: BarChart3, label: 'Progresso por módulo', color: 'text-green-400' },
    { icon: BookOpen, label: 'Anotações por aula', color: 'text-purple-400' },
  ]

  return (
    <div className="min-h-screen bg-surface-900 bg-mesh flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-600/20 border border-brand-500/30 mb-6 glow-sm">
            <BookOpen className="w-10 h-10 text-brand-400" />
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2">DriveStudy</h1>
          <p className="text-gray-400 text-lg">
            Transforme pastas do Google Drive em cursos estruturados
          </p>
        </div>

        {/* Card */}
        <div className="card glow-sm">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            Bem-vindo de volta 👋
          </h2>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {features.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 glass rounded-xl p-3">
                <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                <span className="text-xs text-gray-300 leading-tight">{label}</span>
              </div>
            ))}
          </div>

          {/* Google Sign In */}
          <button
            id="google-login-btn"
            onClick={() => googleLogin()}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Entrando...' : 'Entrar com Google'}
          </button>


          {error && (
            <p className="mt-4 text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-4">
              {error}
            </p>
          )}

          <p className="mt-6 text-xs text-gray-500 text-center">
            Precisamos de acesso de leitura ao Google Drive para estruturar seu curso.
          </p>
        </div>
      </div>
    </div>
  )
}
