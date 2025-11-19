import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SignedContent, incrementVerificationCount } from '@/lib/crypto';
import { Button } from '@/components/ui/button';
import { Shield, Calendar, ArrowLeft, Download, Key, Link as LinkIcon, Check } from 'lucide-react';
import { generateCertificate, decodeContentFromUrl } from '@/lib/qrcode';
import { getCurrentUser } from '@/lib/auth';

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Verifica se o usuário está logado
    const user = getCurrentUser();
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
        // Se o conteúdo decodificado não tem thumbnail, tenta buscar do localStorage
        if (!decodedContent.thumbnail) {
          try {
            const storedContents = localStorage.getItem('veroId_signedContents');
            if (storedContents) {
              const contents: SignedContent[] = JSON.parse(storedContents);
              const fullContent = contents.find(c => c.id === decodedContent.id);
              
              if (fullContent && fullContent.thumbnail) {
                // Adiciona o thumbnail do localStorage ao conteúdo decodificado
                decodedContent.thumbnail = fullContent.thumbnail;
              }
            }
          } catch (error) {
            console.error('Erro ao buscar thumbnail do localStorage:', error);
          }
        }
        
        // Incrementa contador de verificações quando o certificado é acessado via QR Code ou link
        incrementVerificationCount(decodedContent.id);
        
        setContent(decodedContent);
      }
      
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

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
  
  const handleGoBack = () => {
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Certificado Não Encontrado</h1>
          <p className="text-muted-foreground mb-6">
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

  const date = new Date(content.timestamp);
  const formattedDate = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-12 text-center text-white relative">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'40\' fill=\'none\' stroke=\'white\' stroke-width=\'2\'/%3E%3C/svg%3E")',
            }}></div>
          </div>
          <div className="relative">
            <div className="text-6xl mb-4">🛡️</div>
            <h1 className="text-4xl font-bold mb-2">Certificado Digital</h1>
            <p className="text-lg opacity-90">Sistema de Autenticação Vero iD</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-12">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-6 py-3 rounded-full font-semibold mb-8">
            ✓ Conteúdo Autenticado
          </div>

          {/* Thumbnail */}
          {content.thumbnail && (
            <div className="mb-8">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Preview do Conteúdo
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-600">
                <img 
                  src={content.thumbnail} 
                  alt="Thumbnail do conteúdo" 
                  className="w-full max-h-96 object-contain rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Platforms */}
          {content.platforms && content.platforms.length > 0 && (
            <div className="mb-8">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Plataformas de Publicação
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-600">
                <div className="flex flex-wrap gap-2">
                  {content.platforms.map((platform) => (
                    <div
                      key={platform}
                      className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border-2 border-blue-200 text-sm font-medium"
                    >
                      <span className="text-xl">{platformIcons[platform] || '📱'}</span>
                      <span>{platform}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Creator */}
          <div className="mb-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Criador do Conteúdo
            </div>
            <div className="text-xl font-medium bg-gray-50 p-4 rounded-lg border-l-4 border-blue-600">
              {content.creatorName}
            </div>
          </div>

          {/* Date */}
          <div className="mb-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Data e Hora da Assinatura
            </div>
            <div className="text-xl font-medium bg-gray-50 p-4 rounded-lg border-l-4 border-blue-600 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              {formattedDate} às {formattedTime}
            </div>
          </div>

          {/* ID */}
          <div className="mb-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              ID do Certificado
            </div>
            <div className="text-sm font-mono bg-gray-50 p-4 rounded-lg border-l-4 border-blue-600">
              {content.id}
            </div>
          </div>

          {/* Verification Code */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 rounded-2xl text-white text-center mb-8">
            <div className="text-sm opacity-90 mb-3">Código de Verificação</div>
            <div className="text-5xl font-bold tracking-[0.5em] font-mono">
              {content.verificationCode}
            </div>
          </div>

          {/* Copy Link Button */}
          <div className="mb-8">
            <Button
              onClick={handleCopyLink}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Link Copiado!
                </>
              ) : (
                <>
                  <LinkIcon className="h-5 w-5 mr-2" />
                  Copiar Link do Certificado
                </>
              )}
            </Button>
          </div>

          {/* Public Key */}
          <div className="mb-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Key className="h-4 w-4" />
              Chave Pública do Assinante
            </div>
            <div className="text-xs font-mono bg-gray-50 p-4 rounded-lg border-l-4 border-blue-600 break-all leading-relaxed">
              {content.publicKey}
            </div>
          </div>

          {/* Hashes */}
          <div className="space-y-6 mb-8">
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Hash do Conteúdo (SHA-256)
              </div>
              <div className="text-xs font-mono text-gray-700 break-all leading-relaxed">
                {content.contentHash}
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Assinatura Digital
              </div>
              <div className="text-xs font-mono text-gray-700 break-all leading-relaxed">
                {content.signature}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-8 rounded-xl border-t-2 border-gray-200">
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              Este certificado comprova que o conteúdo foi assinado digitalmente por{' '}
              <strong>{content.creatorName}</strong> e não foi alterado desde sua criação.
              O código de verificação pode ser usado para confirmar a autenticidade deste documento.
            </p>

            <div className="flex gap-4">
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {isLoggedIn ? 'Voltar ao Dashboard' : 'Voltar ao Início'}
              </Button>
              <Button
                onClick={handleDownloadCertificate}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Certificado
              </Button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              Certificado visualizado em {new Date().toLocaleString('pt-BR')} • © {new Date().getFullYear()} Vero iD
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}