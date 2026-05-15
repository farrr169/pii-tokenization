import { useState } from 'react'
import { Plus, GitBranch, Pencil } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Button, Modal, FormField, Badge, Toggle } from '../../components/ui'
import { useHasPermission } from '../../store/permissions.store'
import { useAuditStore } from '../../store/audit.store'

const TYPE_COLORS = { STATIC: 'blue', DYNAMIC: 'green', RANDOMIZED: 'amber', USER_BASED: 'gray' }
const TYPE_DESC = {
  STATIC:     'Nilai tweak tetap, sama untuk setiap operasi',
  DYNAMIC:    'Tweak berubah berdasarkan timestamp saat eksekusi',
  RANDOMIZED: 'Tweak acak yang berbeda setiap tokenisasi',
  USER_BASED: 'Tweak unik per user untuk isolasi data',
}

const INIT_TWEAKS = [
  { id: '1', tweak_name: 'Static Tweak Default', tweak_type: 'STATIC',     tweak_value: 'TOKENSYSTEM2024', tweak_length: 15, description: 'Tweak statis default untuk semua tokenisasi', is_active: true },
  { id: '2', tweak_name: 'Dynamic Timestamp',    tweak_type: 'DYNAMIC',    tweak_value: null,               tweak_length: 8,  description: 'Tweak berdasarkan timestamp saat eksekusi',   is_active: true },
  { id: '3', tweak_name: 'Randomized 8-byte',    tweak_type: 'RANDOMIZED', tweak_value: null,               tweak_length: 8,  description: 'Tweak acak 8 byte untuk setiap tokenisasi',   is_active: true },
  { id: '4', tweak_name: 'User-Based Tweak',     tweak_type: 'USER_BASED', tweak_value: null,               tweak_length: 16, description: 'Tweak berbasis user ID',                       is_active: false },
]

const EMPTY_FORM = { tweak_name: '', tweak_type: 'RANDOMIZED', tweak_value: '', tweak_length: '8', description: '' }

export default function TweaksPage() {
  const hasPermission = useHasPermission()
  const { addLog } = useAuditStore()
  const canUpdate = hasPermission('pii_types', 'update')
  const canCreate = hasPermission('pii_types', 'create')
  const [tweaks, setTweaks]     = useState(INIT_TWEAKS)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId]     = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)

  const openAdd = () => {
    if (!canCreate) return
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (t) => {
    if (!canUpdate) return
    setEditId(t.id)
    setForm({
      tweak_name:   t.tweak_name,
      tweak_type:   t.tweak_type,
      tweak_value:  t.tweak_value || '',
      tweak_length: String(t.tweak_length),
      description:  t.description || '',
    })
    setShowModal(true)
  }

  const handleSave = () => {
    if (editId ? !canUpdate : !canCreate) return
    if (!form.tweak_name) return
    const data = {
      ...form,
      tweak_length: parseInt(form.tweak_length),
      tweak_value:  form.tweak_type === 'STATIC' ? form.tweak_value : null,
    }
    if (editId) {
      setTweaks(prev => prev.map(t => t.id === editId ? { ...t, ...data } : t))
      addLog({ module: 'tweaks', activity: 'update', description: `Tweak "${form.tweak_name}" diperbarui` })
    } else {
      setTweaks(prev => [...prev, { ...data, id: Date.now().toString(), is_active: true }])
      addLog({ module: 'tweaks', activity: 'create', description: `Tweak "${form.tweak_name}" (${form.tweak_type}) ditambahkan` })
    }
    setShowModal(false)
  }

  const toggleActive = (id) => {
    if (!canUpdate) return
    setTweaks(prev => prev.map(t => {
      if (t.id !== id) return t
      addLog({ module: 'tweaks', activity: t.is_active ? 'deactivate' : 'activate', description: `Tweak "${t.tweak_name}" ${t.is_active ? 'dinonaktifkan' : 'diaktifkan'}` })
      return { ...t, is_active: !t.is_active }
    }))
  }

  return (
    <DashboardLayout title="Manajemen Tweak"
      actions={canCreate && <Button label="Tambah Tweak" variant="primary" icon={Plus} onClick={openAdd} />}>

      <div className="grid grid-cols-1 gap-4">
        {tweaks.map(t => (
          <div key={t.id} className={`card transition-opacity ${!t.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0 mt-0.5">
                  <GitBranch size={16} className="text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{t.tweak_name}</div>
                  <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canUpdate && (
                  <button onClick={() => openEdit(t)} title="Edit"
                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-light rounded-lg transition-colors">
                    <Pencil size={14} />
                  </button>
                )}
                {canUpdate
                  ? <Toggle checked={t.is_active} onChange={() => toggleActive(t.id)} />
                  : <span className={`text-xs px-2.5 py-1 rounded-full border ${t.is_active ? 'border-green-200 text-green-700 bg-green-50' : 'border-gray-200 text-gray-500 bg-gray-50'}`}>{t.is_active ? 'Aktif' : 'Nonaktif'}</span>
                }
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="text-xs text-gray-400 mb-1">Tipe</div>
                <Badge text={t.tweak_type} variant={TYPE_COLORS[t.tweak_type] || 'gray'} />
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="text-xs text-gray-400 mb-1">Panjang</div>
                <code className="text-sm font-semibold">{t.tweak_length} bytes</code>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2 col-span-2">
                <div className="text-xs text-gray-400 mb-1">Cara Kerja</div>
                <p className="text-xs text-gray-600">{TYPE_DESC[t.tweak_type]}</p>
              </div>
            </div>

            {t.tweak_value && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <div className="text-xs text-amber-700 font-medium mb-1">Tweak Value (Static)</div>
                <code className="text-sm font-mono text-amber-900">{'*'.repeat(t.tweak_value.length)}</code>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Tweak' : 'Tambah Tweak Baru'}
        footer={<><Button label="Batal" onClick={() => setShowModal(false)} /><Button label={editId ? 'Simpan Perubahan' : 'Simpan'} variant="primary" onClick={handleSave} /></>}>
        <FormField label="Nama Tweak" required>
          <input className="input-field" value={form.tweak_name}
            onChange={e => setForm(f => ({ ...f, tweak_name: e.target.value }))} placeholder="Nama tweak" />
        </FormField>
        <FormField label="Tipe Tweak" required>
          <select className="select-field" value={form.tweak_type}
            onChange={e => setForm(f => ({ ...f, tweak_type: e.target.value, tweak_value: '' }))}>
            {['STATIC', 'DYNAMIC', 'RANDOMIZED', 'USER_BASED'].map(t => <option key={t}>{t}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">{TYPE_DESC[form.tweak_type]}</p>
        </FormField>
        {form.tweak_type === 'STATIC' && (
          <FormField label="Tweak Value" hint="Nilai statis yang digunakan sebagai tweak">
            <input className="input-field font-mono" value={form.tweak_value}
              onChange={e => setForm(f => ({ ...f, tweak_value: e.target.value }))} placeholder="NILAI_TWEAK_STATIS" />
          </FormField>
        )}
        <FormField label="Panjang Tweak (bytes)">
          <input type="number" className="input-field" value={form.tweak_length}
            onChange={e => setForm(f => ({ ...f, tweak_length: e.target.value }))} min="4" max="32" />
        </FormField>
        <FormField label="Deskripsi">
          <textarea className="input-field" rows={2} value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Keterangan penggunaan tweak ini" />
        </FormField>
      </Modal>
    </DashboardLayout>
  )
}
