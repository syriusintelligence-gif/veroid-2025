import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLongUrl } from '@/lib/services/url-shortener';
import { Loader2 } from 'lucide-react';

export default function ShortUrlRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    async function redirect() {
      if (!shortCode) {
        setError(true);
        return;
      }

      try {
        const longUrl = await getLongUrl(shortCode);
        
        if (longUrl) {
          // Extrai apenas o caminho da URL longa
          const url = new URL(longUrl);
          navigate(url.pathname + url.search, { replace: true });
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Erro ao redirecionar:', err);
        setError(true);
      }
    }

    redirect();
  }, [shortCode, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link não encontrado</h1>
          <p className="text-gray-600 mb-6">
            Este link curto não existe ou expirou.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar para o início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Redirecionando...</p>
      </div>
    </div>
  );
}