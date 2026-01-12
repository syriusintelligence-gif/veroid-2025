/**
 * Funções de criptografia AES-256-GCM para chaves privadas
 * Usa Web Crypto API para criptografia segura no navegador
 */

// Chave de criptografia derivada do ambiente (deve ser mantida em segredo)
const ENCRYPTION_KEY_MATERIAL = import.meta.env.VITE_ENCRYPTION_KEY || 'vero-id-default-encryption-key-2024';

/**
 * Deriva uma chave de criptografia a partir de uma senha/material
 */
async function deriveKey(keyMaterial: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterialBuffer = encoder.encode(keyMaterial);
  
  // Importa o material da chave
  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyMaterialBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Deriva uma chave AES-256-GCM
  const salt = encoder.encode('vero-id-salt-2024'); // Salt fixo (em produção, use salt único por usuário)
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Criptografa uma chave privada usando AES-256-GCM
 */
export async function encryptPrivateKey(privateKey: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(privateKey);
    
    // Deriva a chave de criptografia
    const key = await deriveKey(ENCRYPTION_KEY_MATERIAL);
    
    // Gera um IV (Initialization Vector) aleatório
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Criptografa os dados
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      data
    );
    
    // Combina IV + dados criptografados
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Converte para Base64 para armazenamento
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('❌ Erro ao criptografar chave privada:', error);
    throw new Error('Falha ao criptografar chave privada');
  }
}

/**
 * Descriptografa uma chave privada usando AES-256-GCM
 */
export async function decryptPrivateKey(encryptedPrivateKey: string): Promise<string> {
  try {
    // Converte de Base64 para Uint8Array
    const combined = Uint8Array.from(atob(encryptedPrivateKey), c => c.charCodeAt(0));
    
    // Extrai IV e dados criptografados
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    // Deriva a chave de criptografia
    const key = await deriveKey(ENCRYPTION_KEY_MATERIAL);
    
    // Descriptografa os dados
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encryptedData
    );
    
    // Converte de volta para string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('❌ Erro ao descriptografar chave privada:', error);
    throw new Error('Falha ao descriptografar chave privada');
  }
}

/**
 * Testa se a criptografia/descriptografia está funcionando
 */
export async function testEncryption(): Promise<boolean> {
  try {
    const testData = 'VID-PRIV-test-key-12345';
    const encrypted = await encryptPrivateKey(testData);
    const decrypted = await decryptPrivateKey(encrypted);
    return testData === decrypted;
  } catch (error) {
    console.error('❌ Teste de criptografia falhou:', error);
    return false;
  }
}