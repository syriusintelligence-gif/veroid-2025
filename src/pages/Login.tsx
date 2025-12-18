import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, Loader2, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

// LOG CRÍTICO - DEVE APARECER SEMPRE
console.log('🔥 LOGIN PAGE LOADED - JavaScript is working!');
console.log('🔥 Timestamp:', new Date().toISOString());

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  console.log('🔥 Login component rendering...');
  
  // Verifica sessão ao carregar
  useEffect(() => {
    console.log('🔥 useEffect - Checking session...');
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔥 Session check result:', { hasSession: !!session, error: error?.message });
        
        if (session) {
          console.log('🔥 Active session found, redirecting to dashboard...');
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('🔥 Error checking session:', err);
      }
    };
    
    checkSession();
  }, [navigate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    console.log('🔥 Form submitted');
    console.log('🔥 Email:', email);
    console.log('🔥 Password length:', senha.length);
    
    // Validação básica
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = senha.trim();
    
    if (!trimmedEmail || !trimmedPassword) {
      console.log('🔥 Validation failed: empty fields');
      setError('Por favor, preencha todos os campos');
      return;
    }
    
    // Validação de email simples
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      console.log('🔥 Validation failed: invalid email');
      setError('Email inválido');
      return;
    }
    
    setIsLoading(true);
    console.log('🔥 Starting login process...');
    
    try {
      // Tenta fazer login
      console.log('🔥 Calling supabase.auth.signInWithPassword...');
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      
      console.log('🔥 Login result:', {
        success: !authError,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: authError?.message
      });
      
      if (authError) {
        console.error('🔥 Login error:', authError);
        
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada.');
        } else {
          setError(authError.message);
        }
        
        setIsLoading(false);
        return;
      }
      
      if (!data.user || !data.session) {
        console.error('🔥 No user or session returned');
        setError('Erro ao fazer login. Tente novamente.');
        setIsLoading(false);
        return;
      }
      
      console.log('🔥 Login successful!');
      console.log('🔥 User ID:', data.user.id);
      console.log('🔥 User email:', data.user.email);
      
      // Aguarda um pouco para garantir que a sessão foi salva
      console.log('🔥 Waiting 1 second before navigation...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verifica se a sessão ainda existe
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('🔥 Session before navigation:', !!currentSession);
      
      if (!currentSession) {
        console.error('🔥 CRITICAL: Session lost after login!');
        setError('Erro: sessão não foi mantida. Tente usar o modo normal do navegador.');
        setIsLoading(false);
        return;
      }
      
      console.log('🔥 Navigating to dashboard...');
      navigate('/dashboard', { replace: true });
      
    } catch (err) {
      console.error('🔥 Critical error:', err);
      setError('Erro ao conectar com o servidor. Tente novamente.');
      setIsLoading(false);
    }
  };
  
  console.log('🔥 Rendering login form...');
  
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
              {error && (
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
                <div className="relative">
                  <Input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
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
                disabled={isLoading}
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