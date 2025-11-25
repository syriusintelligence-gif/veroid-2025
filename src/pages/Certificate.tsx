import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SignedContent, incrementVerificationCount, getSignedContentById } from '@/lib/supabase-crypto';
import { Button } from '@/components/ui/button';
import { Shield, Calendar, ArrowLeft, Download, Key, Link as LinkIcon, Check, Instagram, Facebook, Twitter, Youtube, Linkedin, Globe, Copy } from 'lucide-react';
import { generateCertificate, decodeContentFromUrl } from '@/lib/qrcode';
import { getCurrentUser } from '@/lib/supabase-auth';

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

export default function Certificate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<SignedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
      const decodedContent = decodeContentFromUrl(dataParam);
      
      if (decodedContent) {
        console.log('📄 Conteúdo decodificado da URL:', decodedContent.id);
        
        // Busca o conteúdo completo do Supabase (inclui thumbnail e links sociais)
        const fullContent = await getSignedContentById(decodedContent.id);
        
        if (fullContent) {
          console.log('✅ Conteúdo completo carregado do Supabase');
          setContent(fullContent);
          
          // Incrementa contador de verificações
          await incrementVerificationCount(fullContent.id);
        } else {
          console.warn('⚠️ Conteúdo não encontrado no Supabase, usando dados da URL');
          // Fallback: usa o conteúdo decodificado da URL
          setContent(decodedContent);
        }
      }
      
      setLoading(false);
    } else {
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

  // Filtra links sociais baseado nas plataformas selecionadas
  const getRelevantSocialLinks = () => {
    if (!content?.creatorSocialLinks || !content?.platforms) {
      return [];
    }

    const relevantLinks: Array<{ platform: string; url: string }> = [];
    
    content.platforms.forEach((platform) => {
      const platformKey = platform.toLowerCase();
      const socialLinks = content.creatorSocialLinks!;
      
      if (platformKey === 'instagram' && socialLinks.instagram) {
        relevantLinks.push({ platform: 'instagram', url: socialLinks.instagram });
      } else if (platformKey === 'facebook' && socialLinks.facebook) {
        relevantLinks.push({ platform: 'facebook', url: socialLinks.facebook });
      } else if (platformKey === 'tiktok' && socialLinks.tiktok) {
        relevantLinks.push({ platform: 'tiktok', url: socialLinks.tiktok });
      } else if ((platformKey === 'twitter' || platformKey === 'x') && socialLinks.twitter) {
        relevantLinks.push({ platform: 'twitter', url: socialLinks.twitter });
      } else if (platformKey === 'youtube' && socialLinks.youtube) {
        relevantLinks.push({ platform: 'youtube', url: socialLinks.youtube });
      } else if (platformKey === 'linkedin' && socialLinks.linkedin) {
        relevantLinks.push({ platform: 'linkedin', url: socialLinks.linkedin });
      } else if (platformKey === 'website' && socialLinks.website) {
        relevantLinks.push({ platform: 'website', url: socialLinks.website });
      }
    });

    return relevantLinks;
  };

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
  const relevantSocialLinks = getRelevantSocialLinks();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-4xl w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 sm:p-8 md:p-12 text-center text-white relative">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'40\' fill=\'none\' stroke=\'white\' stroke-width=\'2\'/%3E%3C/svg%3E")',
            }}></div>
          </div>
          <div className="relative">
            <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">🛡️</div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Certificado Digital</h1>
            <p className="text-sm sm:text-base md:text-lg opacity-90">Sistema de Autenticação Vero iD</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 md:p-8 lg:p-12">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold mb-6 sm:mb-8 text-sm sm:text-base">
            ✓ Conteúdo Autenticado
          </div>

          {/* Thumbnail */}
          {content.thumbnail && (
            <div className="mb-6 sm:mb-8">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Preview do Conteúdo
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-600">
                <img 
                  src={content.thumbnail} 
                  alt="Thumbnail do conteúdo" 
                  className="w-full max-h-64 sm:max-h-80 md:max-h-96 object-contain rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Creator */}
          <div className="mb-6 sm:mb-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Criador do Conteúdo
            </div>
            <div className="text-base sm:text-lg md:text-xl font-medium bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-600 break-words">
              {content.creatorName}
            </div>
          </div>

          {/* Date */}
          <div className="mb-6 sm:mb-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Data e Hora da Assinatura
            </div>
            <div className="text-base sm:text-lg md:text-xl font-medium bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-600 flex items-center gap-2 flex-wrap">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span className="break-words">{formattedDate} às {formattedTime}</span>
            </div>
          </div>

          {/* ID */}
          <div className="mb-6 sm:mb-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              ID do Certificado
            </div>
            <div className="text-xs sm:text-sm font-mono bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-600 break-all">
              {content.id}
            </div>
          </div>

          {/* Platforms */}
          {content.platforms && content.platforms.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Plataformas de Publicação
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

          {/* Social Links */}
          {relevantSocialLinks.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Perfis do Criador nas Plataformas
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-5 rounded-lg border-l-4 border-blue-600">
                <p className="text-sm text-gray-700 mb-3">
                  Visite os perfis oficiais de <strong>{content.creatorName}</strong> nas plataformas onde o conteúdo foi publicado:
                </p>
                <div className="flex flex-wrap gap-2">
                  {relevantSocialLinks.map(({ platform, url }) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 px-4 py-2.5 rounded-full border-2 border-blue-300 hover:border-blue-500 text-sm font-medium transition-all shadow-sm hover:shadow-md"
                    >
                      {getSocialIcon(platform)}
                      <span>{getPlatformLabel(platform)}</span>
                      <LinkIcon className="h-3.5 w-3.5 text-gray-400" />
                    </a>
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