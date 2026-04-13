import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SignedContent, incrementVerificationCount, getSignedContentById } from '@/lib/supabase-crypto';
import { getCurrentUser } from '@/lib/supabase-auth';
import { Button } from '@/components/ui/button';
import { Shield, Calendar, ArrowLeft, Download, Key, Link as LinkIcon, Check, Instagram, Facebook, Twitter, Youtube, Linkedin, Globe, Copy, FileText, QrCode } from 'lucide-react';
import { generateCertificate, decodeContentFromUrl, generateQRData } from '@/lib/qrcode';
import { QRCodeSVG } from 'qrcode.react';
import VerificationLoadingScreen from '@/components/VerificationLoadingScreen';

// Ícones das plataformas sociais
const platformIcons: Record<string, string> = {
  Instagram: '📷',
  Facebook: '👥',
  Twitter: '🐦',
  LinkedIn: '💼',
  TikTok: '🎵',
  YouTube: '📺',
  WhatsApp: '💬',
  Telegram: '✈️',
  Website: '🌐',
  Outros: '📱',
};

/**
 * 🆕 CORREÇÃO: Extrai título e descrição do conteúdo assinado
 */
function extractContentDescription(fullContent: string): { title: string; description: string } {
  // Procura pelo marcador "Conteúdo:" e extrai o texto após ele
  const contentMarker = 'Conteúdo:';
  const contentIndex = fullContent.indexOf(contentMarker);
  
  let description = '';
  let title = '';
  
  // Extrai o título
  const titleMatch = fullContent.match(/Título:\s*(.+?)(?:\n|$)/);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }
  
  // Extrai a descrição (texto após "Conteúdo:")
  if (contentIndex !== -1) {
    description = fullContent.substring(contentIndex + contentMarker.length).trim();
  }
  
  return { title, description };
}

