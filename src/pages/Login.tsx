import { useState, useEffect } from 'react';
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
import { supabase } from '@/lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  // Rate limiting: 5 tentativas por minuto
  const { check: checkRateLimit, isBlocked, blockedUntil, remaining, message: rateLimitMessage } = useRateLimit('LOGIN');
  
  // Adiciona log de debug
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugInfo(prev => [...prev, logMessage]);
  };
  
  // Verifica sessão ao carregar
  useEffect(() => {
    const checkSession = async () => {
      addDebugLog('🔍 Verificando sessão existente...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        addDebugLog(`❌ Erro ao verificar sessão: ${error.message}`);
      } else if (session) {
        addDebugLog(`✅ Sessão ativa encontrada: ${session.user.email}`);
        addDebugLog('🔄 Redirecionando para dashboard...');
        navigate('/dashboard', { replace: true });
      } else {
        addDebugLog('ℹ️ Nenhuma sessão ativa encontrada');
      }
    };
    
    checkSession();
  }, [navigate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDebugInfo([]);
    
    addDebugLog('📝 Formulário submetido');
    addDebugLog(`📧 Email: ${email}`);
    
    // Validação simples
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = senha.trim();
    
    addDebugLog(`🔍 Email após trim: ${trimmedEmail}`);
    addDebugLog(`🔍 Senha length: ${trimmedPassword.length}`);
    
    // Validações básicas
    if (!trimmedEmail || !trimmedPassword) {
      const errorMsg = 'Por favor, preencha todos os campos';
      addDebugLog(`❌ Validação falhou: ${errorMsg}`);
      setError(errorMsg);
      return;
    }
    
    if (!isValidEmail(trimmedEmail)) {
      const errorMsg = 'Email inválido';
      addDebugLog(`❌ Validação de email falhou: ${errorMsg}`);
      setError(errorMsg);
      return;
    }
    
    addDebugLog('✅ Validações básicas OK');
    
    // Verifica rate limiting ANTES de tentar login
    addDebugLog('🚦 Verificando rate limit...');
    const rateLimitResult = await checkRateLimit();
    if (!rateLimitResult.allowed) {
      const errorMsg = rateLimitResult.message || 'Muitas tentativas. Aguarde antes de tentar novamente.';
      addDebugLog(`🚫 Rate limit excedido: ${errorMsg}`);
      setError(errorMsg);
      return;
    }
    
    addDebugLog(`✅ Rate limit OK. Tentativas restantes: ${rateLimitResult.remaining}`);
    
    setIsLoading(true);
    addDebugLog('🔐 Iniciando processo de login...');
    
    try {
      // Verificar conexão com Supabase
      addDebugLog('🔌 Testando conexão com Supabase...');
      const { data: healthCheck, error: healthError } = await supabase.from('users').select('count').limit(1);
      
      if (healthError) {
        addDebugLog(`⚠️ Aviso de conexão: ${healthError.message}`);
      } else {
        addDebugLog('✅ Conexão com Supabase OK');
      }
      
      // Usar a função loginUser do supabase-auth-v2.ts
      addDebugLog('🔑 Chamando loginUser...');
      const result = await loginUser(trimmedEmail, trimmedPassword);
      
      addDebugLog(`📊 Resultado do login: ${JSON.stringify({
        success: result.success,
        hasUser: !!result.user,
        hasError: !!result.error,
        errorMessage: result.error
      })}`);

      if (result.success && result.user) {
        addDebugLog('✅ Login bem-sucedido!');
        addDebugLog(`👤 Usuário: ${result.user.email}`);
        addDebugLog(`🔑 ID: ${result.user.id}`);
        
        // Verificar sessão após login
        addDebugLog('🔍 Verificando sessão após login...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          addDebugLog(`❌ Erro ao verificar sessão: ${sessionError.message}`);
        } else if (session) {
          addDebugLog(`✅ Sessão criada com sucesso`);
          addDebugLog(`📝 Access Token: ${session.access_token.substring(0, 20)}...`);
          addDebugLog(`⏰ Expira em: ${new Date(session.expires_at! * 1000).toISOString()}`);
        } else {
          addDebugLog('⚠️ Sessão não encontrada após login bem-sucedido!');
        }
        
        // Pequeno delay para garantir que a sessão foi salva
        addDebugLog('⏳ Aguardando 500ms para garantir persistência da sessão...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar novamente antes de navegar
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        if (finalSession) {
          addDebugLog('✅ Sessão confirmada, navegando para dashboard...');
          navigate('/dashboard', { replace: true });
        } else {
          addDebugLog('❌ ERRO CRÍTICO: Sessão perdida antes da navegação!');
          setError('Erro ao manter sessão. Tente novamente ou use o modo normal do navegador.');
          setIsLoading(false);
        }
      } else {
        addDebugLog(`❌ Login falhou: ${result.error}`);
        
        // Tratamento de erros
        if (result.error?.includes('Invalid login credentials')) {
          setError('Usuário encontrado no sistema, mas a senha está incorreta ou o email não foi confirmado. Use a opção "Esqueceu a senha?" para resetar.');
        } else if (result.error?.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada.');
        } else {
          setError(result.error || 'Erro ao fazer login. Tente novamente.');
        }
        
        setIsLoading(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      addDebugLog(`❌ Erro crítico no login: ${errorMessage}`);
      console.error('❌ Stack trace:', err);
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
              
              {/* Debug Info - Mostrar apenas em desenvolvimento */}
              {debugInfo.length > 0 && import.meta.env.DEV && (
                <Alert>
                  <AlertDescription>
                    <details className="text-xs">
                      <summary className="cursor-pointer font-semibold mb-2">
                        🐛 Debug Logs ({debugInfo.length})
                      </summary>
                      <div className="max-h-40 overflow-y-auto space-y-1 font-mono">
                        {debugInfo.map((log, index) => (
                          <div key={index} className="text-[10px]">{log}</div>
                        ))}
                      </div>
                    </details>
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