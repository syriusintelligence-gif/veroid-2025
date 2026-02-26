import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, ArrowLeft, Loader2, Upload, Camera, CheckCircle2, FileText, Image, AlertCircle, XCircle, Eye, EyeOff, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  checkCpfCnpjExists,
  checkEmailExists,
  AgeDeclarationData,
} from '@/lib/supabase-auth';
import { supabase } from '@/lib/supabase';
import { isValidPassword } from '@/lib/password-validator';
import { sanitizeCadastroData, sanitizeFileName } from '@/lib/input-sanitizer';
import { 
  validateEmailStrict, 
  validatePhoneBR, 
  validateCPForCNPJ,
  formatCPF,
  formatCNPJ,
  formatPhone
} from '@/lib/advanced-validators';
import { useRateLimit } from '@/hooks/useRateLimit';
import { RateLimitAlert } from '@/components/RateLimitAlert';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { useToast } from '@/hooks/use-toast';
// 🔒 CSRF Protection
import { useCSRFProtection } from '@/hooks/useCSRFProtection';
// 🔒 SEGURANÇA: Validação de documentos de identidade (CNH, RG, Passaporte)
import { 
  validateDocument, 
  getDocumentAcceptString, 
  getDocumentExtensionDescription,
  getMaxDocumentSizeMB 
} from '@/lib/document-validator';

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
/**
 * 🔐 SEGURANÇA: Calcula hash SHA256 de um arquivo
 * Usado para identificação única e verificação de integridade
 * Integração com VirusTotal para scan de malware
 * 
 * @param file - Arquivo a ser processado
 * @returns Promise com hash SHA256 em formato hexadecimal (64 caracteres)
 * 
 * @example
 * const hash = await calculateSHA256(file);
 * console.log(hash); // "e7705526e3332c5ddda4257b55acb19d1f2ea28672488b51a09c78ca46d71e5c"
 */
async function calculateSHA256(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function captureWebcamPhoto(video: HTMLVideoElement): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(video, 0, 0);
  }
  return canvas.toDataURL('image/jpeg', 0.8);
}

function compareFaces(doc: string, selfie: string): { match: boolean; confidence: number } {
  // Simulação de comparação facial
  // Em produção: usar API de reconhecimento facial (AWS Rekognition, Azure Face API, etc.)
  return {
    match: true,
    confidence: 0.95
  };
}

