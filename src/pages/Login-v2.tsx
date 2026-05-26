import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, Loader2, LogIn, AlertCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loginUser, isValidEmail } from '@/lib/supabase-auth-v2';
import { checkPasswordExpiration } from '@/lib/password-policy';

interface DebugInfo {
  step: string;
  email?: string;
  timestamp?: string;
  authAttempt?: {
    success: boolean;
    error?: string;
    hasUser: boolean;
    userId?: string;
  };
  userInTable?: {
    exists: boolean;
    error?: string;
    userId?: string;
  };
  userDataFetch?: {
    success: boolean;
    error?: string;
    found: boolean;
  };
  userInfo?: {
    email: string;
    isAdmin: boolean;
    verified: boolean;
  };
  error?: string;
}

export default function LoginV2() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDebugInfo(null);
    
    console.log('📝 Formulário submetido');
    
    // Validações
    if (!email || !senha) {
      setError('Por favor, preencha todos os campos');
      return;
    }
    
    if (!isValidEmail(email)) {
      setError('Email inválido');
      return;
    }
    
    setIsLoading(true);
    console.log('🔐 Iniciando processo de login com Supabase Auth V2...');
    
    try {
      const result = await loginUser(email, senha);
      
      setDebugInfo(result.debugInfo || null);
      
      if (result.success && result.user) {
        console.log('✅ Login bem-sucedido! Redirecionando...');
        console.log('👤 Usuário:', result.user.email);
        console.log('🔑 Admin:', result.user.isAdmin);
        
        // Verifica expiração de senha após login bem-sucedido
        console.log('🔐 [PASSWORD POLICY] Verificando expiração de senha...');
        try {
          const expirationStatus = await checkPasswordExpiration(result.user.id);
          console.log('📊 [PASSWORD POLICY] Status:', expirationStatus);
          
          // Se senha expirou ou deve ser trocada (exceto para admins)
          if ((expirationStatus.isExpired || expirationStatus.mustChangePassword) && !expirationStatus.isAdmin) {
            console.log('⚠️ [PASSWORD POLICY] Senha expirada! Redirecionando para troca de senha...');
            
            // Redireciona para página de troca de senha com informações
            setTimeout(() => {
              navigate('/change-password', {
                state: { expirationStatus }
              });
            }, 100);
            return;
          }
        } catch (error) {
          console.error('❌ [PASSWORD POLICY] Erro ao verificar expiração:', error);
          // Continua com o login mesmo se houver erro na verificação
        }
        
        // Login normal - redireciona para dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 100);
      } else {
        console.log('❌ Login falhou:', result.error);
        setError(result.error || 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('❌ Erro crítico no login:', err);
      setError('Erro ao fazer login. Por favor, tente novamente.');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Vero iD
              </span>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/cadastro')}>
            Criar Conta
          </Button>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Entrar</CardTitle>
            <CardDescription className="text-center">
              Acesse sua conta Vero iD
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {debugInfo && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Informações de Debug Disponíveis</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => setShowDebug(!showDebug)}
                        type="button"
                      >
                        {showDebug ? 'Ocultar' : 'Mostrar'}
                      </Button>
                    </div>
                    {showDebug && (
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(debugInfo, null, 2)}
                      </pre>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha">Senha</Label>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={() => navigate('/forgot-password')}
                    type="button"
                  >
                    Esqueceu a senha?
                  </Button>
                </div>
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Entrar
                  </>
                )}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={() => navigate('/cadastro')}
                  type="button"
                >
                  Cadastre-se
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}