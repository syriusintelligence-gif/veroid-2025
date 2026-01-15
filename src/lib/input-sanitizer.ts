import DOMPurify from 'dompurify';

/**
 * Sanitiza strings para prevenir ataques XSS
 * Remove tags HTML, scripts e outros conteúdos maliciosos
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove espaços extras no início e fim
  const trimmed = input.trim();
  
  // Usa DOMPurify para remover conteúdo malicioso
  // Configuração: remove todas as tags HTML, mantém apenas texto
  const clean = DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [], // Não permite nenhuma tag HTML
    ALLOWED_ATTR: [], // Não permite nenhum atributo
    KEEP_CONTENT: true, // Mantém o conteúdo de texto
  });
  
  return clean;
}

/**
 * Sanitiza múltiplos campos de um objeto
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key] as string) as T[Extract<keyof T, string>];
    }
  }
  
  return sanitized;
}

/**
 * Sanitiza email (converte para lowercase e remove espaços)
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  return sanitizeInput(email).toLowerCase();
}

/**
 * Sanitiza telefone (remove caracteres não numéricos)
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  
  // Remove tudo exceto números
  return phone.replace(/\D/g, '');
}

/**
 * Sanitiza CPF/CNPJ (remove caracteres não numéricos)
 */
export function sanitizeCpfCnpj(cpfCnpj: string): string {
  if (!cpfCnpj || typeof cpfCnpj !== 'string') {
    return '';
  }
  
  // Remove tudo exceto números
  return cpfCnpj.replace(/\D/g, '');
}

/**
 * Sanitiza URL (valida e limpa)
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  const trimmed = url.trim();
  
  // Valida se é uma URL válida
  try {
    const urlObj = new URL(trimmed);
    // Permite apenas http e https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return '';
    }
    return urlObj.toString();
  } catch {
    // Se não for uma URL válida, tenta adicionar https://
    try {
      const urlWithProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      const urlObj = new URL(urlWithProtocol);
      return urlObj.toString();
    } catch {
      return '';
    }
  }
}

/**
 * Valida e sanitiza nome (remove caracteres especiais perigosos, mantém acentos)
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  // Remove HTML/scripts primeiro
  const clean = sanitizeInput(name);
  
  // Remove caracteres especiais perigosos, mas mantém letras acentuadas, espaços e hífens
  return clean.replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '').trim();
}

/**
 * =====================================================
 * 🆕 SANITIZAÇÃO DE NOMES DE ARQUIVOS
 * =====================================================
 * 
 * Sanitiza nomes de arquivos para prevenir ataques de segurança.
 * Implementado seguindo padrões enterprise de Apple, Microsoft e Google.
 * 
 * PROTEÇÕES IMPLEMENTADAS:
 * 1. Path Traversal (../, ..\)
 * 2. XSS (<script>, <img>)
 * 3. Command Injection (;, &&, |, $, `)
 * 4. SQL Injection (', ", --)
 * 5. Null Byte Injection (\x00)
 * 6. Caracteres especiais problemáticos (: * ? " < > |)
 * 7. Nomes reservados Windows (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
 * 8. Espaços múltiplos e caracteres de controle
 * 9. Limite de 255 caracteres (padrão de sistemas de arquivos)
 * 
 * @param fileName - Nome do arquivo original (com extensão)
 * @param options - Opções de sanitização
 * @returns Nome do arquivo sanitizado
 * 
 * @example
 * ```typescript
 * // Exemplo 1: Path Traversal
 * sanitizeFileName("/images/FileSanitization.jpg")
 * // Retorna: "/images/FileSanitization.jpg"
 * 
 * // Exemplo 2: XSS
 * sanitizeFileName("<script>alert('XSS')</script>.jpg")
 * // Retorna: "/images/Sanitization.jpg"
 * 
 * // Exemplo 3: Command Injection
 * sanitizeFileName("/images/photo1768503518.jpg; rm -rf /")
 * // Retorna: "/images/FileSanitization.jpg"
 * 
 * // Exemplo 4: Nome reservado Windows
 * sanitizeFileName("CON.txt")
 * // Retorna: "_CON.txt"
 * 
 * // Exemplo 5: Caracteres especiais
 * sanitizeFileName("my file:name?.jpg")
 * // Retorna: "/images/FileNaming.jpg"
 * ```
 */
export interface SanitizeFileNameOptions {
  /**
   * Caractere de substituição para caracteres inválidos
   * @default "_"
   */
  replacement?: string;
  
  /**
   * Comprimento máximo do nome (sem extensão)
   * @default 200
   */
  maxLength?: number;
  
