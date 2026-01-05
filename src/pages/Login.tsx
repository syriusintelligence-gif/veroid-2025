import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Shield, Eye, EyeOff } from "lucide-react";
import { loginUser } from "@/lib/supabase-auth-v2";
import { RateLimiter, RateLimitPresets, formatTimeRemaining } from "@/lib/rate-limiter";
import { sanitizeEmail, sanitizeInput, limitLength } from "@/lib/input-sanitizer";
import { has2FAEnabled } from "@/lib/supabase-2fa";
import Verify2FAInput from "@/components/Verify2FAInput";

// 🆕 VERSÃO DO CÓDIGO - Para debug de cache
const CODE_VERSION = "2FA-FIX-v3.0-2026-01-05-13:35";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // 🆕 2FA State
  const [needs2FA, setNeeds2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  
  // Rate limiting state
  const [rateLimitBlocked, setRateLimitBlocked] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState("");
  const [rateLimitRemaining, setRateLimitRemaining] = useState(5);
  const [rateLimitResetAt, setRateLimitResetAt] = useState<Date | null>(null);

  // Initialize rate limiter
  const rateLimiter = new RateLimiter('login', RateLimitPresets.LOGIN);

  // 🆕 LOG IMEDIATO QUANDO O COMPONENTE MONTA
  useEffect(() => {
    console.log('%c🚀 LOGIN PAGE LOADED', 'background: #4CAF50; color: white; font-size: 20px; padding: 10px;');
    console.log('%c📦 CODE VERSION: ' + CODE_VERSION, 'background: #2196F3; color: white; font-size: 16px; padding: 5px;');
    console.log('%c⏰ TIMESTAMP: ' + new Date().toISOString(), 'background: #FF9800; color: white; font-size: 14px; padding: 5px;');
    console.log('🔍 Se você está vendo esta mensagem, o código NOVO foi carregado!');
    console.log('🔍 Se NÃO vê esta mensagem, o Vercel está servindo código antigo em cache.');
  }, []);

  // Check rate limit status on mount
  useEffect(() => {
    checkRateLimitStatus();
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (rateLimitBlocked && rateLimitResetAt) {
      // Atualiza imediatamente
      updateCountdown();
      
      // Continua atualizando a cada segundo
      const interval = setInterval(() => {
        updateCountdown();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [rateLimitBlocked, rateLimitResetAt]);

  function updateCountdown() {
    if (!rateLimitResetAt) return;
    
    const now = new Date();
    if (rateLimitResetAt <= now) {
      setRateLimitBlocked(false);
      setRateLimitMessage("");
      checkRateLimitStatus();
    } else {
      const timeRemaining = formatTimeRemaining(rateLimitResetAt);
      setRateLimitMessage(`Muitas tentativas. Tente novamente em ${timeRemaining}`);
    }
  }

  async function checkRateLimitStatus() {
    try {
      console.log('🔍 [Login] Verificando status do rate limit...');
      const status = rateLimiter.getStatus();
      
      setRateLimitBlocked(!status.allowed);
      setRateLimitRemaining(status.remaining);
      
      if (!status.allowed && status.blockedUntil) {
        setRateLimitResetAt(status.blockedUntil);
        const timeRemaining = formatTimeRemaining(status.blockedUntil);
        setRateLimitMessage(`Muitas tentativas. Tente novamente em ${timeRemaining}`);
      } else if (status.remaining < 3 && status.remaining > 0) {
        setRateLimitMessage(`⚠️ Atenção: ${status.remaining} tentativas restantes`);
      } else {
        setRateLimitMessage("");
      }
      
      console.log('✅ [Login] Status do rate limit:', status);
    } catch (error) {
      console.error('❌ [Login] Erro ao verificar rate limit:', error);
      setRateLimitBlocked(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    console.log('%c🔐 INICIANDO LOGIN', 'background: #9C27B0; color: white; font-size: 18px; padding: 8px;');
    console.log('📧 Email digitado:', email);

    // Sanitização de inputs
    const sanitizedEmail = sanitizeEmail(limitLength(email, 100));
    const sanitizedPassword = limitLength(sanitizeInput(password), 100);

    console.log('🧹 [Login] Email sanitizado:', sanitizedEmail);

    // Validação básica
    if (!sanitizedEmail || !sanitizedPassword) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    // Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      setError("Por favor, insira um email válido");
      return;
    }

    // Verificar se JÁ está bloqueado (verificação inicial)
    const initialStatus = rateLimiter.getStatus();
    if (!initialStatus.allowed && initialStatus.blockedUntil) {
      console.warn('🚫 [Login] Usuário já está bloqueado');
      setRateLimitBlocked(true);
      setRateLimitResetAt(initialStatus.blockedUntil);
      const timeRemaining = formatTimeRemaining(initialStatus.blockedUntil);
      setRateLimitMessage(`Muitas tentativas. Tente novamente em ${timeRemaining}`);
      setError(`Muitas tentativas de login. Tente novamente em ${timeRemaining}`);
      return;
    }

    // Prosseguir com login
    setLoading(true);

    // 🆕 Flag para controlar se deve executar o finally
    let shouldRunFinally = true;

    try {
      console.log('%c🔄 CHAMANDO loginUser()', 'background: #00BCD4; color: white; font-size: 16px; padding: 5px;');
      
      const result = await loginUser(sanitizedEmail, sanitizedPassword);
      
      console.log('%c📦 RESULTADO DO LOGIN', 'background: #673AB7; color: white; font-size: 16px; padding: 5px;');
      console.log('✅ Success:', result.success);
      console.log('👤 User ID:', result.user?.id);
      console.log('📧 User Email:', result.user?.email);

      if (result.success && result.user) {
        console.log('%c✅ LOGIN BEM-SUCEDIDO!', 'background: #4CAF50; color: white; font-size: 18px; padding: 8px;');
        
        // 🆕 Verifica se usuário tem 2FA ativado
        console.log('%c🔐 VERIFICANDO 2FA...', 'background: #FF5722; color: white; font-size: 18px; padding: 8px;');
        console.log('🔍 Chamando has2FAEnabled para user ID:', result.user.id);
        
        const has2FA = await has2FAEnabled(result.user.id);
        
        console.log('%c📊 RESULTADO 2FA:', 'background: #E91E63; color: white; font-size: 16px; padding: 5px;');
        console.log('🔒 has2FA =', has2FA);
        console.log('🔒 Tipo:', typeof has2FA);
        console.log('🔒 É true?', has2FA === true);

        if (has2FA === true) {
          // 🔒 Usuário tem 2FA - mostrar tela de verificação
          console.log('%c🔒 2FA ATIVADO - MOSTRANDO TELA DE VERIFICAÇÃO', 'background: #F44336; color: white; font-size: 20px; padding: 10px;');
          
          // 🆕 DESABILITA o finally block
          shouldRunFinally = false;
          
          // Define os estados para mostrar a tela de 2FA
          console.log('📝 Configurando estados...');
          console.log('  → setPendingUserId:', result.user.id);
          setPendingUserId(result.user.id);
          
          console.log('  → setSuccess: "Senha correta! Agora digite o código 2FA."');
          setSuccess("Senha correta! Agora digite o código 2FA.");
          
          console.log('  → setLoading: false');
          setLoading(false);
          
          console.log('  → setNeeds2FA: true');
          setNeeds2FA(true);
          
          console.log('%c✅ ESTADOS CONFIGURADOS - RETORNANDO SEM EXECUTAR FINALLY', 'background: #8BC34A; color: black; font-size: 16px; padding: 5px;');
          console.log('🛑 Executando RETURN para parar aqui');
          
          // ⚠️ IMPORTANTE: Retorna aqui para não executar o resto do código
          return;
        } else {
          // ✅ Usuário NÃO tem 2FA - login completo
          console.log('%c✅ 2FA NÃO ATIVADO - LOGIN COMPLETO', 'background: #4CAF50; color: white; font-size: 18px; padding: 8px;');
          setSuccess("Login realizado com sucesso! Redirecionando...");
          
          // Reseta rate limit após login bem-sucedido
          rateLimiter.reset();
          setRateLimitRemaining(5);
          setRateLimitMessage("");
          console.log('🔄 [Login] Rate limit resetado após sucesso');

          // Aguarda 1 segundo antes de redirecionar
          setTimeout(() => {
            console.log('🔀 [Login] Redirecionando para /dashboard...');
            window.location.href = '/dashboard';
          }, 1000);
        }
      } else {
        // LOGIN FALHOU - Registra tentativa no rate limiter
        console.error('%c❌ LOGIN FALHOU', 'background: #F44336; color: white; font-size: 18px; padding: 8px;');
        console.error('Erro:', result.error);
        
        // Registra a tentativa falhada no rate limiter
        console.log('📝 [Login] Registrando tentativa falhada no rate limiter...');
        const rateLimitResult = await rateLimiter.check();
        
        console.log('📊 [Login] Resultado do rate limit após falha:', rateLimitResult);
        
        // Atualiza estado visual
        setRateLimitRemaining(rateLimitResult.remaining);
        
        // Verifica se agora está bloqueado
        if (!rateLimitResult.allowed && rateLimitResult.blockedUntil) {
          console.warn('🚫 [Login] Usuário bloqueado após esta tentativa!');
          setRateLimitBlocked(true);
          setRateLimitResetAt(rateLimitResult.blockedUntil);
          
          // Força atualização imediata do timer
          setTimeout(() => updateCountdown(), 0);
          
          const timeRemaining = formatTimeRemaining(rateLimitResult.blockedUntil);
          setRateLimitMessage(`Muitas tentativas. Tente novamente em ${timeRemaining}`);
          setError(`Muitas tentativas de login. Tente novamente em ${timeRemaining}`);
        } else {
          // Ainda tem tentativas
          setError(result.error || "Email ou senha incorretos");
          if (rateLimitResult.remaining < 3) {
            setRateLimitMessage(`⚠️ ${rateLimitResult.remaining} tentativas restantes`);
          }
        }
      }
    } catch (err) {
      console.error('%c❌ ERRO DURANTE LOGIN', 'background: #F44336; color: white; font-size: 18px; padding: 8px;');
      console.error('Erro completo:', err);
      const errorMessage = err instanceof Error ? err.message : "Erro ao fazer login. Tente novamente.";
      setError(errorMessage);
      
      // Registra tentativa falhada mesmo em caso de erro
      try {
        const rateLimitResult = await rateLimiter.check();
        setRateLimitRemaining(rateLimitResult.remaining);
        
        if (!rateLimitResult.allowed && rateLimitResult.blockedUntil) {
          setRateLimitBlocked(true);
          setRateLimitResetAt(rateLimitResult.blockedUntil);
          setTimeout(() => updateCountdown(), 0);
        }
      } catch (rateLimitError) {
        console.error('❌ [Login] Erro ao registrar no rate limiter:', rateLimitError);
      }
    } finally {
      // 🆕 Só executa o finally se não for caso de 2FA
      if (shouldRunFinally) {
        setLoading(false);
        console.log('%c🏁 PROCESSO DE LOGIN FINALIZADO', 'background: #607D8B; color: white; font-size: 16px; padding: 5px;');
      } else {
        console.log('%c⏭️ FINALLY IGNORADO - AGUARDANDO 2FA', 'background: #FFC107; color: black; font-size: 16px; padding: 5px;');
      }
    }
  }

  // 🆕 Handler para sucesso do 2FA
  function handle2FASuccess() {
    console.log('✅ [Login] 2FA verificado com sucesso!');
    setSuccess("2FA verificado! Redirecionando...");
    
    // Reseta rate limit
    rateLimiter.reset();
    setRateLimitRemaining(5);
    setRateLimitMessage("");
    
    // Redireciona
    setTimeout(() => {
      console.log('🔀 [Login] Redirecionando para /dashboard...');
      window.location.href = '/dashboard';
    }, 1000);
  }

  // 🆕 Handler para cancelar 2FA
  function handle2FACancel() {
    console.log('❌ [Login] Verificação 2FA cancelada');
    setNeeds2FA(false);
    setPendingUserId(null);
    setSuccess("");
    setError("Login cancelado. Faça login novamente.");
  }

  // 🆕 Se precisa de 2FA, mostra tela de verificação
  if (needs2FA && pendingUserId) {
    console.log('%c🔒 RENDERIZANDO TELA DE 2FA', 'background: #9C27B0; color: white; font-size: 18px; padding: 8px;');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Verificação em Duas Etapas</CardTitle>
            <CardDescription className="text-center">
              Digite o código de 6 dígitos do seu aplicativo autenticador
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success && (
              <Alert className="border-green-500 bg-green-50 mb-4">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
            <Verify2FAInput
              userId={pendingUserId}
              onSuccess={handle2FASuccess}
              onCancel={handle2FACancel}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de login normal
  console.log('🖥️ Renderizando tela de login normal');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Bem-vindo de volta</CardTitle>
          <CardDescription className="text-center">
            Entre com suas credenciais para acessar sua conta
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Rate Limit Warning */}
            {rateLimitMessage && !rateLimitBlocked && (
              <Alert className="border-yellow-500 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  {rateLimitMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Rate Limit Blocked */}
            {rateLimitBlocked && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {rateLimitMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Error Alert */}
            {error && !rateLimitBlocked && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
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
                disabled={loading || rateLimitBlocked}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || rateLimitBlocked}
                  required
                  maxLength={100}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  disabled={loading || rateLimitBlocked}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || rateLimitBlocked}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : rateLimitBlocked ? (
                "Bloqueado temporariamente"
              ) : (
                "Entrar"
              )}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Não tem uma conta?{" "}
              <Link to="/cadastro" className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
                Cadastre-se
              </Link>
            </div>

            <div className="text-center text-sm text-gray-600">
              <Link to="/" className="text-blue-600 hover:text-blue-800 hover:underline">
                ← Voltar para página inicial
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}