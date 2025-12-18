import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, Loader2, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isValidEmail, loginUser } from '@/lib/supabase-auth-v2';
import { useRateLimit } from '@/hooks/useRateLimit';
import { RateLimitAlert } from '@/components/RateLimitAlert';
import DOMPurify from 'dompurify';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Rate limiting: 5 tentativas por minuto
  const { check: checkRateLimit, isBlocked, blockedUntil, remaining, message: rateLimitMessage } = useRateLimit('LOGIN');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    console.log('📝 Formulário submetido');
    
    // Sanitizar inputs para prevenir XSS
    const sanitizedEmail = DOMPurify.sanitize(email.trim().toLowerCase());
    const sanitizedPassword = DOMPurify.sanitize(senha);
    
    // Validações básicas
    if (!sanitizedEmail || !sanitizedPassword) {
      setError('Por favor, preencha todos os campos');
      return;
    }
    
    if (!isValidEmail(sanitizedEmail)) {
      setError('Email inválido');
      return;
    }
    
    // Verifica rate limiting ANTES de tentar login
    const rateLimitResult = await checkRateLimit();
    if (!rateLimitResult.allowed) {
      console.warn('🚫 Rate limit excedido:', rateLimitResult.message);
      setError(rateLimitResult.message || 'Muitas tentativas. Aguarde antes de tentar novamente.');
      return;
    }
    
    console.log(`✅ Rate limit OK. Tentativas restantes: ${rateLimitResult.remaining}`);
    
    setIsLoading(true);
    console.log('🔐 Iniciando processo de login...');
    
    try {
      // Usar a função loginUser do supabase-auth-v2.ts
      const result = await loginUser(sanitizedEmail, sanitizedPassword);

      if (result.success && result.user) {
        console.log('✅ Login bem-sucedido!');
        console.log('👤 Usuário:', result.user.email);
        
        // Usar navigate do React Router ao invés de window.location.href
        // Isso mantém o estado do React e evita hard reload
        navigate('/dashboard', { replace: true });
      } else {
        console.log('❌ Login falhou:', result.error);
        
        // Tratamento de erros
        if (result.error?.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos. Verifique suas credenciais e tente novamente.');
        } else {
          setError(result.error || 'Erro ao fazer login. Tente novamente.');
        }
        
        setIsLoading(false);
      }
    } catch (err) {
      console.error('❌ Erro crítico no login:', err);
      setError('Erro ao conectar com o servidor. Por favor, tente novamente.');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
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
              {/* Rate Limit Alert */}
              {isBlocked && (
                <RateLimitAlert 
                  blockedUntil={blockedUntil}
                  message={rateLimitMessage}
                  remaining={remaining}
                />
              )}
              
              {error && !isBlocked && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
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
                  disabled={isLoading || isBlocked}
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
                <div className="relative">
                  <Input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    disabled={isLoading || isBlocked}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || isBlocked}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Ocultar senha" : "Mostrar senha"}
                    </span>
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full border-2 border-blue-600 hover:scale-105 hover:shadow-lg transition-all duration-300" 
                disabled={isLoading || isBlocked}
              >
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
              
              {/* Indicador de tentativas restantes */}
              {!isBlocked && remaining !== undefined && remaining < 3 && (
                <p className="text-xs text-center text-muted-foreground">
                  ⚠️ {remaining} tentativa{remaining !== 1 ? 's' : ''} restante{remaining !== 1 ? 's' : ''}
                </p>
              )}
              
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