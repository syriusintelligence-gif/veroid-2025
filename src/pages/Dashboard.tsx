import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, FileSignature, CheckCircle2, LogOut, User, Loader2, Key, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '@/lib/supabase-auth';
import type { User as UserType } from '@/lib/supabase-auth';
import { generateKeyPair, saveKeyPair, getKeyPair } from '@/lib/crypto';
import type { KeyPair } from '@/lib/supabase-crypto';
import { getSignedContentsByUserId } from '@/lib/supabase-crypto';
import type { SignedContent } from '@/lib/supabase-crypto';
import ContentCard from '@/components/ContentCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [signedContents, setSignedContents] = useState<SignedContent[]>([]);
  
  useEffect(() => {
    loadUserData();
  }, [navigate]);
  
  const loadUserData = async () => {
    try {
      console.log('🔄 Iniciando carregamento de dados do usuário...');
      setIsLoading(true);
      
      const user = await getCurrentUser();
      if (!user) {
        console.log('❌ Usuário não autenticado, redirecionando...');
        navigate('/login');
        return;
      }
      
      console.log('✅ Usuário autenticado:', user.email, 'ID:', user.id);
      console.log('👤 Status admin:', user.isAdmin);
      setCurrentUser(user);
      
      // 🆕 Tenta carregar chaves (localStorage ou Supabase)
      console.log('🔍 Tentando carregar chaves para userId:', user.id);
      const userKeyPair = await getKeyPair(user.id);
      console.log('🔑 Resultado da busca de chaves:', userKeyPair ? 'ENCONTRADAS' : 'NÃO ENCONTRADAS');
      
      setKeyPair(userKeyPair);
      
      console.log('✅ Dados do usuário carregados:', {
        email: user.email,
        hasKeys: !!userKeyPair,
        keySource: userKeyPair ? 'localStorage ou Supabase' : 'nenhuma',
      });
      
      // Carrega conteúdos assinados
      const contents = await getSignedContentsByUserId(user.id);
      setSignedContents(contents);
      console.log('📄 Conteúdos assinados carregados:', contents.length);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateKeys = async () => {
    if (!currentUser) return;
    
    console.log('🚀 === INICIANDO GERAÇÃO DE CHAVES ===');
    console.log('👤 Usuário atual:', { id: currentUser.id, email: currentUser.email });
    
    setIsGeneratingKeys(true);
    try {
      console.log('🔑 Chamando generateKeyPair com userId:', currentUser.id);
      const newKeyPair = await generateKeyPair(currentUser.id);
      console.log('✅ KeyPair gerado com sucesso:', { 
        publicKey: newKeyPair.publicKey.substring(0, 20) + '...',
        userId: newKeyPair.userId 
      });
      
      console.log('💾 Chamando saveKeyPair...');
      const saveResult = await saveKeyPair(newKeyPair);
      console.log('📊 Resultado do saveKeyPair:', saveResult);
      
      if (saveResult.success) {
        console.log('✅ Chaves salvas com sucesso! Atualizando estado...');
        setKeyPair(newKeyPair);
        
        // Verifica se as chaves foram realmente salvas
        console.log('🔍 Verificando se as chaves foram realmente salvas...');
        const verifyKeyPair = await getKeyPair(currentUser.id);
        if (verifyKeyPair) {
          console.log('✅✅✅ VERIFICAÇÃO CONFIRMADA! Chaves estão no localStorage!');
        } else {
          console.error('❌❌❌ ERRO! Chaves não foram encontradas após salvar!');
        }
        
        console.log('🎉 Processo de geração de chaves concluído com sucesso!');
      } else {
        console.error('❌ Falha ao salvar chaves:', saveResult.error);
        alert('Erro ao salvar chaves: ' + saveResult.error);
      }
    } catch (error) {
      console.error('❌ Erro ao gerar chaves:', error);
      alert('Erro ao gerar chaves. Tente novamente.');
    } finally {
      setIsGeneratingKeys(false);
      console.log('🏁 === FIM DO PROCESSO DE GERAÇÃO ===');
    }
  };
  
  const handleLogout = async () => {
    try {
      console.log('🚪 Fazendo logout...');
      console.log('⚠️ IMPORTANTE: As chaves estão salvas no Supabase e serão restauradas no próximo login!');
      await logout();
      navigate('/');
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            title="Ir para Home"
          >
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Vero iD
            </span>
          </button>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Olá, {currentUser?.nomePublico || currentUser?.nomeCompleto}! 👋
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas assinaturas digitais e proteja seu conteúdo
          </p>
        </div>
        
        {/* Key Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Status das Chaves Criptográficas
            </CardTitle>
            <CardDescription>
              Suas chaves são armazenadas localmente E no Supabase para backup automático
            </CardDescription>
          </CardHeader>
          <CardContent>
            {keyPair ? (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="space-y-2">
                    <p className="font-medium">✅ Chaves ativas e sincronizadas com o Supabase!</p>
                    <p className="text-sm">
                      Chave Pública: <code className="text-xs bg-white/50 px-2 py-1 rounded">{keyPair.publicKey.substring(0, 32)}...</code>
                    </p>
                    <p className="text-xs text-green-700">
                      💾 Backup automático ativo: localStorage + sessionStorage + IndexedDB + Supabase
                    </p>
                    <p className="text-xs text-green-700">
                      🔄 Suas chaves serão restauradas automaticamente no próximo login
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Você ainda não possui chaves criptográficas. Gere suas chaves para começar a assinar conteúdo digitalmente.
                    As chaves serão salvas no Supabase para backup automático.
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={handleGenerateKeys} 
                  disabled={isGeneratingKeys}
                  className="w-full"
                  size="lg"
                >
                  {isGeneratingKeys ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Gerando e salvando no Supabase...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-5 w-5" />
                      Gerar Chaves Criptográficas
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/sign')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-blue-600" />
                Assinar Conteúdo
              </CardTitle>
              <CardDescription>
                Adicione uma assinatura digital ao seu conteúdo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={!keyPair}>
                {keyPair ? 'Criar Nova Assinatura' : 'Gere suas chaves primeiro'}
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/verify')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Verificar Conteúdo
              </CardTitle>
              <CardDescription>
                Verifique a autenticidade de um conteúdo assinado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Verificar Assinatura
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Signed Contents */}
        <Card>
          <CardHeader>
            <CardTitle>Meus Conteúdos Assinados</CardTitle>
            <CardDescription>
              {signedContents.length} {signedContents.length === 1 ? 'conteúdo assinado' : 'conteúdos assinados'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signedContents.length === 0 ? (
              <div className="text-center py-12">
                <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Você ainda não assinou nenhum conteúdo
                </p>
                <Button onClick={() => navigate('/sign')} disabled={!keyPair}>
                  {keyPair ? 'Assinar Primeiro Conteúdo' : 'Gere suas chaves primeiro'}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {signedContents.map((content) => (
                  <ContentCard key={content.id} content={content} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}