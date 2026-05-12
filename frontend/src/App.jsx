import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import { usePiiStore } from './store/pii.store'
import { useResultsStore } from './store/results.store'
import { useAuditStore } from './store/audit.store'
import { useRulesStore, METHODS_LIST, TWEAKS_LIST } from './store/rules.store'
import { useHasPermission } from './store/permissions.store'

// Pages
import Login from './pages/auth/Login'
import Demo from './pages/demo/Demo'
import Detokenisasi from './pages/detokenisasi/Detokenisasi'
import ApiDocs from './pages/api-docs/ApiDocs'
import Settings from './pages/settings/Settings'
import AccessManagement from './pages/access/AccessManagement'
import TweakPage from './pages/tweaks/TweakPage'

// Lazy-ish inline pages for remaining routes
import { DashboardLayout } from './components/layout/DashboardLayout'
import { DataTable, StatusBadge, Badge, SearchInput, Button, Modal, FormField } from './components/ui'
import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'

// ── Protected Route ────────────────────────────────────────────
function Protected({ children, module, action }) {
  const { token } = useAuthStore()
  const hasPermission = useHasPermission()
  if (!token) return <Navigate to="/login" replace />
  if (module && action && !hasPermission(module, action)) return <Navigate to="/results" replace />
  return children
}

function RootRedirect() {
  const { token } = useAuthStore()
  const hasPermission = useHasPermission()
  if (!token) return <Navigate to="/login" replace />
  return <Navigate to={hasPermission('tokenization', 'execute') ? '/demo' : '/results'} replace />
}

// ── PII Types Page ─────────────────────────────────────────────
const CAT_COLORS = { Identitas:'blue', Finansial:'green', Pajak:'amber', Kontak:'gray' }
const EMPTY_FORM = { name:'', category:'Identitas', min_length:'', max_length:'', example_value:'', validation_regex:'' }

