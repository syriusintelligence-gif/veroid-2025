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
        console.log('🌐 URL completa:', window.location.href);
        console.log('📊 Search params:', Object.fromEntries(searchParams.entries()));
        console.log('📊 Hash:', window.location.hash);
        
        // Verifica se é um callback de recuperação de senha via query params
        const type = searchParams.get('type');
        const token = searchParams.get('token');
        
        console.log('📋 Type:', type);
        console.log('🔑 Token (primeiros 20 chars):', token?.substring(0, 20));
        
        if (type === 'recovery' && token) {
          console.log('🔑 Processando token de recuperação de senha...');
          
          // Verifica se é um token PKCE (começa com pkce_)
          if (token.startsWith('pkce_')) {
            console.log('🔐 Token PKCE detectado, usando exchangeCodeForSession...');
            
            // Para tokens PKCE, precisamos usar o método de troca de código
            // O Supabase já deve ter processado isso automaticamente via URL
            // Vamos apenas verificar se há uma sessão ativa
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
              console.error('❌ Erro ao obter sessão:', sessionError);
              
              // Tenta processar o token diretamente via hash fragment
              const hashParams = new URLSearchParams(window.location.hash.substring(1));
              const accessToken = hashParams.get('access_token');
              const refreshToken = hashParams.get('refresh_token');
              
              if (accessToken && refreshToken) {
                console.log('🔄 Tentando estabelecer sessão via tokens do hash...');
                
                const { error: setSessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                
                if (setSessionError) {
                  console.error('❌ Erro ao estabelecer sessão:', setSessionError);
                  setStatus('error');
                  setMessage('Link de recuperação inválido ou expirado. Solicite um novo link.');
                  
                  setTimeout(() => {
                    navigate('/forgot-password');
                  }, 3000);
                  return;
                }
                
                console.log('✅ Sessão estabelecida via hash tokens');
              } else {
                setStatus('error');
                setMessage('Link de recuperação inválido ou expirado. Solicite um novo link.');
                
                setTimeout(() => {
                  navigate('/forgot-password');
                }, 3000);
                return;
              }
            } else {
              console.log('✅ Sessão ativa encontrada:', session.user.email);
            }
            
            setStatus('success');
            setMessage('Autenticado! Redirecionando para redefinir senha...');
            
            setTimeout(() => {
              navigate('/reset-password');
            }, 1500);
            
          } else {
            // Token OTP normal (não PKCE)
            console.log('🔐 Token OTP detectado, usando verifyOtp...');
            
            const email = searchParams.get('email');
            
            if (!email) {
              console.error('❌ Email não fornecido');
              setStatus('error');
              setMessage('Link inválido. Email não encontrado.');
              
              setTimeout(() => {
                navigate('/forgot-password');
              }, 3000);
              return;
            }
            
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'recovery',
              email: email,
            });
            
            if (error) {
              console.error('❌ Erro ao verificar token OTP:', error);
              setStatus('error');
              setMessage('Link de recuperação inválido ou expirado. Solicite um novo link.');
              
              setTimeout(() => {
                navigate('/forgot-password');
              }, 3000);
              return;
            }
            
            console.log('✅ Token OTP verificado com sucesso:', data);
            setStatus('success');
            setMessage('Token verificado! Redirecionando para redefinir senha...');
            
            setTimeout(() => {
              navigate('/reset-password');
            }, 1500);
          }
        } else {
          // Tenta processar hash fragment (fallback para fluxo antigo)
          console.log('🔄 Tentando processar hash fragment...');
          
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const errorParam = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');
          
          console.log('📊 Hash params:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            error: errorParam,
            errorDescription,
          });
          
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