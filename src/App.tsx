import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import CourseDashboard from './pages/CourseDashboard'
import ModulePage from './pages/ModulePage'
import VideoPage from './pages/VideoPage'
import PdfPage from './pages/PdfPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/course/:folderId" element={<ProtectedRoute><CourseDashboard /></ProtectedRoute>} />
      <Route path="/course/:folderId/module/:moduleId" element={<ProtectedRoute><ModulePage /></ProtectedRoute>} />
      <Route path="/course/:folderId/watch/:fileId" element={<ProtectedRoute><VideoPage /></ProtectedRoute>} />
      <Route path="/course/:folderId/read/:fileId" element={<ProtectedRoute><PdfPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
