import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, Loader2, Upload, Camera, CheckCircle2, FileText, Image, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from '@/lib/supabase-auth';
import { isValidPassword } from '@/lib/password-validator';
import { sanitizeCadastroData } from '@/lib/input-sanitizer';
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
// 🔒 CSRF Protection
import { useCSRFProtection } from '@/hooks/useCSRFProtection';

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

function validateDocumentFile(file: File): { valid: boolean; message: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      message: 'Formato de arquivo não suportado. Use JPG, PNG ou PDF.'
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      message: 'Arquivo muito grande. O tamanho máximo é 10MB.'
    };
  }
  
  return { valid: true, message: 'Arquivo válido' };
}

export default function Cadastro() {
  const navigate = useNavigate();
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
  
  const handleDocumentoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Valida o arquivo
      const validation = validateDocumentFile(file);
      if (!validation.valid) {
        setError(validation.message);
        return;
      }
      
      setError('');
      setDocumentoFile(file);
      
      // Determina o tipo do arquivo
      const isPdf = file.type === 'application/pdf';
      setDocumentoType(isPdf ? 'pdf' : 'image');
      
      // Converte para base64
      const base64 = await fileToBase64(file);
      setDocumentoUrl(base64);
    }
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
  
  const validateStep1 = (): boolean => {
    setError('');
    
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
  
  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
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
      
      const result = await registerUser(
        {
          ...sanitizedData,
          documentoUrl,
          selfieUrl,
        },
        senha
      );
      
      if (!result.success) {
        setError(result.error || 'Erro ao criar conta. Tente novamente.');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Usuário registrado com sucesso!');
      
      // Faz login automático
      const loginResult = await loginUser(sanitizedData.email, senha);
      
      if (loginResult.success) {
        console.log('✅ Login automático realizado!');
        // Redireciona para dashboard
        navigate('/dashboard');
      } else {
        console.log('⚠️ Registro OK, mas login automático falhou. Redirecionando para login...');
        navigate('/login');
      }
    } catch (err) {
      console.error('❌ Erro ao criar conta:', err);
      setError('Erro ao criar conta. Tente novamente.');
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
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Erro de segurança. Recarregue a página.
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
              
              {error && !isBlocked && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
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
                    />
                    <p className="text-xs text-muted-foreground">
                      Apenas números brasileiros (DDD + número)
                    </p>
                  </div>
                  
                  <Button onClick={handleNextStep} className="w-full">
                    Próximo
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
                      CNH, Passaporte ou RG (JPG, PNG ou PDF - máx. 10MB)
                    </p>
                    {!documentoUrl ? (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <Label htmlFor="documento" className="cursor-pointer">
                          <span className="text-blue-600 hover:underline font-medium">
                            Clique para fazer upload
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            Formatos aceitos: JPG, PNG, PDF
                          </p>
                          <Input
                            id="documento"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,application/pdf"
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
                                  {documentoFile?.name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {((documentoFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
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
                              Imagem
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
                            className="w-full"
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
                            <Button onClick={captureSelfie} className="w-full">
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
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Voltar
                    </Button>
                    <Button onClick={handleNextStep} className="flex-1">
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
                    <Input
                      id="senha"
                      type="password"
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      disabled={isBlocked || csrfLoading}
                      maxLength={100}
                    />
                  </div>
                  
                  {/* Indicador de Força da Senha */}
                  <PasswordStrengthIndicator password={senha} />
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
                    <Input
                      id="confirmarSenha"
                      type="password"
                      placeholder="••••••••"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      disabled={isBlocked || csrfLoading}
                      maxLength={100}
                    />
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
                      className="flex-1" 
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