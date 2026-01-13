import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SignedContent, getSignedContentById } from '@/lib/supabase-crypto';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { decodeContentFromUrl } from '@/lib/qrcode';

interface DebugLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

export default function CertificateDebug() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<SignedContent | null>(null);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [loading, setLoading] = useState(true);

  const addLog = (type: DebugLog['type'], message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [...prev, { timestamp, type, message, data }]);
    console.log(`[${timestamp}] ${message}`, data || '');
  };

  useEffect(() => {
    loadCertificateWithDebug();
  }, [searchParams]);

  const loadCertificateWithDebug = async () => {
    addLog('info', '🚀 Iniciando carregamento do certificado...');
    
    // Tenta parâmetro compactado 'd' primeiro
    let dataParam = searchParams.get('d');
    
    if (!dataParam) {
      dataParam = searchParams.get('data');
    }
    
    if (!dataParam) {
      addLog('error', '❌ Nenhum parâmetro encontrado na URL');
      setLoading(false);
      return;
    }
    
    addLog('success', '✅ Parâmetro encontrado na URL');
    addLog('info', `📊 Tamanho do parâmetro: ${dataParam.length} caracteres`);
    
    // Decodifica URL
    const decodedContent = decodeContentFromUrl(dataParam);
    
    if (!decodedContent) {
      addLog('error', '❌ Falha ao decodificar conteúdo da URL');
      setLoading(false);
      return;
    }
    
    addLog('success', '✅ Conteúdo decodificado da URL');
    addLog('info', `📄 ID do conteúdo: ${decodedContent.id}`);
    addLog('info', `👤 Criador: ${decodedContent.creatorName}`);
    
    // Verifica links sociais na URL decodificada
    if (decodedContent.creatorSocialLinks) {
      const linksCount = Object.keys(decodedContent.creatorSocialLinks).length;
      addLog('success', `✅ Links sociais encontrados na URL: ${linksCount}`, decodedContent.creatorSocialLinks);
    } else {
      addLog('warning', '⚠️ Nenhum link social encontrado na URL decodificada');
    }
    
    // Busca conteúdo completo do Supabase
    addLog('info', '🔍 Buscando conteúdo completo do Supabase...');
    
    try {
      const fullContent = await getSignedContentById(decodedContent.id);
      
      if (fullContent) {
        addLog('success', '✅ Conteúdo carregado do Supabase');
        
        // Verifica links sociais do Supabase
        if (fullContent.creatorSocialLinks) {
          const linksCount = Object.keys(fullContent.creatorSocialLinks).length;
          addLog('success', `✅ Links sociais do Supabase: ${linksCount}`, fullContent.creatorSocialLinks);
        } else {
          addLog('error', '❌ Nenhum link social retornado do Supabase');
        }
        
        setContent(fullContent);
      } else {
        addLog('warning', '⚠️ Primeira tentativa falhou, tentando novamente...');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const retryContent = await getSignedContentById(decodedContent.id);
        
        if (retryContent) {
          addLog('success', '✅ Conteúdo carregado na segunda tentativa');
          
          if (retryContent.creatorSocialLinks) {
            const linksCount = Object.keys(retryContent.creatorSocialLinks).length;
            addLog('success', `✅ Links sociais: ${linksCount}`, retryContent.creatorSocialLinks);
          } else {
            addLog('error', '❌ Nenhum link social na segunda tentativa');
          }
          
          setContent(retryContent);
        } else {
          addLog('error', '❌ Falha ao buscar do Supabase após retry');
          addLog('warning', '⚠️ Usando dados da URL (sem links sociais)');
          setContent(decodedContent);
        }
      }
    } catch (error) {
      addLog('error', '❌ Erro ao buscar do Supabase', error);
      setContent(decodedContent);
    }
    
    setLoading(false);
  };

  const getLogIcon = (type: DebugLog['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default: return <Shield className="h-5 w-5 text-blue-600" />;
    }
  };

  const getLogColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold">Debug do Certificado</h1>
                <p className="text-sm text-gray-600">Diagnóstico de Links Sociais</p>
              </div>
            </div>
            <Button onClick={() => navigate(-1)} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
          
          {loading && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Carregando e analisando...</span>
            </div>
          )}
        </div>

        {/* Status Summary */}
        {!loading && content && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold mb-4">📊 Resumo do Status</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold w-32">ID:</span>
                <span className="text-sm font-mono break-all">{content.id}</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold w-32">Criador:</span>
                <span>{content.creatorName}</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold w-32">Plataformas:</span>
                <span>{content.platforms?.join(', ') || 'Nenhuma'}</span>
              </div>
              
              <div className={`flex items-center gap-3 p-3 rounded-lg ${
                content.creatorSocialLinks && Object.keys(content.creatorSocialLinks).length > 0
                  ? 'bg-green-50 border-2 border-green-300'
                  : 'bg-red-50 border-2 border-red-300'
              }`}>
                <span className="font-semibold w-32">Links Sociais:</span>
                {content.creatorSocialLinks && Object.keys(content.creatorSocialLinks).length > 0 ? (
                  <div className="flex-1">
                    <div className="font-bold text-green-700 mb-2">
                      ✅ {Object.keys(content.creatorSocialLinks).length} link(s) encontrado(s)
                    </div>
                    <div className="space-y-1">
                      {Object.entries(content.creatorSocialLinks).map(([platform, url]) => (
                        <div key={platform} className="text-sm">
                          <span className="font-medium">{platform}:</span>{' '}
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
                            {url}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className="font-bold text-red-700">❌ Nenhum link social encontrado</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Debug Logs */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">📝 Logs de Debug</h2>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-2 ${getLogColor(log.type)}`}
              >
                <div className="flex items-start gap-3">
                  {getLogIcon(log.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono opacity-60">{log.timestamp}</span>
                    </div>
                    <p className="font-medium break-words">{log.message}</p>
                    {log.data && (
                      <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-3">
          <Button
            onClick={() => window.location.reload()}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            🔄 Recarregar Teste
          </Button>
          <Button
            onClick={() => {
              const text = logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
              navigator.clipboard.writeText(text);
              alert('Logs copiados para a área de transferência!');
            }}
            variant="outline"
            className="flex-1"
          >
            📋 Copiar Logs
          </Button>
        </div>
      </div>
    </div>
  );
}