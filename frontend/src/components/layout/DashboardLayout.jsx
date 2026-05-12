import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { useHasPermission, usePermissionsStore, INIT_PERMISSIONS } from '../../store/permissions.store'
import {
  FlaskConical, Database, Cpu, ListChecks,
  ClipboardList, Settings, Users, LogOut, Shield,
  GitBranch, Unlock, BookOpen
} from 'lucide-react'

const NAV_ITEMS = [
  { group: 'Utama', items: [
    { to: '/demo',    label: 'Demo',    icon: FlaskConical, perm: { module: 'tokenization', action: 'execute' } },
  ]},
  { group: 'Master Data', items: [
    { to: '/pii-types', label: 'PII Types', icon: Database,   perm: { module: 'pii_types', action: 'read' } },
    { to: '/methods',   label: 'Metode',    icon: Cpu,        perm: { module: 'pii_types', action: 'read' } },
    { to: '/tweaks',    label: 'Tweaks',    icon: GitBranch,  perm: { module: 'pii_types', action: 'read' } },
    { to: '/rules',     label: 'Rules',     icon: ListChecks, perm: { module: 'pii_types', action: 'read' } },
  ]},
  { group: 'Operasional', items: [
    { to: '/results',      label: 'Hasil Tokenisasi', icon: Shield, perm: { module: 'tokenization', action: 'read' } },
    { to: '/detokenisasi', label: 'Detokenisasi',     icon: Unlock, perm: { module: 'tokenization', action: 'execute' } },
  ]},
  { group: 'Sistem', items: [
    { to: '/audit',    label: 'Audit Log',       icon: ClipboardList, perm: { module: 'audit_logs',   action: 'read' } },
    { to: '/access',   label: 'Manajemen Akses', icon: Users,         perm: { module: 'users',        action: 'read' } },
    { to: '/settings', label: 'Pengaturan',      icon: Settings,      perm: { module: 'settings',     action: 'read' } },
    { to: '/api-docs', label: 'Panduan API',     icon: BookOpen,      perm: { module: 'tokenization', action: 'read' } },
  ]},
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const hasPermission = useHasPermission()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    usePermissionsStore.getState().save(INIT_PERMISSIONS)
    navigate('/login')
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800 leading-tight">PII Tokenization</div>
            <div className="text-xs text-gray-400">v1.0.0</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV_ITEMS.map(group => {
          const visible = group.items.filter(item =>
            !item.perm || hasPermission(item.perm.module, item.perm.action)
          )
          if (visible.length === 0) return null
          return (
            <div key={group.group}>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-1">{group.group}</div>
              <div className="space-y-0.5">
                {visible.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-xs font-semibold text-primary">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-xs font-medium text-gray-800 truncate">{user?.full_name || 'User'}</div>
            <div className="text-xs text-gray-400">{user?.role}</div>
          </div>
          <button onClick={handleLogout} title="Logout" className="p-1 text-gray-400 hover:text-red-500 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}

export function DashboardLayout({ children, title, actions }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
