import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SignedContent, incrementVerificationCount } from '@/lib/supabase-crypto';
import { Button } from '@/components/ui/button';
import { Shield, Calendar, ArrowLeft, Download, Key, Link as LinkIcon, Check } from 'lucide-react';
import { generateCertificate, decodeContentFromUrl } from '@/lib/qrcode';
import { getCurrentUser } from '@/lib/supabase-auth-v2';

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
        // Incrementa contador de verificações quando o certificado é acessado via QR Code ou link
        await incrementVerificationCount(decodedContent.id);
        
        setContent(decodedContent);
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

          {/* Platforms */}
          {content.platforms && content.platforms.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Plataformas de Publicação
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-600">
                <div className="flex flex-wrap gap-2">
                  {content.platforms.map(
