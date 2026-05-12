import { useState } from 'react'
import { UserPlus, Shield, Users, Pencil, Trash2, Check, RotateCcw } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Button, Modal, FormField, StatusBadge, Badge } from '../../components/ui'
import { useAuditStore } from '../../store/audit.store'
import { useAuthStore } from '../../store/auth.store'
import { usePermissionsStore, useHasPermission, INIT_PERMISSIONS } from '../../store/permissions.store'

const ROLES = ['Admin', 'Operator', 'Auditor', 'Viewer']
const ROLE_COLORS = { Admin: 'red', Operator: 'blue', Auditor: 'amber', Viewer: 'gray' }

const MODULES = {
  tokenization: 'Tokenisasi',
  pii_types:    'PII Types',
  audit_logs:   'Audit Log',
  settings:     'Pengaturan',
  users:        'Manajemen User',
}

const ACTIONS_PER_MODULE = {
  tokenization: ['execute', 'read'],
  pii_types:    ['create', 'read', 'update', 'delete'],
  audit_logs:   ['read'],
  settings:     ['read', 'update'],
  users:        ['create', 'read', 'update', 'delete'],
}

const INIT_USERS = [
  { id: '1', full_name: 'System Administrator', email: 'admin@system.id',   role: 'Admin',    status: 'active',   last_login: new Date().toISOString() },
  { id: '2', full_name: 'Operator Pertama',     email: 'operator1@bank.id', role: 'Operator', status: 'active',   last_login: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', full_name: 'Audit Officer',        email: 'auditor1@bank.id',  role: 'Auditor',  status: 'active',   last_login: new Date(Date.now() - 7200000).toISOString() },
  { id: '4', full_name: 'Data Viewer',          email: 'viewer1@bank.id',   role: 'Viewer',   status: 'inactive', last_login: null },
]

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'Operator' }
const clone = obj => JSON.parse(JSON.stringify(obj))
const fmtDate = d => d
  ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : 'Belum pernah'