  /**
   * Se true, converte para lowercase
   * @default false
   */
  lowercase?: boolean;
  
  /**
   * Se true, preserva espaços (convertidos para underscores por padrão)
   * @default false
   */
  preserveSpaces?: boolean;
}

export function sanitizeFileName(
  fileName: string,
  options: SanitizeFileNameOptions = {}
): string {
  // Configuração padrão
  const {
    replacement = '_',
    maxLength = 200,
    lowercase = false,
    preserveSpaces = false,
  } = options;

  // =====================================================
  // VALIDAÇÃO INICIAL
  // =====================================================
  if (!fileName || typeof fileName !== 'string') {
    console.warn('⚠️ [SANITIZE] Nome de arquivo inválido, usando fallback');
    return `file_${Date.now()}.bin`;
  }

  // Remove espaços no início e fim
  let clean = fileName.trim();

  // Se arquivo está vazio após trim, gera nome único
  if (!clean) {
    console.warn('⚠️ [SANITIZE] Nome de arquivo vazio, gerando nome único');
    return `file_${Date.now()}.bin`;
  }

  // =====================================================
  // SEPARAÇÃO DE NOME E EXTENSÃO
  // =====================================================
  const lastDotIndex = clean.lastIndexOf('.');
  let name = lastDotIndex > 0 ? clean.substring(0, lastDotIndex) : clean;
  let extension = lastDotIndex > 0 ? clean.substring(lastDotIndex) : '';

  // Sanitiza extensão separadamente (remove caracteres perigosos)
  if (extension) {
    extension = extension
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '')
      .substring(0, 10); // Limita extensão a 10 caracteres
  }

  // =====================================================
  // ETAPA 1: REMOÇÃO DE PATH TRAVERSAL
  // =====================================================
  // Remove ../ e ..\ (path traversal)
  name = name.replace(/\.\./g, '');
  
  // Remove barras (/ e \)
  name = name.replace(/[\/\\]/g, replacement);

  // =====================================================
  // ETAPA 2: REMOÇÃO DE NULL BYTES
  // =====================================================
  // Remove null bytes (\x00) - usado em null byte injection
  name = name.replace(/\x00/g, '');
  name = name.replace(/\0/g, '');

  // =====================================================
  // ETAPA 3: REMOÇÃO DE CARACTERES DE CONTROLE
  // =====================================================
  // Remove caracteres de controle ASCII (0x00-0x1F, 0x7F-0x9F)
  // eslint-disable-next-line no-control-regex
  name = name.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // =====================================================
  // ETAPA 4: REMOÇÃO DE TAGS HTML/XSS
  // =====================================================
  // Remove tags HTML e scripts
  name = name.replace(/<[^>]*>/g, '');
  name = name.replace(/javascript:/gi, '');
  name = name.replace(/on\w+\s*=/gi, ''); // Remove event handlers (onclick, onerror, etc)

  // =====================================================
  // ETAPA 5: REMOÇÃO DE COMMAND INJECTION
  // =====================================================
  // Remove caracteres usados em command injection
  const commandInjectionChars = /[;|&$`!(){}[\]]/g;
  name = name.replace(commandInjectionChars, replacement);

  // =====================================================
  // ETAPA 6: REMOÇÃO DE SQL INJECTION
  // =====================================================
  // Remove caracteres usados em SQL injection
  name = name.replace(/['"`]/g, replacement);
  name = name.replace(/--/g, replacement);

  // =====================================================
  // ETAPA 7: REMOÇÃO DE CARACTERES ESPECIAIS PROBLEMÁTICOS
  // =====================================================
  // Remove caracteres inválidos em sistemas de arquivos Windows/Unix
  // : * ? " < > | (Windows)
  // \x00 (Unix)
  const invalidChars = /[<>:"|?*]/g;
  name = name.replace(invalidChars, replacement);

  // =====================================================
  // ETAPA 8: TRATAMENTO DE ESPAÇOS
  // =====================================================
  if (preserveSpaces) {
    // Substitui espaços múltiplos por um único espaço
    name = name.replace(/\s+/g, ' ');
  } else {
    // Substitui espaços por underscore
    name = name.replace(/\s+/g, replacement);
  }

  // =====================================================
  // ETAPA 9: NORMALIZAÇÃO UNICODE
  // =====================================================
  // Normaliza caracteres Unicode (remove acentos)
  // NFD = Canonical Decomposition
  name = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // =====================================================
  // ETAPA 10: REMOÇÃO DE CARACTERES NÃO-ASCII
  // =====================================================
  // Mantém apenas caracteres ASCII seguros: a-z, A-Z, 0-9, -, _, .
  name = name.replace(/[^a-zA-Z0-9\-_.]/g, replacement);

  // =====================================================
  // ETAPA 11: LIMPEZA DE UNDERSCORES/HÍFENS MÚLTIPLOS
  // =====================================================
  // Remove underscores/hífens duplicados
  name = name.replace(/_{2,}/g, '_');
  name = name.replace(/-{2,}/g, '-');
  name = name.replace(/\.{2,}/g, '.');

  // Remove underscore/hífen no início e fim
  name = name.replace(/^[_\-]+|[_\-]+$/g, '');

  // =====================================================
  // ETAPA 12: VALIDAÇÃO DE NOMES RESERVADOS (WINDOWS)
  // =====================================================
  // Lista de nomes reservados no Windows
  const windowsReservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];

  const nameUpperCase = name.toUpperCase();
  if (windowsReservedNames.includes(nameUpperCase)) {
    console.warn(`⚠️ [SANITIZE] Nome reservado Windows detectado: ${name}`);
    name = `_${name}`;
  }

  // =====================================================
  // ETAPA 13: APLICAÇÃO DE LOWERCASE (OPCIONAL)
  // =====================================================
  if (lowercase) {
    name = name.toLowerCase();
  }

  // =====================================================
  // ETAPA 14: LIMITE DE COMPRIMENTO
  // =====================================================
  // Limita o nome (sem extensão) ao tamanho máximo
  if (name.length > maxLength) {
    name = name.substring(0, maxLength);
    console.warn(`⚠️ [SANITIZE] Nome truncado para ${maxLength} caracteres`);
  }

  // =====================================================
  // ETAPA 15: VALIDAÇÃO FINAL
  // =====================================================
  // Se o nome ficou vazio após sanitização, gera nome único
  if (!name || name.length === 0) {
    console.warn('⚠️ [SANITIZE] Nome vazio após sanitização, gerando nome único');
    name = `file_${Date.now()}`;
  }

  // =====================================================
  // ETAPA 16: MONTAGEM FINAL
  // =====================================================
  const sanitized = name + extension;

  // Limite total de 255 caracteres (padrão de sistemas de arquivos)
  const finalName = sanitized.length > 255 
    ? sanitized.substring(0, 255) 
    : sanitized;

  // =====================================================
  // LOG DE AUDITORIA
  // =====================================================
  if (fileName !== finalName) {
    console.log('🔒 [SANITIZE] Nome de arquivo sanitizado:', {
      original: fileName.substring(0, 50) + (fileName.length > 50 ? '...' : ''),
      sanitized: finalName,
      changes: {
        lengthBefore: fileName.length,
        lengthAfter: finalName.length,
        hadPathTraversal: /\.\./.test(fileName),
        hadSpecialChars: /[<>:"|?*;|&$`]/.test(fileName),
        hadSpaces: /\s/.test(fileName),
        wasReservedName: windowsReservedNames.includes(name.toUpperCase()),
      }
    });
  }

  return finalName;
}