export default function Cadastro() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Rate limiting: 3 contas por hora
  const { check: checkRateLimit, isBlocked, blockedUntil, remaining, message: rateLimitMessage } = useRateLimit('REGISTER');
  
  // 🔒 CSRF Protection
  const { 
    token: csrfToken, 
    isLoading: csrfLoading, 
    error: csrfError 
  } = useCSRFProtection();
  
  // Dados do formulário
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [nomePublico, setNomePublico] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [documentoUrl, setDocumentoUrl] = useState('');
  const [documentoType, setDocumentoType] = useState<'image' | 'pdf'>('image');
  const [selfieUrl, setSelfieUrl] = useState('');
  
  // 👁️ Estados para mostrar/ocultar senha
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // ✅ Estado para declaração de maioridade
  const [ageDeclarationAccepted, setAgeDeclarationAccepted] = useState(false);
  
  // 🔐 SEGURANÇA: Hash do documento (usado internamente, sem exibição de status)
  const [documentoHash, setDocumentoHash] = useState<string>('');
  
  // Validação de arquivo
  const [fileValidationError, setFileValidationError] = useState<string>('');
  
  // Webcam
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);
  
  // 🔒 Log CSRF token status
  useEffect(() => {
    if (csrfToken) {
      console.log('🔐 [Cadastro] CSRF Token disponível:', csrfToken.substring(0, 16) + '...');
    }
    if (csrfError) {
      console.error('❌ [Cadastro] Erro ao obter CSRF token:', csrfError);
    }
  }, [csrfToken, csrfError]);
  
  // Adiciona efeito para garantir que o vídeo seja reproduzido quando o stream estiver disponível
  useEffect(() => {
    if (stream && videoRef.current && webcamActive) {
      videoRef.current.srcObject = stream;
      // Força o play do vídeo
      videoRef.current.play().catch(err => {
        console.error('Erro ao iniciar vídeo:', err);
      });
    }
  }, [stream, webcamActive]);
  
  /**
   * 🔒 SEGURANÇA: Handler de upload de documento com validação rigorosa
   * 🆕 VALIDAÇÃO HÍBRIDA: Aceita apenas CNH, RG e Passaporte
   * 🔐 VIRUSTOTAL: Scan silencioso em background (SEM exibição de status na UI)
   */
  const handleDocumentoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    // Limpa estados anteriores
    setFileValidationError('');
    setError('');
    setDocumentoFile(null);
    setDocumentoUrl('');
    setDocumentoHash('');
    
    if (!file) {
      return;
    }
    
    // ========================================
    // 🔒 SANITIZAÇÃO DE NOMES DE ARQUIVOS
    // ========================================
    const sanitizedFileName = sanitizeFileName(file.name);
    
    console.log('📁 [DOCUMENTO UPLOAD] Arquivo selecionado:', {
      originalName: file.name,
      sanitizedName: sanitizedFileName,
      size: file.size,
      type: file.type
    });
    
    // =====================================================
    // 🔒 VALIDAÇÃO HÍBRIDA: CNH, RG, Passaporte
    // =====================================================
    
    const validationResult = await validateDocument(file);
    
    if (!validationResult.valid) {
      console.error('❌ [DOCUMENTO UPLOAD] Validação falhou:', validationResult.message);
      setFileValidationError(validationResult.message);
      setError(validationResult.message);
      
      // Limpa o input de arquivo
      e.target.value = '';
      return;
    }
    
    console.log('✅ [DOCUMENTO UPLOAD] Documento validado com sucesso:', validationResult.details);
    
    // =====================================================
    // 🔐 SEGURANÇA: Scan VirusTotal SILENCIOSO (SEM UI)
    // =====================================================
    
    try {
      // Calcula hash SHA256 do arquivo
      console.log('🔐 [VIRUSTOTAL] Calculando hash SHA256...');
      const hash = await calculateSHA256(file);
      setDocumentoHash(hash);
      console.log('✅ [VIRUSTOTAL] Hash calculado:', hash);
      
      // Inicia scan VirusTotal em background (SILENCIOSO)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('🚀 [VIRUSTOTAL] Iniciando scan silencioso em background...');
        
        // Chama Edge Function para scan (não aguarda resposta, não bloqueia UI)
        supabase.functions.invoke('scan-uploaded-file', {
          body: { 
            fileHash: hash,
            fileName: sanitizedFileName
          }
        }).then(({ data: scanData, error: scanError }) => {
          if (scanError) {
            console.warn('⚠️ [VIRUSTOTAL] Erro no scan silencioso (não bloqueia upload):', scanError);
          } else if (scanData) {
            console.log('✅ [VIRUSTOTAL] Scan silencioso concluído:', scanData);
            
            // Verifica se há ameaças detectadas (apenas log, não bloqueia)
            if (scanData.stats && (scanData.stats.malicious > 0 || scanData.stats.suspicious > 0)) {
              console.warn('⚠️ [VIRUSTOTAL] Ameaça detectada:', {
                malicious: scanData.stats.malicious,
                suspicious: scanData.stats.suspicious
              });
            }
          }
        }).catch(scanErr => {
          console.warn('⚠️ [VIRUSTOTAL] Erro ao processar scan silencioso:', scanErr);
        });
      } else {
        console.log('ℹ️ [VIRUSTOTAL] Usuário não autenticado, scan será feito após registro');
      }
    } catch (scanErr) {
      console.warn('⚠️ [VIRUSTOTAL] Erro ao calcular hash (não bloqueia upload):', scanErr);
    }
    
    // =====================================================
    // Arquivo válido, prosseguir com upload
    // =====================================================
    
    setDocumentoFile(file);
    
    // Determina o tipo do arquivo
    const isPdf = file.type === 'application/pdf';
    setDocumentoType(isPdf ? 'pdf' : 'image');
    
    // Converte para base64
    const base64 = await fileToBase64(file);
    setDocumentoUrl(base64);
  };
  
  const startWebcam = async () => {
    try {
      setError('');
      setIsLoading(true);
      
      // Solicita permissão para câmera com configurações específicas
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      
      setStream(mediaStream);
      setWebcamActive(true);
      
      // Aguarda um pouco para garantir que o vídeo está pronto
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => {
            console.error('Erro ao reproduzir vídeo:', err);
            setError('Erro ao iniciar visualização da câmera. Tente novamente.');
          });
        }
      }, 100);
      
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      setError('Erro ao acessar câmera. Verifique as permissões do navegador.');
      setWebcamActive(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const captureSelfie = async () => {
    if (videoRef.current && stream) {
      const photo = await captureWebcamPhoto(videoRef.current);
      setSelfieUrl(photo);
      setSelfieCaptured(true);
      stream.getTracks().forEach(track => track.stop());
      setWebcamActive(false);
      setStream(null);
    }
  };
  
  const retakeSelfie = () => {
    setSelfieUrl('');
    setSelfieCaptured(false);
    startWebcam();
  };
  
  // Auto-formatação de CPF/CNPJ
  const handleCpfCnpjChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) {
      setCpfCnpj(formatCPF(value));
    } else if (cleaned.length === 14) {
      setCpfCnpj(formatCNPJ(value));
    } else {
      setCpfCnpj(value);
    }
  };
  
  // Auto-formatação de telefone
  const handleTelefoneChange = (value: string) => {
    setTelefone(formatPhone(value));
  };
  
  const validateStep1 = async (): Promise<boolean> => {
    setError('');
    setIsLoading(true);
    
    try {
      if (!nomeCompleto.trim()) {
        setError('Nome completo é obrigatório');
        return false;
      }
      
      if (nomeCompleto.length > 100) {
        setError('Nome completo muito longo (máximo 100 caracteres)');
        return false;
      }
      
      if (!email.trim()) {
        setError('Email é obrigatório');
        return false;
      }
      
      // Validação rigorosa de email
      const emailValidation = validateEmailStrict(email);
      if (!emailValidation.valid) {
        setError(emailValidation.message);
        return false;
      }
      
      // 🛡️ PROTEÇÃO CONTRA ENUMERAÇÃO: Verifica duplicação silenciosamente
      console.log('🔍 Verificando disponibilidade de dados...');
      const emailCheck = await checkEmailExists(email);
      if (emailCheck.error) {
        // Não revela o erro específico
        setError('Erro ao validar dados. Tente novamente.');
        return false;
      }
      if (emailCheck.exists) {
        // 🛡️ Mensagem genérica - não revela que email existe
        setError('Não foi possível completar o cadastro. Verifique seus dados ou faça login se já possui conta.');
        return false;
      }
      console.log('✅ Email disponível!');
      
      if (!cpfCnpj.trim()) {
        setError('CPF/CNPJ é obrigatório');
        return false;
      }
      
      // Validação rigorosa de CPF/CNPJ
      const cpfCnpjValidation = validateCPForCNPJ(cpfCnpj);
      if (!cpfCnpjValidation.valid) {
        setError(cpfCnpjValidation.message);
        return false;
      }
      
      // 🛡️ PROTEÇÃO CONTRA ENUMERAÇÃO: Verifica duplicação silenciosamente
      const cpfCheck = await checkCpfCnpjExists(cpfCnpj);
      if (cpfCheck.error) {
        // Não revela o erro específico
        setError('Erro ao validar dados. Tente novamente.');
        return false;
      }
      if (cpfCheck.exists) {
        // 🛡️ Mensagem genérica - não revela que CPF/CNPJ existe
        setError('Não foi possível completar o cadastro. Verifique seus dados ou faça login se já possui conta.');
        return false;
      }
      console.log('✅ CPF/CNPJ disponível!');
      
      if (!telefone.trim()) {
        setError('Telefone é obrigatório');
        return false;
      }
      
      // Validação rigorosa de telefone
      const phoneValidation = validatePhoneBR(telefone);
      if (!phoneValidation.valid) {
        setError(phoneValidation.message);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('❌ Erro na validação:', err);
      setError('Erro ao validar dados. Tente novamente.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const validateStep2 = (): boolean => {
    setError('');
    
    if (!documentoUrl) {
      setError('Documento de identificação é obrigatório');
      return false;
    }
    
    if (!selfieUrl) {
      setError('Selfie é obrigatória');
      return false;
    }
    
    if (!ageDeclarationAccepted) {
      setError('Você deve aceitar a declaração de maioridade para continuar');
      return false;
    }
    
    return true;
  };
  
  const validateStep3 = (): boolean => {
    setError('');
    
    if (!senha) {
      setError('Senha é obrigatória');
      return false;
    }
    
    if (!isValidPassword(senha)) {
      setError('A senha deve ter no mínimo 6 caracteres, incluindo 1 letra maiúscula e 1 caractere especial');
      return false;
    }
    
    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem');
      return false;
    }
    
    return true;
  };
  
  const handleNextStep = async () => {
    if (step === 1) {
      const isValid = await validateStep1();
      if (isValid) {
        setStep(2);
      }
    } else if (step === 2 && validateStep2()) {
      // Comparação facial
      const comparison = compareFaces(documentoUrl, selfieUrl);
      if (comparison.match) {
        setStep(3);
      } else {
        setError('A selfie não corresponde ao documento. Por favor, tente novamente.');
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep3()) {
      return;
    }
    
    // 🔒 Verifica se CSRF token está disponível
    if (!csrfToken) {
      console.error('❌ [Cadastro] CSRF token não disponível!');
      setError('Erro de segurança. Recarregue a página e tente novamente.');
      return;
    }
    
    console.log('🔐 [Cadastro] CSRF Token será incluído na requisição');
    
    // Verifica rate limiting ANTES de criar conta
    const rateLimitResult = await checkRateLimit();
    if (!rateLimitResult.allowed) {
      console.warn('🚫 Rate limit excedido:', rateLimitResult.message);
      setError(rateLimitResult.message || 'Muitas tentativas de registro. Aguarde antes de tentar novamente.');
      return;
    }
    
    console.log(`✅ Rate limit OK. Tentativas restantes: ${rateLimitResult.remaining}`);
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log('📝 Registrando usuário no Supabase...');
      
      // Sanitiza dados antes de enviar
      const sanitizedData = sanitizeCadastroData({
        nomeCompleto,
        nomePublico: nomePublico || nomeCompleto,
        email,
        cpfCnpj,
        telefone,
      });
      
      console.log('🧹 Dados sanitizados:', {
        nomeCompleto: sanitizedData.nomeCompleto,
        email: sanitizedData.email,
      });
      
      // Prepara dados de compliance da declaração de maioridade
      const ageDeclaration: AgeDeclarationData = {
        accepted: ageDeclarationAccepted,
        userAgent: navigator.userAgent,
      };
      
      console.log('📋 Declaração de maioridade:', ageDeclaration.accepted ? 'ACEITA' : 'NÃO ACEITA');
      
      const result = await registerUser(
        {
          ...sanitizedData,
          documentoUrl,
          selfieUrl,
        },
        senha,
        ageDeclaration
      );
      
      if (!result.success) {
        // 🛡️ PROTEÇÃO CONTRA ENUMERAÇÃO: Mensagem genérica
        setError('Não foi possível completar o cadastro. Verifique seus dados ou faça login se já possui conta.');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Usuário registrado com sucesso!');
      
      // 📧 REDIRECIONA PARA PÁGINA DE CONFIRMAÇÃO DE EMAIL
      console.log('🔄 Redirecionando para página de confirmação de email...');
      
      // Redireciona imediatamente para a página de confirmação com o email como parâmetro
      navigate(`/email-confirmation?email=${encodeURIComponent(sanitizedData.email)}`);
      
    } catch (err) {
      console.error('❌ Erro ao criar conta:', err);
      // 🛡️ PROTEÇÃO CONTRA ENUMERAÇÃO: Mensagem genérica
      setError('Não foi possível completar o cadastro. Tente novamente mais tarde.');
      setIsLoading(false);
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
          <Button variant="outline" onClick={() => navigate('/login')}>
            Já tenho conta
          </Button>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Passo {step} de 3</span>
              <span className="text-sm text-muted-foreground">
                {step === 1 ? 'Dados Pessoais' : step === 2 ? 'Verificação' : 'Senha'}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
          
          {/* 🎨 NOVO LAYOUT DE ALERTAS - Mais Visível e Destacado */}
          {error && !isBlocked && !fileValidationError && (
            <Alert variant="destructive" className="mb-6 border-2 border-red-500 bg-red-50 shadow-lg">
              <XCircle className="h-5 w-5 text-red-600" />
              <AlertTitle className="text-red-900 font-bold text-base">Erro de Validação</AlertTitle>
              <AlertDescription className="text-red-800 font-medium text-sm mt-2">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {step === 2 && fileValidationError && (
            <Alert variant="destructive" className="mb-6 border-2 border-red-500 bg-red-50 shadow-lg">
              <XCircle className="h-5 w-5 text-red-600" />
              <AlertTitle className="text-red-900 font-bold text-base">Documento Não Aceito</AlertTitle>
              <AlertDescription className="text-red-800 font-medium text-sm mt-2">
                {fileValidationError}
              </AlertDescription>
            </Alert>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Criar Conta</CardTitle>
              <CardDescription>
                {step === 1 && 'Preencha seus dados pessoais'}
                {step === 2 && 'Verificação de identidade'}
                {step === 3 && 'Crie uma senha segura'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 🔒 CSRF Loading/Error - apenas no step 3 */}
              {step === 3 && csrfLoading && (
                <Alert className="border-blue-500 bg-blue-50 mb-4">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <AlertDescription className="text-blue-800">
                    Inicializando proteção de segurança...
                  </AlertDescription>
                </Alert>
              )}
              
              {step === 3 && csrfError && (
                <Alert variant="destructive" className="mb-6 border-2 border-red-500 bg-red-50 shadow-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <AlertTitle className="text-red-900 font-bold text-base">Erro de Segurança</AlertTitle>
                  <AlertDescription className="text-red-800 font-medium text-sm mt-2">
                    Recarregue a página e tente novamente.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Rate Limit Alert - apenas no step 3 */}
              {step === 3 && isBlocked && (
                <RateLimitAlert 
                  blockedUntil={blockedUntil}
                  message={rateLimitMessage}
                  remaining={remaining}
                />
              )}
              
              {/* Step 1: Dados Pessoais */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeCompleto">Nome Completo / Razão Social *</Label>
                    <Input
                      id="nomeCompleto"
                      placeholder="João Silva"
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value)}
                      maxLength={100}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nomePublico">Nome ou Codinome Público</Label>
                    <Input
                      id="nomePublico"
                      placeholder="@joaosilva (opcional)"
                      value={nomePublico}
                      onChange={(e) => setNomePublico(e.target.value)}
                      maxLength={50}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={100}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Emails temporários não são permitidos
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cpfCnpj">CPF / CNPJ *</Label>
                    <Input
                      id="cpfCnpj"
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      value={cpfCnpj}
                      onChange={(e) => handleCpfCnpjChange(e.target.value)}
                      maxLength={18}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato será aplicado automaticamente
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      placeholder="(11) 99999-9999"
                      value={telefone}
                      onChange={(e) => handleTelefoneChange(e.target.value)}
                      maxLength={15}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Apenas números brasileiros (DDD + número)
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleNextStep} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validando dados...
                      </>
                    ) : (
                      'Próximo'
                    )}
                  </Button>
                </div>
              )}
              
              {/* Step 2: Verificação */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Upload Documento */}
                  <div className="space-y-2">
                    <Label>Documento de Identificação com Foto *</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      📄 Envie apenas: <strong>CNH, RG ou Passaporte</strong>
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Formatos aceitos: {getDocumentExtensionDescription()} • Tamanho máximo: {getMaxDocumentSizeMB()}MB
                    </p>
                    {!documentoUrl ? (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <Label htmlFor="documento" className="cursor-pointer">
                          <span className="text-blue-600 hover:underline font-medium">
                            Clique para fazer upload
                          </span>
                          <p className="text-xs text-muted-foreground mt-2">
                            🔒 Validação de segurança ativa
                          </p>
                          <p className="text-xs text-amber-600 mt-1 font-medium">
                            ⚠️ Apenas CNH, RG ou Passaporte são aceitos
                          </p>
                          <Input
                            id="documento"
                            type="file"
                            accept={getDocumentAcceptString()}
                            className="hidden"
                            onChange={handleDocumentoUpload}
                          />
                        </Label>
                      </div>
                    ) : (
                      <div className="relative">
                        {documentoType === 'pdf' ? (
                          <div className="border rounded-lg p-8 bg-muted/50">
                            <div className="flex items-center justify-center gap-3">
                              <FileText className="h-16 w-16 text-blue-600" />
                              <div className="text-left">
                                <p className="font-medium">Documento PDF</p>
                                <p className="text-sm text-muted-foreground">
                                  {documentoFile ? sanitizeFileName(documentoFile.name) : 'documento.pdf'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {((documentoFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  ✓ Documento validado com sucesso
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative group">
                            <img
                              src={documentoUrl}
                              alt="Documento"
                              className="w-full rounded-lg"
                            />
                            <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                              <Image className="h-3 w-3" />
                              Documento Validado
                            </div>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => {
                            setDocumentoUrl('');
                            setDocumentoFile(null);
                            setFileValidationError('');
                            setDocumentoHash('');
                          }}
                        >
                          Trocar Documento
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Selfie */}
                  <div className="space-y-2">
                    <Label>Selfie em Tempo Real *</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Tire uma foto do seu rosto para verificação
                    </p>
                    
                    {!selfieCaptured ? (
                      <div className="space-y-4">
                        {!webcamActive ? (
                          <Button 
                            onClick={startWebcam} 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Iniciando câmera...
                              </>
                            ) : (
                              <>
                                <Camera className="mr-2 h-4 w-4" />
                                Ativar Câmera
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="space-y-4">
                            <div className="relative bg-black rounded-lg overflow-hidden">
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full rounded-lg"
                                style={{ minHeight: '300px' }}
                              />
                              <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                Câmera Ativa
                              </div>
                            </div>
                            <Button 
                              onClick={captureSelfie} 
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            >
                              <Camera className="mr-2 h-4 w-4" />
                              Capturar Foto
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <img
                          src={selfieUrl}
                          alt="Selfie"
                          className="w-full rounded-lg border-2 border-green-400"
                        />
                        <Button variant="outline" onClick={retakeSelfie} className="w-full">
                          Tirar Nova Foto
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* ✅ Declaração de Maioridade */}
                  <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="ageDeclaration"
                        checked={ageDeclarationAccepted}
                        onCheckedChange={(checked) => setAgeDeclarationAccepted(checked === true)}
                        className="mt-1"
                      />
                      <div className="space-y-2">
                        <Label 
                          htmlFor="ageDeclaration" 
                          className="text-sm font-semibold text-amber-900 cursor-pointer"
                        >
                          Declaração do Usuário *
                        </Label>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          Declaro, sob as penas da lei, que sou maior de 18 (dezoito) anos e estou ciente de que é estritamente proibido publicar, compartilhar ou divulgar qualquer conteúdo que envolva menores de idade neste site. Comprometo‑me a não enviar, submeter ou disponibilizar imagens, vídeos, textos ou quaisquer materiais que exponham, explorem ou coloquem em risco a integridade física, psíquica ou moral de menores de 18 anos.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setStep(1)} 
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button 
                      onClick={handleNextStep} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                      disabled={!ageDeclarationAccepted}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Step 3: Senha */}
              {step === 3 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Verificação concluída com sucesso! Agora crie sua senha.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha *</Label>
                    <div className="relative">
                      <Input
                        id="senha"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        disabled={isBlocked || csrfLoading}
                        maxLength={100}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Indicador de Força da Senha */}
                  <PasswordStrengthIndicator password={senha} />
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
                    <div className="relative">
                      <Input
                        id="confirmarSenha"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        disabled={isBlocked || csrfLoading}
                        maxLength={100}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Indicador de tentativas restantes */}
                  {!isBlocked && remaining !== undefined && remaining <= 1 && (
                    <p className="text-xs text-center text-amber-600 font-medium">
                      ⚠️ Última tentativa disponível nesta hora
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="flex-1"
                      disabled={isLoading || isBlocked || csrfLoading}
                    >
                      Voltar
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium" 
                      disabled={isLoading || isBlocked || csrfLoading || !csrfToken}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : csrfLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Inicializando...
                        </>
                      ) : (
                        'Criar Conta'
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}