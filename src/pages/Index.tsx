import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, QrCode, CheckCircle, Zap, Globe, BarChart3, CreditCard, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isCurrentUserAdmin } from '@/lib/auth';
import { useEffect, useState, useRef } from 'react';
import { motion, useInView, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ScrollProgressBar } from '@/components/ScrollProgressBar';

export default function Index() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef(null);
  const howItWorksRef = useRef(null);
  const benefitsRef = useRef(null);
  const ctaRef = useRef(null);
  
  const heroInView = useInView(heroRef, { once: true, amount: 0.2 });
  const howItWorksInView = useInView(howItWorksRef, { once: true, amount: 0.15 });
  const benefitsInView = useInView(benefitsRef, { once: true, amount: 0.1 });
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.2 });
  
  // Parallax Effects: Multiple scroll transforms for different layers
  const { scrollYProgress } = useScroll();
  
  // Hero section parallax (background moves slower)
  const heroBackgroundY = useTransform(scrollYProgress, [0, 0.3], ['0%', '50%']);
  
  // Section backgrounds parallax (different speeds for depth)
  const howItWorksBackgroundY = useTransform(scrollYProgress, [0.2, 0.5], ['0%', '30%']);
  const benefitsBackgroundY = useTransform(scrollYProgress, [0.4, 0.7], ['0%', '30%']);
  const ctaBackgroundY = useTransform(scrollYProgress, [0.6, 1], ['0%', '40%']);
  
  // Floating elements parallax (move in opposite direction)
  const floatingY = useTransform(scrollYProgress, [0, 1], ['0%', '-20%']);
  
  // Opacity changes based on scroll
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.3]);
  const ctaOpacity = useTransform(scrollYProgress, [0.7, 0.9], [0.3, 1]);
  
  // Scale changes for depth effect
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  
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
        staggerChildren: shouldReduceMotion ? 0 : 0.15,
        delayChildren: shouldReduceMotion ? 0 : 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: shouldReduceMotion ? 0 : 40,
      scale: shouldReduceMotion ? 1 : 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0.01 : 0.7,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };
  
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: shouldReduceMotion ? 0 : 60,
      scale: shouldReduceMotion ? 1 : 0.9
    },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0.01 : 0.7,
        delay: shouldReduceMotion ? 0 : custom * 0.15,
        ease: [0.25, 0.1, 0.25, 1]
      }
    })
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Scroll Progress Bar */}
      <ScrollProgressBar />
      
      {/* Header with Glassmorphism */}
      <motion.header 
        initial={{ y: shouldReduceMotion ? 0 : -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: shouldReduceMotion ? 0.01 : 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-header sticky top-0 z-50 shadow-lg shadow-blue-500/10"
      >
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={shouldReduceMotion ? {} : { 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={shouldReduceMotion ? {} : { 
                duration: 3,
                repeat: Infinity,
                repeatDelay: 5
              }}
              whileHover={shouldReduceMotion ? {} : { rotate: 360 }}
            >
              <Shield className="h-7 w-7 md:h-8 md:w-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            </motion.div>
            <span className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Vero iD
            </span>
          </motion.div>
          <nav className="flex gap-2 md:gap-3">
            {isAdmin && (
              <motion.div 
                whileHover={shouldReduceMotion ? {} : { scale: 1.05, y: -2 }} 
                whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
              >
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/admin/dashboard')} 
                  className="button-ripple border-white/20 text-cyan-400 hover:bg-white/10 hover:border-cyan-400/50 hover:text-cyan-300 hover:shadow-lg hover:shadow-cyan-500/20 text-xs md:text-sm px-2 md:px-4 transition-all duration-300"
                >
                  <motion.div
                    whileHover={shouldReduceMotion ? {} : { rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <BarChart3 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  </motion.div>
                  <span className="hidden sm:inline">Admin Dashboard</span>
                  <span className="sm:hidden">Admin</span>
                </Button>
              </motion.div>
            )}
            <motion.div 
              whileHover={shouldReduceMotion ? {} : { scale: 1.05, y: -2 }} 
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            >
              <Button 
                variant="outline" 
                onClick={() => navigate('/pricing')} 
                className="button-ripple border-white/20 text-cyan-400 hover:bg-white/10 hover:border-cyan-400/50 hover:text-cyan-300 hover:shadow-lg hover:shadow-cyan-500/20 text-xs md:text-sm px-2 md:px-4 transition-all duration-300"
              >
                <CreditCard className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Planos</span>
                <span className="sm:hidden">Planos</span>
              </Button>
            </motion.div>
            <motion.div 
              whileHover={shouldReduceMotion ? {} : { scale: 1.05, y: -2 }} 
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            >
              <Button 
                variant="outline" 
                onClick={() => navigate('/login')} 
                className="button-ripple border-white/20 bg-white/90 text-slate-900 hover:bg-white hover:border-cyan-400/50 hover:text-slate-950 hover:shadow-lg hover:shadow-white/20 font-semibold text-xs md:text-sm px-3 md:px-4 transition-all duration-300"
              >
                Entrar
              </Button>
            </motion.div>
            <motion.div 
              whileHover={shouldReduceMotion ? {} : { scale: 1.05, y: -2 }} 
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            >
              <Button 
                onClick={() => navigate('/cadastro')} 
                className="button-ripple bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 transition-all duration-300 text-xs md:text-sm px-3 md:px-4"
              >
                Cadastro
              </Button>
            </motion.div>
          </nav>
        </div>
      </motion.header>
      
      {/* Hero Section with Enhanced Parallax */}
      <section ref={heroRef} className="relative container mx-auto px-4 py-12 md:py-20 lg:py-24 text-center overflow-hidden">
        {/* Layer 1: Background grid with parallax (slowest) */}
        <motion.div 
          style={{ 
            y: shouldReduceMotion ? 0 : heroBackgroundY,
            opacity: shouldReduceMotion ? 0.2 : heroOpacity
          }}
          className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" 
        />
        
        {/* Layer 2: Floating decorative elements (opposite direction) */}
        <motion.div
          style={{ y: shouldReduceMotion ? 0 : floatingY }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute top-20 left-10 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute top-40 right-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-purple-500/5 rounded-full blur-3xl" />
        </motion.div>
        
        {/* Layer 3: Content (normal speed with scale) */}
        <motion.div 
          style={{ scale: shouldReduceMotion ? 1 : heroScale }}
          className="relative z-10 max-w-5xl mx-auto space-y-6 md:space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate={heroInView ? "visible" : "hidden"}
        >
          <motion.div 
            variants={itemVariants}
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            className="glass-badge inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-300"
          >
            <motion.div
              animate={shouldReduceMotion ? {} : { rotate: 360 }}
              transition={shouldReduceMotion ? {} : { duration: 20, repeat: Infinity, ease: "linear" }}
              whileHover={shouldReduceMotion ? {} : { scale: 1.2 }}
            >
              <Shield className="h-3 w-3 md:h-4 md:w-4 text-cyan-400" />
            </motion.div>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Criptografia de Ponta para Validação de Conteúdo
            </span>
          </motion.div>
          
          <motion.h1 
            variants={itemVariants}
            className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight tracking-tight mb-8 md:mb-12 px-2"
          >
            <span className="text-white">O Fim da Desinformação</span>
            <br />
            <motion.span 
              className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent"
              animate={shouldReduceMotion ? {} : {
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={shouldReduceMotion ? {} : {
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
          
          <motion.div variants={itemVariants} className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
            <p className="text-base md:text-xl lg:text-2xl text-gray-300 leading-relaxed text-center px-4">
              Assine seu conteúdo com <strong className="text-white">criptografia avançada</strong>, comprove a autoria de cada publicação e blinde sua reputação contra <strong className="text-white">deepfakes</strong> e <strong className="text-white">FAKENEWS</strong>.
            </p>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center pt-4 px-4"
          >
            <motion.div
              whileHover={shouldReduceMotion ? {} : { scale: 1.08, y: -5 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                size="lg" 
                onClick={() => navigate('/cadastro')} 
                className="button-ripple w-full sm:w-auto text-base md:text-lg px-6 md:px-8 py-5 md:py-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-2xl shadow-cyan-500/40 hover:shadow-3xl hover:shadow-cyan-500/60 transition-all duration-300"
              >
                Começar Agora
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { rotate: 360, scale: 1.2 }}
                  transition={{ duration: 0.5 }}
                  className="ml-2"
                >
                  <Shield className="h-4 w-4 md:h-5 md:w-5" />
                </motion.div>
              </Button>
            </motion.div>
            <motion.div
              whileHover={shouldReduceMotion ? {} : { scale: 1.08, y: -5 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/verify')} 
                className="button-ripple w-full sm:w-auto text-base md:text-lg px-6 md:px-8 py-5 md:py-6 border-2 border-white/20 !bg-transparent text-cyan-400 hover:border-cyan-400/50 hover:!bg-white/5 hover:text-cyan-300 hover:shadow-lg hover:shadow-cyan-500/20 backdrop-blur-sm transition-all duration-300 font-semibold"
              >
                Verificar Autenticidade
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { scale: 1.2 }}
                  transition={{ duration: 0.3 }}
                  className="ml-2"
                >
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
                </motion.div>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>
      
      {/* Como Funciona with Parallax */}
      <section ref={howItWorksRef} className="relative bg-gradient-to-b from-slate-900 to-slate-950 py-12 md:py-16 lg:py-20 overflow-hidden">
        {/* Grid pattern with parallax */}
        <motion.div 
          style={{ y: shouldReduceMotion ? 0 : howItWorksBackgroundY }}
          className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none" 
        />
        
        <div className="relative z-10 container mx-auto px-4">
          <motion.div 
            className="text-center mb-10 md:mb-16"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 40 }}
            animate={howItWorksInView ? { opacity: 1, y: 0 } : { opacity: 0, y: shouldReduceMotion ? 0 : 40 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-3 md:mb-4 tracking-tight px-4">
              <span className="text-white">Como </span>
              <span className="bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">Funciona?</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-400 px-4">Processo simples e seguro em 3 passos</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Lock,
                title: "1. Gere suas Chaves",
                description: "Crie um par de chaves criptográficas único (pública e privada) com tecnologia RSA",
                gradient: "from-cyan-500 to-blue-600",
                shadowClass: "glass-shadow-cyan",
                delay: 0
              },
              {
                icon: Shield,
                title: "2. Assine o Conteúdo",
                description: "Adicione uma assinatura digital criptografada e matematicamente verificável ao seu conteúdo",
                gradient: "from-purple-500 to-pink-600",
                shadowClass: "glass-shadow-purple",
                delay: 1
              },
              {
                icon: QrCode,
                title: "3. Compartilhe",
                description: "Compartilhe seu conteúdo com suas assinaturas e qualquer pessoa pode verificar a autenticidade instantaneamente",
                gradient: "from-green-500 to-emerald-600",
                shadowClass: "glass-shadow-green",
                delay: 2
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                custom={step.delay}
                variants={cardVariants}
                initial="hidden"
                animate={howItWorksInView ? "visible" : "hidden"}
                whileHover={shouldReduceMotion ? {} : { scale: 1.05, y: -12 }}
                transition={{ duration: shouldReduceMotion ? 0.01 : 0.3 }}
              >
                <Card className={`glass-card glass-noise ${step.shadowClass} text-center h-full cursor-pointer transition-all duration-300`}>
                  <CardHeader className="pb-4">
                    <motion.div 
                      className={`mx-auto w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-lg transition-all duration-300`}
                      whileHover={shouldReduceMotion ? {} : { 
                        rotate: 360, 
                        scale: 1.15,
                        boxShadow: `0 20px 40px rgba(6, 182, 212, 0.4)`
                      }}
                      transition={{ duration: shouldReduceMotion ? 0.01 : 0.6 }}
                    >
                      <step.icon className="h-8 w-8 md:h-10 md:w-10 text-white" />
                    </motion.div>
                    <CardTitle className="text-xl md:text-2xl mb-2 md:mb-3 text-white font-bold">{step.title}</CardTitle>
                    <CardDescription className="text-sm md:text-base text-gray-300 leading-relaxed">
                      {step.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Benefícios with Parallax */}
      <section ref={benefitsRef} className="relative py-12 md:py-16 lg:py-20 bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden">
        {/* Grid pattern with parallax */}
        <motion.div 
          style={{ y: shouldReduceMotion ? 0 : benefitsBackgroundY }}
          className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none" 
        />
        
        <div className="relative z-10 container mx-auto px-4">
          <motion.div 
            className="text-center mb-10 md:mb-16"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 40 }}
            animate={benefitsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: shouldReduceMotion ? 0 : 40 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-3 md:mb-4 text-white tracking-tight px-4">Por Que Escolher o Vero iD?</h2>
            <p className="text-lg md:text-xl text-gray-400 px-4">Proteja sua reputação e combata a desinformação com tecnologia comprovada</p>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto auto-rows-fr">
            {[
              {
                icon: Shield,
                title: "Plataforma Única",
                description: "A única plataforma que utiliza criptografia de ponta para validar a origem do seu conteúdo e neutralizar manipulações por IA",
                iconColor: "text-cyan-400",
                shadowClass: "glass-shadow-cyan",
                delay: 0
              },
              {
                icon: CheckCircle,
                title: "Credibilidade Aumentada",
                description: "Seu público saberá que o conteúdo é autêntico e não foi manipulado por IA ou terceiros",
                iconColor: "text-green-400",
                shadowClass: "glass-shadow-green",
                delay: 1
              },
              {
                icon: Zap,
                title: "Verificação Instantânea",
                description: "Qualquer pessoa pode verificar a autenticidade do conteúdo em segundos",
                iconColor: "text-yellow-400",
                shadowClass: "glass-shadow-cyan",
                delay: 2
              },
              {
                icon: Lock,
                title: "Criptografia Avançada",
                description: "Tecnologia de ponta baseada em algoritmos SHA-256 e RSA de nível militar",
                iconColor: "text-purple-400",
                shadowClass: "glass-shadow-purple",
                delay: 3
              },
              {
                icon: Globe,
                title: "Parcerias Comerciais",
                description: "Marcas confiarão mais em criadores de conteúdo com autenticidade garantida",
                iconColor: "text-indigo-400",
                shadowClass: "glass-shadow-purple",
                delay: 4
              },
              {
                icon: QrCode,
                title: "Fácil de Usar",
                description: "Interface intuitiva com QR Code para verificação simplificada e rápida",
                iconColor: "text-pink-400",
                shadowClass: "glass-shadow-purple",
                delay: 5
              }
            ].map((benefit, index) => (
              <motion.div
                key={index}
                custom={benefit.delay}
                variants={cardVariants}
                initial="hidden"
                animate={benefitsInView ? "visible" : "hidden"}
                whileHover={shouldReduceMotion ? {} : { scale: 1.05, y: -12 }}
                transition={{ duration: shouldReduceMotion ? 0.01 : 0.3 }}
                className="h-full"
              >
                <Card className={`glass-card glass-noise ${benefit.shadowClass} h-full cursor-pointer transition-all duration-300 flex flex-col`}>
                  <CardHeader className="pb-3 flex-shrink-0">
                    <motion.div
                      className="inline-block"
                      whileHover={shouldReduceMotion ? {} : { 
                        y: -4
                      }}
                      transition={{ 
                        duration: 0.3,
                        ease: "easeOut"
                      }}
                    >
                      <benefit.icon className={`h-10 w-10 md:h-12 md:w-12 ${benefit.iconColor} mb-2 md:mb-3 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]`} />
                    </motion.div>
                    <CardTitle className="text-lg md:text-xl text-white font-bold mb-2 md:mb-3">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 flex-grow">
                    <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Final with Parallax */}
      <section ref={ctaRef} className="relative bg-gradient-to-br from-blue-950 via-purple-950 to-slate-950 py-12 md:py-16 lg:py-20 overflow-hidden">
        {/* Background glow with parallax */}
        <motion.div 
          style={{ y: shouldReduceMotion ? 0 : ctaBackgroundY }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)] pointer-events-none"
          animate={shouldReduceMotion ? {} : {
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={shouldReduceMotion ? {} : {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div 
            style={{ opacity: shouldReduceMotion ? 1 : ctaOpacity }}
            className="max-w-3xl mx-auto space-y-4 md:space-y-6"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 40 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: shouldReduceMotion ? 0 : 40 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <motion.h2 
              className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight px-4"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
              animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.7, delay: shouldReduceMotion ? 0 : 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <span className="text-white">Pronto para </span>
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Proteger seu Conteúdo?
              </span>
            </motion.h2>
            <motion.p 
              className="text-lg md:text-xl text-gray-300 px-4"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
              animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.7, delay: shouldReduceMotion ? 0 : 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              Use assinatura digital para transformar cada publicação em evidência irrefutável de autoria.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
              animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.7, delay: shouldReduceMotion ? 0 : 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              whileHover={shouldReduceMotion ? {} : { scale: 1.08, y: -8 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
              className="pt-2"
            >
              <Button 
                size="lg" 
                onClick={() => navigate('/cadastro')} 
                className="button-ripple text-base md:text-lg px-6 md:px-8 py-5 md:py-6 bg-white text-blue-600 hover:bg-gray-100 shadow-2xl hover:shadow-3xl hover:shadow-white/30 transition-all duration-300 font-bold"
              >
                Começar Agora
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { rotate: 360, scale: 1.2 }}
                  transition={{ duration: 0.5 }}
                  className="ml-2"
                >
                  <Shield className="h-4 w-4 md:h-5 md:w-5" />
                </motion.div>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Contact Section - Compact */}
      <section className="relative bg-slate-900/50 py-4 md:py-5 border-t border-slate-800/50">
        <div className="container mx-auto px-4">
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.5 }}
            viewport={{ once: true }}
          >
            <span className="text-sm text-gray-400">Entre em contato:</span>
            <motion.a
              href="mailto:contato@veroid.com.br"
              className="inline-flex items-center gap-2 text-sm md:text-base font-medium text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
              whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
            >
              <Mail className="h-4 w-4" />
              contato@veroid.com.br
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer 
        className="glass-header py-6 md:py-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: shouldReduceMotion ? 0.01 : 0.6 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p className="font-semibold text-white text-sm md:text-base">© {new Date().getFullYear()} Vero iD - Sistema de Autenticação Digital</p>
          <p className="text-xs md:text-sm mt-2">Combatendo desinformação através de criptografia avançada</p>
          <div className="flex justify-center gap-4 mt-4 text-xs md:text-sm">
            <button 
              onClick={() => navigate('/privacy')} 
              className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors duration-200"
            >
              Política de Privacidade
            </button>
            <span className="text-gray-600">•</span>
            <button 
              onClick={() => navigate('/terms')} 
              className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors duration-200"
            >
              Termos de Uso
            </button>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}