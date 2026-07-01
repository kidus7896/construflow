import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import SelectCompany from './pages/SelectCompany'
import ActiveSessions from './pages/ActiveSessions'
import Dashboard from './pages/Dashboard'
import UserDashboard from './pages/UserDashboard'
import Payments from './pages/Payments'
import VatReports from './pages/VatReports'
import WithholdingReports from './pages/WithholdingReports'
import AggregateExpenses from './pages/AggregateExpenses'
import TransportExpenses from './pages/TransportExpenses'
import FuelExpenses from './pages/FuelExpenses'
import EquipmentRental from './pages/EquipmentRental'
import MachineryMaintenance from './pages/MachineryMaintenance'
import SiteExpenses from './pages/SiteExpenses'
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

function AppRoutes() {
  const { user, getDefaultRoute, ROLES, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  const role = user.role || ROLES.COMPANY_ADMIN

  if (role === ROLES.SUPER_ADMIN) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/select-company" element={<SelectCompany />} />
        <Route element={<ProtectedRoute roles={[ROLES.SUPER_ADMIN]}><AdminLayout /></ProtectedRoute>}>
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
          <Route path="/system-admin/sessions" element={<ActiveSessions />} />
        </Route>
        <Route path="*" element={<Navigate to="/system-admin" replace />} />
      </Routes>
    )
  }

  if (role === ROLES.COMPANY_ADMIN) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/select-company" element={<SelectCompany />} />
        <Route element={<ProtectedRoute roles={[ROLES.COMPANY_ADMIN]}><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/vat-reports" element={<VatReports />} />
          <Route path="/withholding-reports" element={<WithholdingReports />} />
          <Route path="/aggregate-expenses" element={<AggregateExpenses />} />
          <Route path="/transport-expenses" element={<TransportExpenses />} />
          <Route path="/fuel-expenses" element={<FuelExpenses />} />
          <Route path="/equipment-rental" element={<EquipmentRental />} />
          <Route path="/machinery-maintenance" element={<MachineryMaintenance />} />
          <Route path="/site-expenses" element={<SiteExpenses />} />
          <Route path="/miscellaneous-expenses" element={<MiscellaneousExpenses />} />
          <Route path="/financial-statements" element={<FinancialStatements />} />
          <Route path="/transaction-history" element={<TransactionHistory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/sessions" element={<ActiveSessions />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/select-company" element={<SelectCompany />} />
      <Route element={<ProtectedRoute roles={[ROLES.FINANCE_OFFICER, ROLES.ACCOUNTANT, ROLES.PROJECT_MANAGER, ROLES.VIEWER]}><Layout /></ProtectedRoute>}>
        <Route path="/user-dashboard" element={<UserDashboard />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/vat-reports" element={<VatReports />} />
        <Route path="/withholding-reports" element={<WithholdingReports />} />
        <Route path="/aggregate-expenses" element={<AggregateExpenses />} />
        <Route path="/transport-expenses" element={<TransportExpenses />} />
        <Route path="/fuel-expenses" element={<FuelExpenses />} />
        <Route path="/equipment-rental" element={<EquipmentRental />} />
        <Route path="/machinery-maintenance" element={<MachineryMaintenance />} />
        <Route path="/site-expenses" element={<SiteExpenses />} />
        <Route path="/miscellaneous-expenses" element={<MiscellaneousExpenses />} />
        <Route path="/financial-statements" element={<FinancialStatements />} />
        <Route path="/transaction-history" element={<TransactionHistory />} />
        <Route path="/sessions" element={<ActiveSessions />} />
      </Route>
      <Route path="*" element={<Navigate to="/user-dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return <AppRoutes />
}
