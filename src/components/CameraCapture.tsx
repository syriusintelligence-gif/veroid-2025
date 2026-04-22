import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onCancel?: () => void;
  isDisabled?: boolean;
}

/**
 * Componente para captura de foto pela câmera do dispositivo
 * Reutilizável para qualquer contexto que precise de captura de imagem
 */
export function CameraCapture({ onCapture, onCancel, isDisabled = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Limpa o stream quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Garante que o vídeo seja reproduzido quando o stream estiver disponível
  useEffect(() => {
    if (stream && videoRef.current && isCameraActive) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error('Erro ao iniciar vídeo:', err);
        setError('Erro ao iniciar visualização da câmera');
      });
    }
  }, [stream, isCameraActive]);

  const startCamera = async () => {
    try {
      setError('');
      setIsLoading(true);

      // Solicita permissão para câmera
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment' // Câmera traseira por padrão (melhor para documentos)
        }
      });

      setStream(mediaStream);
      setIsCameraActive(true);

      // Aguarda um pouco para garantir que o vídeo está pronto
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => {
            console.error('Erro ao reproduzir vídeo:', err);
            setError('Erro ao iniciar visualização da câmera');
          });
        }
      }, 100);
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      setIsCameraActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !stream) {
      return;
    }

    try {
      // Cria canvas para capturar a imagem
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
      }

      // Converte para base64 com qualidade alta
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

      // Para o stream da câmera
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);

      // Envia a imagem capturada
      onCapture(imageDataUrl);
    } catch (err) {
      console.error('Erro ao capturar foto:', err);
      setError('Erro ao capturar foto. Tente novamente.');
    }
  };

  const handleCancel = () => {
    // Para o stream da câmera
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setError('');
    
    if (onCancel) {
      onCancel();
    }
  };

  if (!isCameraActive) {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          onClick={startCamera}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
          disabled={isDisabled || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Iniciando câmera...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              📸 Tirar Foto pela Câmera
            </>
          )}
        </Button>
        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
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

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          className="flex-1"
        >
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={capturePhoto}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          <Camera className="mr-2 h-4 w-4" />
          Capturar Foto
        </Button>
      </div>
    </div>
  );
}