export default function Certificate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<SignedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPromoLoading, setShowPromoLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    checkUserAndLoadCertificate();
  }, [searchParams]);

  const checkUserAndLoadCertificate = async () => {
    // Verifica se o usuário está logado
    const user = await getCurrentUser();
    setIsLoggedIn(!!user);
    
    // Tenta parâmetro compactado 'd' primeiro
    let dataParam = searchParams.get('d');
    
    // Se não encontrar, tenta parâmetro antigo 'data'
    if (!dataParam) {
      dataParam = searchParams.get('data');
    }
    
    if (dataParam) {
      console.log('🔍 [CERTIFICATE] Parâmetro encontrado na URL');
      const decodedContent = decodeContentFromUrl(dataParam);
      
      if (decodedContent) {
        console.log('📄 [CERTIFICATE] Conteúdo decodificado da URL:', decodedContent.id);
        
        // 🆕 CORREÇÃO CRÍTICA: SEMPRE busca do Supabase para garantir TODOS os dados
        // incluindo links sociais, thumbnail, conteúdo completo, etc.
        console.log('🔍 [CERTIFICATE] Buscando conteúdo COMPLETO do Supabase...');
        
        let fullContent = await getSignedContentById(decodedContent.id);
        
        // Se falhar, tenta novamente após 1 segundo
        if (!fullContent) {
          console.warn('⚠️ [CERTIFICATE] Primeira tentativa falhou, aguardando 1s...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          fullContent = await getSignedContentById(decodedContent.id);
        }
        
        // Se ainda falhar, tenta mais uma vez após 2 segundos
        if (!fullContent) {
          console.warn('⚠️ [CERTIFICATE] Segunda tentativa falhou, aguardando 2s...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          fullContent = await getSignedContentById(decodedContent.id);
        }
        
        if (fullContent) {
          console.log('✅ [CERTIFICATE] Conteúdo COMPLETO carregado do Supabase!');
          console.log('📊 [CERTIFICATE] Dados carregados:', {
            id: fullContent.id,
            creatorName: fullContent.creatorName,
            hasContent: !!fullContent.content,
            contentLength: fullContent.content?.length || 0,
            hasThumbnail: !!fullContent.thumbnail,
            hasSocialLinks: !!fullContent.creatorSocialLinks,
            socialLinksCount: fullContent.creatorSocialLinks ? Object.keys(fullContent.creatorSocialLinks).length : 0,
            socialLinks: fullContent.creatorSocialLinks,
          });
          
          setContent(fullContent);
          
          // Incrementa contador de verificações
          await incrementVerificationCount(fullContent.id);
        } else {
          console.error('❌ [CERTIFICATE] Falha ao buscar do Supabase após 3 tentativas');
          console.error('❌ [CERTIFICATE] ID:', decodedContent.id);
          // Último recurso: usa dados da URL (incompletos)
          console.warn('⚠️ [CERTIFICATE] Usando dados da URL como fallback (DADOS INCOMPLETOS)');
          setContent(decodedContent);
        }
      } else {
        console.error('❌ [CERTIFICATE] Falha ao decodificar conteúdo da URL');
      }
      
      setLoading(false);
    } else {
      console.log('⚠️ [CERTIFICATE] Nenhum parâmetro encontrado na URL');
      setLoading(false);
    }
  };

  const handleDownloadCertificate = () => {
    if (!content) return;
    
    const certificate = generateCertificate(content);
    const blob = new Blob([certificate], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veroId-certificate-${content.verificationCode}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  const handleCopyCode = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content.verificationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar código:', err);
    }
  };
  
  const handleGoBack = () => {
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  // Função para formatar data de forma segura
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      
      // Verifica se a data é válida
      if (isNaN(date.getTime())) {
        return { date: 'Data inválida', time: '' };
      }
      
      const formattedDate = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      
      const formattedTime = date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      
      return { date: formattedDate, time: formattedTime };
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return { date: 'Data inválida', time: '' };
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return <Instagram className="h-5 w-5" />;
      case 'facebook': return <Facebook className="h-5 w-5" />;
      case 'twitter': return <Twitter className="h-5 w-5" />;
      case 'youtube': return <Youtube className="h-5 w-5" />;
      case 'linkedin': return <Linkedin className="h-5 w-5" />;
      case 'website': return <Globe className="h-5 w-5" />;
      case 'tiktok': return <div className="h-5 w-5 font-bold text-sm flex items-center justify-center">TT</div>;
      default: return <LinkIcon className="h-5 w-5" />;
    }
  };

  // 🆕 CORREÇÃO: Função para garantir que URLs tenham protocolo
  const ensureProtocol = (url: string): string => {
    if (!url) return '';
    const trimmedUrl = url.trim();
    // Se já tem protocolo, retorna como está
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl;
    }
    // Adiciona https:// por padrão
    return `https://${trimmedUrl}`;
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return 'Instagram';
      case 'facebook': return 'Facebook';
      case 'tiktok': return 'TikTok';
      case 'twitter': return 'Twitter/X';
      case 'youtube': return 'YouTube';
      case 'linkedin': return 'LinkedIn';
      case 'website': return 'Website';
      default: return platform;
    }
  };

  // 🆕 Show promotional loading screen for 3 seconds, then show certificate
  if (loading || showPromoLoading) {
    // If still loading data, show simple loading
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando certificado...</p>
          </div>
        </div>
      );
    }
    
    // If data loaded but still showing promo, show promotional loading screen
    if (showPromoLoading) {
      return (
        <VerificationLoadingScreen 
          onComplete={() => setShowPromoLoading(false)}
          duration={5000}
        />
      );
    }
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Certificado Não Encontrado</h1>
          <p className="text-muted-foreground mb-6 text-sm sm:text-base">
            O certificado solicitado não pôde ser carregado. Verifique se o link está correto.
          </p>
          <Button onClick={handleGoBack} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isLoggedIn ? 'Voltar ao Dashboard' : 'Voltar ao Início'}
          </Button>
        </div>
      </div>
    );
  }

  const { date: formattedDate, time: formattedTime } = formatDate(content.createdAt);
  
  // 🆕 CORREÇÃO: Extrai título e descrição do conteúdo
  const { title, description } = extractContentDescription(content.content);

  // 🆕 FUNÇÃO RENDERIZAÇÃO DE LINKS SOCIAIS - MOVIDA PARA CIMA E COM CSS FORÇADO
  const renderSocialLinks = () => {
    console.log('🔍 [DEBUG renderSocialLinks] Verificando links sociais...');
    console.log('🔍 [DEBUG] content:', content);
    console.log('🔍 [DEBUG] content.creatorSocialLinks:', content?.creatorSocialLinks);
    
    if (!content?.creatorSocialLinks) {
      console.log('⚠️ [DEBUG] Sem links sociais disponíveis');
      return null;
    }

    const relevantLinks: Array<{ platform: string; url: string }> = [];
    const socialLinks = content.creatorSocialLinks;
    
    // Itera sobre todos os links sociais disponíveis
    Object.entries(socialLinks).forEach(([platform, url]) => {
      console.log(`🔍 [DEBUG] Processando ${platform}: ${url}`);
      if (url && typeof url === 'string' && url.trim() !== '') {
        relevantLinks.push({ platform, url });
      }
    });

    console.log(`✅ [DEBUG] Total de links encontrados: ${relevantLinks.length}`);

    if (relevantLinks.length === 0) {
      console.log('⚠️ [DEBUG] Nenhum link válido encontrado');
      return null;
    }

    return (
      <div 
        className="mb-8 w-full"
        style={{ 
          display: 'block !important',
          visibility: 'visible !important',
          opacity: '1 !important',
          position: 'relative',
          zIndex: 10,
          minHeight: '100px'
        }}
      >
        <div className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Perfis Oficiais do Criador
        </div>
        <div 
          className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-300 shadow-lg"
          style={{ 
            display: 'block !important',
            visibility: 'visible !important'
          }}
        >
          <p className="text-base text-gray-800 mb-4 font-medium">
            🔗 Conecte-se com <strong className="text-blue-600">{content.creatorName}</strong>:
          </p>
          <div className="flex flex-wrap gap-3">
            {relevantLinks.map(({ platform, url }) => (
              <a
                key={platform}
                href={ensureProtocol(url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 px-5 py-3 rounded-full border-2 border-blue-400 hover:border-blue-600 text-base font-semibold transition-all shadow-md hover:shadow-xl transform hover:scale-105"
                style={{ 
                  display: 'inline-flex !important',
                  visibility: 'visible !important'
                }}
              >
                {getSocialIcon(platform)}
                <span className="text-gray-800">{getPlatformLabel(platform)}</span>
                <LinkIcon className="h-4 w-4 text-blue-500" />
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-4xl w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header - Modernized Banner */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 p-6 sm:p-8 md:p-10 text-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h60v60H0z\' fill=\'none\'/%3E%3Cpath d=\'M30 0L60 30L30 60L0 30z\' fill=\'white\' opacity=\'0.1\'/%3E%3C/svg%3E")',
              backgroundSize: '60px 60px',
            }}></div>
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

          {/* Content Container */}
          <div className="relative z-10">
            {/* Vero iD Logo - Centered and Larger */}
            <div className="flex items-center justify-center mb-6">
              <img 
                src="/assets/logo-veroid.png" 
                alt="Vero iD Logo" 
                className="h-20 sm:h-28 md:h-32 w-auto object-contain drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' }}
              />
            </div>

            {/* Title Section */}
            <div className="text-center space-y-2 sm:space-y-3 pb-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                Certificado Digital
              </h1>
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm sm:text-base md:text-lg font-medium opacity-95">
                  Sistema de Autenticação Vero iD
                </p>
                {/* Website Badge */}
                <a
                  href="https://www.veroid.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 transition-all duration-300 hover:scale-105 shadow-lg group relative z-20"
                >
                  <Globe className="h-4 w-4 text-white group-hover:rotate-12 transition-transform" />
                  <span className="text-sm font-semibold">www.veroid.com.br</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 md:p-8 lg:p-12">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold mb-6 sm:mb-8 text-sm sm:text-base">
            ✓ Conteúdo Autenticado
          </div>

          {/* 🆕 CORREÇÃO: Thumbnail com tratamento de erro */}
          {content.thumbnail && !imageError && (
            <div className="mb-6 sm:mb-8">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                📸 Preview do Conteúdo
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-600">
                <img 
                  src={content.thumbnail} 
                  alt="Preview do conteúdo" 
                  className="w-full max-h-64 sm:max-h-80 md:max-h-96 object-contain rounded-lg"
                  onError={() => {
                    console.error('❌ Erro ao carregar thumbnail');
                    setImageError(true);
                  }}
                />
              </div>
            </div>
          )}
          
          {/* 🆕 CORREÇÃO: Fallback quando thumbnail falha */}
          {content.thumbnail && imageError && (
            <div className="mb-6 sm:mb-8">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                📸 Preview do Conteúdo
              </div>
              <div className="bg-gray-100 p-8 rounded-lg border-l-4 border-gray-400 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Preview não disponível</p>
              </div>
            </div>
          )}

          {/* 🆕 CORREÇÃO: Título do Conteúdo */}
          {title && (
            <div className="mb-6 sm:mb-8">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                📌 Título do Conteúdo
              </div>
              <div className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-600 text-blue-900 break-words">
                {title}
              </div>
            </div>
          )}

          {/* Creator */}
          <div className="mb-6 sm:mb-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              👤 Criador do Conteúdo
            </div>
            <div className="text-base sm:text-lg md:text-xl font-medium bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-600 break-words">
              {content.creatorName}
            </div>
          </div>

          {/* 🆕 LINKS SOCIAIS MOVIDOS PARA LOGO APÓS O NOME DO CRIADOR */}
          {renderSocialLinks()}

          {/* 🆕 CORREÇÃO: Descrição/Conteúdo */}
          {description && description.trim() !== '' && (
            <div className="mb-6 sm:mb-8">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                📝 Descrição / Conteúdo
              </div>
              <div className="text-sm sm:text-base bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-600 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                {description}
              </div>
            </div>
          )}

          {/* Date */}
          <div className="mb-6 sm:mb-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              📅 Data e Hora da Assinatura
            </div>
            <div className="text-base sm:text-lg md:text-xl font-medium bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-600 flex items-center gap-2 flex-wrap">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span className="break-words">{formattedDate} às {formattedTime}</span>
            </div>
          </div>

          {/* ID */}
          <div className="mb-6 sm:mb-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              🆔 ID do Certificado
            </div>
            <div className="text-xs sm:text-sm font-mono bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-600 break-all">
              {content.id}
            </div>
          </div>

          {/* Platforms */}
          {content.platforms && content.platforms.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                📱 Plataformas de Publicação
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-600">
                <div className="flex flex-wrap gap-2">
                  {content.platforms.map((platform) => (
                    <div
                      key={platform}
                      className="inline-flex items-center gap-2 bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 border-blue-200 text-xs sm:text-sm font-medium"
                    >
                      <span className="text-lg sm:text-xl">{platformIcons[platform] || '📱'}</span>
                      <span>{platform}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Verification Code */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 sm:p-8 rounded-xl sm:rounded-2xl text-white text-center mb-6 sm:mb-8">
            <div className="text-xs sm:text-sm opacity-90 mb-2 sm:mb-3">Código de Verificação</div>
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[0.3em] sm:tracking-[0.5em] font-mono break-all mb-4">
              {content.verificationCode}
            </div>
            <Button
              onClick={handleCopyCode}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              {copiedCode ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Código
                </>
              )}
            </Button>
          </div>

          {/* Copy Link Button */}
          <div className="mb-6 sm:mb-8">
            <Button
              onClick={handleCopyLink}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm sm:text-base"
              size="lg"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Link Copiado!
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Copiar Link do Certificado
                </>
              )}
            </Button>
          </div>

          {/* Public Key */}
          <div className="mb-6 sm:mb-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Key className="h-3 w-3 sm:h-4 sm:w-4" />
              Chave Pública do Assinante
            </div>
            <div className="text-xs font-mono bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-600 break-all leading-relaxed">
              {content.publicKey}
            </div>
          </div>

          {/* Hashes */}
          <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
            <div className="bg-gray-50 p-4 sm:p-6 rounded-xl">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Hash do Conteúdo (SHA-256)
              </div>
              <div className="text-xs font-mono text-gray-700 break-all leading-relaxed">
                {content.contentHash}
              </div>
            </div>

            <div className="bg-gray-50 p-4 sm:p-6 rounded-xl">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Assinatura Digital
              </div>
              <div className="text-xs font-mono text-gray-700 break-all leading-relaxed">
                {content.signature}
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="mb-6 sm:mb-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <QrCode className="h-3 w-3 sm:h-4 sm:w-4" />
              QR Code de Verificação
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
              <QRCodeSVG
                value={generateQRData(content)}
                size={180}
                level="M"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#000000"
              />
              <p className="text-xs text-center text-gray-500 mt-4">
                Escaneie para verificar a autenticidade
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-4 sm:p-6 md:p-8 rounded-xl border-t-2 border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4 sm:mb-6">
              Este certificado comprova que o conteúdo foi assinado digitalmente por{' '}
              <strong>{content.creatorName}</strong> e não foi alterado desde sua criação.
              O código de verificação pode ser usado para confirmar a autenticidade deste documento.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="flex-1 text-sm sm:text-base"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {isLoggedIn ? 'Voltar ao Dashboard' : 'Voltar ao Início'}
              </Button>
              <Button
                onClick={handleDownloadCertificate}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm sm:text-base"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Certificado
              </Button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4 sm:mt-6">
              Certificado visualizado em {new Date().toLocaleString('pt-BR')} • © {new Date().getFullYear()} Vero iD
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}