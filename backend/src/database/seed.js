require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Roles
  const roles = await Promise.all([
    prisma.role.upsert({ where: { role_name: 'Admin' }, update: {}, create: { role_name: 'Admin', description: 'Full system access' } }),
    prisma.role.upsert({ where: { role_name: 'Operator' }, update: {}, create: { role_name: 'Operator', description: 'Can perform tokenization operations' } }),
    prisma.role.upsert({ where: { role_name: 'Auditor' }, update: {}, create: { role_name: 'Auditor', description: 'Read-only access including audit logs and user management' } }),
    prisma.role.upsert({ where: { role_name: 'Data Consumer' }, update: {}, create: { role_name: 'Data Consumer', description: 'Read-only access to tokenization and PII data' } }),
  ]);
  console.log('✅ Roles seeded:', roles.map(r => r.role_name).join(', '));

  // Default Admin User
  const adminRole = roles.find(r => r.role_name === 'Admin');
  const adminHash = await bcrypt.hash('Admin@12345', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@system.id' },
    update: {},
    create: {
      full_name: 'System Administrator',
      email: 'admin@system.id',
      password_hash: adminHash,
      role_id: adminRole.id,
      status: 'active'
    }
  });
  console.log('✅ Admin user seeded:', admin.email);

  // Additional users per role
  const operatorRole = roles.find(r => r.role_name === 'Operator');
  const auditorRole       = roles.find(r => r.role_name === 'Auditor');
  const dataConsumerRole  = roles.find(r => r.role_name === 'Data Consumer');

  const additionalUsers = [
    { full_name: 'Operator Pertama', email: 'operator1@bank.id',      password: 'Operator@12345',     role_id: operatorRole.id },
    { full_name: 'Audit Officer',    email: 'auditor1@bank.id',        password: 'Auditor@12345',      role_id: auditorRole.id },
    { full_name: 'Data Consumer 1',  email: 'dataconsumer1@bank.id',   password: 'Consumer@12345',     role_id: dataConsumerRole.id },
  ];

  for (const u of additionalUsers) {
    const hash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { full_name: u.full_name, email: u.email, password_hash: hash, role_id: u.role_id, status: 'active' }
    });
    console.log('✅ User seeded:', u.email);
  }

  // PII Types
  const piiTypes = [
    { name: 'NIK', category: 'Identitas', validation_regex: '^\\d{16}$', min_length: 16, max_length: 16, example_value: '3276011203990001' },
    { name: 'NPWP', category: 'Pajak', validation_regex: '^\\d{15}$', min_length: 15, max_length: 15, example_value: '012345678901234' },
    { name: 'Nomor Rekening', category: 'Finansial', validation_regex: '^\\d{10,16}$', min_length: 10, max_length: 16, example_value: '1234567890' },
    { name: 'Kartu Kredit', category: 'Finansial', validation_regex: '^\\d{13,19}$', min_length: 13, max_length: 19, example_value: '4111111111111111' },
    { name: 'Nomor Telepon', category: 'Kontak', validation_regex: '^(08|\\+62)\\d{8,11}$', min_length: 10, max_length: 15, example_value: '081234567890' },
    { name: 'Email', category: 'Kontak', validation_regex: '^[^@]+@[^@]+\\.[^@]+$', min_length: 5, max_length: 150, example_value: 'user@example.com' },
    { name: 'Passport', category: 'Identitas', validation_regex: '^[A-Z]{1,2}\\d{6,7}$', min_length: 7, max_length: 9, example_value: 'A1234567' },
    { name: 'Nama Lengkap', category: 'Identitas', min_length: 2, max_length: 100, example_value: 'John Doe' },
  ];

  for (const pii of piiTypes) {
    await prisma.piiType.upsert({
      where: { id: (await prisma.piiType.findFirst({ where: { name: pii.name } }))?.id || '00000000-0000-0000-0000-000000000000' },
      update: {},
      create: pii
    });
  }
  console.log('✅ PII Types seeded');

  // Tokenization Methods — only FF1 algorithm
  const methods = [
    { method_name: 'Full FPE FF1', description: 'Format-Preserving Encryption menggunakan algoritma FF1 (AES-based Feistel network). Mendukung pengaturan preserve prefix/suffix dan tweak.', supports_prefix: true, supports_suffix: true, supports_tweak: true, is_deterministic: true },
  ];

  for (const m of methods) {
    await prisma.tokenizationMethod.upsert({
      where: { id: (await prisma.tokenizationMethod.findFirst({ where: { method_name: m.method_name } }))?.id || '00000000-0000-0000-0000-000000000000' },
      update: {},
      create: m
    });
  }
  console.log('✅ Tokenization Methods seeded');

  // Tweaks
  const tweaks = [
    { tweak_name: 'Static Tweak Default', tweak_type: 'STATIC', tweak_value: 'TOKENSYSTEM2024', tweak_length: 15, description: 'Tweak statis default' },
    { tweak_name: 'Dynamic Timestamp', tweak_type: 'DYNAMIC', tweak_length: 8, description: 'Tweak berdasarkan timestamp' },
    { tweak_name: 'Randomized 8-byte', tweak_type: 'RANDOMIZED', tweak_length: 8, description: 'Tweak acak 8 byte' },
    { tweak_name: 'User-Based Tweak', tweak_type: 'USER_BASED', tweak_length: 16, description: 'Tweak berbasis user ID' },
  ];

  for (const t of tweaks) {
    await prisma.tweak.upsert({
      where: { id: (await prisma.tweak.findFirst({ where: { tweak_name: t.tweak_name } }))?.id || '00000000-0000-0000-0000-000000000000' },
      update: {},
      create: t
    });
  }
  console.log('✅ Tweaks seeded');

  // Permissions
  const permissionDefs = [
    { permission_name: 'execute', module_name: 'tokenization' },
    { permission_name: 'read',    module_name: 'tokenization' },
    { permission_name: 'create',  module_name: 'pii_types' },
    { permission_name: 'read',    module_name: 'pii_types' },
    { permission_name: 'update',  module_name: 'pii_types' },
    { permission_name: 'delete',  module_name: 'pii_types' },
    { permission_name: 'read',    module_name: 'audit_logs' },
    { permission_name: 'read',    module_name: 'settings' },
    { permission_name: 'update',  module_name: 'settings' },
    { permission_name: 'create',  module_name: 'users' },
    { permission_name: 'read',    module_name: 'users' },
    { permission_name: 'update',  module_name: 'users' },
    { permission_name: 'delete',  module_name: 'users' },
  ];

  const permMap = {};
  for (const p of permissionDefs) {
    let perm = await prisma.permission.findFirst({
      where: { module_name: p.module_name, permission_name: p.permission_name }
    });
    if (!perm) {
      perm = await prisma.permission.create({ data: p });
    }
    permMap[`${p.module_name}:${p.permission_name}`] = perm;
  }
  console.log('✅ Permissions seeded:', Object.keys(permMap).length);

  // Role → Permissions matrix
  const ROLE_PERMS = {
    Admin:    { tokenization: ['execute', 'read'], pii_types: ['create', 'read', 'update', 'delete'], audit_logs: ['read'], settings: ['read', 'update'], users: ['create', 'read', 'update', 'delete'] },
    Operator: { tokenization: ['execute', 'read'], pii_types: ['read'],                               audit_logs: [],        settings: [],                users: [] },
    Auditor:         { tokenization: ['read'], pii_types: ['read'], audit_logs: ['read'], settings: ['read'], users: ['read'] },
    'Data Consumer': { tokenization: ['read'], pii_types: ['read'], audit_logs: [],       settings: [],        users: [] },
  };

  for (const [roleName, modules] of Object.entries(ROLE_PERMS)) {
    const role = roles.find(r => r.role_name === roleName);
    if (!role) continue;
    for (const [mod, actions] of Object.entries(modules)) {
      for (const action of actions) {
        const perm = permMap[`${mod}:${action}`];
        if (!perm) continue;
        await prisma.rolePermission.upsert({
          where: { role_id_permission_id: { role_id: role.id, permission_id: perm.id } },
          create: { role_id: role.id, permission_id: perm.id },
          update: {},
        });
      }
    }
  }
  console.log('✅ Role permissions seeded');

  // System Settings
  const settings = [
    { setting_key: 'fpe_key', setting_value: 'AES256DEFAULTKEY1234567890ABCDEF', description: 'AES Key untuk FPE (ganti di production)' },
    { setting_key: 'max_batch_size', setting_value: '1000', description: 'Max record per batch job' },
    { setting_key: 'token_expiry_days', setting_value: '365', description: 'Masa berlaku token dalam hari' },
    { setting_key: 'audit_retention_days', setting_value: '730', description: 'Retensi audit log dalam hari' },
    { setting_key: 'app_version', setting_value: '1.0.0', description: 'Versi aplikasi' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({ where: { setting_key: s.setting_key }, update: {}, create: s });
  }
  console.log('✅ System Settings seeded');

  // Tokenization Rules
  const [nikType, npwpType, rekeningType, kkType, teleponType, emailType, passportType, namaType] =
    await Promise.all([
      prisma.piiType.findFirst({ where: { name: 'NIK' } }),
      prisma.piiType.findFirst({ where: { name: 'NPWP' } }),
      prisma.piiType.findFirst({ where: { name: 'Nomor Rekening' } }),
      prisma.piiType.findFirst({ where: { name: 'Kartu Kredit' } }),
      prisma.piiType.findFirst({ where: { name: 'Nomor Telepon' } }),
      prisma.piiType.findFirst({ where: { name: 'Email' } }),
      prisma.piiType.findFirst({ where: { name: 'Passport' } }),
      prisma.piiType.findFirst({ where: { name: 'Nama Lengkap' } }),
    ]);

  const mFF1 = await prisma.tokenizationMethod.findFirst({ where: { method_name: 'Full FPE FF1' } });

  const [tStatic, tDynamic] = await Promise.all([
    prisma.tweak.findFirst({ where: { tweak_name: 'Static Tweak Default' } }),
    prisma.tweak.findFirst({ where: { tweak_name: 'Dynamic Timestamp' } }),
  ]);

  // All rules use FF1 — prefix/suffix preservation is a rule-level setting
  const rules = [
    { rule_name: 'NIK - Full FPE FF1',               pii_type_id: nikType?.id,      method_id: mFF1?.id, tweak_id: tStatic?.id,  preserve_prefix: 0, preserve_suffix: 0, maintain_length: true },
    { rule_name: 'NIK - Partial FPE (6 Prefix)',      pii_type_id: nikType?.id,      method_id: mFF1?.id, tweak_id: tStatic?.id,  preserve_prefix: 6, preserve_suffix: 0, maintain_length: true },
    { rule_name: 'NPWP - Full FPE FF1',               pii_type_id: npwpType?.id,     method_id: mFF1?.id, tweak_id: tStatic?.id,  preserve_prefix: 0, preserve_suffix: 0, maintain_length: true },
    { rule_name: 'NPWP - Partial FPE (3 Prefix)',     pii_type_id: npwpType?.id,     method_id: mFF1?.id, tweak_id: tStatic?.id,  preserve_prefix: 3, preserve_suffix: 0, maintain_length: true },
    { rule_name: 'Rekening - Full FPE FF1',           pii_type_id: rekeningType?.id, method_id: mFF1?.id, tweak_id: tDynamic?.id, preserve_prefix: 0, preserve_suffix: 0, maintain_length: true },
    { rule_name: 'Rekening - Partial FPE (4 Prefix)', pii_type_id: rekeningType?.id, method_id: mFF1?.id, tweak_id: tStatic?.id,  preserve_prefix: 4, preserve_suffix: 0, maintain_length: true },
    { rule_name: 'Kartu Kredit - PCI (6-4)',          pii_type_id: kkType?.id,       method_id: mFF1?.id, tweak_id: tStatic?.id,  preserve_prefix: 6, preserve_suffix: 4, maintain_length: true },
    { rule_name: 'Kartu Kredit - Full FPE FF1',       pii_type_id: kkType?.id,       method_id: mFF1?.id, tweak_id: tStatic?.id,  preserve_prefix: 0, preserve_suffix: 0, maintain_length: true },
    { rule_name: 'Telepon - Full FPE FF1',            pii_type_id: teleponType?.id,  method_id: mFF1?.id, tweak_id: tStatic?.id,  preserve_prefix: 0, preserve_suffix: 0, maintain_length: true },
    { rule_name: 'Telepon - Partial FPE (3 Prefix)',  pii_type_id: teleponType?.id,  method_id: mFF1?.id, tweak_id: tStatic?.id,  preserve_prefix: 3, preserve_suffix: 0, maintain_length: true },
    { rule_name: 'Passport - Full FPE FF1',           pii_type_id: passportType?.id, method_id: mFF1?.id, tweak_id: tStatic?.id,  preserve_prefix: 0, preserve_suffix: 0, maintain_length: true },
    { rule_name: 'Nama - Full FPE FF1',               pii_type_id: namaType?.id,     method_id: mFF1?.id, tweak_id: tDynamic?.id, preserve_prefix: 0, preserve_suffix: 0, maintain_length: false },
  ];

  for (const rule of rules) {
    const existing = await prisma.tokenizationRule.findFirst({ where: { rule_name: rule.rule_name } });
    if (!existing) {
      await prisma.tokenizationRule.create({ data: rule });
    }
  }
  console.log('✅ Tokenization Rules seeded:', rules.length, 'rules');

  console.log('\n🎉 Seeding selesai!');
  console.log('📧 Login: admin@system.id');
  console.log('🔑 Password: Admin@12345');
}

seed()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
