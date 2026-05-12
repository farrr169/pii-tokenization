import { create } from 'zustand'

export const METHODS_LIST = [
  { id: '1', name: 'Full FPE FF1', label: 'Full FPE FF1 (Format-Preserving)', description: 'Format-Preserving Encryption FF1. Seluruh data dienkripsi dengan mempertahankan format asli.', supports_prefix: false, supports_suffix: false, supports_tweak: true, is_deterministic: true },
  { id: '2', name: 'Full FPE FF3', label: 'Full FPE FF3-1 (Format-Preserving)', description: 'Format-Preserving Encryption FF3-1. Varian FF3 dengan keamanan lebih tinggi.', supports_prefix: false, supports_suffix: false, supports_tweak: true, is_deterministic: true },
  { id: '3', name: 'Partial FPE', label: 'Partial FPE (Preserve Prefix/Suffix)', description: 'Sebagian data dipertahankan, sebagian dienkripsi menggunakan FPE.', supports_prefix: true, supports_suffix: true, supports_tweak: true, is_deterministic: true },
]

export const TWEAKS_LIST = [
  { id: '1', name: 'Auto Generate (Sistem)', type: 'RANDOMIZED' },
  { id: '2', name: 'Static Tweak Default',   type: 'STATIC', value: 'TOKENSYSTEM2024' },
  { id: '3', name: 'Dynamic Timestamp',       type: 'DYNAMIC' },
  { id: '4', name: 'User-Based Tweak',        type: 'USER_BASED' },
]

// pii_type_id references pii.store.js initial IDs:
// '1'=NIK, '2'=NPWP, '3'=Nomor Rekening, '4'=Kartu Kredit,
// '5'=Nomor Telepon, '6'=Email, '7'=Passport, '8'=Nama Lengkap
const INITIAL_RULES = [
  { id: '1',  rule_name: 'NIK - Full FPE FF1',               pii_type_id: '1', method_id: '1', tweak_id: '2', preserve_prefix: 0, preserve_suffix: 0, maintain_length: true,  is_active: true },
  { id: '2',  rule_name: 'NIK - Full FPE FF3',               pii_type_id: '1', method_id: '2', tweak_id: '2', preserve_prefix: 0, preserve_suffix: 0, maintain_length: true,  is_active: true },
  { id: '3',  rule_name: 'NIK - Partial FPE (6 Prefix)',     pii_type_id: '1', method_id: '3', tweak_id: '2', preserve_prefix: 6, preserve_suffix: 0, maintain_length: true,  is_active: true },
  { id: '4',  rule_name: 'NPWP - Full FPE FF1',              pii_type_id: '2', method_id: '1', tweak_id: '2', preserve_prefix: 0, preserve_suffix: 0, maintain_length: true,  is_active: true },
  { id: '5',  rule_name: 'NPWP - Partial FPE (3 Prefix)',    pii_type_id: '2', method_id: '3', tweak_id: '2', preserve_prefix: 3, preserve_suffix: 0, maintain_length: true,  is_active: true },
  { id: '6',  rule_name: 'Rekening - Full FPE FF1',          pii_type_id: '3', method_id: '1', tweak_id: '3', preserve_prefix: 0, preserve_suffix: 0, maintain_length: true,  is_active: true },
  { id: '7',  rule_name: 'Rekening - Partial FPE (4 Prefix)',pii_type_id: '3', method_id: '3', tweak_id: '2', preserve_prefix: 4, preserve_suffix: 0, maintain_length: true,  is_active: true },
  { id: '8',  rule_name: 'Kartu Kredit - PCI (6-4)',         pii_type_id: '4', method_id: '3', tweak_id: '1', preserve_prefix: 6, preserve_suffix: 4, maintain_length: true,  is_active: true },
  { id: '9',  rule_name: 'Kartu Kredit - Full FPE FF1',      pii_type_id: '4', method_id: '1', tweak_id: '2', preserve_prefix: 0, preserve_suffix: 0, maintain_length: true,  is_active: true },
  { id: '10', rule_name: 'Telepon - Full FPE FF1',           pii_type_id: '5', method_id: '1', tweak_id: '2', preserve_prefix: 0, preserve_suffix: 0, maintain_length: true,  is_active: true },
  { id: '11', rule_name: 'Telepon - Partial FPE (3 Prefix)', pii_type_id: '5', method_id: '3', tweak_id: '2', preserve_prefix: 3, preserve_suffix: 0, maintain_length: true,  is_active: true },
  { id: '12', rule_name: 'Passport - Full FPE FF3',          pii_type_id: '7', method_id: '2', tweak_id: '2', preserve_prefix: 0, preserve_suffix: 0, maintain_length: true,  is_active: true },
  { id: '13', rule_name: 'Nama Lengkap - Full FPE FF1',      pii_type_id: '8', method_id: '1', tweak_id: '3', preserve_prefix: 0, preserve_suffix: 0, maintain_length: false, is_active: true },
]

export const useRulesStore = create(set => ({
  rules: INITIAL_RULES,
  add:    (rule)     => set(s => ({ rules: [...s.rules, { ...rule, id: Date.now().toString(), is_active: true }] })),
  update: (id, data) => set(s => ({ rules: s.rules.map(r => r.id === id ? { ...r, ...data } : r) })),
  remove: (id)       => set(s => ({ rules: s.rules.filter(r => r.id !== id) })),
  toggle: (id)       => set(s => ({ rules: s.rules.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r) })),
}))
