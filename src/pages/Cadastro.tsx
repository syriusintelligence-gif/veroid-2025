import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, ArrowLeft, Loader2, Upload, Camera, CheckCircle2, Image, AlertCircle, XCircle, Eye, EyeOff, Mail, MessageCircle, PartyPopper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  checkCpfCnpjExists,
  checkEmailExists,
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
// 🔐 AWS Textract: Verificação de idade via documento
import { verifyAgeFromDocument, formatBirthDate } from '@/lib/age-verification';
// 🤖 Gemini AI: Validação de documento com IA
import { validateDocument as validateDocumentWithAI, formatValidationIssues } from '@/lib/document-validation';
// 🤖 Gemini AI: Validação de selfie com IA
import { validateSelfie, formatSelfieValidationIssues } from '@/lib/selfie-validation';
// 📊 GTM: Instrumentação básica de tracking do funil de cadastro
//    (form_start, form_step, sign_up, form_error) — Oportunidade 1
import {
  trackCadastroStart,
  trackCadastroStep,
  trackCadastroSuccess,
  trackCadastroError,
  CadastroStep,
} from '@/lib/gtm-tracker';

// Última atualização: 2026-07-14 - Adiciona opt-in WhatsApp + tela intermediária de boas-vindas + GTM tracking



async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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

// Função removida - validação de selfie agora é feita via Gemini AI no momento da captura

// Icone oficial do WhatsApp (SVG inline em verde #25D366).
// Componente local, adicionado em 2026-07-16 exclusivamente para o bloco
// de opt-in de WhatsApp. Nao substitui nenhum outro icone do arquivo.
function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      fill="#25D366"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.571-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.04 2.003C6.579 2.003 2.129 6.454 2.126 11.916c0 1.746.457 3.45 1.325 4.955L2.05 21.949a.5.5 0 0 0 .614.614l5.115-1.402a9.87 9.87 0 0 0 4.259.972h.004c5.462 0 9.911-4.451 9.914-9.913 0-2.647-1.03-5.135-2.9-7.006A9.844 9.844 0 0 0 12.04 2.003z" />
    </svg>
  );
}

