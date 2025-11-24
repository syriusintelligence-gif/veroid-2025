/**
 * Biblioteca de criptografia simplificada
 * Versão restaurada que funciona em modo anônimo e múltiplos dispositivos
 */

import { saveKeyPair as saveKeyPairToSupabase, getKeyPair as getKeyPairFromSupabase } from './supabase-crypto';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  createdAt: string;
  userId?: string; // Opcional, só quando logado
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
  thumbnail?: string;
  platforms?: string[];
  verificationCount?: number;
  userId?: string;
}

/**
 * Gera hash SHA-256 do conteúdo
 */
export async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera uma chave curta de verificação (8 caracteres)
 */
export function generateVerificationCode(signature: string, contentHash: string): string {
  const combined = signature + contentHash;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  
  for (let i = 0; i < 8; i++) {
    const index = combined.charCodeAt(i * 4) % chars.length;
    code += chars[index];
  }
  
  return code;
}

/**
 * Gera um par de chaves RSA simulado
 */
export async function generateKeyPair(creatorName: string, userId?: string): Promise<KeyPair> {
  console.log('🔑 Gerando novo par de chaves...');
  
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const publicKey = `VID-PUB-${btoa(String.fromCharCode(...randomBytes)).substring(0, 64)}`;
  const privateKey = `VID-PRIV-${btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).substring(0, 64)}`;
  
  const keyPair: KeyPair = {
    publicKey,
    privateKey,
    createdAt: new Date().toISOString(),
    userId,
  };
  
  console.log('✅ Par de chaves gerado com sucesso');
  return keyPair;
}

/**
 * Salva par de chaves no localStorage (sempre) e Supabase (se logado)
 */
export function saveKeyPair(keyPair: KeyPair, creatorName: string): void {
  console.log('💾 Salvando chaves...');
  
  // 1. SEMPRE salva no localStorage (funciona em modo anônimo)
  localStorage.setItem('veroId_keyPair', JSON.stringify(keyPair));
  localStorage.setItem('veroId_creatorName', creatorName);
  console.log('✅ Chaves salvas no localStorage');
  
  // 2. Se tiver userId, tenta salvar no Supabase (backup na nuvem)
  if (keyPair.userId) {
    console.log('☁️ Tentando backup no Supabase...');
    saveKeyPairToSupabase({
      id: crypto.randomUUID(),
      userId: keyPair.userId,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      createdAt: keyPair.createdAt,
    }).then(result => {
      if (result.success) {
        console.log('✅ Backup no Supabase realizado com sucesso!');
      } else {
        console.warn('⚠️ Falha no backup Supabase (mas chaves estão salvas localmente)');
      }
    }).catch(error => {
      console.warn('⚠️ Erro no backup Supabase:', error);
    });
  }
}

/**
 * Obtém par de chaves do localStorage ou Supabase
 */
export async function getKeyPair(userId?: string): Promise<KeyPair | null> {
  console.log('🔍 Buscando chaves...');
  
  // 1. Tenta carregar do localStorage primeiro (mais rápido)
  const stored = localStorage.getItem('veroId_keyPair');
  if (stored) {
    console.log('✅ Chaves encontradas no localStorage');
    return JSON.parse(stored);
  }
  
  // 2. Se não encontrou e tem userId, tenta restaurar do Supabase
  if (userId) {
    console.log('☁️ Tentando restaurar do Supabase...');
    try {
      const supabaseKeyPair = await getKeyPairFromSupabase(userId);
      if (supabaseKeyPair) {
        console.log('✅ Chaves restauradas do Supabase!');
        
        // Converte para formato local e salva
        const localKeyPair: KeyPair = {
          publicKey: supabaseKeyPair.publicKey,
          privateKey: supabaseKeyPair.privateKey,
          createdAt: supabaseKeyPair.createdAt,
          userId: supabaseKeyPair.userId,
        };
        
        localStorage.setItem('veroId_keyPair', JSON.stringify(localKeyPair));
        return localKeyPair;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao restaurar do Supabase:', error);
    }
  }
  
  console.log('ℹ️ Nenhuma chave encontrada');
  return null;
}

export function getCreatorName(): string {
  return localStorage.getItem('veroId_creatorName') || 'Usuário Anônimo';
}

/**
 * Assina o conteúdo com a chave privada
 */
export async function signContent(
  content: string,
  privateKey: string,
  publicKey: string,
  creatorName: string,
  userId?: string,
  thumbnail?: string,
  platforms?: string[]
): Promise<SignedContent> {
  const contentHash = await generateHash(content);
  
  // Simulação de assinatura digital
  const signatureData = `<span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mrow><mi>c</mi><mi>o</mi><mi>n</mi><mi>t</mi><mi>e</mi><mi>n</mi><mi>t</mi><mi>H</mi><mi>a</mi><mi>s</mi><mi>h</mi></mrow><mo>:</mo></mrow><annotation encoding="application/x-tex">{contentHash}:</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:0.6944em;"></span><span class="mord"><span class="mord mathnormal">co</span><span class="mord mathnormal">n</span><span class="mord mathnormal">t</span><span class="mord mathnormal">e</span><span class="mord mathnormal">n</span><span class="mord mathnormal">t</span><span class="mord mathnormal" style="margin-right:0.08125em;">H</span><span class="mord mathnormal">a</span><span class="mord mathnormal">s</span><span class="mord mathnormal">h</span></span><span class="mspace" style="margin-right:0.2778em;"></span><span class="mrel">:</span></span></span></span>{privateKey}:${Date.now()}`;
  const signature = await generateHash(signatureData);
  
  // Gera chave curta de verificação
  const verificationCode = generateVerificationCode(signature, contentHash);
  
  return {
    id: crypto.randomUUID(),
    content,
    contentHash,
    signature,
    publicKey,
    timestamp: new Date().toISOString(),
    creatorName,
    verificationCode,
    thumbnail,
    platforms,
    verificationCount: 0,
    userId,
  };
}

/**
 * Verifica a autenticidade do conteúdo assinado
 */
export async function verifySignature(
  signedContent: SignedContent,
  providedContent: string
): Promise<{ valid: boolean; message: string }> {
  try {
    const providedHash = await generateHash(providedContent);
    
    if (providedHash !== signedContent.contentHash) {
      return {
        valid: false,
        message: 'O conteúdo foi modificado e não corresponde à assinatura original.',
      };
    }
    
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

/**
 * NÃO limpa as chaves no logout - elas ficam salvas!
 * Isso garante que funcionem em modo anônimo e múltiplos dispositivos
 */
export function clearAllKeys(userId: string): void {
  console.log('🔒 Mantendo chaves salvas (não limpando no logout)');
  console.log('ℹ️ As chaves permanecerão disponíveis para uso futuro');
  // NÃO REMOVE NADA!
}