/**
 * Limita o tamanho de um input
 */
export function limitLength(input: string, maxLength: number): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input.slice(0, maxLength);
}

/**
 * Sanitização completa para formulário de cadastro
 */
export interface CadastroData {
  nomeCompleto: string;
  nomePublico?: string;
  email: string;
  cpfCnpj: string;
  telefone: string;
}

export function sanitizeCadastroData(data: CadastroData): CadastroData {
  return {
    nomeCompleto: limitLength(sanitizeName(data.nomeCompleto), 100),
    nomePublico: data.nomePublico ? limitLength(sanitizeName(data.nomePublico), 50) : undefined,
    email: limitLength(sanitizeEmail(data.email), 100),
    cpfCnpj: sanitizeCpfCnpj(data.cpfCnpj),
    telefone: sanitizePhone(data.telefone),
  };
}

/**
 * Sanitização para links sociais
 */
export interface SocialLinksData {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  twitter?: string;
  youtube?: string;
  linkedin?: string;
  website?: string;
}

export function sanitizeSocialLinks(links: SocialLinksData): SocialLinksData {
  const sanitized: SocialLinksData = {};
  
  for (const [key, value] of Object.entries(links)) {
    if (value && typeof value === 'string') {
      const cleanUrl = sanitizeUrl(value);
      if (cleanUrl) {
        sanitized[key as keyof SocialLinksData] = cleanUrl;
      }
    }
  }
  
  return sanitized;
}