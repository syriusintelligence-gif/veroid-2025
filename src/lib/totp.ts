/**
 * Biblioteca TOTP (Time-based One-Time Password)
 * Compatível com Google Authenticator, Authy, Microsoft Authenticator, etc.
 * Baseado no padrão RFC 6238
 */

/**
 * Gera um secret aleatório para TOTP (base32)
 */
export function generateTOTPSecret(): string {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const secretLength = 32; // 160 bits de entropia
  
  const randomBytes = crypto.getRandomValues(new Uint8Array(secretLength));
  let secret = '';
  
  for (let i = 0; i < secretLength; i++) {
    secret += base32Chars[randomBytes[i] % base32Chars.length];
  }
  
  return secret;
}

/**
 * Decodifica string base32 para bytes
 */
function base32Decode(base32: string): Uint8Array {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanedBase32 = base32.toUpperCase().replace(/=+$/, '');
  
  let bits = '';
  for (const char of cleanedBase32) {
    const val = base32Chars.indexOf(char);
    if (val === -1) throw new Error('Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }
  
  return bytes;
}

/**
 * Gera HMAC-SHA1
 */
async function hmacSHA1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return new Uint8Array(signature);
}

/**
 * Gera código TOTP de 6 dígitos
 */
async function generateTOTPCode(secret: string, timeStep: number = 30): Promise<string> {
  const epoch = Math.floor(Date.now() / 1000);
  let counter = Math.floor(epoch / timeStep);
  
  // Converte counter para bytes (big-endian)
  const counterBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = counter & 0xff;
    counter = counter >> 8;
  }
  
  // Decodifica secret
  const keyBytes = base32Decode(secret);
  
  // Gera HMAC
  const hmac = await hmacSHA1(keyBytes, counterBytes);
  
  // Extrai código de 6 dígitos (RFC 6238)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0');
}

/**
 * Verifica se o código TOTP fornecido é válido
 * Aceita códigos com ±1 time step de tolerância (90 segundos)
 */
export async function verifyTOTPCode(secret: string, code: string): Promise<boolean> {
  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    return false;
  }
  
  const timeStep = 30; // segundos
  const epoch = Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(epoch / timeStep);
  
  // Verifica código atual e ±1 time step (tolerância de 90 segundos)
  for (let offset = -1; offset <= 1; offset++) {
    let testCounter = currentCounter + offset;
    const counterBytes = new Uint8Array(8);
    
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = testCounter & 0xff;
      testCounter = testCounter >> 8;
    }
    
    const keyBytes = base32Decode(secret);
    const hmac = await hmacSHA1(keyBytes, counterBytes);
    
    const hmacOffset = hmac[hmac.length - 1] & 0x0f;
    const expectedCode = (
      ((hmac[hmacOffset] & 0x7f) << 24) |
      ((hmac[hmacOffset + 1] & 0xff) << 16) |
      ((hmac[hmacOffset + 2] & 0xff) << 8) |
      (hmac[hmacOffset + 3] & 0xff)
    ) % 1000000;
    
    if (expectedCode.toString().padStart(6, '0') === code) {
      return true;
    }
  }
  
  return false;
}

/**
 * Gera URL para QR Code (compatível com Google Authenticator)
 */
export function generateTOTPQRCodeURL(
  secret: string,
  accountName: string,
  issuer: string = 'Vero iD'
): string {
  const encodedAccount = encodeURIComponent(accountName);
  const encodedIssuer = encodeURIComponent(issuer);
  
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Gera códigos de backup (10 códigos de 8 dígitos)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(4));
    const code = Array.from(randomBytes)
      .map(byte => byte.toString(10).padStart(3, '0'))
      .join('')
      .substring(0, 8);
    
    codes.push(code);
  }
  
  return codes;
}

/**
 * Hasheia código de backup para armazenamento seguro
 */
export async function hashBackupCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica se código de backup é válido
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<boolean> {
  const hashedInput = await hashBackupCode(code);
  return hashedCodes.includes(hashedInput);
}