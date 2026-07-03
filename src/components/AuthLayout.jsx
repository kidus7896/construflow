import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">ConstruFlow</h1>
          <p className="text-sm text-muted mt-1">Financial management for construction</p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
