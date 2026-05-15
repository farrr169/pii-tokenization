const crypto = require('crypto');

/**
 * FPE Service - Format-Preserving Encryption
 * Menggunakan pendekatan AES-based FF1 (simplified) untuk demo
 * Production: gunakan library ff1-lib atau implementasi NIST SP 800-38G
 */

const NUMERIC_CHARSET = '0123456789';
const ALPHA_CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHANUMERIC_CHARSET = NUMERIC_CHARSET + ALPHA_CHARSET;

/**
 * Deteksi charset dari string input
 */
function detectCharset(input) {
  if (/^\d+$/.test(input)) return NUMERIC_CHARSET;
  if (/^[a-zA-Z]+$/.test(input)) return ALPHA_CHARSET;
  return ALPHANUMERIC_CHARSET;
}

/**
 * Generate tweak berdasarkan tipe
 */
function generateTweak(tweakConfig) {
  switch (tweakConfig.tweak_type) {
    case 'STATIC':
      return Buffer.from(tweakConfig.tweak_value || 'DEFAULT_TWEAK').slice(0, 8);
    case 'DYNAMIC':
      return Buffer.from(Date.now().toString()).slice(0, 8);
    case 'RANDOMIZED':
      return crypto.randomBytes(8);
    case 'USER_BASED':
      return crypto.createHash('sha256')
        .update(tweakConfig.user_id || 'system')
        .digest()
        .slice(0, 8);
    default:
      return crypto.randomBytes(8);
  }
}

/**
 * AES-based Format Preserving Encryption (simplified FF1-like)
 * Production: gunakan library NIST-compliant
 */
function fpeEncrypt(plaintext, key, tweak, charset) {
  const n = plaintext.length;
  const radix = charset.length;

  // Convert plaintext to numeric representation
  const indices = plaintext.split('').map(c => charset.indexOf(c));

  // Generate keystream menggunakan AES
  const keyBuffer = crypto.createHash('sha256').update(key).digest();
  const tweakBuffer = tweak || crypto.randomBytes(8);

  let encrypted = [...indices];

  // Feistel network - 10 rounds (sesuai FF1 spec)
  const u = Math.ceil(n / 2);
  const v = n - u;

  for (let round = 0; round < 10; round++) {
    const A = encrypted.slice(0, u);
    const B = encrypted.slice(u);

    // PRF function
    const prfInput = Buffer.concat([
      Buffer.from([round]),
      tweakBuffer,
      Buffer.from(B.map(i => i).join(''))
    ]);

    const prfOutput = crypto.createHmac('sha256', keyBuffer)
      .update(prfInput)
      .digest();

    // Numeric value dari PRF output
    const c = BigInt('0x' + prfOutput.toString('hex'));

    // Map ke charset
    const newA = A.map((aVal, idx) => {
      const shift = Number(c >> BigInt(idx * 8)) % radix;
      return (aVal + shift + radix) % radix;
    });

    encrypted = [...B, ...newA];
  }

  return encrypted.map(i => charset[i]).join('');
}

/**
 * Main tokenize function
 */
function tokenize(options) {
  const {
    value,
    method,
    tweakConfig,
    preservePrefix = 0,
    preserveSuffix = 0,
    maintainLength = true,
    maintainCharset = true,
    key = process.env.FPE_KEY || 'DEFAULT_KEY_CHANGE_IN_PROD'
  } = options;

  const startTime = Date.now();

  try {
    // Extract prefix/suffix
    const prefix = value.substring(0, preservePrefix);
    const suffix = preserveSuffix > 0 ? value.substring(value.length - preserveSuffix) : '';
    const core = value.substring(preservePrefix, preserveSuffix > 0 ? value.length - preserveSuffix : undefined);

    const charset = maintainCharset ? detectCharset(core) : ALPHANUMERIC_CHARSET;
    const tweak = tweakConfig ? generateTweak(tweakConfig) : crypto.randomBytes(8);

    // Only FF1 algorithm is supported
    const tokenized = fpeEncrypt(core, key, tweak, charset);

    const result = prefix + tokenized + suffix;
    const processingTime = Date.now() - startTime;

    return {
      success: true,
      tokenized_value: result,
      tweak_used: tweakConfig?.tweak_type || 'RANDOMIZED',
      tweak_hex: tweak ? tweak.toString('hex') : null,
      processing_time_ms: processingTime,
      original_length: value.length,
      tokenized_length: result.length,
      length_preserved: value.length === result.length
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      processing_time_ms: Date.now() - startTime
    };
  }
}

module.exports = { tokenize, generateTweak, detectCharset };
