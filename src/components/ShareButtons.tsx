import { Button } from '@/components/ui/button';
import { 
  Share2, 
  Facebook, 
  Twitter, 
  Linkedin, 
  MessageCircle, 
  Link as LinkIcon,
  Check,
  Instagram
} from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ShareButtonsProps {
  certificateUrl: string;
  title: string;
  description?: string;
  compact?: boolean;
}

export default function ShareButtons({ 
  certificateUrl, 
  title, 
  description = 'Certificado Digital Vero iD',
  compact = false 
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  
  const shareText = `${title}\n\n${description}\n\nVerifique a autenticidade: ${certificateUrl}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(certificateUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };
  
  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: certificateUrl,
        });
      } catch (err) {
        console.error('Erro ao compartilhar:', err);
      }
    } else {
      // Fallback para copiar link
      handleCopyLink();
    }
  };
  
  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(certificateUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };
  
  const handleTwitterShare = () => {
    const text = encodeURIComponent(`${title}\n\n${description}`);
    const url = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(certificateUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };
  
  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certificateUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };
  
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(shareText);
    const url = `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };
  
  const handleInstagramShare = () => {
    // Instagram não tem API pública de compartilhamento web
    // Copia o link e instrui o usuário
    handleCopyLink();
    alert('Link copiado! Cole no Instagram Stories ou em uma postagem.');
  };
  
  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Compartilhar Certificado</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {navigator.share && (
            <>
              <DropdownMenuItem onClick={handleWebShare} className="cursor-pointer">
                <Share2 className="mr-2 h-4 w-4" />
                <span>Compartilhar...</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          <DropdownMenuItem onClick={handleFacebookShare} className="cursor-pointer">
            <Facebook className="mr-2 h-4 w-4 text-blue-600" />
            <span>Facebook</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleTwitterShare} className="cursor-pointer">
            <Twitter className="mr-2 h-4 w-4 text-sky-500" />
            <span>Twitter / X</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleLinkedInShare} className="cursor-pointer">
            <Linkedin className="mr-2 h-4 w-4 text-blue-700" />
            <span>LinkedIn</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleWhatsAppShare} className="cursor-pointer">
            <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
            <span>WhatsApp</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleInstagramShare} className="cursor-pointer">
            <Instagram className="mr-2 h-4 w-4 text-pink-600" />
            <span>Instagram</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-600" />
                <span className="text-green-600">Link Copiado!</span>
              </>
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                <span>Copiar Link</span>
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-center mb-2">Compartilhar Certificado</div>
      
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFacebookShare}
          className="flex flex-col items-center gap-1 h-auto py-3"
        >
          <Facebook className="h-5 w-5 text-blue-600" />
          <span className="text-xs">Facebook</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleTwitterShare}
          className="flex flex-col items-center gap-1 h-auto py-3"
        >
          <Twitter className="h-5 w-5 text-sky-500" />
          <span className="text-xs">Twitter</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleLinkedInShare}
          className="flex flex-col items-center gap-1 h-auto py-3"
        >
          <Linkedin className="h-5 w-5 text-blue-700" />
          <span className="text-xs">LinkedIn</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleWhatsAppShare}
          className="flex flex-col items-center gap-1 h-auto py-3"
        >
          <MessageCircle className="h-5 w-5 text-green-600" />
          <span className="text-xs">WhatsApp</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleInstagramShare}
          className="flex flex-col items-center gap-1 h-auto py-3"
        >
          <Instagram className="h-5 w-5 text-pink-600" />
          <span className="text-xs">Instagram</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="flex flex-col items-center gap-1 h-auto py-3"
        >
          {copied ? (
            <>
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-xs text-green-600">Copiado!</span>
            </>
          ) : (
            <>
              <LinkIcon className="h-5 w-5" />
              <span className="text-xs">Copiar</span>
            </>
          )}
        </Button>
      </div>
      
      {navigator.share && (
        <Button
          variant="default"
          size="sm"
          onClick={handleWebShare}
          className="w-full"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Mais Opções de Compartilhamento
        </Button>
      )}
    </div>
  );
}