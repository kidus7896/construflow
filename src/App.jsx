import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import AuthLayout from './components/AuthLayout'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingScreen from './components/LoadingScreen'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import VerifyEmail from './pages/VerifyEmail'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'
import UserDashboard from './pages/UserDashboard'
import Payments from './pages/Payments'
import VatReports from './pages/VatReports'
import WithholdingReports from './pages/WithholdingReports'
import AggregateExpenses from './pages/AggregateExpenses'
import TransportExpenses from './pages/TransportExpenses'
import MiscellaneousExpenses from './pages/MiscellaneousExpenses'
import FinancialStatements from './pages/FinancialStatements'
import TransactionHistory from './pages/TransactionHistory'
import Settings from './pages/Settings'
import Companies from './pages/Companies'

import AdminDashboard from './pages/admin/Dashboard'
import AdminCompanies from './pages/admin/Companies'
import AdminUsers from './pages/admin/Users'
import AdminRoles from './pages/admin/Roles'
import AdminSubscriptions from './pages/admin/Subscriptions'
import AdminBilling from './pages/admin/Billing'
import AdminReports from './pages/admin/Reports'
import AdminSupport from './pages/admin/Support'
import AdminAnnouncements from './pages/admin/Announcements'
import AdminActivityLogs from './pages/admin/ActivityLogs'
import AdminSecurity from './pages/admin/Security'
import AdminBackup from './pages/admin/Backup'
import AdminSystemSettings from './pages/admin/SystemSettings'
import AdminAuditLogs from './pages/admin/AuditLogs'
import AdminProfile from './pages/admin/Profile'

export default function App() {
  const { user, loading, profile } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <Routes>
      {!user ? (
        <>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <>
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/user-dashboard" element={<UserDashboard />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/vat-reports" element={<VatReports />} />
            <Route path="/withholding-reports" element={<WithholdingReports />} />
            <Route path="/aggregate-expenses" element={<AggregateExpenses />} />
            <Route path="/transport-expenses" element={<TransportExpenses />} />
            <Route path="/fuel-expenses" element={<div />} />
            <Route path="/equipment-rental" element={<div />} />
            <Route path="/machinery-maintenance" element={<div />} />
            <Route path="/site-expenses" element={<div />} />
            <Route path="/miscellaneous-expenses" element={<MiscellaneousExpenses />} />
            <Route path="/financial-statements" element={<FinancialStatements />} />
            <Route path="/transaction-history" element={<TransactionHistory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route element={
            <ProtectedRoute roles={['super_admin', 'admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="/system-admin" element={<AdminDashboard />} />
            <Route path="/system-admin/companies" element={<AdminCompanies />} />
            <Route path="/system-admin/users" element={<AdminUsers />} />
            <Route path="/system-admin/roles" element={<AdminRoles />} />
            <Route path="/system-admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/system-admin/billing" element={<AdminBilling />} />
            <Route path="/system-admin/reports" element={<AdminReports />} />
            <Route path="/system-admin/support" element={<AdminSupport />} />
            <Route path="/system-admin/announcements" element={<AdminAnnouncements />} />
            <Route path="/system-admin/activity-logs" element={<AdminActivityLogs />} />
            <Route path="/system-admin/security" element={<AdminSecurity />} />
            <Route path="/system-admin/backup" element={<AdminBackup />} />
            <Route path="/system-admin/audit-logs" element={<AdminAuditLogs />} />
            <Route path="/system-admin/system-settings" element={<AdminSystemSettings />} />
            <Route path="/system-admin/profile" element={<AdminProfile />} />
          </Route>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  )
}
