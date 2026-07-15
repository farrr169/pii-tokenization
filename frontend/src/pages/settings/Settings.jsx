import { useState } from 'react'
import { Save, AlertTriangle, Database, Key, Clock, Shield } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Alert, Button } from '../../components/ui'
import { useHasPermission } from '../../store/permissions.store'

const MOCK_SETTINGS = [
  { id: '1', setting_key: 'fpe_key', setting_value: 'AES256DEFAULTKEY1234567890ABCDEF', description: 'AES Key untuk FPE encryption (wajib diganti di production)' },
  { id: '2', setting_key: 'max_batch_size', setting_value: '1000', description: 'Maksimum record per batch job' },
  { id: '3', setting_key: 'token_expiry_days', setting_value: '365', description: 'Masa berlaku token dalam hari' },
  { id: '4', setting_key: 'audit_retention_days', setting_value: '730', description: 'Retensi audit log dalam hari' },
  { id: '5', setting_key: 'app_version', setting_value: '1.0.0', description: 'Versi aplikasi saat ini' },
]

const ICON_MAP = {
  fpe_key: Key, max_batch_size: Database, token_expiry_days: Clock,
  audit_retention_days: Clock, app_version: Shield
}

export default function Settings() {
  const hasPermission = useHasPermission()
  const canUpdate = hasPermission('settings', 'update')
  const [settings, setSettings] = useState(MOCK_SETTINGS)
  const [saved, setSaved] = useState(false)

  const handleChange = (id, value) => {
    if (!canUpdate) return
    setSettings(prev => prev.map(s => s.id === id ? { ...s, setting_value: value } : s))
  }

  const handleSave = () => {
    if (!canUpdate) return
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <DashboardLayout title="Pengaturan Sistem"
      actions={canUpdate && <Button label="Simpan Perubahan" variant="primary" icon={Save} onClick={handleSave} />}>

      {canUpdate
        ? <Alert type="warning" message="Perubahan setting dapat mempengaruhi keamanan dan operasional sistem. Pastikan konsultasi dengan tim keamanan sebelum mengubah FPE Key." />
        : <Alert type="info" message="Anda memiliki akses baca saja. Hubungi administrator untuk mengubah pengaturan sistem." />
      }

      {saved && <div className="mt-4"><Alert type="success" message="Pengaturan berhasil disimpan!" /></div>}

      <div className="mt-6 grid grid-cols-1 gap-4">
        {settings.map(s => {
          const Icon = ICON_MAP[s.setting_key] || Shield
          const isSensitive = s.setting_key === 'fpe_key'
          return (
            <div key={s.id} className="card">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                  <Icon size={17} className="text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-semibold text-gray-800">{s.setting_key}</code>
                    {isSensitive && (
                      <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={10} /> Sensitif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{s.description}</p>
                  <input
                    type={isSensitive ? 'password' : 'text'}
                    value={s.setting_value}
                    onChange={e => handleChange(s.id, e.target.value)}
                    readOnly={!canUpdate}
                    className={`input-field font-mono text-sm max-w-lg ${!canUpdate ? 'bg-gray-50 cursor-not-allowed text-gray-500' : ''}`}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </DashboardLayout>
  )
}
