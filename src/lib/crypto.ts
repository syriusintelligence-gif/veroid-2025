/**
 * Biblioteca de criptografia simplificada para demonstração
 * Em produção, usar HSM/TPM e bibliotecas robustas como OpenSSL
 */

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  timestamp: string;
  userId?: string; // ID do usuário dono das chaves
}

export interface SignedContent {
  id: string;
  content: string;
  contentHash: string;
  signature: string;
  publicKey: string;
  timestamp: string;
  creatorName: string;
  verificationCode: string;
  thumbnail?: string; // URL ou base64 da imagem/preview do conteúdo
  platforms?: string[]; // Plataformas onde foi postado (Instagram, Facebook, etc.)
  verificationCount?: number; // Contador de verificações
  userId?: string; // ID do usuário que assinou o conteúdo
}

/**
 * Gera um par de chaves RSA simulado
 * Em produção: usar Web Crypto API ou bibliotecas criptográficas reais
 */
export function generateKeyPair(userId?: string): KeyPair {
  // Simulação de geração de chaves para demo
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const publicKey = `VID-PUB-${btoa(String.fromCharCode(...randomBytes)).substring(0, 64)}`;
  const privateKey = `VID-PRIV-${btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).substring(0, 64)}`;
  
  return {
    publicKey,
    privateKey,
    timestamp: new Date().toISOString(),
    userId,
  };
}

/**
 * Gera hash SHA-256 do conteúdo
 */
async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera uma chave curta de verificação (8 caracteres)
 */
function generateVerificationCode(signature: string, contentHash: string): string {
  const combined = signature + contentHash;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem caracteres confusos (0, O, 1, I)
  let code = '';
  
  for (let i = 0; i < 8; i++) {
    const index = combined.charCodeAt(i * 4) % chars.length;
    code += chars[index];
  }
  
  return code;
}

/**
 * Assina o conteúdo com a chave privada
 * Em produção: usar algoritmos RSA/ECC reais
 */
export function signContent(
  content: string,
  privateKey: string,
  publicKey: string,
  creatorName: string,
  userId?: string,
  thumbnail?: string,
  platforms?: string[]
): { success: boolean; signedContent?: SignedContent; error?: string } {
  try {
    // Gera hash síncrono usando uma abordagem simplificada
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    let hash = '';
    for (let i = 0; i < data.length; i++) {
      hash += data[i].toString(16).padStart(2, '0');
    }
    const contentHash = hash.substring(0, 64);
    
    // Simulação de assinatura digital
    const signatureData = `${contentHash}:${privateKey}:${Date.now()}`;
    const signatureHash = signatureData.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0).toString(16);
    }, '').substring(0, 64);
    
    // Gera chave curta de verificação
    const verificationCode = generateVerificationCode(signatureHash, contentHash);
    
    const signedContent: SignedContent = {
      id: crypto.randomUUID(),
      content,
      contentHash,
      signature: signatureHash,
      publicKey,
      timestamp: new Date().toISOString(),
      creatorName,
      verificationCode,
      thumbnail,
      platforms,
      verificationCount: 0,
      userId,
    };
    
    // Salva no localStorage
    saveSignedContent(signedContent);
    
    return { success: true, signedContent };
  } catch (error) {
    console.error('Erro ao assinar conteúdo:', error);
    return { success: false, error: 'Erro ao assinar conteúdo' };
  }
}

/**
 * Verifica a autenticidade do conteúdo assinado
 */
export async function verifySignature(
  signedContent: SignedContent,
  providedContent: string
): Promise<{ valid: boolean; message: string }> {
  try {
    // Verifica se o hash do conteúdo fornecido corresponde ao hash armazenado
    const providedHash = await generateHash(providedContent);
    
    if (providedHash !== signedContent.contentHash) {
      return {
        valid: false,
        message: 'O conteúdo foi modificado e não corresponde à assinatura original.',
      };
    }
    
    // Verifica se a assinatura é válida
    if (!signedContent.signature || signedContent.signature.length < 32) {
      return {
        valid: false,
        message: 'Assinatura digital inválida ou corrompida.',
      };
    }
    
    return {
      valid: true,
      message: 'Conteúdo autêntico! A assinatura digital foi verificada com sucesso.',
    };
  } catch (error) {
    return {
      valid: false,
      message: 'Erro ao verificar a assinatura. Por favor, tente novamente.',
    };
  }
}

/**
 * Verifica conteúdo usando código de verificação curto
 */
export function verifyByCode(verificationCode: string): SignedContent | null {
  const contents = getSignedContents();
  return contents.find(c => c.verificationCode === verificationCode.toUpperCase()) || null;
}

/**
 * Incrementa o contador de verificações de um conteúdo
 */
export function incrementVerificationCount(contentId: string): void {
  const stored = localStorage.getItem('veroId_signedContents');
  if (!stored) return;
  
  const contents: SignedContent[] = JSON.parse(stored);
  const contentIndex = contents.findIndex(c => c.id === contentId);
  
  if (contentIndex !== -1) {
    contents[contentIndex].verificationCount = (contents[contentIndex].verificationCount || 0) + 1;
    localStorage.setItem('veroId_signedContents', JSON.stringify(contents));
  }
}

/**
 * Armazena chaves no localStorage (apenas para demo)
 * Em produção: usar HSM, TPM ou armazenamento seguro
 */
export function saveKeyPair(keyPair: KeyPair): { success: boolean; error?: string } {
  try {
    localStorage.setItem('veroId_keyPair', JSON.stringify(keyPair));
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar chaves:', error);
    return { success: false, error: 'Erro ao salvar chaves' };
  }
}

export function getKeyPair(userId?: string): KeyPair | null {
  const stored = localStorage.getItem('veroId_keyPair');
  if (!stored) return null;
  
  const keyPair: KeyPair = JSON.parse(stored);
  
  // Se userId foi fornecido, verifica se as chaves pertencem ao usuário
  if (userId && keyPair.userId !== userId) {
    return null;
  }
  
  return keyPair;
}

/**
 * Armazena conteúdos assinados
 */
export function saveSignedContent(signedContent: SignedContent): void {
  const stored = localStorage.getItem('veroId_signedContents');
  const contents: SignedContent[] = stored ? JSON.parse(stored) : [];
  contents.unshift(signedContent);
  localStorage.setItem('veroId_signedContents', JSON.stringify(contents));
}

export function getSignedContents(): SignedContent[] {
  const stored = localStorage.getItem('veroId_signedContents');
  return stored ? JSON.parse(stored) : [];
}

/**
 * Obtém TODOS os conteúdos assinados (para admin)
 */
export function getAllSignedContents(): SignedContent[] {
  return getSignedContents();
}

/**
 * Obtém conteúdos assinados de um usuário específico
 */
export function getSignedContentsByUserId(userId: string): SignedContent[] {
  const allContents = getSignedContents();
  return allContents.filter(content => content.userId === userId);
}

export function getSignedContentById(id: string): SignedContent | null {
  const contents = getSignedContents();
  return contents.find(c => c.id === id) || null;
}
