import { useEffect, useState } from 'react';
import { validatePasswordStrength, getPasswordStrengthColor, getPasswordStrengthText, PasswordStrength } from '@/lib/password-validator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({ password, showRequirements = true }: PasswordStrengthIndicatorProps) {
  const [strength, setStrength] = useState<PasswordStrength | null>(null);

  useEffect(() => {
    if (password) {
      const result = validatePasswordStrength(password);
      setStrength(result);
    } else {
      setStrength(null);
    }
  }, [password]);

  if (!password || !strength) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Barra de Força */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Força da senha:</span>
          <span className={`font-medium ${
            strength.score >= 3 ? 'text-green-600' : 
            strength.score >= 2 ? 'text-yellow-600' : 
            'text-red-600'
          }`}>
            {getPasswordStrengthText(strength.score)}
          </span>
        </div>
        <div className="flex gap-1 h-1.5">
          {[0, 1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className={`flex-1 rounded-full transition-all ${
                index < strength.score + 1
                  ? getPasswordStrengthColor(strength.score)
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Requisitos Mínimos */}
      {showRequirements && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Requisitos:</p>
          <div className="grid grid-cols-1 gap-1.5 text-xs">
            <RequirementItem
              met={strength.requirements.minLength}
              text="Mínimo 8 caracteres (6 obrigatório)"
            />
            <RequirementItem
              met={strength.requirements.hasUppercase}
              text="1 letra MAIÚSCULA"
              required
            />
            <RequirementItem
              met={strength.requirements.hasLowercase}
              text="1 letra minúscula"
            />
            <RequirementItem
              met={strength.requirements.hasNumber}
              text="1 número"
            />
            <RequirementItem
              met={strength.requirements.hasSpecial}
              text="1 caractere especial (!@#$%^&*)"
              required
            />
          </div>
        </div>
      )}

      {/* Feedback */}
      {strength.feedback.length > 0 && (
        <Alert className={
          strength.score >= 3 
            ? 'border-green-500 bg-green-50' 
            : strength.score >= 2 
            ? 'border-yellow-500 bg-yellow-50'
            : 'border-red-500 bg-red-50'
        }>
          {strength.score >= 3 ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : strength.score >= 2 ? (
            <Info className="h-4 w-4 text-yellow-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={
            strength.score >= 3 
              ? 'text-green-800' 
              : strength.score >= 2 
              ? 'text-yellow-800'
              : 'text-red-800'
          }>
            <ul className="list-disc list-inside space-y-1">
              {strength.feedback.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface RequirementItemProps {
  met: boolean;
  text: string;
  required?: boolean;
}

function RequirementItem({ met, text, required = false }: RequirementItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
        met ? 'bg-green-500' : 'bg-gray-300'
      }`}>
        {met && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
      <span className={met ? 'text-green-700' : 'text-muted-foreground'}>
        {text}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
    </div>
  );
}