import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔐 [AUTH CALLBACK] Processando callback de autenticação...');
        
        // Verifica se é um callback de recuperação de senha
        const type = searchParams.get('type');
        const token = searchParams.get('token');
        const email = searchParams.get('email');
        
        console.log('📊 Parâmetros recebidos:', { type, hasToken: !!token, email });
        
        if (type === 'recovery' && token && email) {
          console.log('🔑 Processando token de recuperação de senha...');
          
          // Verifica o OTP token
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery',
            email: email,
          });
          
          if (error) {
            console.error('❌ Erro ao verificar token:', error);
            setStatus('error');
            setMessage('Link de recuperação inválido ou expirado. Solicite um novo link.');
            
            // Redireciona para forgot-password após 3 segundos
            setTimeout(() => {
              navigate('/forgot-password');
            }, 3000);
            return;
          }
          
          console.log('✅ Token verificado com sucesso:', data);
          setStatus('success');
          setMessage('Token verificado! Redirecionando para redefinir senha...');
          
          // Redireciona para a página de reset de senha
          setTimeout(() => {
            navigate('/reset-password');
          }, 1500);
        } else {
          // Tenta processar hash fragment (fallback para fluxo antigo)
          console.log('🔄 Tentando processar hash fragment...');
          
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const errorParam = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');
          
          if (errorParam) {
            console.error('❌ Erro no hash:', errorDescription);
            setStatus('error');
            setMessage(errorDescription || 'Link inválido ou expirado');
            
            setTimeout(() => {
              navigate('/forgot-password');
            }, 3000);
            return;
          }
          
          if (accessToken && refreshToken) {
            console.log('✅ Tokens encontrados no hash, estabelecendo sessão...');
            
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (sessionError) {
              console.error('❌ Erro ao estabelecer sessão:', sessionError);
              setStatus('error');
              setMessage('Erro ao processar link. Solicite um novo.');
              
              setTimeout(() => {
                navigate('/forgot-password');
              }, 3000);
              return;
            }
            
            console.log('✅ Sessão estabelecida, redirecionando...');
            setStatus('success');
            setMessage('Autenticado! Redirecionando...');
            
            setTimeout(() => {
              navigate('/reset-password');
            }, 1500);
          } else {
            console.warn('⚠️ Nenhum token encontrado');
            setStatus('error');
            setMessage('Link inválido. Solicite um novo link de recuperação.');
            
            setTimeout(() => {
              navigate('/forgot-password');
            }, 3000);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao processar callback:', error);
        setStatus('error');
        setMessage('Erro ao processar link. Tente novamente.');
        
        setTimeout(() => {
          navigate('/forgot-password');
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Processando...
                  </h2>
                  <p className="text-gray-600">{message}</p>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Sucesso!
                  </h2>
                  <p className="text-gray-600">{message}</p>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <p className="text-sm text-gray-500">
                  Você será redirecionado em alguns segundos...
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}