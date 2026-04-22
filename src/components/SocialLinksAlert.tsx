import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LinkIcon, Instagram, X, Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase-auth';

interface SocialLinksAlertProps {
  userId: string;
  className?: string;
}

export default function SocialLinksAlert({ userId, className = '' }: SocialLinksAlertProps) {
  const navigate = useNavigate();
  const [hasSocialLinks, setHasSocialLinks] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Verifica se o alerta já foi dispensado nesta sessão
    const dismissed = sessionStorage.getItem(`social_links_alert_dismissed_${userId}`);
    if (dismissed === 'true') {
      setIsDismissed(true);
      setIsLoading(false);
      return;
    }

    checkSocialLinksStatus();
  }, [userId]);

  const checkSocialLinksStatus = async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        setHasSocialLinks(false);
        return;
      }

      // Verifica se o usuário tem pelo menos um link social cadastrado
      const socialLinks = user.socialLinks;
      const hasAnyLink = socialLinks && Object.values(socialLinks).some(link => link && link.trim() !== '');
      
      setHasSocialLinks(hasAnyLink);
    } catch (error) {
      console.error('Erro ao verificar status dos links sociais:', error);
      setHasSocialLinks(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    // Salva no sessionStorage para não mostrar novamente nesta sessão
    sessionStorage.setItem(`social_links_alert_dismissed_${userId}`, 'true');
    setIsDismissed(true);
  };

  const handleAddSocialLinks = () => {
    navigate('/profile');
  };

  // Não mostra nada se está carregando, já foi dispensado ou já tem links cadastrados
  if (isLoading) {
    return null;
  }

  if (isDismissed || hasSocialLinks) {
    return null;
  }

  return (
    <Alert 
      className={`border-blue-500 bg-blue-50 dark:bg-blue-950/20 ${className}`}
    >
      <LinkIcon className="h-5 w-5 text-blue-600" />
      <div className="flex-1">
        <AlertTitle className="text-blue-800 dark:text-blue-200 font-semibold flex items-center gap-2">
          🔗 Conecte suas Redes Sociais
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300 mt-1">
          <p className="mb-3">
            Cadastre seus perfis nas redes sociais para que apareçam nos certificados de autenticação do seu conteúdo. 
            Isso ajuda a fortalecer sua identidade digital e facilita para as pessoas encontrarem você.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleAddSocialLinks}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Instagram className="h-4 w-4 mr-2" />
              Cadastrar Redes Sociais
            </Button>
            <Button 
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-blue-700 hover:text-blue-800 hover:bg-blue-100"
            >
              Lembrar depois
            </Button>
          </div>
        </AlertDescription>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}