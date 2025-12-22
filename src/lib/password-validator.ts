/**
 * Validador de força de senha
 * Verifica requisitos de segurança e calcula score de força
 */

export interface PasswordStrength {
  score: number; // 0-4 (0=muito fraca, 4=muito forte)
  feedback: string[];
  isValid: boolean;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Valida força da senha e retorna análise detalhada
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Requisitos mínimos
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };

  // Verifica comprimento
  if (password.length < 6) {
    feedback.push('Senha muito curta (mínimo 6 caracteres)');
  } else if (password.length < 8) {
    feedback.push('Recomendado: mínimo 8 caracteres');
    score += 1;
  } else if (password.length >= 8 && password.length < 12) {
    score += 2;
  } else if (password.length >= 12) {
    score += 3;
  }

  // Verifica maiúsculas
  if (!requirements.hasUppercase) {
    feedback.push('Adicione pelo menos 1 letra MAIÚSCULA');
  } else {
    score += 1;
  }

  // Verifica minúsculas
  if (!requirements.hasLowercase) {
    feedback.push('Adicione pelo menos 1 letra minúscula');
  } else {
    score += 1;
  }

  // Verifica números
  if (!requirements.hasNumber) {
    feedback.push('Adicione pelo menos 1 número');
  } else {
    score += 1;
  }

  // Verifica caracteres especiais
  if (!requirements.hasSpecial) {
    feedback.push('Adicione pelo menos 1 caractere especial (!@#$%^&*)');
  } else {
    score += 1;
  }

  // Verifica padrões comuns fracos
  const weakPatterns = [
    /^123456/,
    /^password/i,
    /^qwerty/i,
    /^abc123/i,
    /^111111/,
    /^000000/,
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      feedback.push('Evite padrões comuns (123456, password, etc.)');
      score = Math.max(0, score - 2);
      break;
    }
  }

  // Verifica sequências
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Evite repetir o mesmo caractere');
    score = Math.max(0, score - 1);
  }

  // Normaliza score (0-4)
  score = Math.min(4, Math.max(0, Math.floor(score / 2)));

  // Validação mínima: 6 caracteres + 1 maiúscula + 1 especial
  const isValid = password.length >= 6 && requirements.hasUppercase && requirements.hasSpecial;

  // Feedback positivo se senha forte
  if (score >= 3 && feedback.length === 0) {
    feedback.push('Senha forte! ✓');
  }

  return {
    score,
    feedback,
    isValid,
    requirements,
  };
}

/**
 * Retorna cor baseada no score
 */
export function getPasswordStrengthColor(score: number): string {
  switch (score) {
    case 0:
      return 'bg-red-500';
    case 1:
      return 'bg-orange-500';
    case 2:
      return 'bg-yellow-500';
    case 3:
      return 'bg-lime-500';
    case 4:
      return 'bg-green-500';
    default:
      return 'bg-gray-300';
  }
}

/**
 * Retorna texto descritivo do score
 */
export function getPasswordStrengthText(score: number): string {
  switch (score) {
    case 0:
      return 'Muito fraca';
    case 1:
      return 'Fraca';
    case 2:
      return 'Média';
    case 3:
      return 'Forte';
    case 4:
      return 'Muito forte';
    default:
      return 'Indefinida';
  }
}

/**
 * Validação legada (compatibilidade com código existente)
 * Mantém requisitos mínimos: 6 chars + 1 maiúscula + 1 especial
 */
export function isValidPassword(password: string): boolean {
  if (!password || password.length < 6) {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  return hasUppercase && hasSpecial;
}