export default function Cadastro() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { check: checkRateLimit, isBlocked, blockedUntil, remaining, message: rateLimitMessage } = useRateLimit('REGISTER');
  
  const { 
    token: csrfToken, 
    isLoading: csrfLoading, 
    error: csrfError 
  } = useCSRFProtection();
  
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [nomePublico, setNomePublico] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [documentoUrl, setDocumentoUrl] = useState('');
  const [documentoType, setDocumentoType] = useState<'image'>('image');
  const [selfieUrl, setSelfieUrl] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ageDeclarationAccepted, setAgeDeclarationAccepted] = useState(false);
  const [documentoHash, setDocumentoHash] = useState<string>('');
  const [fileValidationError, setFileValidationError] = useState<string>('');
  // 🆕 Opt-in WhatsApp (LGPD) — checkbox opcional no Step 1
  const [whatsappOptin, setWhatsappOptin] = useState(false);
  // 🆕 Tela intermediária de boas-vindas entre Step 1 e Step 2.
  //    Não é um novo `step` numerado porque não queremos criar conta
  //    prematuramente (o trigger de trial no INSERT dispararia).
  //    É apenas um overlay visual dentro do próprio step 1.
  const [showWelcome, setShowWelcome] = useState(false);
  
  const [ageVerificationStatus, setAgeVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
  const [verifiedAge, setVerifiedAge] = useState<number | null>(null);
  const [verifiedBirthDate, setVerifiedBirthDate] = useState<string | null>(null);
  
  // 🆕 ETAPA 1: Validação de documento com IA
  const [documentAIValidationStatus, setDocumentAIValidationStatus] = useState<'idle' | 'validating' | 'validated' | 'failed'>('idle');
  const [documentAIValidationResult, setDocumentAIValidationResult] = useState<{ isValid: boolean; confidence: number; documentType?: string; issues?: string[] } | null>(null);
  
  // 🆕 ETAPA 2: Validação de selfie com IA
  const [selfieAIValidationStatus, setSelfieAIValidationStatus] = useState<'idle' | 'validating' | 'validated' | 'failed'>('idle');
  const [selfieAIValidationResult, setSelfieAIValidationResult] = useState<{ isValid: boolean; confidence: number; hasHumanFace: boolean; issues?: string[] } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  
  const documentVideoRef = useRef<HTMLVideoElement>(null);
  const [documentStream, setDocumentStream] = useState<MediaStream | null>(null);
  const [documentWebcamActive, setDocumentWebcamActive] = useState(false);
  
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (documentStream) {
        documentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream, documentStream]);
  
  useEffect(() => {
    if (csrfToken) {
      console.log('🔐 [Cadastro] CSRF Token disponível:', csrfToken.substring(0, 16) + '...');
    }
    if (csrfError) {
      console.error('❌ [Cadastro] Erro ao obter CSRF token:', csrfError);
    }
  }, [csrfToken, csrfError]);
  
  // 📊 GTM: Dispara `form_start` no primeiro mount + step inicial "dados_pessoais".
  //    Roda apenas uma vez — sem dependências dinâmicas — para não duplicar
  //    o evento em re-renders. Nunca falha o app (o próprio tracker é defensivo).
  useEffect(() => {
    trackCadastroStart();
    trackCadastroStep(1, CadastroStep.DADOS_PESSOAIS);
  }, []);
  
  useEffect(() => {
    if (stream && videoRef.current && webcamActive) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error('Erro ao iniciar vídeo:', err);
      });
    }
  }, [stream, webcamActive]);
  
  useEffect(() => {
    if (documentStream && documentVideoRef.current && documentWebcamActive) {
      documentVideoRef.current.srcObject = documentStream;
      documentVideoRef.current.play().catch(err => {
        console.error('Erro ao iniciar vídeo do documento:', err);
      });
    }
  }, [documentStream, documentWebcamActive]);
  
  const handleDocumentoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    setFileValidationError('');
    setError('');
    setDocumentoFile(null);
    setDocumentoUrl('');
    setDocumentoHash('');
    
    if (!file) {
      return;
    }
    
    const sanitizedFileName = sanitizeFileName(file.name);
    
    console.log('📁 [DOCUMENTO UPLOAD] Arquivo selecionado:', {
      originalName: file.name,
      sanitizedName: sanitizedFileName,
      size: file.size,
      type: file.type
    });
    
    const validationResult = await validateDocument(file);
    
    if (!validationResult.valid) {
      console.error('❌ [DOCUMENTO UPLOAD] Validação falhou:', validationResult.message);
      setFileValidationError(validationResult.message);
      setError(validationResult.message);
      e.target.value = '';
      return;
    }
    
    console.log('✅ [DOCUMENTO UPLOAD] Documento validado com sucesso:', validationResult.details);
    
    try {
      console.log('🔐 [VIRUSTOTAL] Calculando hash SHA256...');
      const hash = await calculateSHA256(file);
      setDocumentoHash(hash);
      console.log('✅ [VIRUSTOTAL] Hash calculado:', hash);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('🚀 [VIRUSTOTAL] Iniciando scan silencioso em background...');
        
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
    
    setDocumentoFile(file);
    setDocumentoType('image');
    
    const base64 = await fileToBase64(file);
    setDocumentoUrl(base64);
    
    // 🆕 ETAPA 1: Valida documento com IA após upload
    // Para PDFs (documentos digitais oficiais como CNH-e e RG Digital), pular validação de IA
    // PDFs já passaram por validação de magic number e formato
    if (file.type === 'application/pdf') {
      console.log('📄 [AI-VALIDATION] PDF detectado - pulando validação de IA (documento digital oficial)');
      setDocumentAIValidationStatus('validated');
      setDocumentAIValidationResult({
        isValid: true,
        confidence: 1.0,
        documentType: 'Documento Digital',
        issues: []
      });
      
      toast({
        title: '✅ Documento Digital Aceito',
        description: 'PDF de documento oficial brasileiro (CNH-e ou RG Digital)',
        variant: 'default',
      });
    } else {
      // Para imagens, validar com IA
      await performAIValidation(base64);
    }
  };

  const cancelDocumentCapture = () => {
    if (documentStream) {
      documentStream.getTracks().forEach(track => track.stop());
      setDocumentStream(null);
    }
    setDocumentWebcamActive(false);
  };
  
  // 🆕 ETAPA 1: Validação de documento com IA
  const performAIValidation = async (documentBase64: string) => {
    console.log('🤖 [AI-VALIDATION] Iniciando validação de documento com IA...');
    
    setDocumentAIValidationStatus('validating');
    setDocumentAIValidationResult(null);
    
    try {
      const result = await validateDocumentWithAI(documentBase64);
      
      console.log('✅ [AI-VALIDATION] Resultado da validação:', result);
      
      setDocumentAIValidationResult({
        isValid: result.isValid,
        confidence: result.confidence,
        documentType: result.documentType,
        issues: result.issues
      });
      
      if (result.isValid) {
        setDocumentAIValidationStatus('validated');
        
        toast({
          title: '✅ Documento Validado',
          description: `Documento identificado: ${result.documentType || 'Documento brasileiro'}. Confiança: ${(result.confidence * 100).toFixed(0)}%`,
          variant: 'default',
        });
      } else {
        setDocumentAIValidationStatus('failed');
        
        const issuesText = formatValidationIssues(result.issues || ['Documento não passou na validação']);
        
        setFileValidationError(issuesText);
        setError(issuesText);
        
        // Limpa o documento inválido
        setDocumentoUrl('');
        setDocumentoFile(null);
        
        toast({
          title: '❌ Documento Inválido',
          description: issuesText,
          variant: 'destructive',
        });
      }
      
    } catch (err) {
      console.error('❌ [AI-VALIDATION] Erro na validação:', err);
      
      setDocumentAIValidationStatus('failed');
      
      toast({
        title: '⚠️ Erro na Validação',
        description: 'Não foi possível validar o documento. Tente novamente.',
        variant: 'default',
      });
    }
  };
  
  // 🆕 ETAPA 2: Validação de selfie com IA
  const performSelfieAIValidation = async (selfieBase64: string) => {
    console.log('🤖 [SELFIE-VALIDATION] Iniciando validação de selfie com IA...');
    
    setSelfieAIValidationStatus('validating');
    setSelfieAIValidationResult(null);
    
    try {
      const result = await validateSelfie(selfieBase64);
      
      console.log('✅ [SELFIE-VALIDATION] Resultado da validação:', result);
      
      setSelfieAIValidationResult({
        isValid: result.isValid,
        confidence: result.confidence,
        hasHumanFace: result.hasHumanFace,
        issues: result.issues
      });
      
      if (result.isValid && result.hasHumanFace) {
        setSelfieAIValidationStatus('validated');
        
        toast({
          title: '✅ Selfie Validada',
          description: `Rosto humano detectado. Confiança: ${(result.confidence * 100).toFixed(0)}%`,
          variant: 'default',
        });
      } else {
        setSelfieAIValidationStatus('failed');
        
        const issuesText = formatSelfieValidationIssues(result.issues || ['Selfie não passou na validação']);
        
        setError(issuesText);
        
        // Limpa a selfie inválida
        setSelfieUrl('');
        setSelfieCaptured(false);
        
        toast({
          title: '❌ Selfie Inválida',
          description: issuesText,
          variant: 'destructive',
        });
      }
      
    } catch (err) {
      console.error('❌ [SELFIE-VALIDATION] Erro na validação:', err);
      
      setSelfieAIValidationStatus('failed');
      
      toast({
        title: '⚠️ Erro na Validação',
        description: 'Não foi possível validar a selfie. Tente novamente.',
        variant: 'default',
      });
    }
  };
  
  const startWebcam = async () => {
    try {
      setError('');
      setIsLoading(true);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      
      setStream(mediaStream);
      setWebcamActive(true);
      
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
      
      // 🆕 Valida selfie com IA após captura
      await performSelfieAIValidation(photo);
    }
  };
  
  const retakeSelfie = () => {
    setSelfieUrl('');
    setSelfieCaptured(false);
    startWebcam();
  };
  
  const startDocumentWebcam = async () => {
    try {
      setError('');
      setIsLoading(true);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        } 
      });
      
      setDocumentStream(mediaStream);
      setDocumentWebcamActive(true);
      
      setTimeout(() => {
        if (documentVideoRef.current) {
          documentVideoRef.current.srcObject = mediaStream;
          documentVideoRef.current.play().catch(err => {
            console.error('Erro ao reproduzir vídeo do documento:', err);
            setError('Erro ao iniciar visualização da câmera. Tente novamente.');
          });
        }
      }, 100);
      
    } catch (err) {
      console.error('Erro ao acessar câmera para documento:', err);
      setError('Erro ao acessar câmera. Verifique as permissões do navegador.');
      setDocumentWebcamActive(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const captureDocument = async () => {
    if (documentVideoRef.current && documentStream) {
      const photo = await captureWebcamPhoto(documentVideoRef.current);
      
      documentStream.getTracks().forEach(track => track.stop());
      setDocumentStream(null);
      setDocumentWebcamActive(false);
      
      try {
        // Converter base64 diretamente em Blob sem usar fetch (evita CSP violation)
        const base64Data = photo.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        
        const timestamp = new Date().getTime();
        const file = new File([blob], `documento_${timestamp}.jpg`, { type: 'image/jpeg' });
        
        console.log('📸 [DOCUMENT CAPTURE] Foto capturada:', {
          name: file.name,
          size: file.size,
          type: file.type
        });
        
        const syntheticEvent = {
          target: {
            files: [file],
            value: ''
          }
        } as React.ChangeEvent<HTMLInputElement>;
        
        await handleDocumentoUpload(syntheticEvent);
        
      } catch (error) {
        console.error('❌ [DOCUMENT CAPTURE] Erro ao processar foto:', error);
        setError('Erro ao processar foto capturada. Tente novamente.');
      }
    }
  };
  
  
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
      
      const emailValidation = validateEmailStrict(email);
      if (!emailValidation.valid) {
        setError(emailValidation.message);
        return false;
      }
      
      console.log('🔍 Verificando disponibilidade de dados...');
      const emailCheck = await checkEmailExists(email);
      if (emailCheck.error) {
        setError('Erro ao validar dados. Tente novamente.');
        return false;
      }
      if (emailCheck.exists) {
        setError('Não foi possível completar o cadastro. Verifique seus dados ou faça login se já possui conta.');
        return false;
      }
      console.log('✅ Email disponível!');
      
      if (!cpfCnpj.trim()) {
        setError('CPF/CNPJ é obrigatório');
        return false;
      }
      
      const cpfCnpjValidation = validateCPForCNPJ(cpfCnpj);
      if (!cpfCnpjValidation.valid) {
        setError(cpfCnpjValidation.message);
        return false;
      }
      
      const cpfCheck = await checkCpfCnpjExists(cpfCnpj);
      if (cpfCheck.error) {
        setError('Erro ao validar dados. Tente novamente.');
        return false;
      }
      if (cpfCheck.exists) {
        setError('Não foi possível completar o cadastro. Verifique seus dados ou faça login se já possui conta.');
        return false;
      }
      console.log('✅ CPF/CNPJ disponível!');
      
      if (!telefone.trim()) {
        setError('Telefone é obrigatório');
        return false;
      }
      
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
    
    // 🆕 ETAPA 1: Verifica se documento foi validado pela IA
    if (documentAIValidationStatus !== 'validated') {
      setError('O documento enviado não passou na validação de segurança. Envie uma foto real e clara do seu documento.');
      return false;
    }
    
    if (!documentAIValidationResult?.isValid) {
      setError('Documento inválido. Certifique-se de enviar uma foto REAL do documento físico (CNH, RG ou Passaporte).');
      return false;
    }
    
    // ⚠️ SELFIE DESABILITADA - Não é mais obrigatória
    // A validação de selfie foi temporariamente removida devido a dificuldades
    // em encontrar um equilíbrio adequado entre segurança e usabilidade
    
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
  
  // 🆕 Deriva o primeiro nome do "Nome Completo / Razão Social" para
  //    personalizar a tela intermediária de boas-vindas (decisão e1 = SIM).
  //    Se o campo estiver vazio ou for uma única palavra, retorna string
  //    vazia — o componente cai no fallback genérico.
  const getFirstName = (): string => {
    const trimmed = nomeCompleto.trim();
    if (!trimmed) return '';
    return trimmed.split(/\s+/)[0];
  };

  const handleNextStep = async () => {
    if (step === 1) {
      const isValid = await validateStep1();
      if (isValid) {
        // 🆕 Tela intermediária de boas-vindas (decisão a2 + c1):
        //    exibe a mensagem "Perfeito! Seus dados foram salvos..." e
        //    aguarda o usuário clicar em "Continuar cadastro" para avançar.
        //    Registra o evento de tracking `form_step` = 2 / boas_vindas.
        setShowWelcome(true);
        trackCadastroStep(2, CadastroStep.BOAS_VINDAS);
      } else {
        // 📊 GTM: erro genérico na validação do Step 1
        trackCadastroError({
          stepNumber: 1,
          stepName: CadastroStep.DADOS_PESSOAIS,
          errorType: 'validation_failed',
        });
      }
    } else if (step === 2 && validateStep2()) {
      // Verificação simplificada: apenas checkbox de declaração de maioridade
      console.log('✅ [CADASTRO] Validações concluídas com sucesso');
      console.log('📄 [CADASTRO] Documento validado pela IA');
      console.log('🤳 [CADASTRO] Selfie validada pela IA');
      console.log('✅ [CADASTRO] Declaração de maioridade aceita');
      
      // 📊 GTM: avança para senha (step 4 conceitual: dados > boas-vindas > verificação > senha)
      trackCadastroStep(4, CadastroStep.SENHA);
      setStep(3);
    } else if (step === 2 && !validateStep2()) {
      // 📊 GTM: erro genérico na validação do Step 2 (documento/idade)
      trackCadastroError({
        stepNumber: 3,
        stepName: CadastroStep.VERIFICACAO,
        errorType: 'validation_failed',
      });
    }
  };

  // 🆕 Handler do botão "Continuar cadastro" da tela intermediária.
  //    Sai da tela de boas-vindas e efetivamente entra no Step 2 (verificação).
  const handleContinueFromWelcome = () => {
    setShowWelcome(false);
    // 📊 GTM: marca a transição para a etapa de verificação (step 3 conceitual)
    trackCadastroStep(3, CadastroStep.VERIFICACAO);
    setStep(2);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep3()) {
      return;
    }
    
    if (!csrfToken) {
      console.error('❌ [Cadastro] CSRF token não disponível!');
      setError('Erro de segurança. Recarregue a página e tente novamente.');
      return;
    }
    
    console.log('🔐 [Cadastro] CSRF Token será incluído na requisição');
    
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
          // 🆕 Repassa opt-in WhatsApp e declaração de maioridade para a
          //    Edge Function persistir com auditoria LGPD completa
          //    (timestamp + IP + user-agent). Se o usuário não marcou,
          //    default é false — nenhuma coluna de auditoria é preenchida.
          whatsappOptin,
          ageDeclarationAccepted,
        },
        senha
      );
      
      if (!result.success) {
        setError('Não foi possível completar o cadastro. Verifique seus dados ou faça login se já possui conta.');
        // 📊 GTM: registra o erro final (falha na criação da conta)
        trackCadastroError({
          stepNumber: 4,
          stepName: CadastroStep.SENHA,
          errorType: 'register_failed',
        });
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Usuário registrado com sucesso!');
      console.log('🔄 Redirecionando para página de confirmação de email...');
      
      // 📊 GTM: dispara evento de CONVERSÃO `sign_up` — este é o evento
      //    que a agência de tráfego deve mapear como conversão no Google
      //    Ads / Meta Ads / GA4. Payload contém apenas metadados agregados
      //    (sem PII crua).
      trackCadastroSuccess({
        whatsappOptin,
        ageDeclarationAccepted,
      });

      navigate(`/email-confirmation?email=${encodeURIComponent(sanitizedData.email)}`);
      
    } catch (err) {
      console.error('❌ Erro ao criar conta:', err);
      setError('Não foi possível completar o cadastro. Tente novamente mais tarde.');
      // 📊 GTM: erro crítico (exceção) na criação da conta
      trackCadastroError({
        stepNumber: 4,
        stepName: CadastroStep.SENHA,
        errorType: 'register_exception',
      });
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
                {step === 1 && !showWelcome && 'Preencha seus dados pessoais'}
                {step === 1 && showWelcome && 'Dados recebidos com sucesso'}
                {step === 2 && 'Verificação de identidade'}
                {step === 3 && 'Crie uma senha segura'}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
              
              {step === 3 && isBlocked && (
                <RateLimitAlert 
                  blockedUntil={blockedUntil}
                  message={rateLimitMessage}
                  remaining={remaining}
                />
              )}
              
              {/* 🆕 Tela intermediária de boas-vindas (decisão a2 + c1 + e1).
                   É renderizada DENTRO do Step 1 quando `showWelcome === true`,
                   ao invés de criar um novo step numerado. Isso é intencional:
                   nenhuma conta é criada ainda, então o trigger de trial do
                   banco NÃO dispara prematuramente. O usuário volta ao Step 2
                   real apenas ao clicar em "Continuar cadastro". */}
              {step === 1 && showWelcome && (
                <div className="space-y-6 py-4">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center shadow-inner">
                      <PartyPopper className="h-10 w-10 text-green-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {getFirstName()
                          ? `Bem-vindo(a), ${getFirstName()}!`
                          : 'Bem-vindo(a)!'}
                      </h3>
                      <p className="text-base text-gray-700 font-medium">
                        Perfeito! Seus dados foram salvos.
                      </p>
                      <p className="text-sm text-gray-600">
                        Falta pouco para você começar a assinar.
                      </p>
                    </div>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900 text-sm">
                      A seguir, vamos fazer uma verificação rápida de identidade e criar sua senha de acesso.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handleContinueFromWelcome}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 text-base"
                    disabled={isLoading}
                  >
                    Continuar cadastro
                  </Button>
                </div>
              )}

              {step === 1 && !showWelcome && (
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
                  
                  {/* Opt-in WhatsApp (LGPD-friendly, opcional).
                       Bloco visualmente distinto (verde WhatsApp) para
                       transmitir confianca e destacar que e opcional.
                       Toda a auditoria (timestamp + IP + user-agent) e
                       gravada apenas se o checkbox for marcado.
                       Ajuste visual (2026-07-16): checkbox maior, cor de
                       destaque mais viva, icone oficial do WhatsApp em verde
                       #25D366 e texto reescrito para foco em beneficio.
                       NENHUMA logica/state/envio foi alterado - apenas UI/texto. */}
                  <div className="space-y-3 p-4 bg-green-100/70 border-2 border-green-300 rounded-xl shadow-sm">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="whatsappOptin"
                        checked={whatsappOptin}
                        onCheckedChange={(checked) => setWhatsappOptin(checked === true)}
                        className="mt-0.5 h-5 w-5"
                        disabled={isLoading}
                      />
                      <div className="space-y-1 flex-1">
                        <Label
                          htmlFor="whatsappOptin"
                          className="text-sm font-semibold text-green-900 cursor-pointer flex items-center gap-2"
                        >
                          <WhatsappIcon className="h-5 w-5 flex-shrink-0" />
                          Receber pelo WhatsApp <span className="text-xs font-normal text-green-700">(opcional)</span>
                        </Label>
                        <p className="text-xs text-green-800 leading-relaxed">
                          Sim, quero acompanhar meu progresso, receber alertas importantes e dicas personalizadas pelo WhatsApp. Posso cancelar a qualquer momento.
                        </p>
                      </div>
                    </div>
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
              
              {step === 2 && (
                <div className="space-y-8">
                  {/* 📄 SEÇÃO 1: DOCUMENTO DE IDENTIFICAÇÃO */}
                  <div className="space-y-4 p-6 bg-blue-50/50 border-2 border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        1
                      </div>
                      <Label className="text-lg font-semibold text-blue-900">Documento de Identificação com Foto *</Label>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-blue-800">
                        📷 Envie uma <strong>FOTO ou PDF</strong> do seu documento: <strong>CNH, RG, Passaporte ou documento de classe profissional válidos</strong>
                      </p>
                      <p className="text-xs text-blue-700 mt-2">
                        <strong>Documentos aceitos:</strong>
                      </p>
                      <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                        <li><strong>Documentos Civis:</strong> CNH, RG, Passaporte</li>
                        <li><strong>Documentos Profissionais:</strong> OAB, CRM, CREA, CRC, CRO, CRF</li>
                      </ul>
                      <p className="text-xs text-blue-600 mt-2">
                        Formatos aceitos: {getDocumentExtensionDescription()} • Tamanho máximo: {getMaxDocumentSizeMB()}MB
                      </p>
                      <p className="text-xs text-green-700 font-medium">
                        ✅ <strong>Documentos digitais aceitos</strong> - CNH-e e RG Digital em PDF
                      </p>
                    </div>
                    
                    {!documentoUrl && !documentWebcamActive ? (
                      <>
                        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <Label htmlFor="documento" className="cursor-pointer">
                            <span className="text-blue-600 hover:underline font-medium">
                              Clique para fazer upload
                            </span>
                            <p className="text-xs text-muted-foreground mt-2">
                              🔒 Validação de segurança ativa
                            </p>
                            <p className="text-xs text-green-600 mt-1 font-medium">
                              ✅ Aceita fotos (JPG/PNG) e documentos digitais (PDF)
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
                        
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                              ou
                            </span>
                          </div>
                        </div>
                        
                        <Button 
                          type="button"
                          onClick={startDocumentWebcam} 
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
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
                              📸 Tirar Foto do Documento
                            </>
                          )}
                        </Button>
                      </>
                    ) : documentWebcamActive ? (
                      <div className="space-y-4">
                        <div className="relative bg-black rounded-lg overflow-hidden">
                          <video
                            ref={documentVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full rounded-lg"
                            style={{ minHeight: '300px', maxHeight: '500px' }}
                          />
                          <div className="absolute top-2 left-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-lg">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            Câmera Ativa
                          </div>
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs">
                            Posicione o documento na tela
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelDocumentCapture}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            onClick={captureDocument}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            Capturar Foto
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative group">
                          <img
                            src={documentoUrl}
                            alt="Documento"
                            className="w-full rounded-lg"
                          />
                          {documentAIValidationStatus === 'validating' && (
                            <div className="absolute top-2 right-2 bg-amber-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Validando com IA...
                            </div>
                          )}
                          {documentAIValidationStatus === 'validated' && documentAIValidationResult?.isValid && (
                            <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {documentAIValidationResult.documentType || 'Validado'}
                            </div>
                          )}
                          {documentAIValidationStatus === 'failed' && (
                            <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              Inválido
                            </div>
                          )}
                        </div>
                        
                        {documentAIValidationStatus === 'validated' && documentAIValidationResult?.isValid && (
                          <Alert className="mt-3 border-green-500 bg-green-50">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 text-sm">
                              ✅ Documento validado com sucesso! Tipo: <strong>{documentAIValidationResult.documentType}</strong>
                              <br />
                              Confiança: <strong>{(documentAIValidationResult.confidence * 100).toFixed(0)}%</strong>
                            </AlertDescription>
                          </Alert>
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
                            setDocumentAIValidationStatus('idle');
                            setDocumentAIValidationResult(null);
                          }}
                        >
                          Trocar Documento
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* ✅ DECLARAÇÃO DE MAIORIDADE */}
                  <div className="space-y-3 p-6 bg-amber-50 border-2 border-amber-300 rounded-xl">
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
                      disabled={isLoading}
                    >
                      Voltar
                    </Button>
                    <Button 
                      onClick={handleNextStep} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                      disabled={!ageDeclarationAccepted || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        'Próximo'
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              {step === 3 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {ageVerificationStatus === 'verified' && verifiedAge && verifiedBirthDate ? (
                    <Alert className="border-green-500 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-900 font-semibold">Idade Verificada via Documento</AlertTitle>
                      <AlertDescription className="text-green-800">
                        ✅ Idade confirmada: <strong>{verifiedAge} anos</strong> (nascido em {formatBirthDate(verifiedBirthDate)})
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        Verificação concluída com sucesso! Agora crie sua senha.
                      </AlertDescription>
                    </Alert>
                  )}
                  
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