import { create } from 'zustand'

const INITIAL = [
  { id:'1', name:'NIK', category:'Identitas', min_length:16, max_length:16, example_value:'3276011203990001', validation_regex:'^\\d{16}$', is_active:true },
  { id:'2', name:'NPWP', category:'Pajak', min_length:15, max_length:15, example_value:'012345678901234', validation_regex:'^\\d{15}$', is_active:true },
  { id:'3', name:'Nomor Rekening', category:'Finansial', min_length:10, max_length:16, example_value:'1234567890', validation_regex:'^\\d{10,16}$', is_active:true },
  { id:'4', name:'Kartu Kredit', category:'Finansial', min_length:13, max_length:19, example_value:'4111111111111111', validation_regex:'^\\d{13,19}$', is_active:true },
  { id:'5', name:'Nomor Telepon', category:'Kontak', min_length:10, max_length:15, example_value:'081234567890', validation_regex:'^(08|\\+62)\\d{8,11}$', is_active:true },
  { id:'6', name:'Email', category:'Kontak', min_length:5, max_length:150, example_value:'user@example.com', validation_regex:'^[^@]+@[^@]+\\.[^@]+$', is_active:true },
  { id:'7', name:'Passport', category:'Identitas', min_length:7, max_length:9, example_value:'A1234567', validation_regex:'^[A-Z]{1,2}\\d{6,7}$', is_active:true },
  { id:'8', name:'Nama Lengkap', category:'Identitas', min_length:2, max_length:100, example_value:'John Doe', validation_regex:'', is_active:false },
]

export const usePiiStore = create(set => ({
  piiTypes: INITIAL,
  add:    (pii)      => set(s => ({ piiTypes: [...s.piiTypes, { ...pii, id: Date.now().toString(), is_active: true }] })),
  update: (id, data) => set(s => ({ piiTypes: s.piiTypes.map(p => p.id === id ? { ...p, ...data } : p) })),
  remove: (id)       => set(s => ({ piiTypes: s.piiTypes.filter(p => p.id !== id) })),
  toggle: (id)       => set(s => ({ piiTypes: s.piiTypes.map(p => p.id === id ? { ...p, is_active: !p.is_active } : p) })),
}))