function PIITypesPage() {
  const { piiTypes, add, update, remove, toggle } = usePiiStore()
  const { addLog } = useAuditStore()
  const { user: currentUser } = useAuthStore()
  const hasPermission = useHasPermission()
  const canCreate = hasPermission('pii_types', 'create')
  const canUpdate = hasPermission('pii_types', 'update')
  const canDelete = hasPermission('pii_types', 'delete')
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId]       = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)

  const filtered = piiTypes.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  const log = (activity, description) => addLog({ module: 'pii_types', activity, description, user: currentUser })

  const openAdd = () => { if (!canCreate) return; setEditId(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (p) => { if (!canUpdate) return; setEditId(p.id); setForm({ name:p.name, category:p.category, min_length:p.min_length, max_length:p.max_length, example_value:p.example_value, validation_regex:p.validation_regex||'' }); setShowModal(true) }
  const handleSave = () => {
    if (editId ? !canUpdate : !canCreate) return
    const data = { ...form, min_length: Number(form.min_length), max_length: Number(form.max_length) }
    if (editId) { update(editId, data); log('update', `PII Type "${form.name}" diperbarui`) }
    else        { add(data);            log('create', `PII Type "${form.name}" (${form.category}) ditambahkan`) }
    setShowModal(false)
  }
  const handleDelete = (id) => {
    if (!canDelete) return
    const p = piiTypes.find(x => x.id === id)
    if (window.confirm(`Hapus PII type "${p?.name}"?`)) { remove(id); log('delete', `PII Type "${p?.name}" dihapus`) }
  }

  const cols = [
    { key:'name',          label:'Nama',     render: v => <span className="font-medium">{v}</span> },
    { key:'category',      label:'Kategori', render: v => <Badge text={v} variant={CAT_COLORS[v]||'gray'} /> },
    { key:'min_length',    label:'Min',      render: (v,r) => `${v}–${r.max_length}` },
    { key:'example_value', label:'Contoh',   render: v => <code className="text-xs text-gray-500 font-mono">{v}</code> },
    { key:'is_active', label:'Status', render: (v,r) => (
      <div className="flex items-center gap-2">
        {canUpdate && (
          <button onClick={() => toggle(r.id)}
            className={`text-xs px-2.5 py-1 rounded-full border ${v ? 'border-green-200 text-green-700 bg-green-50' : 'border-gray-200 text-gray-500'}`}>
            {v ? 'Aktif' : 'Nonaktif'}
          </button>
        )}
        {!canUpdate && <span className={`text-xs px-2.5 py-1 rounded-full border ${v ? 'border-green-200 text-green-700 bg-green-50' : 'border-gray-200 text-gray-500'}`}>{v ? 'Aktif' : 'Nonaktif'}</span>}
        {canUpdate && (
          <button onClick={() => openEdit(r)} className="p-1 text-gray-400 hover:text-primary transition-colors" title="Edit">
            <Pencil size={13} />
          </button>
        )}
        {canDelete && (
          <button onClick={() => handleDelete(r.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Hapus">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    )},
  ]

  return (
    <DashboardLayout title="Master PII Types" actions={<><SearchInput value={search} onChange={setSearch} placeholder="Cari PII type..." />{canCreate && <Button label="Tambah" variant="primary" icon={Plus} onClick={openAdd} />}</>}>
      <DataTable columns={cols} data={filtered} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit PII Type' : 'Tambah PII Type'}
        footer={<><Button label="Batal" onClick={() => setShowModal(false)} /><Button label="Simpan" variant="primary" onClick={handleSave} /></>}>
        <FormField label="Nama" required><input className="input-field" value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} /></FormField>
        <FormField label="Kategori"><select className="select-field" value={form.category} onChange={e => setForm(f => ({...f, category:e.target.value}))}>{['Identitas','Finansial','Pajak','Kontak'].map(c => <option key={c}>{c}</option>)}</select></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Min Panjang"><input type="number" className="input-field" value={form.min_length} onChange={e => setForm(f => ({...f, min_length:e.target.value}))} /></FormField>
          <FormField label="Max Panjang"><input type="number" className="input-field" value={form.max_length} onChange={e => setForm(f => ({...f, max_length:e.target.value}))} /></FormField>
        </div>
        <FormField label="Contoh Nilai"><input className="input-field font-mono" value={form.example_value} onChange={e => setForm(f => ({...f, example_value:e.target.value}))} /></FormField>
        <FormField label="Regex Validasi"><input className="input-field font-mono text-xs" value={form.validation_regex} onChange={e => setForm(f => ({...f, validation_regex:e.target.value}))} placeholder="Contoh: ^\d{16}$" /></FormField>
      </Modal>
    </DashboardLayout>
  )
}

// ── Methods Page ───────────────────────────────────────────────
function MethodsPage() {
  return (
    <DashboardLayout title="Tokenization Methods">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {METHODS_LIST.map(m => (
          <div key={m.id} className="card">
            <div className="font-semibold text-gray-800 mb-1">{m.name}</div>
            <p className="text-sm text-gray-500 mb-3">{m.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {m.supports_tweak && <Badge text="Tweak Support" variant="amber" />}
              {m.supports_prefix && <Badge text="Prefix" variant="green" />}
              {m.supports_suffix && <Badge text="Suffix" variant="green" />}
              <Badge text={m.is_deterministic ? 'Deterministik' : 'Random'} variant={m.is_deterministic ? 'blue' : 'gray'} />
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}

// ── Rules Page ─────────────────────────────────────────────────
const RULE_EMPTY = { rule_name: '', pii_type_id: '1', method_id: '1', tweak_id: '2', preserve_prefix: 0, preserve_suffix: 0, maintain_length: true }

function RulesPage() {
  const { rules, add, update, remove, toggle } = useRulesStore()
  const { piiTypes } = usePiiStore()
  const { addLog } = useAuditStore()
  const { user: currentUser } = useAuthStore()
  const hasPermission = useHasPermission()
  const canCreate = hasPermission('pii_types', 'create')
  const canUpdate = hasPermission('pii_types', 'update')
  const canDelete = hasPermission('pii_types', 'delete')
  const [search, setSearch]   = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId]   = useState(null)
  const [form, setForm]       = useState(RULE_EMPTY)
  const log = (act, desc) => addLog({ module: 'rules', activity: act, description: desc, user: currentUser })

  const activePii = piiTypes.filter(p => p.is_active)
  const filtered  = rules.filter(r => r.rule_name.toLowerCase().includes(search.toLowerCase()))

  const selectedMethod = METHODS_LIST.find(m => m.id === form.method_id)
  const isPartial      = selectedMethod?.supports_prefix || selectedMethod?.supports_suffix

  const openAdd  = () => { if (!canCreate) return; setEditId(null); setForm(RULE_EMPTY); setShowModal(true) }
  const openEdit = (r) => {
    if (!canUpdate) return
    setEditId(r.id)
    setForm({ rule_name: r.rule_name, pii_type_id: r.pii_type_id, method_id: r.method_id, tweak_id: r.tweak_id, preserve_prefix: r.preserve_prefix, preserve_suffix: r.preserve_suffix, maintain_length: r.maintain_length })
    setShowModal(true)
  }
  const handleSave = () => {
    if (editId ? !canUpdate : !canCreate) return
    if (!form.rule_name.trim()) return
    const data = { ...form, preserve_prefix: isPartial ? Number(form.preserve_prefix) : 0, preserve_suffix: (selectedMethod?.supports_suffix) ? Number(form.preserve_suffix) : 0 }
    if (editId) { update(editId, data); log('update', `Rule "${form.rule_name}" diperbarui`) }
    else        { add(data);            log('create', `Rule "${form.rule_name}" ditambahkan`) }
    setShowModal(false)
  }
  const handleDelete = (r) => {
    if (!canDelete) return
    if (!window.confirm(`Hapus rule "${r.rule_name}"?`)) return
    remove(r.id)
    log('delete', `Rule "${r.rule_name}" dihapus`)
  }
  const handleToggle = (r) => {
    if (!canUpdate) return
    toggle(r.id)
    log(r.is_active ? 'deactivate' : 'activate', `Rule "${r.rule_name}" ${r.is_active ? 'dinonaktifkan' : 'diaktifkan'}`)
  }

  return (
    <DashboardLayout title="Tokenization Rules"
      actions={<><SearchInput value={search} onChange={setSearch} placeholder="Cari rule..." />{canCreate && <Button label="Buat Rule" variant="primary" icon={Plus} onClick={openAdd} />}</>}>
      <div className="grid grid-cols-1 gap-3">
        {filtered.map(r => {
          const pii    = piiTypes.find(p => p.id === r.pii_type_id)
          const method = METHODS_LIST.find(m => m.id === r.method_id)
          const tweak  = TWEAKS_LIST.find(t => t.id === r.tweak_id)
          return (
            <div key={r.id} className={`card ${!r.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-semibold text-gray-800">{r.rule_name}</span>
                  {!r.is_active && <span className="ml-2 text-xs text-gray-400">(nonaktif)</span>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.is_active ? 'active' : 'inactive'} />
                  {canUpdate && (
                    <button onClick={() => handleToggle(r)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${r.is_active ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                      {r.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  )}
                  {canUpdate && <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-light rounded-lg transition-colors" title="Edit"><Pencil size={13} /></button>}
                  {canDelete && <button onClick={() => handleDelete(r)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><Trash2 size={13} /></button>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {pii    && <Badge text={pii.name}         variant="blue" />}
                {method && <Badge text={method.name}      variant="green" />}
                {tweak  && <Badge text={tweak.name}       variant="amber" />}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  ['Prefix',              r.preserve_prefix],
                  ['Suffix',              r.preserve_suffix],
                  ['Pertahankan Panjang', r.maintain_length ? 'Ya' : 'Tidak'],
                  ['Deterministik',       method?.is_deterministic ? 'Ya' : 'Tidak'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg px-2.5 py-2">
                    <div className="text-xs text-gray-400">{k}</div>
                    <div className="text-sm font-medium mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="card text-center py-12 text-gray-300 text-sm">Belum ada rule. Klik "Buat Rule" untuk membuat rule baru.</div>
        )}
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Rule' : 'Buat Rule Baru'}
        footer={<><Button label="Batal" onClick={() => setShowModal(false)} /><Button label={editId ? 'Simpan Perubahan' : 'Buat Rule'} variant="primary" onClick={handleSave} /></>}>
        <FormField label="Nama Rule" required>
          <input className="input-field" value={form.rule_name} onChange={e => setForm(f => ({...f, rule_name: e.target.value}))} placeholder="Contoh: NIK - Full FPE FF1" />
        </FormField>
        <FormField label="Jenis Data (PII Type)" required>
          <select className="select-field" value={form.pii_type_id} onChange={e => setForm(f => ({...f, pii_type_id: e.target.value}))}>
            {activePii.map(p => <option key={p.id} value={p.id}>{p.name} ({p.category})</option>)}
          </select>
        </FormField>
        <FormField label="Metode" required>
          <select className="select-field" value={form.method_id} onChange={e => setForm(f => ({...f, method_id: e.target.value, preserve_prefix: 0, preserve_suffix: 0}))}>
            {METHODS_LIST.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </FormField>
        <FormField label="Tweak">
          <select className="select-field" value={form.tweak_id} onChange={e => setForm(f => ({...f, tweak_id: e.target.value}))}>
            {TWEAKS_LIST.map(t => <option key={t.id} value={t.id}>{t.name} ({t.type})</option>)}
          </select>
        </FormField>
        {isPartial && (
          <div className="grid grid-cols-2 gap-3">
            {selectedMethod?.supports_prefix && (
              <FormField label="Preserve Prefix (digit)">
                <input type="number" min="0" max="20" className="input-field" value={form.preserve_prefix}
                  onChange={e => setForm(f => ({...f, preserve_prefix: e.target.value}))} />
              </FormField>
            )}
            {selectedMethod?.supports_suffix && (
              <FormField label="Preserve Suffix (digit)">
                <input type="number" min="0" max="20" className="input-field" value={form.preserve_suffix}
                  onChange={e => setForm(f => ({...f, preserve_suffix: e.target.value}))} />
              </FormField>
            )}
          </div>
        )}
        <FormField label="">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.maintain_length} onChange={e => setForm(f => ({...f, maintain_length: e.target.checked}))} />
            <span className="text-sm text-gray-700">Pertahankan panjang data asli</span>
          </label>
        </FormField>
      </Modal>
    </DashboardLayout>
  )
}

const fmtDate = d => new Date(d).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })

// ── Audit Page ─────────────────────────────────────────────────
const MOD_COLORS   = { auth:'green', users:'blue', pii_types:'gray', rules:'amber', tweaks:'amber', settings:'red', permissions:'red' }
const ACT_COLORS   = { login:'green', logout:'gray', create:'green', update:'blue', delete:'red', activate:'green', deactivate:'gray' }
const MOD_LABELS   = { auth:'Auth', users:'Users', pii_types:'PII Types', rules:'Rules', tweaks:'Tweaks', settings:'Pengaturan', permissions:'Permissions' }
const ACT_LABELS   = { login:'Login', logout:'Logout', create:'Tambah', update:'Ubah', delete:'Hapus', activate:'Aktifkan', deactivate:'Nonaktifkan' }

function ActivityBadge({ activity }) {
  const color = ACT_COLORS[activity] || 'gray'
  const variants = {
    green: 'bg-green-50 text-green-700',
    blue:  'bg-blue-50 text-blue-700',
    red:   'bg-red-50 text-red-600',
    gray:  'bg-gray-100 text-gray-500',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${variants[color]}`}>
      {ACT_LABELS[activity] || activity}
    </span>
  )
}

function AuditPage() {
  const { logs, clear } = useAuditStore()
  const { user: currentUser } = useAuthStore()
  const [modFilter,  setModFilter]  = useState('')
  const [actFilter,  setActFilter]  = useState('')

  const modules    = [...new Set(logs.map(l => l.module_name))].sort()
  const activities = [...new Set(logs.map(l => l.activity))].sort()

  const filtered = logs.filter(l =>
    (!modFilter || l.module_name === modFilter) &&
    (!actFilter || l.activity   === actFilter)
  )

  return (
    <DashboardLayout title="Audit Log" actions={
      <div className="flex items-center gap-2">
        <select className="select-field text-sm w-auto" value={modFilter} onChange={e => setModFilter(e.target.value)}>
          <option value="">Semua Modul</option>
          {modules.map(m => <option key={m} value={m}>{MOD_LABELS[m] || m}</option>)}
        </select>
        <select className="select-field text-sm w-auto" value={actFilter} onChange={e => setActFilter(e.target.value)}>
          <option value="">Semua Aktivitas</option>
          {activities.map(a => <option key={a} value={a}>{ACT_LABELS[a] || a}</option>)}
        </select>
        {logs.length > 0 && currentUser?.role === 'Admin' && (
          <button onClick={() => { if (window.confirm('Bersihkan semua audit log?')) clear() }}
            className="btn-secondary text-xs px-3 py-1.5">Bersihkan</button>
        )}
      </div>
    }>
      {logs.length === 0 ? (
        <div className="card text-center py-16 space-y-2">
          <p className="text-gray-300 text-sm">Belum ada aktivitas yang tercatat.</p>
          <p className="text-gray-400 text-xs">Log akan muncul saat Anda melakukan perubahan pada sistem:<br />tambah/edit/hapus user, PII type, ubah hak akses, dll.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="table-header">
                {['Waktu', 'User', 'Modul', 'Aktivitas', 'Keterangan'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className="table-row hover:bg-gray-50/50">
                  <td className="whitespace-nowrap text-gray-400 text-xs">{fmtDate(l.created_at)}</td>
                  <td className="font-medium text-gray-800">{l.user?.full_name || '—'}</td>
                  <td><Badge text={MOD_LABELS[l.module_name] || l.module_name} variant={MOD_COLORS[l.module_name] || 'gray'} /></td>
                  <td><ActivityBadge activity={l.activity} /></td>
                  <td className="text-gray-500">{l.description}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-300 text-sm">Tidak ada log yang sesuai filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}

// ── Results Page ───────────────────────────────────────────────
function ResultsPage() {
  const { results, clear } = useResultsStore()
  const hasPermission = useHasPermission()
  const canClear = hasPermission('tokenization', 'execute')
  const cols = [
    { key:'pii',      label:'Jenis Data', render: v => <span className="font-medium">{v}</span> },
    { key:'original', label:'Nilai Asli',  render: v => <code className="font-mono text-xs text-gray-600">{v}</code> },
    { key:'method',   label:'Metode',      render: v => <span className="text-gray-600">{v}</span> },
    { key:'rule',     label:'Aturan',      render: v => <span className="text-gray-500">{v}</span> },
    { key:'token',    label:'Hasil Token', render: v => <code className="text-xs font-mono text-primary bg-primary-light px-1.5 py-0.5 rounded">{v}</code> },
    { key:'tweak',    label:'Tweak',       render: v => v ? <code className="text-xs font-mono text-gray-400">{v.substring(0,16)}…</code> : <span className="text-gray-300">—</span> },
    { key:'savedAt',  label:'Waktu Simpan', render: v => <span className="text-gray-400 text-xs whitespace-nowrap">{fmtDate(v)}</span> },
  ]
  return (
    <DashboardLayout title="Hasil Tokenisasi" actions={results.length > 0 && canClear && <Button label="Hapus Semua" onClick={clear} />}>
      {results.length === 0
        ? <div className="card text-center py-16 text-gray-300 text-sm">Belum ada hasil yang disimpan.<br />Gunakan tombol "Simpan Hasil" di halaman Demo.</div>
        : <DataTable columns={cols} data={results} />}
    </DashboardLayout>
  )
}

// ── App Router ─────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RootRedirect />} />

      <Route path="/demo"         element={<Protected module="tokenization" action="execute"><Demo /></Protected>} />
      <Route path="/pii-types"    element={<Protected module="pii_types"    action="read"><PIITypesPage /></Protected>} />
      <Route path="/methods"      element={<Protected module="pii_types"    action="read"><MethodsPage /></Protected>} />
      <Route path="/tweaks"       element={<Protected module="pii_types"    action="read"><TweakPage /></Protected>} />
      <Route path="/rules"        element={<Protected module="pii_types"    action="read"><RulesPage /></Protected>} />
      <Route path="/results"      element={<Protected module="tokenization" action="read"><ResultsPage /></Protected>} />
      <Route path="/detokenisasi" element={<Protected module="tokenization" action="execute"><Detokenisasi /></Protected>} />
      <Route path="/api-docs"     element={<Protected module="tokenization" action="read"><ApiDocs /></Protected>} />
      <Route path="/audit"        element={<Protected module="audit_logs"   action="read"><AuditPage /></Protected>} />
      <Route path="/access"       element={<Protected module="users"        action="read"><AccessManagement /></Protected>} />
      <Route path="/settings"     element={<Protected module="settings"     action="read"><Settings /></Protected>} />
      <Route path="*" element={<Navigate to="/results" replace />} />
    </Routes>
  )
}
