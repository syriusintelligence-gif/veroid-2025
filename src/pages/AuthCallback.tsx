import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * Página de callback de autenticação
 * Captura tokens do Supabase e redireciona para a página apropriada
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [message, setMessage] = useState('Processando autenticação...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log('🔐 [AUTH CALLBACK] Iniciando processamento...');
      console.log('📍 URL completa:', window.location.href);
      console.log('📍 Hash:', window.location.hash);
      console.log('📍 Search:', window.location.search);

      try {
        // FORMATO 1: Hash params (#access_token=...&type=recovery)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');
        const hashError = hashParams.get('error');
        const hashErrorDescription = hashParams.get('error_description');

        console.log('🔑 [HASH] Access Token:', !!hashAccessToken);
        console.log('🔑 [HASH] Refresh Token:', !!hashRefreshToken);
        console.log('📋 [HASH] Type:', hashType);
        console.log('❌ [HASH] Error:', hashError);

        // FORMATO 2: Query params (?access_token=...&type=recovery)
        const queryParams = new URLSearchParams(window.location.search);
        const queryAccessToken = queryParams.get('access_token');
        const queryRefreshToken = queryParams.get('refresh_token');
        const queryType = queryParams.get('type');
        const queryError = queryParams.get('error');
        const queryErrorDescription = queryParams.get('error_description');

        console.log('🔑 [QUERY] Access Token:', !!queryAccessToken);
        console.log('🔑 [QUERY] Refresh Token:', !!queryRefreshToken);
        console.log('📋 [QUERY] Type:', queryType);
        console.log('❌ [QUERY] Error:', queryError);

        // Verifica se há erro
        const error = hashError || queryError;
        const errorDescription = hashErrorDescription || queryErrorDescription;

        if (error) {
          console.error('❌ Erro na autenticação:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || 'Erro ao processar autenticação');
          
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        // Determina qual formato usar
        const accessToken = hashAccessToken || queryAccessToken;
        const refreshToken = hashRefreshToken || queryRefreshToken;
        const type = hashType || queryType;

        console.log('🔑 Token encontrado:', !!accessToken);
        console.log('📋 Type:', type);

        if (!accessToken) {
          console.warn('⚠️ Nenhum token encontrado na URL');
          setStatus('error');
          setMessage('Link inválido ou expirado');
          
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        // Estabelece sessão com os tokens
        console.log('🔄 Estabelecendo sessão...');
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || accessToken,
        });

        if (sessionError) {
          console.error('❌ Erro ao estabelecer sessão:', sessionError);
          setStatus('error');
          setMessage('Erro ao processar autenticação. Link pode estar expirado.');
          
          setTimeout(() => {
            if (type === 'recovery') {
              navigate('/forgot-password');
            } else {
              navigate('/login');
            }
          }, 3000);
          return;
        }

        if (!data.session) {
          console.error('❌ Sessão não criada');
          setStatus('error');
          setMessage('Erro ao criar sessão');
          
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        console.log('✅ Sessão estabelecida com sucesso');
        console.log('👤 User ID:', data.session.user?.id);
        console.log('📧 Email:', data.session.user?.email);

        setStatus('success');

        // Redireciona baseado no tipo
        if (type === 'recovery') {
          console.log('🔄 Redirecionando para reset-password...');
          setMessage('Autenticação bem-sucedida! Redirecionando para redefinição de senha...');
          
          // Redireciona com o token no hash para a página de reset
          setTimeout(() => {
            navigate(`/reset-password#access_token=${accessToken}&type=recovery`);
          }, 1000);
        } else if (type === 'signup') {
          console.log('🔄 Redirecionando para dashboard...');
          setMessage('Email confirmado! Redirecionando para o dashboard...');
          
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);
        } else {
          console.log('🔄 Redirecionando para dashboard (tipo desconhecido)...');
          setMessage('Autenticação bem-sucedida! Redirecionando...');
          
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);
        }
      } catch (err) {
        console.error('❌ Erro ao processar callback:', err);
        setStatus('error');
        setMessage('Erro ao processar autenticação');
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-10 w-10 text-blue-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Vero iD
            </h1>
          </div>
          <p className="text-muted-foreground">Processando Autenticação</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              {status === 'loading' && (
                <>
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Processando...</h2>
                    <p className="text-muted-foreground text-sm">{message}</p>
                  </div>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Shield className="h-10 w-10 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-green-600 mb-2">Sucesso!</h2>
                    <p className="text-muted-foreground text-sm">{message}</p>
                  </div>
                </>
              )}

              {status === 'error' && (
                <>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                  <p className="text-sm text-muted-foreground">
                    Você será redirecionado em instantes...
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 text-center">
            <strong>💡 Aguarde:</strong> Estamos processando sua autenticação de forma segura.
          </p>
        </div>
      </div>
    </div>
  );
}