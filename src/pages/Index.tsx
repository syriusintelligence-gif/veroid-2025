import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, QrCode, CheckCircle, Zap, Globe, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isCurrentUserAdmin } from '@/lib/auth';
import { useEffect, useState, useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

export default function Index() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const heroRef = useRef(null);
  const howItWorksRef = useRef(null);
  const benefitsRef = useRef(null);
  const ctaRef = useRef(null);
  
  const heroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const howItWorksInView = useInView(howItWorksRef, { once: true, amount: 0.2 });
  const benefitsInView = useInView(benefitsRef, { once: true, amount: 0.1 });
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.3 });
  
  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  
  useEffect(() => {
    const user = getCurrentUser();
    if (user && isCurrentUserAdmin()) {
      setIsAdmin(true);
    }
  }, []);
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };
  
  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: custom * 0.1,
        ease: [0.22, 1, 0.36, 1]
      }
    })
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="border-b border-white/10 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50 shadow-lg shadow-blue-500/10"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                repeatDelay: 5
              }}
            >
              <Shield className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            </motion.div>
            <span className="text-2xl font-bold text-white tracking-tight">
              Vero iD
            </span>
          </motion.div>
          <nav className="flex gap-3">
            {isAdmin && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" onClick={() => navigate('/admin/dashboard')} className="border-white/20 text-cyan-400 hover:bg-white/10 hover:border-cyan-400/50 hover:text-cyan-300">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Admin Dashboard
                </Button>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" onClick={() => navigate('/login')} className="border-white/20 bg-white/90 text-slate-900 hover:bg-white hover:border-cyan-400/50 hover:text-slate-950 font-semibold">
                Entrar
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={() => navigate('/cadastro')} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all">
                Cadastro
              </Button>
            </motion.div>
          </nav>
        </div>
      </motion.header>
      
      {/* Hero Section */}
      <section ref={heroRef} className="relative container mx-auto px-4 py-24 text-center overflow-hidden">
        {/* Background decorativo com grid - com parallax */}
        <motion.div 
          style={{ y: backgroundY }}
          className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" 
        />
        
        <motion.div 
          className="relative z-10 max-w-5xl mx-auto space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate={heroInView ? "visible" : "hidden"}
        >
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-2 backdrop-blur-xl bg-white/5 border border-white/20 rounded-full text-sm font-semibold shadow-2xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Shield className="h-4 w-4 text-cyan-400" />
            </motion.div>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Criptografia de Ponta para Validação de Conteúdo
            </span>
          </motion.div>
          
          <motion.h1 
            variants={itemVariants}
            className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-12"
          >
            <span className="text-white">O Fim da Desinformação</span>
            <br />
            <motion.span 
              className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                backgroundSize: '200% 200%'
              }}
            >
              Começa com a Sua Assinatura.
            </motion.span>
          </motion.h1>
          
          <motion.div variants={itemVariants} className="space-y-6 max-w-4xl mx-auto">
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed text-center px-4">
              Proteja sua reputação contra <strong className="text-white">Deepfakes</strong> e <strong className="text-white">Fake News</strong>. Nosso sistema de assinatura digital utiliza criptografia avançada para garantir que seu conteúdo seja <strong className="text-white">matemático e incontestavelmente seu</strong>.
            </p>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            className="flex gap-4 justify-center flex-wrap pt-4"
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" onClick={() => navigate('/cadastro')} className="text-lg px-8 py-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-2xl shadow-cyan-500/40 hover:shadow-cyan-500/60 transition-all">
                Começar Agora
                <Shield className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" variant="outline" onClick={() => navigate('/verify')} className="text-lg px-8 py-6 border-2 border-white/20 !bg-transparent text-cyan-400 hover:border-cyan-400/50 hover:!bg-white/5 hover:text-cyan-300 backdrop-blur-sm transition-all font-semibold">
                Verificar Autenticidade
                <CheckCircle className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>
      
      {/* Como Funciona */}
      <section ref={howItWorksRef} className="relative bg-gradient-to-b from-slate-900 to-slate-950 py-20 overflow-hidden">
        {/* Grid pattern decorativo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none" />
        
        <div className="relative z-10 container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={howItWorksInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
              <span className="text-white">Como </span>
              <span className="bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">Funciona</span>
            </h2>
            <p className="text-xl text-gray-400">Processo simples e seguro em 3 passos</p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Lock,
                title: "1. Gere suas Chaves",
                description: "Crie um par de chaves criptográficas único (pública e privada) com tecnologia RSA",
                gradient: "from-cyan-500 to-blue-600",
                hoverColor: "cyan",
                delay: 0
              },
              {
                icon: Shield,
                title: "2. Assine o Conteúdo",
                description: "Adicione uma assinatura digital criptografada e matematicamente verificável ao seu conteúdo",
                gradient: "from-purple-500 to-pink-600",
                hoverColor: "purple",
                delay: 1
              },
              {
                icon: QrCode,
                title: "3. Compartilhe",
                description: "Compartilhe seu conteúdo com suas assinaturas e qualquer pessoa pode verificar a autenticidade instantaneamente",
                gradient: "from-green-500 to-emerald-600",
                hoverColor: "green",
                delay: 2
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                custom={step.delay}
                variants={cardVariants}
                initial="hidden"
                animate={howItWorksInView ? "visible" : "hidden"}
                whileHover={{ scale: 1.05, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={`text-center backdrop-blur-xl bg-white/5 border-2 border-white/10 hover:border-${step.hoverColor}-400/50 hover:bg-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-${step.hoverColor}-500/20`}>
                  <CardHeader>
                    <motion.div 
                      className={`mx-auto w-20 h-20 bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-${step.hoverColor}-500/50`}
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                    >
                      <step.icon className="h-10 w-10 text-white" />
                    </motion.div>
                    <CardTitle className="text-2xl mb-3 text-white font-bold">{step.title}</CardTitle>
                    <CardDescription className="text-base text-gray-300">
                      {step.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Benefícios */}
      <section ref={benefitsRef} className="relative py-20 bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden">
        {/* Grid pattern decorativo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none" />
        
        <div className="relative z-10 container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={benefitsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-white tracking-tight">Por Que Escolher o Vero iD</h2>
            <p className="text-xl text-gray-400">Proteja sua reputação e combata a desinformação com tecnologia comprovada</p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Shield,
                title: "Plataforma Única",
                description: "A única plataforma que utiliza criptografia de ponta para validar a origem do seu conteúdo e neutralizar manipulações por IA",
                color: "cyan",
                delay: 0
              },
              {
                icon: CheckCircle,
                title: "Credibilidade Aumentada",
                description: "Seu público saberá que o conteúdo é autêntico e não foi manipulado por IA ou terceiros",
                color: "green",
                delay: 1
              },
              {
                icon: Zap,
                title: "Verificação Instantânea",
                description: "Qualquer pessoa pode verificar a autenticidade do conteúdo em segundos",
                color: "yellow",
                delay: 2
              },
              {
                icon: Lock,
                title: "Criptografia Avançada",
                description: "Tecnologia de ponta baseada em algoritmos SHA-256 e RSA de nível militar",
                color: "purple",
                delay: 3
              },
              {
                icon: Globe,
                title: "Parcerias Comerciais",
                description: "Marcas confiarão mais em criadores de conteúdo com autenticidade garantida",
                color: "indigo",
                delay: 4
              },
              {
                icon: QrCode,
                title: "Fácil de Usar",
                description: "Interface intuitiva com QR Code para verificação simplificada e rápida",
                color: "pink",
                delay: 5
              }
            ].map((benefit, index) => (
              <motion.div
                key={index}
                custom={benefit.delay}
                variants={cardVariants}
                initial="hidden"
                animate={benefitsInView ? "visible" : "hidden"}
                whileHover={{ scale: 1.05, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={`backdrop-blur-xl bg-white/5 border-2 border-white/10 hover:border-${benefit.color}-400/50 hover:bg-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-${benefit.color}-500/20`}>
                  <CardHeader>
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.2 }}
                      transition={{ duration: 0.5 }}
                    >
                      <benefit.icon className={`h-12 w-12 text-${benefit.color}-400 mb-3 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]`} />
                    </motion.div>
                    <CardTitle className="text-xl text-white font-bold">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Final */}
      <section ref={ctaRef} className="relative bg-gradient-to-br from-blue-950 via-purple-950 to-slate-950 py-20 overflow-hidden">
        {/* Efeito de brilho animado */}
        <motion.div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)] pointer-events-none"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div 
            className="max-w-3xl mx-auto space-y-6"
            initial={{ opacity: 0, y: 30 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h2 
              className="text-4xl md:text-5xl font-black tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className="text-white">Pronto para </span>
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Proteger seu Conteúdo?
              </span>
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-300"
              initial={{ opacity: 0, y: 20 }}
              animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Junte-se aos criadores de conteúdo que já estão combatendo deepfakes e fake news com tecnologia de ponta
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" onClick={() => navigate('/cadastro')} className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-gray-100 shadow-2xl hover:shadow-white/20 transition-all font-bold">
                Começar Agora
                <Shield className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <motion.footer 
        className="border-t border-white/10 bg-slate-950/50 backdrop-blur-xl py-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p className="font-semibold text-white">© {new Date().getFullYear()} Vero iD - Sistema de Autenticação Digital</p>
          <p className="text-sm mt-2">Combatendo desinformação através de criptografia avançada</p>
        </div>
      </motion.footer>
    </div>
  );
}