import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BookOpen, ChevronLeft, LogOut, User } from 'lucide-react'

interface NavbarProps {
  /** Itens do breadcrumb em ordem: [pasta do drive, curso, módulo, tópico, aula...] */
  breadcrumbs?: string[]
  showBackButton?: boolean
  backTo?: string
}

export default function Navbar({ breadcrumbs = [], showBackButton = true, backTo }: NavbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  function handleBack() {
    if (backTo) {
      navigate(backTo)
    } else {
      navigate(-1)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Back Button */}
        {showBackButton && (
          <button
            onClick={handleBack}
            className="btn-ghost p-2 rounded-xl flex items-center gap-1"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-600/30 border border-brand-500/40 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-brand-400" />
          </div>
          <span className="font-bold text-white hidden sm:block">DriveStudy</span>
        </button>

        {/* Breadcrumb */}
        {breadcrumbs.map((item, idx) => (
          <span key={idx} className="flex items-center gap-1 min-w-0">
            <span className="text-gray-700">/</span>
            <span
              className={`font-medium truncate hidden sm:block ${
                idx === breadcrumbs.length - 1
                  ? 'text-white max-w-[200px]'
                  : 'text-gray-400 max-w-[120px]'
              }`}
              title={item}
            >
              {item}
            </span>
          </span>
        ))}

        <div className="flex-1" />

        {/* User */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full ring-2 ring-brand-500/30" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-brand-400" />
                </div>
              )}
              <span className="text-sm text-gray-300 hidden md:block">{user.name?.split(' ')[0]}</span>
            </div>
            <button
              id="logout-btn"
              onClick={logout}
              className="btn-ghost p-2 rounded-xl text-gray-500 hover:text-red-400"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
