import React, { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import AuthNavigationHandler from './components/AuthNavigationHandler'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/login/LoginPage'

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))

function App(): React.JSX.Element {
  return (
    <>
      <AuthNavigationHandler />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="app-loading">Cargando...</div>}>
                <DashboardPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

export default App
