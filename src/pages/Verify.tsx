import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ArrowLeft, Search, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSignedContentById, getSignedContentByVerificationCode } from '@/lib/supabase-crypto';
import type { SignedContent } from '@/lib/supabase-crypto';

export default function Verify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Função para codificar conteúdo para URL
  // 🆕 CORREÇÃO: Incluindo creatorSocialLinks para exibir perfis oficiais
  const encodeContentToUrl = (content: SignedContent): string => {
    console.log('🔍 [Verify] Codificando conteúdo para URL...');
    console.log('🔍 [Verify] creatorSocialLinks:', content.creatorSocialLinks);
    
    const compact = {
      i: content.id,
      c: content.content.substring(0, 200),
      h: content.contentHash.substring(0, 32),
      s: content.signature.substring(0, 32),
      p: content.publicKey.substring(0, 32),
      n: content.creatorName,
      v: content.verificationCode,
      pl: content.platforms,
      // 🆕 CORREÇÃO: Incluindo links sociais do criador
      sl: content.creatorSocialLinks || {},
      // 🆕 CORREÇÃO: Incluindo thumbnail se existir
      th: content.thumbnail ? content.thumbnail.substring(0, 500) : undefined,
    };
    
    console.log('✅ [Verify] Dados compactados incluem socialLinks:', !!compact.sl);
    
    const jsonStr = JSON.stringify(compact);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };
  
  useEffect(() => {
    // Verifica se há código na URL e redireciona automaticamente
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setVerificationCode(codeParam);
      handleVerifyByCode(codeParam);
    }
    
    // Mantém compatibilidade com ID antigo
    const idParam = searchParams.get('id');
    if (idParam && !codeParam) {
      handleVerifyById(idParam);
    }
  }, [searchParams]);
  
  const handleVerifyById = async (id: string) => {
    setIsVerifying(true);
    try {
      console.log('🔍 Buscando conteúdo por ID:', id);
      const signedContent = await getSignedContentById(id);
      
      if (!signedContent) {
        alert('Conteúdo não encontrado. Verifique o código e tente novamente.');
        return;
      }
      
      console.log('✅ Conteúdo encontrado:', signedContent.verificationCode);
      
      // Redireciona para a página do certificado
      const encodedData = encodeContentToUrl(signedContent);
      navigate(`/certificate?d=${encodedData}`);
    } catch (error) {
      console.error('❌ Erro ao verificar por ID:', error);
      alert('Erro ao buscar conteúdo. Tente novamente.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleVerifyByCode = async (code: string) => {
    setIsVerifying(true);
    try {
      console.log('🔍 Buscando conteúdo por código:', code);
      const signedContent = await getSignedContentByVerificationCode(code);
      
      if (!signedContent) {
        alert('Código de verificação não encontrado. Verifique se o código está correto e tente novamente.');
        return;
      }
      
      console.log('✅ Conteúdo encontrado:', signedContent.id);
      
      // Redireciona para a página do certificado
      const encodedData = encodeContentToUrl(signedContent);
      navigate(`/certificate?d=${encodedData}`);
    } catch (error) {
      console.error('❌ Erro ao verificar por código:', error);
      alert('Erro ao buscar conteúdo. Tente novamente.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleVerify = () => {
    const code = verificationCode.trim().toUpperCase();
    
    if (!code) {
      alert('Por favor, insira o código de verificação');
      return;
    }
    
    setIsVerifying(true);
    
    try {
      // Verifica se parece ser um UUID (ID antigo) ou código de verificação
      if (code.length === 36 && code.includes('-')) {
        // É um UUID, usa método antigo
        handleVerifyById(code);
      } else {
        // É um código de verificação
        handleVerifyByCode(code);
      }
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Converte para maiúsculas automaticamente
    const value = e.target.value.toUpperCase();
    setVerificationCode(value);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleVerify();
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
          <Button 
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          >
            Dashboard
          </Button>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Verificar Autenticidade</h1>
          <p className="text-muted-foreground">
            Insira o código de verificação para visualizar o certificado digital completo
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Verificação de Certificado
            </CardTitle>
            <CardDescription>
              Digite o código de verificação de 8 caracteres para acessar o certificado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Código de Verificação</Label>
              <Input
                id="verificationCode"
                placeholder="Ex: 2ST3XZTC"
                value={verificationCode}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="font-mono text-lg tracking-widest text-center uppercase"
                maxLength={8}
                disabled={isVerifying}
              />
              <p className="text-xs text-muted-foreground">
                O código de verificação de 8 caracteres pode ser encontrado no certificado digital
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">💡 Onde encontrar o código?</p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>No certificado digital baixado</li>
                <li>Na área destacada em roxo/azul do certificado</li>
                <li>Formato: 8 letras e números (ex: 2ST3XZTC)</li>
              </ul>
            </div>
            

            
            <Button 
              onClick={handleVerify} 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200" 
              size="lg"
              disabled={isVerifying || !verificationCode.trim()}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  Ver Certificado Completo
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}