/**
 * Validadores avançados com Regex rigoroso
 * Para Email, Telefone, CPF e CNPJ
 */

/**
 * Valida email com regex rigoroso (RFC 5322 simplificado)
 * Aceita: user@domain.com, user.name@sub.domain.com
 * Rejeita: user@, @domain.com, user domain@test.com
 */
export function validateEmailStrict(email: string): { valid: boolean; message: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email é obrigatório' };
  }

  const trimmed = email.trim();

  // Verifica comprimento
  if (trimmed.length > 254) {
    return { valid: false, message: 'Email muito longo (máximo 254 caracteres)' };
  }

  // Regex rigoroso para email
  const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: 'Formato de email inválido' };
  }

  // Verifica parte local (antes do @)
  const [localPart, domainPart] = trimmed.split('@');
  
  if (localPart.length > 64) {
    return { valid: false, message: 'Parte local do email muito longa' };
  }

  // Verifica se tem pontos consecutivos
  if (localPart.includes('..') || domainPart.includes('..')) {
    return { valid: false, message: 'Email não pode ter pontos consecutivos' };
  }

  // Verifica domínios suspeitos/temporários (opcional)
  const suspiciousDomains = ['tempmail.com', 'throwaway.email', 'guerrillamail.com', '10minutemail.com'];
  const domain = domainPart.toLowerCase();
  
  for (const suspicious of suspiciousDomains) {
    if (domain.endsWith(suspicious)) {
      return { valid: false, message: 'Email temporário não é permitido' };
    }
  }

  return { valid: true, message: 'Email válido' };
}

/**
 * Valida telefone brasileiro com regex rigoroso
 * Aceita: (11) 98765-4321, (11) 3456-7890, 11987654321
 * Formato: (DD) 9XXXX-XXXX ou (DD) XXXX-XXXX
 */
export function validatePhoneBR(phone: string): { valid: boolean; message: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, message: 'Telefone é obrigatório' };
  }

  // Remove formatação
  const cleaned = phone.replace(/\D/g, '');

  // Verifica comprimento (10 ou 11 dígitos)
  if (cleaned.length < 10 || cleaned.length > 11) {
    return { valid: false, message: 'Telefone deve ter 10 ou 11 dígitos' };
  }

  // Regex para validar formato brasileiro
  // DDD: 11-99 (códigos válidos)
  // Celular: 9XXXX-XXXX (9 dígitos)
  // Fixo: XXXX-XXXX (8 dígitos)
  const phoneRegex = /^([1-9]{2})(9[0-9]{8}|[2-5][0-9]{7})$/;

  if (!phoneRegex.test(cleaned)) {
    return { valid: false, message: 'Formato de telefone inválido' };
  }

  // Verifica DDD válido (11-99)
  const ddd = parseInt(cleaned.substring(0, 2));
  const validDDDs = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
    21, 22, 24, // RJ
    27, 28, // ES
    31, 32, 33, 34, 35, 37, 38, // MG
    41, 42, 43, 44, 45, 46, // PR
    47, 48, 49, // SC
    51, 53, 54, 55, // RS
    61, // DF
    62, 64, // GO
    63, // TO
    65, 66, // MT
    67, // MS
    68, // AC
    69, // RO
    71, 73, 74, 75, 77, // BA
    79, // SE
    81, 87, // PE
    82, // AL
    83, // PB
    84, // RN
    85, 88, // CE
    86, 89, // PI
    91, 93, 94, // PA
    92, 97, // AM
    95, // RR
    96, // AP
    98, 99, // MA
  ];

  if (!validDDDs.includes(ddd)) {
    return { valid: false, message: 'DDD inválido' };
  }

  // Verifica números repetidos (ex: 11111111111)
  if (/^(\d)\1+$/.test(cleaned)) {
    return { valid: false, message: 'Telefone não pode ter todos os dígitos iguais' };
  }

  return { valid: true, message: 'Telefone válido' };
}

/**
 * Valida CPF com algoritmo oficial (dígitos verificadores)
 */
export function validateCPFStrict(cpf: string): { valid: boolean; message: string } {
  if (!cpf || typeof cpf !== 'string') {
    return { valid: false, message: 'CPF é obrigatório' };
  }

  // Remove formatação
  const cleaned = cpf.replace(/\D/g, '');

  // Verifica comprimento
  if (cleaned.length !== 11) {
    return { valid: false, message: 'CPF deve ter 11 dígitos' };
  }

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) {
    return { valid: false, message: 'CPF inválido (dígitos repetidos)' };
  }

  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) {
    return { valid: false, message: 'CPF inválido (dígito verificador incorreto)' };
  }

  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) {
    return { valid: false, message: 'CPF inválido (dígito verificador incorreto)' };
  }

  return { valid: true, message: 'CPF válido' };
}

/**
 * Valida CNPJ com algoritmo oficial (dígitos verificadores)
 */
export function validateCNPJStrict(cnpj: string): { valid: boolean; message: string } {
  if (!cnpj || typeof cnpj !== 'string') {
    return { valid: false, message: 'CNPJ é obrigatório' };
  }

  // Remove formatação
  const cleaned = cnpj.replace(/\D/g, '');

  // Verifica comprimento
  if (cleaned.length !== 14) {
    return { valid: false, message: 'CNPJ deve ter 14 dígitos' };
  }

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) {
    return { valid: false, message: 'CNPJ inválido (dígitos repetidos)' };
  }

  // Valida primeiro dígito verificador
  let sum = 0;
  let pos = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * pos;
    pos = pos === 2 ? 9 : pos - 1;
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleaned.charAt(12))) {
    return { valid: false, message: 'CNPJ inválido (dígito verificador incorreto)' };
  }

  // Valida segundo dígito verificador
  sum = 0;
  pos = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * pos;
    pos = pos === 2 ? 9 : pos - 1;
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cleaned.charAt(13))) {
    return { valid: false, message: 'CNPJ inválido (dígito verificador incorreto)' };
  }

  return { valid: true, message: 'CNPJ válido' };
}

/**
 * Valida CPF ou CNPJ automaticamente
 */
export function validateCPForCNPJ(value: string): { valid: boolean; message: string; type: 'CPF' | 'CNPJ' | null } {
  if (!value || typeof value !== 'string') {
    return { valid: false, message: 'CPF/CNPJ é obrigatório', type: null };
  }

  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length === 11) {
    const result = validateCPFStrict(value);
    return { ...result, type: 'CPF' };
  } else if (cleaned.length === 14) {
    const result = validateCNPJStrict(value);
    return { ...result, type: 'CNPJ' };
  } else {
    return { 
      valid: false, 
      message: 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos',
      type: null
    };
  }
}

/**
 * Formata CPF: 123.456.789-00
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ: 12.345.678/0001-00
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formata telefone: (11) 98765-4321
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}