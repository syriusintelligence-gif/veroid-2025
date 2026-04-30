import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SignedContent, incrementVerificationCount, getSignedContentById } from '@/lib/supabase-crypto';
import { getCurrentUser } from '@/lib/supabase-auth';
import { Button } from '@/components/ui/button';
import { Shield, Calendar, ArrowLeft, Download, Key, Link as LinkIcon, Check, Instagram, Facebook, Twitter, Youtube, Linkedin, Globe, Copy, FileText, QrCode } from 'lucide-react';
import { generateCertificate, decodeContentFromUrl, generateQRData } from '@/lib/qrcode';
import { generateCertificateWithEmbeddedFile } from '@/lib/services/certificate-generator'; // 🆕 Para certificados com arquivo embutido
import { QRCodeSVG } from 'qrcode.react';
import VerificationLoadingScreen from '@/components/VerificationLoadingScreen';
import { PublicDownloadButton } from '@/components/PublicDownloadButton'; // 🆕 Para download público de arquivos
import { DownloadButton } from '@/components/DownloadButton'; // 🆕 Para download autenticado (criador)
import ImageCarouselViewer from '@/components/ImageCarouselViewer'; // 🆕 Para exibir carrossel de imagens
import type { CarouselMetadata } from '@/lib/types/carousel'; // 🆕 Tipos do carrossel

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    checkUserAndLoadCertificate();
  }, [searchParams]);

  const checkUserAndLoadCertificate = async () => {
    // Verifica se o usuário está logado
    const user = await getCurrentUser();
    setIsLoggedIn(!!user);
    setCurrentUserId(user?.id || null);
    
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
            // 🆕 LOGS DE DEBUG PARA ARQUIVO
            hasFilePath: !!fullContent.filePath,
            filePath: fullContent.filePath,
            fileName: fullContent.fileName,
            fileSize: fullContent.fileSize,
            allowFileDownload: fullContent.allowFileDownload,
          });
          
          // 🔍 DEBUG CRÍTICO: Verificar permissão de download
          console.log('🔍 [CERTIFICATE DEBUG] Estado de download:', {
            'allowFileDownload (raw)': fullContent.allowFileDownload,
            'allowFileDownload (type)': typeof fullContent.allowFileDownload,
            'allowFileDownload (boolean)': Boolean(fullContent.allowFileDownload),
            'isCreator': user && fullContent.userId === user.id,
            'userId': fullContent.userId,
            'currentUserId': user?.id,
          });
          
          // 🔍 DEBUG CRÍTICO: Verificar permissão de download
          console.log('🔍 [CERTIFICATE DEBUG] Estado de download:', {
            'allowFileDownload (raw)': fullContent.allowFileDownload,
            'allowFileDownload (type)': typeof fullContent.allowFileDownload,
            'allowFileDownload (boolean)': Boolean(fullContent.allowFileDownload),
            'isCreator': user && fullContent.userId === user.id,
            'userId': fullContent.userId,
            'currentUserId': user?.id,
          });
          
          setContent(fullContent);
          
          // 🆕 Verifica se o usuário atual é o criador do certificado
          const userIsCreator = user && fullContent.userId === user.id;
          setIsCreator(userIsCreator);
          console.log('👤 [CERTIFICATE] Usuário é o criador?', userIsCreator);
          
          // Incrementa contador de verificações
          await incrementVerificationCount(fullContent.id);
        } else {
          console.error('❌ [CERTIFICATE] Falha ao buscar do Supabase após 3 tentativas');
          console.error('❌ [CERTIFICATE] ID:', decodedContent.id);
          // Último recurso: usa dados da URL (incompletos)
          console.warn('⚠️ [CERTIFICATE] Usando dados da URL como fallback (DADOS INCOMPLETOS)');
          setContent(decodedContent);
          
          // 🆕 Verifica se o usuário atual é o criador (fallback)
          const userIsCreator = user && decodedContent.userId === user.id;
          setIsCreator(userIsCreator);
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

  const handleDownloadCertificate = async () => {
    if (!content) return;
    
    try {
      console.log('📥 [Certificate] Gerando certificado para download...');
      
      // 🆕 SOLUÇÃO: Gera certificado com arquivo embutido como base64
      // Isso resolve o problema de CORS quando o HTML é aberto localmente (file://)
      const certificate = await generateCertificateWithEmbeddedFile(content);
      
      const blob = new Blob([certificate], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `veroId-certificate-${content.verificationCode}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✅ [Certificate] Certificado baixado com sucesso');
    } catch (error) {
      console.error('❌ [Certificate] Erro ao gerar certificado:', error);
    }
  };

  const handleDownloadQRCode = () => {
    if (!content) return;
    
    // Cria um canvas temporário
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensões do canvas
    const qrSize = 300;
    const padding = 40;
    const textHeight = 80;
    const canvasWidth = qrSize + (padding * 2);
    const canvasHeight = qrSize + textHeight + (padding * 2);

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Obtém o QR code SVG existente
    const qrElement = document.querySelector('.qr-code-container svg') as SVGElement;
    if (!qrElement) return;

    // Converte SVG para imagem
    const svgData = new XMLSerializer().serializeToString(qrElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // Desenha o QR code
      ctx.drawImage(img, padding, padding, qrSize, qrSize);

      // Adiciona o texto abaixo do QR code
      const textY = padding + qrSize + 30;
      
      // Texto principal
      ctx.fillStyle = '#1e40af'; // Azul
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Escaneie e confirme:', canvasWidth / 2, textY);
      
      // Texto secundário
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText('conteúdo 100% autêntico', canvasWidth / 2, textY + 28);

      // Converte canvas para blob e faz download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `veroId-qrcode-${content.verificationCode}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      URL.revokeObjectURL(svgUrl);
    };

    img.src = svgUrl;
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

  /**
   * 🆕 CORRELAÇÃO INTELIGENTE: Links Sociais + Plataformas de Publicação
   * Mostra links sociais correlacionados com as plataformas onde o conteúdo foi publicado
   */
  const renderSocialLinks = () => {
    console.log('🔍 [DEBUG renderSocialLinks] Verificando links sociais...');
    console.log('🔍 [DEBUG] content.platforms:', content?.platforms);
    console.log('🔍 [DEBUG] content.creatorSocialLinks:', content?.creatorSocialLinks);
    
    if (!content?.creatorSocialLinks || !content?.platforms || content.platforms.length === 0) {
      console.log('⚠️ [DEBUG] Sem links sociais ou plataformas disponíveis');
      return null;
    }

    const socialLinks = content.creatorSocialLinks;
    
    // 🆕 Correlaciona plataformas de publicação com links sociais disponíveis
    const correlatedLinks: Array<{ platform: string; url: string }> = [];
    const additionalLinks: Array<{ platform: string; url: string }> = [];
    
    // Normaliza nomes de plataformas para matching (case-insensitive)
    const normalizePlatformName = (name: string): string => {
      return name.toLowerCase().replace(/[^a-z]/g, '');
    };
    
    // Primeiro, processa as plataformas de publicação
    content.platforms.forEach((platform) => {
      const normalizedPlatform = normalizePlatformName(platform);
      
      // Procura link social correspondente
      Object.entries(socialLinks).forEach(([socialKey, url]) => {
        const normalizedSocialKey = normalizePlatformName(socialKey);
        
        if (normalizedSocialKey === normalizedPlatform && url && typeof url === 'string' && url.trim() !== '') {
          correlatedLinks.push({ platform: socialKey, url });
        }
      });
    });
    
    // Depois, adiciona links sociais que NÃO estão nas plataformas de publicação
    Object.entries(socialLinks).forEach(([platform, url]) => {
      if (url && typeof url === 'string' && url.trim() !== '') {
        const isCorrelated = correlatedLinks.some(link => 
          normalizePlatformName(link.platform) === normalizePlatformName(platform)
        );
        
        if (!isCorrelated) {
          additionalLinks.push({ platform, url });
        }
      }
    });

    console.log(`✅ [DEBUG] Links correlacionados: ${correlatedLinks.length}`);
    console.log(`✅ [DEBUG] Links adicionais: ${additionalLinks.length}`);

    if (correlatedLinks.length === 0 && additionalLinks.length === 0) {
      console.log('⚠️ [DEBUG] Nenhum link válido encontrado');
      return null;
    }

    // Se há pelo menos um link correlacionado, mostra botão grande
    const primaryLink = correlatedLinks.length > 0 ? correlatedLinks[0] : additionalLinks[0];

    return (
      <div className="mb-8 w-full">
        {correlatedLinks.length > 0 && (
          <>
            <div className="text-sm font-bold text-green-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              🔗 Conteúdo Original nas Plataformas
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-300 shadow-lg mb-6">
              <p className="text-base text-gray-800 mb-4 font-medium">
                ✅ Acesse o conteúdo original publicado por <strong className="text-green-600">{content.creatorName}</strong>:
              </p>
              
              {/* Grid de botões - Se apenas 1 plataforma, mostra botão grande. Se 2+, mostra grid de botões iguais */}
              {correlatedLinks.length === 1 ? (
                // Botão único GRANDE
                <a
                  href={ensureProtocol(correlatedLinks[0].url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-4 rounded-xl font-bold text-lg text-center shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">🔗</span>
                    <span>VER CONTEÚDO ORIGINAL COMPLETO</span>
                    {getSocialIcon(correlatedLinks[0].platform)}
                  </div>
                  <p className="text-sm font-normal mt-2 opacity-90">
                    Clique para acessar o post original em {getPlatformLabel(correlatedLinks[0].platform)}
                  </p>
                </a>
              ) : (
                // Grid de 2 ou mais botões - tamanhos iguais, lado a lado
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {correlatedLinks.map(({ platform, url }) => (
                    <a
                      key={platform}
                      href={ensureProtocol(url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-4 rounded-xl font-bold text-base text-center shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 min-h-[120px]"
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-2xl">🔗</span>
                        {getSocialIcon(platform)}
                      </div>
                      <span className="mb-1">VER ORIGINAL</span>
                      <span className="text-sm font-normal opacity-90">
                        em {getPlatformLabel(platform)}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Seção adicional: Outros perfis oficiais (não correlacionados) */}
        {additionalLinks.length > 0 && (
          <>
            <div className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Outros Perfis Oficiais
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border-2 border-blue-300 shadow-lg">
              <div className="flex flex-wrap gap-3">
                {additionalLinks.map(({ platform, url }) => (
                  <a
                    key={platform}
                    href={ensureProtocol(url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 px-4 py-2 rounded-full border-2 border-blue-400 hover:border-blue-600 text-sm font-semibold transition-all shadow-md hover:shadow-xl transform hover:scale-105"
                  >
                    {getSocialIcon(platform)}
                    <span className="text-gray-800">{getPlatformLabel(platform)}</span>
                    <LinkIcon className="h-4 w-4 text-blue-500" />
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-4xl w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header - Modernized Banner - Smaller */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 p-3 sm:p-4 md:p-5 text-white relative overflow-hidden">
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
            {/* Title Section - No Logo */}
            <div className="text-center space-y-1 sm:space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                Certificado Digital
              </h1>
              <div className="flex flex-col items-center gap-2">
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
          {/* Badge de Autenticação - Destaque Premium com Logo Vero iD */}
          <div className="relative mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 sm:px-8 py-4 sm:py-5 rounded-2xl font-bold text-base sm:text-lg shadow-2xl hover:shadow-green-500/50 transform hover:scale-105 transition-all duration-300 relative overflow-hidden">
              {/* Efeito de brilho animado */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              
              {/* Ícone Shield com animação */}
              <div className="relative z-10 bg-white/20 p-2 rounded-full animate-pulse">
                <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-white" strokeWidth={2.5} />
              </div>
              
              {/* Texto */}
              <span className="relative z-10 flex items-center gap-2">
                <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={3} />
                Conteúdo Autenticado
              </span>
              
              {/* Efeito de borda brilhante */}
              <div className="absolute inset-0 rounded-2xl border-2 border-white/50 animate-pulse-slow"></div>
            </div>
            
            {/* Texto explicativo abaixo */}
            <p className="text-xs sm:text-sm text-gray-600 mt-3 ml-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Certificado verificado e protegido pela Vero iD
            </p>
          </div>

          {/* 🔒 SOLUÇÃO 3: AVISO INTELIGENTE DE SEGURANÇA - Banner de Alerta */}
          <div className="mb-8 sm:mb-10 bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 border-2 border-orange-400 rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-bold text-orange-900 mb-2">
                  ATENÇÃO: Verificação de Autenticidade
                </h3>
                <p className="text-sm text-orange-800 leading-relaxed mb-3">
                  Este certificado autentica o <strong>CONTEÚDO COMPLETO</strong> original. 
                  Se você está vendo um <strong className="text-red-700">RECORTE ou FRAGMENTO</strong>, 
                  ele NÃO está coberto por esta certificação.
                </p>
              </div>
            </div>
            
            {/* 🔒 SOLUÇÃO 3: Checklist de Verificação */}
            <div className="bg-white/70 rounded-lg p-4 border border-orange-200">
              <p className="text-sm font-bold text-orange-900 mb-3">✅ COMO VERIFICAR A AUTENTICIDADE:</p>
              <ul className="space-y-2 text-sm text-orange-800">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">☐</span>
                  <span>A imagem de preview abaixo corresponde ao conteúdo que você viu?</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">☐</span>
                  <span>O conteúdo completo está íntegro (não foi editado ou recortado)?</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">☐</span>
                  <span>Os links das redes sociais levam ao post/perfil original do criador?</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">☐</span>
                  <span className="font-bold text-orange-900">Clique no botão "VER ORIGINAL" abaixo para comparar com a fonte oficial!</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 🆕 CARROSSEL DE IMAGENS - Se houver múltiplas imagens */}
          {content.carouselMetadata && content.carouselMetadata.carousel_images && content.carouselMetadata.carousel_images.length > 0 && (
            <div className="mb-8 sm:mb-10">
              <div className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="text-xl">📸</span>
                Carrossel de Imagens ORIGINAIS Autenticadas ({content.carouselMetadata.total_images} imagens)
              </div>
              <div className="relative bg-gradient-to-br from-blue-100 to-purple-100 p-4 sm:p-6 rounded-xl border-4 border-blue-500 shadow-xl">
                {/* Badge de autenticação no canto */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  ORIGINAIS
                </div>
                
                {/* Componente do Carrossel */}
                <ImageCarouselViewer 
                  images={content.carouselMetadata.carousel_images}
                  showCounter={true}
                  allowFullscreen={true}
                />
                
                {/* Aviso abaixo do carrossel */}
                <div className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-center">
                  <p className="text-xs sm:text-sm font-medium">
                    ✅ Estas são as <strong>{content.carouselMetadata.total_images} imagens originais completas</strong> que foram autenticadas
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 🔒 SOLUÇÃO 1: HASH VISUAL - Thumbnail Destacada com Aviso (quando NÃO há carrossel) */}
          {!content.carouselMetadata && content.thumbnail && !imageError && (
            <div className="mb-8 sm:mb-10">
              <div className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="text-xl">📸</span>
                Preview do Conteúdo ORIGINAL Autenticado
              </div>
              <div className="relative bg-gradient-to-br from-blue-100 to-purple-100 p-4 sm:p-6 rounded-xl border-4 border-blue-500 shadow-xl">
                {/* Badge de autenticação no canto */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  ORIGINAL
                </div>
                
                <img 
                  src={content.thumbnail} 
                  alt="Preview do conteúdo original autenticado" 
                  className="w-full max-h-80 sm:max-h-96 object-contain rounded-lg shadow-md border-2 border-white"
                  onError={() => {
                    console.error('❌ Erro ao carregar thumbnail');
                    setImageError(true);
                  }}
                />
                
                {/* Aviso abaixo da imagem */}
                <div className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-center">
                  <p className="text-xs sm:text-sm font-medium">
                    ✅ Esta é a imagem/frame do <strong>conteúdo original completo</strong> que foi autenticado
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* 🆕 CORREÇÃO: Fallback quando thumbnail falha */}
          {!content.carouselMetadata && content.thumbnail && imageError && (
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

          {/* 🆕 SEÇÃO DE DOWNLOAD DE ARQUIVO ORIGINAL - LAYOUT PADRONIZADO */}
          {content.filePath && content.fileName && (
            <div className="mb-6 sm:mb-8">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                📄 Documento Original Anexado
              </div>
              <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 p-5 sm:p-6 rounded-xl border-l-4 border-green-500 shadow-md">
                <p className="text-sm text-green-800 mb-4 leading-relaxed">
                  📝 Este certificado contém o arquivo original anexado. Clique no botão abaixo para baixar:
                </p>
                
                {/* 🔒 LÓGICA DE DOWNLOAD:
                    1. Se é o CRIADOR (isCreator === true): sempre pode baixar (DownloadButton com auth)
                    2. Se NÃO é o criador (isCreator === false ou null) E allowFileDownload=true: pode baixar (PublicDownloadButton sem auth)
                    3. Se NÃO é o criador (isCreator === false ou null) E allowFileDownload=false: mostra mensagem de restrição
                */}
                {(() => {
                  console.log('🔍 [CERTIFICATE RENDER] Decidindo componente de download:', {
                    isCreator,
                    allowFileDownload: content.allowFileDownload,
                    decision: isCreator === true ? 'DownloadButton (criador)' : 
                              content.allowFileDownload ? 'PublicDownloadButton (público)' : 
                              'Mensagem de restrição'
                  });
                  return null;
                })()}
                {isCreator === true ? (
                  <>
                    {/* Criador: sempre pode baixar com autenticação */}
                    <DownloadButton
                      filePath={content.filePath}
                      fileName={content.fileName}
                      mimeType={content.mimeType}
                      fileSize={content.fileSize}
                      bucket={content.storageBucket || 'signed-documents'}
                      variant="default"
                      size="default"
                      showFileInfo={true}
                    />
                    <p className="text-xs text-green-700 mt-4 text-center leading-relaxed">
                      ✅ O arquivo está embutido neste certificado e pode ser baixado mesmo sem conexão com a internet
                    </p>
                  </>
                ) : (
                  <>
                    {/* Verificador (logado ou não logado): download depende de allowFileDownload */}
                    {content.allowFileDownload ? (
                      <>
                        <PublicDownloadButton
                          filePath={content.filePath}
                          fileName={content.fileName}
                          mimeType={content.mimeType}
                          fileSize={content.fileSize}
                          bucket={content.storageBucket || 'signed-documents'}
                          variant="default"
                          size="default"
                          showFileInfo={true}
                        />
                        <p className="text-xs text-green-700 mt-4 text-center leading-relaxed">
                          ✅ O arquivo está embutido neste certificado e pode ser baixado mesmo sem conexão com a internet
                        </p>
                      </>
                    ) : (
                      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 font-medium mb-2">
                          🔒 Download Restrito
                        </p>
                        <p className="text-xs text-yellow-700">
                          O criador optou por não permitir o download do arquivo original. Apenas as informações do certificado estão disponíveis para verificação.
                        </p>
                      </div>
                    )}
                  </>
                )}
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
              <div className="qr-code-container">
                <QRCodeSVG
                  value={generateQRData(content)}
                  size={180}
                  level="M"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="text-xs text-center text-gray-500 mt-4">
                Escaneie para verificar a autenticidade
              </p>
              {/* 🔒 Botão de download disponível APENAS para o criador */}
              {isCreator && (
                <Button
                  onClick={handleDownloadQRCode}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar QR Code
                </Button>
              )}
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