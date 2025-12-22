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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Rate limiting state
  const [rateLimitBlocked, setRateLimitBlocked] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState("");
  const [rateLimitRemaining, setRateLimitRemaining] = useState(5);
  const [rateLimitResetAt, setRateLimitResetAt] = useState<Date | null>(null);

  // Initialize rate limiter
  const rateLimiter = new RateLimiter('login', RateLimitPresets.LOGIN);

  // Check rate limit status on mount
  useEffect(() => {
    checkRateLimitStatus();
  }, []);

  // Update countdown timer - FIX: Atualiza imediatamente quando bloqueado
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
      } else if (status.remaining < 3) {
        setRateLimitMessage(`⚠️ Atenção: ${status.remaining} tentativas restantes`);
      }
      
      console.log('✅ [Login] Status do rate limit:', status);
    } catch (error) {
      console.error('❌ [Login] Erro ao verificar rate limit:', error);
      // Fail-open: permite login se verificação falhar
      setRateLimitBlocked(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    console.log('🔐 [Login] Iniciando processo de login...');

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

    // Verificar rate limit ANTES de tentar login
    try {
      console.log('🔍 [Login] Verificando rate limit antes do login...');
      const rateLimitResult = await rateLimiter.check();
      
      console.log('📊 [Login] Resultado do rate limit:', rateLimitResult);
      
      if (!rateLimitResult.allowed) {
        console.warn('🚫 [Login] Rate limit excedido!');
        setRateLimitBlocked(true);
        setRateLimitRemaining(0);
        
        if (rateLimitResult.blockedUntil) {
          setRateLimitResetAt(rateLimitResult.blockedUntil);
          const timeRemaining = formatTimeRemaining(rateLimitResult.blockedUntil);
          setError(`Muitas tentativas de login. Tente novamente em ${timeRemaining}`);
        } else {
          setError(rateLimitResult.message || "Muitas tentativas. Aguarde antes de tentar novamente.");
        }
        return;
      }
      
      // Atualiza UI com tentativas restantes
      setRateLimitRemaining(rateLimitResult.remaining);
      if (rateLimitResult.remaining < 3) {
        setRateLimitMessage(`⚠️ ${rateLimitResult.remaining} tentativas restantes`);
      }
      
      console.log(`✅ [Login] Rate limit OK - ${rateLimitResult.remaining} tentativas restantes`);
    } catch (rateLimitError) {
      console.error('❌ [Login] Erro ao verificar rate limit:', rateLimitError);
      // Fail-open: continua com login mesmo se rate limit falhar
      console.warn('⚠️ [Login] Continuando com login (fail-open)');
    }

    // Prosseguir com login
    setLoading(true);

    try {
      console.log('🔄 [Login] Chamando função de login...');
      
      const result = await loginUser(sanitizedEmail, sanitizedPassword);
      
      console.log('📦 [Login] Resultado do login:', {
        success: result.success,
        hasUser: !!result.user,
        userId: result.user?.id,
      });

      if (result.success && result.user) {
        console.log('✅ [Login] Login bem-sucedido!');
        console.log('👤 [Login] Usuário:', {
          id: result.user.id,
          email: result.user.email,
          nomeCompleto: result.user.nomeCompleto,
        });

        setSuccess("Login realizado com sucesso! Redirecionando...");
        
        // Reseta rate limit após login bem-sucedido
        rateLimiter.reset();
        console.log('🔄 [Login] Rate limit resetado após sucesso');

        // Aguarda 1 segundo antes de redirecionar
        setTimeout(() => {
          console.log('🔀 [Login] Redirecionando para /dashboard...');
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        console.error('❌ [Login] Login falhou:', result.error);
        setError(result.error || "Email ou senha incorretos");
        
        // Atualiza status do rate limit após falha
        await checkRateLimitStatus();
      }
    } catch (err) {
      console.error('❌ [Login] Erro durante login:', err);
      const errorMessage = err instanceof Error ? err.message : "Erro ao fazer login. Tente novamente.";
      setError(errorMessage);
      
      // Atualiza status do rate limit após erro
      await checkRateLimitStatus();
    } finally {
      setLoading(false);
      console.log('🏁 [Login] Processo de login finalizado');
    }
  }

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