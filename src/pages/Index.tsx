import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, QrCode, CheckCircle, Zap, Globe, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isCurrentUserAdmin } from '@/lib/auth';
import { useEffect, useState } from 'react';

export default function Index() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const user = getCurrentUser();
    if (user && isCurrentUserAdmin()) {
      setIsAdmin(true);
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">
              Vero iD
            </span>
          </div>
          <nav className="flex gap-3">
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Admin Dashboard
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/login')}>
              Entrar
            </Button>
            <Button onClick={() => navigate('/cadastro')} className="bg-blue-600 hover:bg-blue-700">
              Cadastro
            </Button>
          </nav>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-200">
            <Shield className="h-4 w-4" />
            Criptografia de Ponta para Validação de Conteúdo
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-gray-900">
            O Fim da Desinformação<br />
            <span className="text-blue-600">Começa com a Sua Assinatura.</span>
          </h1>
          
          <div className="space-y-6 max-w-3xl mx-auto">
            <p className="text-xl md:text-2xl text-gray-700 leading-relaxed">
              Proteja sua reputação contra <strong>Deepfakes</strong> e <strong>Fake News</strong>. Nosso sistema de assinatura digital utiliza criptografia avançada para garantir que seu conteúdo seja <strong>matemático e incontestavelmente seu</strong>.
            </p>
            
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed border-l-4 border-blue-600 pl-6 py-2">
              A única plataforma que utiliza <strong>criptografia de ponta</strong> para validar a origem do seu conteúdo e neutralizar manipulações por IA.
            </p>
          </div>
          
          <div className="flex gap-4 justify-center flex-wrap pt-4">
            <Button size="lg" onClick={() => navigate('/cadastro')} className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all">
              Começar Agora
              <Shield className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/verify')} className="text-lg px-8 py-6 border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600 transition-all">
              Verificar Autenticidade
              <CheckCircle className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Como Funciona */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Como Funciona</h2>
            <p className="text-xl text-gray-600">Processo simples e seguro em 3 passos</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="text-center hover:shadow-xl transition-all border-2 hover:border-blue-200 bg-white">
              <CardHeader>
                <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <Lock className="h-10 w-10 text-blue-600" />
                </div>
                <CardTitle className="text-2xl mb-3">1. Gere suas Chaves</CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Crie um par de chaves criptográficas único (pública e privada) com tecnologia RSA
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="text-center hover:shadow-xl transition-all border-2 hover:border-purple-200 bg-white">
              <CardHeader>
                <div className="mx-auto w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                  <Shield className="h-10 w-10 text-purple-600" />
                </div>
                <CardTitle className="text-2xl mb-3">2. Assine o Conteúdo</CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Adicione uma assinatura digital criptografada e matematicamente verificável ao seu conteúdo
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="text-center hover:shadow-xl transition-all border-2 hover:border-green-200 bg-white">
              <CardHeader>
                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <QrCode className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl mb-3">3. Compartilhe</CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Compartilhe seu conteúdo com suas assinaturas e qualquer pessoa pode verificar a autenticidade instantaneamente
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Benefícios */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Por Que Escolher o Vero iD</h2>
            <p className="text-xl text-gray-600">Proteja sua reputação e combata a desinformação com tecnologia comprovada</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="hover:shadow-lg transition-all bg-white border-2">
              <CardHeader>
                <CheckCircle className="h-12 w-12 text-green-600 mb-3" />
                <CardTitle className="text-xl">Credibilidade Aumentada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Seu público saberá que o conteúdo é autêntico e não foi manipulado por IA ou terceiros
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all bg-white border-2">
              <CardHeader>
                <Shield className="h-12 w-12 text-blue-600 mb-3" />
                <CardTitle className="text-xl">Combate à Desinformação</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Ajude a criar um ambiente digital mais seguro, transparente e confiável
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all bg-white border-2">
              <CardHeader>
                <Zap className="h-12 w-12 text-yellow-600 mb-3" />
                <CardTitle className="text-xl">Verificação Instantânea</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Qualquer pessoa pode verificar a autenticidade do conteúdo em segundos
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all bg-white border-2">
              <CardHeader>
                <Lock className="h-12 w-12 text-purple-600 mb-3" />
                <CardTitle className="text-xl">Criptografia Avançada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Tecnologia de ponta baseada em algoritmos SHA-256 e RSA de nível militar
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all bg-white border-2">
              <CardHeader>
                <Globe className="h-12 w-12 text-indigo-600 mb-3" />
                <CardTitle className="text-xl">Parcerias Comerciais</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Marcas confiarão mais em criadores de conteúdo com autenticidade garantida
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all bg-white border-2">
              <CardHeader>
                <QrCode className="h-12 w-12 text-pink-600 mb-3" />
                <CardTitle className="text-xl">Fácil de Usar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Interface intuitiva com QR Code para verificação simplificada e rápida
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* CTA Final */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Pronto para Proteger seu Conteúdo?
            </h2>
            <p className="text-xl text-blue-100">
              Junte-se aos criadores de conteúdo que já estão combatendo deepfakes e fake news com tecnologia de ponta
            </p>
            <Button size="lg" onClick={() => navigate('/cadastro')} className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all">
              Começar Agora
              <Shield className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p className="font-semibold">© {new Date().getFullYear()} Vero iD - Sistema de Autenticação Digital</p>
          <p className="text-sm mt-2">Combatendo desinformação através de criptografia avançada</p>
        </div>
      </footer>
    </div>
  );
}