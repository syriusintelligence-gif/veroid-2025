import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SignedContent } from '@/lib/crypto';
import { CheckCircle2, XCircle, Shield, User, Calendar, Hash } from 'lucide-react';

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