export default function AccessManagement() {
  const { addLog } = useAuditStore()
  const { user: currentUser } = useAuthStore()
  const { matrix, save: saveMatrix } = usePermissionsStore()
  const hasPermission = useHasPermission()

  const canManageUsers = hasPermission('users', 'create') || hasPermission('users', 'update') || hasPermission('users', 'delete')

  const [activeTab, setActiveTab]   = useState('users')
  const [users, setUsers]           = useState(INIT_USERS)
  const [showAdd, setShowAdd]       = useState(false)
  const [editUser, setEditUser]     = useState(null)
  const [addForm, setAddForm]       = useState(EMPTY_FORM)
  const [editForm, setEditForm]     = useState(EMPTY_FORM)
  const [permissions, setPermissions] = useState(() => clone(matrix))
  const [savedPerms, setSavedPerms]   = useState(() => clone(matrix))

  const hasPermChanges = JSON.stringify(permissions) !== JSON.stringify(savedPerms)
  const log = (module, activity, description) => addLog({ module, activity, description, user: currentUser })

  // ── User actions ──────────────────────────────────────────────
  const handleAdd = () => {
    if (!hasPermission('users', 'create')) return
    if (!addForm.full_name || !addForm.email) return
    setUsers(p => [...p, {
      id: Date.now().toString(),
      full_name: addForm.full_name,
      email: addForm.email,
      role: addForm.role,
      status: 'active',
      last_login: null,
    }])
    log('users', 'create', `User "${addForm.full_name}" ditambahkan sebagai ${addForm.role}`)
    setShowAdd(false)
    setAddForm(EMPTY_FORM)
  }

  const openEdit = (u) => {
    if (!hasPermission('users', 'update')) return
    setEditUser(u)
    setEditForm({ full_name: u.full_name, email: u.email, role: u.role, password: '' })
  }

  const handleEdit = () => {
    if (!hasPermission('users', 'update')) return
    if (!editForm.full_name || !editForm.email) return
    setUsers(p => p.map(u => u.id === editUser.id
      ? { ...u, full_name: editForm.full_name, email: editForm.email, role: editForm.role }
      : u
    ))
    const changes = []
    if (editForm.full_name !== editUser.full_name) changes.push('nama')
    if (editForm.email     !== editUser.email)     changes.push('email')
    if (editForm.role      !== editUser.role)      changes.push(`role → ${editForm.role}`)
    if (editForm.password)                         changes.push('password')
    log('users', 'update', `User "${editForm.full_name}" diperbarui (${changes.join(', ') || 'tidak ada perubahan'})`)
    setEditUser(null)
  }

  const handleDelete = (u) => {
    if (!hasPermission('users', 'delete')) return
    if (!window.confirm(`Hapus user "${u.full_name}"?\nTindakan ini tidak bisa dibatalkan.`)) return
    setUsers(p => p.filter(usr => usr.id !== u.id))
    log('users', 'delete', `User "${u.full_name}" (${u.email}) dihapus dari sistem`)
  }

  const toggleStatus = (u) => {
    if (!hasPermission('users', 'update')) return
    const next = u.status === 'active' ? 'inactive' : 'active'
    setUsers(p => p.map(usr => usr.id === u.id ? { ...usr, status: next } : usr))
    log('users', next === 'inactive' ? 'deactivate' : 'activate',
      `User "${u.full_name}" ${next === 'inactive' ? 'dinonaktifkan' : 'diaktifkan'}`)
  }

  // ── Permission actions ────────────────────────────────────────
  const togglePerm = (role, mod, action) => {
    if (!hasPermission('users', 'update')) return
    setPermissions(prev => {
      const next = clone(prev)
      const arr = next[role][mod]
      next[role][mod] = arr.includes(action) ? arr.filter(a => a !== action) : [...arr, action]
      return next
    })
  }

  const savePerms = () => {
    if (!hasPermission('users', 'update')) return
    setSavedPerms(clone(permissions))
    saveMatrix(permissions)
    log('permissions', 'update', 'Matriks hak akses role diperbarui')
  }

  const revertPerms = () => setPermissions(clone(savedPerms))

  const TABS = [
    { id: 'users', label: 'Pengguna', icon: Users },
    { id: 'roles', label: 'Hak Akses', icon: Shield },
  ]

  return (
    <DashboardLayout title="Manajemen Akses"
      actions={hasPermission('users', 'create') && <Button label="Tambah Pengguna" variant="primary" icon={UserPlus} onClick={() => { setAddForm(EMPTY_FORM); setShowAdd(true) }} />}>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── Users tab ── */}
      {activeTab === 'users' && (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="table-header">
                {['Pengguna', 'Role', 'Status', 'Login Terakhir', 'Aksi'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="table-row hover:bg-gray-50/50">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-xs font-semibold text-primary">
                        {u.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{u.full_name}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><Badge text={u.role} variant={ROLE_COLORS[u.role] || 'gray'} /></td>
                  <td><StatusBadge status={u.status} /></td>
                  <td className="text-sm text-gray-500">{fmtDate(u.last_login)}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {hasPermission('users', 'update') && (
                        <button onClick={() => toggleStatus(u)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap
                            ${u.status === 'active'
                              ? 'border-orange-200 text-orange-600 hover:bg-orange-50'
                              : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                          {u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      )}
                      {hasPermission('users', 'update') && (
                        <button onClick={() => openEdit(u)} title="Edit"
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-light rounded-lg transition-colors">
                          <Pencil size={13} />
                        </button>
                      )}
                      {hasPermission('users', 'delete') && (
                        <button onClick={() => handleDelete(u)} title="Hapus"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                      {!canManageUsers && <span className="text-xs text-gray-300 italic">Read-only</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Roles tab ── */}
      {activeTab === 'roles' && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            {hasPermission('users', 'update')
              ? <p className="text-sm text-gray-500 leading-relaxed">Klik badge aksi untuk menambah atau mencabut hak akses. Badge aktif berwarna biru; badge abu-abu (putus-putus) berarti belum diberikan. Simpan setelah selesai.</p>
              : <p className="text-sm text-gray-400 italic">Anda hanya memiliki akses baca. Matriks hak akses hanya dapat diubah oleh Administrator.</p>
            }
            {hasPermission('users', 'update') && hasPermChanges && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={revertPerms}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                  <RotateCcw size={11} /> Batalkan
                </button>
                <button onClick={savePerms}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                  <Check size={11} /> Simpan Perubahan
                </button>
              </div>
            )}
          </div>

          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-100 w-36">Modul</th>
                  {ROLES.map(r => (
                    <th key={r} className="px-4 py-3 text-center text-xs font-medium text-gray-500 border-b border-gray-100">
                      <Badge text={r} variant={ROLE_COLORS[r] || 'gray'} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(MODULES).map(([mod, label]) => (
                  <tr key={mod} className="border-b border-gray-50 hover:bg-gray-50/30">
                    <td className="px-4 py-3 font-medium text-gray-700 text-xs">{label}</td>
                    {ROLES.map(role => {
                      const active = permissions[role]?.[mod] || []
                      const available = ACTIONS_PER_MODULE[mod] || []
                      const canEdit = hasPermission('users', 'update')
                      return (
                        <td key={role} className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {available.map(action => {
                              const has = active.includes(action)
                              return canEdit ? (
                                <button key={action}
                                  onClick={() => togglePerm(role, mod, action)}
                                  title={has ? `Cabut hak "${action}"` : `Beri hak "${action}"`}
                                  className={`text-xs px-2 py-0.5 rounded border transition-all
                                    ${has
                                      ? 'bg-primary-light text-primary border-primary/20 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                                      : 'bg-white text-gray-300 border-dashed border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-300'
                                    }`}>
                                  {action}
                                </button>
                              ) : (
                                <span key={action}
                                  className={`text-xs px-2 py-0.5 rounded border
                                    ${has
                                      ? 'bg-primary-light text-primary border-primary/20'
                                      : 'bg-white text-gray-300 border-dashed border-gray-200'
                                    }`}>
                                  {action}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasPermission('users', 'update') && hasPermChanges && (
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              ⚠ Terdapat perubahan hak akses yang belum disimpan.
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Tambah User ── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Pengguna Baru"
        footer={<><Button label="Batal" onClick={() => setShowAdd(false)} /><Button label="Simpan" variant="primary" onClick={handleAdd} /></>}>
        <FormField label="Nama Lengkap" required>
          <input className="input-field" value={addForm.full_name}
            onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nama pengguna" />
        </FormField>
        <FormField label="Email" required>
          <input type="email" className="input-field" value={addForm.email}
            onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="email@domain.id" />
        </FormField>
        <FormField label="Password" required hint="Minimal 8 karakter">
          <input type="password" className="input-field" value={addForm.password}
            onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
        </FormField>
        <FormField label="Role">
          <select className="select-field" value={addForm.role}
            onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </FormField>
      </Modal>

      {/* ── Modal: Edit User ── */}
      <Modal open={editUser !== null} onClose={() => setEditUser(null)} title="Edit Pengguna"
        footer={<><Button label="Batal" onClick={() => setEditUser(null)} /><Button label="Simpan Perubahan" variant="primary" onClick={handleEdit} /></>}>
        <FormField label="Nama Lengkap" required>
          <input className="input-field" value={editForm.full_name}
            onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
        </FormField>
        <FormField label="Email" required>
          <input type="email" className="input-field" value={editForm.email}
            onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
        </FormField>
        <FormField label="Password Baru" hint="Kosongkan jika tidak ingin mengubah password">
          <input type="password" className="input-field" value={editForm.password}
            onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
        </FormField>
        <FormField label="Role">
          <select className="select-field" value={editForm.role}
            onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </FormField>
      </Modal>
    </DashboardLayout>
  )
}
