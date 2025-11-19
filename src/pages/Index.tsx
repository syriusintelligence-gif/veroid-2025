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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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
            <Button onClick={() => navigate('/cadastro')}>
              Cadastro
            </Button>
          </nav>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            <Shield className="h-4 w-4" />
            Autenticidade Digital Garantida
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Combata <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Deepfakes</span> e{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Fake News</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sistema de assinatura digital que garante a autenticidade do seu conteúdo através de criptografia avançada e verificação via QR Code.
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => navigate('/cadastro')} className="text-lg px-8">
              Começar Agora
              <Shield className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/verify')} className="text-lg px-8">
              Verificar Autenticidade
              <CheckCircle className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Como Funciona */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Como Funciona</h2>
          <p className="text-xl text-muted-foreground">Processo simples em 3 passos</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>1. Gere suas Chaves</CardTitle>
              <CardDescription>
                Crie um par de chaves criptográficas único (pública e privada)
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle>2. Assine o Conteúdo</CardTitle>
              <CardDescription>
                Adicione uma assinatura digital criptografada ao seu conteúdo
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <QrCode className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>3. Compartilhe com QR Code</CardTitle>
              <CardDescription>
                Qualquer pessoa pode verificar a autenticidade escaneando o QR Code
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
      
      {/* Benefícios */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Benefícios do Vero iD</h2>
            <p className="text-xl text-muted-foreground">Proteja sua reputação e combata a desinformação</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card>
              <CardHeader>
                <CheckCircle className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle>Credibilidade Aumentada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Seu público saberá que o conteúdo é autêntico e não foi manipulado
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>Combate à Desinformação</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ajude a criar um ambiente digital mais seguro e transparente
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-yellow-600 mb-2" />
                <CardTitle>Verificação Instantânea</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Qualquer pessoa pode verificar a autenticidade em segundos
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Lock className="h-10 w-10 text-purple-600 mb-2" />
                <CardTitle>Criptografia Avançada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Tecnologia de ponta baseada em algoritmos SHA-256 e RSA
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Globe className="h-10 w-10 text-indigo-600 mb-2" />
                <CardTitle>Parcerias Comerciais</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Marcas confiarão mais em influenciadores com autenticidade garantida
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <QrCode className="h-10 w-10 text-pink-600 mb-2" />
                <CardTitle>Fácil de Usar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Interface intuitiva com QR Code para verificação simplificada
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* CTA Final */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold">
            Pronto para Proteger seu Conteúdo?
          </h2>
          <p className="text-xl text-muted-foreground">
            Junte-se aos influenciadores que já estão combatendo deepfakes e fake news
          </p>
          <Button size="lg" onClick={() => navigate('/cadastro')} className="text-lg px-8">
            Começar Agora
            <Shield className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} Vero iD - Sistema de Autenticação Digital</p>
          <p className="text-sm mt-2">Combatendo desinformação através de criptografia</p>
        </div>
      </footer>
    </div>
  );
}