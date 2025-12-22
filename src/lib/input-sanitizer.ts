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
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key]) as any;
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