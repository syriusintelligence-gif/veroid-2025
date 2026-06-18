import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SignedContent } from '@/lib/supabase-crypto';
import { Shield, Calendar, Download, ExternalLink, Copy, Check, Eye, FileText, Image as ImageIcon, Video, Music, File, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generateQRData, generateCertificate } from '@/lib/qrcode';
import { useState, useRef, useEffect } from 'react';
import ShareButtons from '@/components/ShareButtons';
import { DownloadButton } from '@/components/DownloadButton'; // 🆕 FASE 4

interface ContentCardProps {
  content: SignedContent;
  onVerify?: (id: string) => void;
}

export default function ContentCard({ content: initialContent, onVerify }: ContentCardProps) {
  // 🆕 Estado local para conteúdo com links sociais
  const [content, setContent] = useState<SignedContent>(initialContent);
  const [isLoadingSocialLinks, setIsLoadingSocialLinks] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [imageError, setImageError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 🆕 CORRIGIDO: Verifica se já tem links sociais completos
  useEffect(() => {
    console.log('🔍 [ContentCard] Verificando links sociais...');
    console.log('📊 [ContentCard] initialContent.creatorSocialLinks:', initialContent.creatorSocialLinks);
    
    // Se já tem links sociais, usa diretamente
    if (initialContent.creatorSocialLinks && Object.keys(initialContent.creatorSocialLinks).length > 0) {
      console.log('✅ [ContentCard] Links sociais já disponíveis, usando diretamente');
      setContent(initialContent);
      setIsLoadingSocialLinks(false);
    } else {
      console.log('⚠️ [ContentCard] Sem links sociais, mas getSignedContentsByUserId já deveria ter buscado');
      console.log('⚠️ [ContentCard] Isso indica que o usuário não tem links sociais cadastrados');
      setContent(initialContent);
      setIsLoadingSocialLinks(false);
    }
  }, [initialContent]);
  
  // 🆕 Gera QR Data SOMENTE DEPOIS de carregar links sociais
  const qrData = !isLoadingSocialLinks ? generateQRData(content) : '';
  
  // Log QR data for debugging
  if (!isLoadingSocialLinks) {
    console.log('📊 [ContentCard] QR Code gerado:', {
      contentId: content.id,
      length: qrData.length,
      hasSocialLinks: !!content.creatorSocialLinks,
      socialLinksCount: content.creatorSocialLinks ? Object.keys(content.creatorSocialLinks).length : 0,
      socialLinks: content.creatorSocialLinks,
    });
  }
  
  const handleDownloadCertificate = () => {
    console.log('📥 [ContentCard] Gerando certificado com links sociais:', !!content.creatorSocialLinks);
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
  
  const handleDownloadQR = async () => {
    const svg = document.getElementById(`qr-${content.id}`) as SVGElement;
    if (!svg || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size - larger for better quality
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    
    // Create a white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    
    // Get SVG data
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      // Draw QR code
      ctx.drawImage(img, 0, 0, size, size);
      
      // Draw logo in center
      const logoSize = 60;
      const logoX = (size - logoSize) / 2;
      const logoY = (size - logoSize) / 2;
      
      // White background for logo
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, logoSize / 2 + 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw shield icon
      ctx.fillStyle = '#667eea';
      ctx.font = `${logoSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛡️', size / 2, size / 2);
      
      // Download
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `veroId-qrcode-${content.verificationCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(svgUrl);
    };
    
    img.src = svgUrl;
  };
  
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(content.verificationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar código:', err);
    }
  };
  
  // Determina o ícone baseado no tipo de conteúdo (se houver plataformas)
  const getContentIcon = () => {
    if (!content.platforms || content.platforms.length === 0) {
      return <FileText className="h-12 w-12 text-muted-foreground" />;
    }
    
    const platform = content.platforms[0].toLowerCase();
    if (platform.includes('imagem') || platform.includes('instagram') || platform.includes('pinterest')) {
      return <ImageIcon className="h-12 w-12 text-blue-500" />;
    }
    if (platform.includes('vídeo') || platform.includes('youtube') || platform.includes('tiktok')) {
      return <Video className="h-12 w-12 text-red-500" />;
    }
    if (platform.includes('música') || platform.includes('spotify') || platform.includes('soundcloud')) {
      return <Music className="h-12 w-12 text-green-500" />;
    }
    return <File className="h-12 w-12 text-purple-500" />;
  };
  
  // URL do certificado para compartilhamento
  const certificateUrl = qrData;
  const shareTitle = `Certificado Digital - ${content.creatorName}`;
  const shareDescription = `Conteúdo autenticado digitalmente. Código: ${content.verificationCode}`;
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Conteúdo Assinado
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              <Calendar className="h-4 w-4" />
              {new Date(content.createdAt).toLocaleString('pt-BR')}
            </CardDescription>
            {/* Contador de Verificações */}
            <CardDescription className="flex items-center gap-2 mt-1">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-600">
                {content.verificationCount || 0} {(content.verificationCount || 0) === 1 ? 'verificação' : 'verificações'}
              </span>
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Autêntico
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Thumbnail do Conteúdo */}
        {content.thumbnail && !imageError ? (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
            <img
              src={content.thumbnail}
              alt="Thumbnail do conteúdo"
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={() => setImageError(true)}
            />
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md">
              <p className="text-xs font-semibold text-blue-900">Preview</p>
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-blue-300 flex items-center justify-center">
            {getContentIcon()}
            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md">
              <p className="text-xs font-semibold text-muted-foreground">Sem preview</p>
            </div>
          </div>
        )}
        
        {/* Nome do Criador */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
          <p className="text-xs font-semibold text-blue-900 mb-1">Assinado por</p>
          <p className="text-lg font-bold text-blue-900">{content.creatorName}</p>
        </div>
        
        {/* Código de Verificação */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-xl text-white">
          <p className="text-sm opacity-90 mb-2 text-center">Código de Verificação</p>
          <div className="flex items-center justify-between gap-2 px-2">
            <p className="text-2xl font-bold tracking-[0.3em] font-mono flex-1 text-center">
              {content.verificationCode}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyCode}
              className="text-white hover:bg-white/20 flex-shrink-0"
              title="Copiar código"
            >
              {copiedCode ? (
                <Check className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs opacity-75 mt-3 text-center">
            Use este código para verificar a autenticidade em nosso site
          </p>
        </div>
        
        {/* Conteúdo */}
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm font-medium mb-2">Conteúdo:</p>
          <p className="text-sm text-muted-foreground line-clamp-3">{content.content}</p>
        </div>
        
        {/* Plataformas */}
        {content.platforms && content.platforms.length > 0 && (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Plataformas:</p>
            <div className="flex flex-wrap gap-2">
              {content.platforms.map((platform) => (
                <Badge key={platform} variant="secondary" className="text-xs">
                  {platform}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* 🆕 FASE 4: Seção de Download de Documento Original */}
        {content.filePath && content.fileName && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
            <p className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documento Original Anexado
            </p>
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
            <p className="text-xs text-green-700 mt-3">
              ✅ Este documento foi verificado e armazenado de forma segura
            </p>
          </div>
        )}
        
        {/* QR Code - Sem loading state (já carregado) */}
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border-2 border-dashed border-muted-foreground/25">
          <QRCodeSVG
            id={`qr-${content.id}`}
            value={qrData}
            size={220}
            level="M"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#000000"
          />
          <p className="text-xs text-center text-muted-foreground mt-4">
            URL: {qrData.substring(0, 50)}...
          </p>
          <p className="text-xs text-center text-muted-foreground">
            Tamanho: {qrData.length} caracteres
          </p>
          {content.creatorSocialLinks && Object.keys(content.creatorSocialLinks).length > 0 && (
            <p className="text-xs text-center text-green-600 font-semibold mt-2">
              ✅ Inclui {Object.keys(content.creatorSocialLinks).length} link(s) social(is)
            </p>
          )}
        </div>
        
        <p className="text-xs text-center text-muted-foreground">
          Escaneie o QR Code para abrir o certificado digital
        </p>
        
        {/* Hidden canvas for QR download */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* Share Buttons - Compact Version */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
          <ShareButtons 
            certificateUrl={certificateUrl}
            title={shareTitle}
            description={shareDescription}
            compact={true}
          />
        </div>
        
        {/* Informações Técnicas */}
        <div className="text-xs text-muted-foreground space-y-2 bg-muted/50 p-3 rounded-lg">
          <div className="flex justify-between">
            <span className="font-medium">ID do Certificado:</span>
            <span className="font-mono">{content.id.substring(0, 8)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Hash SHA-256:</span>
            <span className="font-mono">{content.contentHash.substring(0, 16)}...</span>
          </div>
        </div>
        
        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadQR}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            QR Code
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCertificate}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Certificado
          </Button>
        </div>
        
        {onVerify && (
          <Button
            variant="default"
            size="lg"
            onClick={() => onVerify(content.id)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Verificar Autenticidade
          </Button>
        )}
      </CardContent>
    </Card>
  );
}