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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50 shadow-lg shadow-blue-500/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            <span className="text-2xl font-bold text-white tracking-tight">
              Vero iD
            </span>
          </div>
          <nav className="flex gap-3">
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate('/admin/dashboard')} className="border-white/20 text-cyan-400 hover:bg-white/10 hover:border-cyan-400/50 hover:text-cyan-300">
                <BarChart3 className="mr-2 h-4 w-4" />
                Admin Dashboard
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/login')} className="border-white/20 !bg-white text-slate-900 hover:bg-gray-100 hover:border-cyan-400/50 hover:text-slate-800 font-semibold">
              Entrar
            </Button>
            <Button onClick={() => navigate('/cadastro')} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all">
              Cadastro
            </Button>
          </nav>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-24 text-center overflow-hidden">
        {/* Background decorativo com grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />
        
        <div className="relative z-10 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 backdrop-blur-xl bg-white/5 border border-white/20 rounded-full text-sm font-semibold shadow-2xl">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Criptografia de Ponta para Validação de Conteúdo
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
            <span className="text-white">O Fim da Desinformação</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Começa com a Sua Assinatura.
            </span>
          </h1>
          
          <div className="space-y-6 max-w-3xl mx-auto">
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed text-justify hyphens-auto" lang="pt-BR">
              Proteja sua reputação contra <strong className="text-white">Deepfakes</strong> e <strong className="text-white">Fake News</strong>. Nosso sistema de assinatura digital utiliza criptografia avançada para garantir que seu conteúdo seja <strong className="text-white">matemático e incontestavelmente seu</strong>.
            </p>
            
            <p className="text-lg md:text-xl text-gray-400 leading-relaxed border-l-4 border-cyan-500 pl-6 py-2 bg-white/5 backdrop-blur-sm rounded-r-lg">
              A única plataforma que utiliza <strong className="text-cyan-400">criptografia de ponta</strong> para validar a origem do seu conteúdo e neutralizar manipulações por IA.
            </p>
          </div>
          
          <div className="flex gap-4 justify-center flex-wrap pt-4">
            <Button size="lg" onClick={() => navigate('/cadastro')} className="text-lg px-8 py-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-2xl shadow-cyan-500/40 hover:shadow-cyan-500/60 transition-all transform hover:scale-105">
              Começar Agora
              <Shield className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/verify')} className="text-lg px-8 py-6 border-2 border-white/20 !bg-transparent text-cyan-400 hover:border-cyan-400/50 hover:!bg-white/5 hover:text-cyan-300 backdrop-blur-sm transition-all font-semibold">
              Verificar Autenticidade
              <CheckCircle className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Como Funciona */}
      <section className="relative bg-gradient-to-b from-slate-900 to-slate-950 py-20 overflow-hidden">
        {/* Grid pattern decorativo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none" />
        
        <div className="relative z-10 container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
              <span className="text-white">Como </span>
              <span className="bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">Funciona</span>
            </h2>
            <p className="text-xl text-gray-400">Processo simples e seguro em 3 passos</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="text-center backdrop-blur-xl bg-white/5 border-2 border-white/10 hover:border-cyan-400/50 hover:bg-white/10 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20">
              <CardHeader>
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/50">
                  <Lock className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-2xl mb-3 text-white font-bold">1. Gere suas Chaves</CardTitle>
                <CardDescription className="text-base text-gray-300">
                  Crie um par de chaves criptográficas único (pública e privada) com tecnologia RSA
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="text-center backdrop-blur-xl bg-white/5 border-2 border-white/10 hover:border-purple-400/50 hover:bg-white/10 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
              <CardHeader>
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/50">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-2xl mb-3 text-white font-bold">2. Assine o Conteúdo</CardTitle>
                <CardDescription className="text-base text-gray-300">
                  Adicione uma assinatura digital criptografada e matematicamente verificável ao seu conteúdo
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="text-center backdrop-blur-xl bg-white/5 border-2 border-white/10 hover:border-green-400/50 hover:bg-white/10 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20">
              <CardHeader>
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/50">
                  <QrCode className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-2xl mb-3 text-white font-bold">3. Compartilhe</CardTitle>
                <CardDescription className="text-base text-gray-300">
                  Compartilhe seu conteúdo com suas assinaturas e qualquer pessoa pode verificar a autenticidade instantaneamente
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Benefícios */}
      <section className="relative py-20 bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden">
        {/* Grid pattern decorativo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none" />
        
        <div className="relative z-10 container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-white tracking-tight">Por Que Escolher o Vero iD</h2>
            <p className="text-xl text-gray-400">Proteja sua reputação e combata a desinformação com tecnologia comprovada</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="backdrop-blur-xl bg-white/5 border-2 border-white/10 hover:border-green-400/50 hover:bg-white/10 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-green-500/20">
              <CardHeader>
                <CheckCircle className="h-12 w-12 text-green-400 mb-3 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                <CardTitle className="text-xl text-white font-bold">Credibilidade Aumentada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Seu público saberá que o conteúdo é autêntico e não foi manipulado por IA ou terceiros
                </p>
              </CardContent>
            </Card>
            
            <Card className="backdrop-blur-xl bg-white/5 border-2 border-white/10 hover:border-blue-400/50 hover:bg-white/10 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20">
              <CardHeader>
                <Shield className="h-12 w-12 text-blue-400 mb-3 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                <CardTitle className="text-xl text-white font-bold">Combate à Desinformação</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Ajude a criar um ambiente digital mais seguro, transparente e confiável
                </p>
              </CardContent>
            </Card>
            
            <Card className="backdrop-blur-xl bg-white/5 border-2 border-white/10 hover:border-yellow-400/50 hover:bg-white/10 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-500/20">
              <CardHeader>
                <Zap className="h-12 w-12 text-yellow-400 mb-3 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                <CardTitle className="text-xl text-white font-bold">Verificação Instantânea</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Qualquer pessoa pode verificar a autenticidade do conteúdo em segundos
                </p>
              </CardContent>
            </Card>
            
            <Card className="backdrop-blur-xl bg-white/5 border-2 border-white/10 hover:border-purple-400/50 hover:bg-white/10 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20">
              <CardHeader>
                <Lock className="h-12 w-12 text-purple-400 mb-3 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                <CardTitle className="text-xl text-white font-bold">Criptografia Avançada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Tecnologia de ponta baseada em algoritmos SHA-256 e RSA de nível militar
                </p>
              </CardContent>
            </Card>
            
            <Card className="backdrop-blur-xl bg-white/5 border-2 border-white/10 hover:border-indigo-400/50 hover:bg-white/10 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/20">
              <CardHeader>
                <Globe className="h-12 w-12 text-indigo-400 mb-3 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                <CardTitle className="text-xl text-white font-bold">Parcerias Comerciais</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Marcas confiarão mais em criadores de conteúdo com autenticidade garantida
                </p>
              </CardContent>
            </Card>
            
            <Card className="backdrop-blur-xl bg-white/5 border-2 border-white/10 hover:border-pink-400/50 hover:bg-white/10 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-500/20">
              <CardHeader>
                <QrCode className="h-12 w-12 text-pink-400 mb-3 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
                <CardTitle className="text-xl text-white font-bold">Fácil de Usar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Interface intuitiva com QR Code para verificação simplificada e rápida
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* CTA Final */}
      <section className="relative bg-gradient-to-br from-blue-950 via-purple-950 to-slate-950 py-20 overflow-hidden">
        {/* Efeito de brilho animado */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)] pointer-events-none" />
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              <span className="text-white">Pronto para </span>
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Proteger seu Conteúdo?
              </span>
            </h2>
            <p className="text-xl text-gray-300">
              Junte-se aos criadores de conteúdo que já estão combatendo deepfakes e fake news com tecnologia de ponta
            </p>
            <Button size="lg" onClick={() => navigate('/cadastro')} className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-gray-100 shadow-2xl hover:shadow-white/20 transition-all transform hover:scale-105 font-bold">
              Começar Agora
              <Shield className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/50 backdrop-blur-xl py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p className="font-semibold text-white">© {new Date().getFullYear()} Vero iD - Sistema de Autenticação Digital</p>
          <p className="text-sm mt-2">Combatendo desinformação através de criptografia avançada</p>
        </div>
      </footer>
    </div>
  );
}