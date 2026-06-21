import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SignedContent } from '@/lib/crypto';
import { CheckCircle2, XCircle, Shield, User, Calendar, Hash, Key } from 'lucide-react';
import { KeyIdenticon } from '@/components/KeyIdenticon';
import { getKeyVisualSeed, getKeyShortSuffix } from '@/lib/keyVisual';

interface VerificationResultProps {
  isValid: boolean;
  message: string;
  signedContent?: SignedContent;
}

export default function VerificationResult({ isValid, message, signedContent }: VerificationResultProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Alert className={isValid ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
        {isValid ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
        <AlertTitle className={isValid ? 'text-green-900' : 'text-red-900'}>
          {isValid ? 'Conteúdo Autêntico ✓' : 'Verificação Falhou ✗'}
        </AlertTitle>
        <AlertDescription className={isValid ? 'text-green-800' : 'text-red-800'}>
          {message}
        </AlertDescription>
      </Alert>
      
      {isValid && signedContent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Detalhes da Assinatura Digital
              </CardTitle>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Verificado
              </Badge>
            </div>
            <CardDescription>
              Este conteúdo foi assinado digitalmente e sua autenticidade foi confirmada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Criador</p>
                  <p className="text-sm text-muted-foreground">{signedContent.creatorName}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Data de Assinatura</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(signedContent.timestamp).toLocaleString('pt-BR', {
                      dateStyle: 'long',
                      timeStyle: 'medium',
                    })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">ID do Conteúdo</p>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {signedContent.id}
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Conteúdo Original:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {signedContent.content}
                </p>
              </div>
              
              {/* 🎨 Bloco de destaque visual da Chave Pública (identicon + ID curto + últimos 20 chars) */}
              {signedContent.publicKey && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Key className="h-4 w-4 text-blue-700" />
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Chave Pública do Assinante
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <KeyIdenticon
                      hash={getKeyVisualSeed(signedContent.publicKey)}
                      size={64}
                      className="flex-shrink-0 border-2 border-white shadow-md"
                    />
                    <div className="flex-1 min-w-[180px] space-y-2">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-blue-700/80 font-bold block mb-1">
                          ID Visual da Chave
                        </span>
                        <code className="text-sm font-mono font-extrabold break-all bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                          {getKeyVisualSeed(signedContent.publicKey)}
                        </code>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-purple-700/80 font-bold block mb-1">
                          Últimos 20 caracteres
                        </span>
                        <code className="text-sm font-mono font-extrabold break-all bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          …{getKeyShortSuffix(signedContent.publicKey, 20)}
                        </code>
                      </div>
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className="text-xs text-blue-700 cursor-pointer hover:text-blue-900 font-medium select-none">
                      Ver chave completa
                    </summary>
                    <div className="mt-2 p-2 bg-white/70 rounded border border-blue-200">
                      <code className="text-[11px] font-mono break-all text-gray-700">
                        {signedContent.publicKey}
                      </code>
                    </div>
                  </details>
                </div>
              )}

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium mb-1">Hash SHA-256:</p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {signedContent.contentHash}
                </p>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium mb-1">Assinatura Digital:</p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {signedContent.signature}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}