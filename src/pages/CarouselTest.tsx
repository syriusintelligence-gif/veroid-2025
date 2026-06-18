import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function CarouselTest() {
  const navigate = useNavigate();

  // Dados de teste do carrossel
  const testImages = [
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop',
      order: 0,
      uploadedAt: new Date().toISOString(),
    },
    {
      id: '2',
      url: 'https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=800&h=600&fit=crop',
      order: 1,
      uploadedAt: new Date().toISOString(),
    },
    {
      id: '3',
      url: 'https://images.unsplash.com/photo-1618556658017-280a8e8e8c5a?w=800&h=600&fit=crop',
      order: 2,
      uploadedAt: new Date().toISOString(),
    },
    {
      id: '4',
      url: 'https://images.unsplash.com/photo-1618556667886-76e9a2d3c6e8?w=800&h=600&fit=crop',
      order: 3,
      uploadedAt: new Date().toISOString(),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="bg-white rounded-xl shadow-xl p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Teste de Carrossel de Certificado
          </h1>
          <p className="text-gray-600 mb-8">
            Demonstração da funcionalidade de carrossel com múltiplas imagens
          </p>

          {/* Informações do Certificado Mock */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-600">Código de Verificação:</span>
              <span className="font-mono text-blue-700">TEST-CAROUSEL-2024</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-600">Criador:</span>
              <span className="text-gray-800">João da Silva</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-600">Data:</span>
              <span className="text-gray-800">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {/* Carrossel de Imagens */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Preview do Conteúdo ({testImages.length} imagens)
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-600">
              <Carousel className="w-full max-w-4xl mx-auto">
                <CarouselContent>
                  {testImages.map((image, index) => (
                    <CarouselItem key={image.id}>
                      <div className="relative">
                        <img 
                          src={image.url} 
                          alt={`Imagem ${index + 1} do conteúdo`}
                          className="w-full max-h-96 object-contain rounded-lg"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
                          {index + 1} / {testImages.length}
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
            <h3 className="font-semibold text-green-900 mb-2">✅ Status do Carrossel</h3>
            <ul className="space-y-1 text-sm text-green-800">
              <li>• Carrossel implementado com sucesso</li>
              <li>• Navegação entre imagens funcionando</li>
              <li>• Contador de imagens exibido</li>
              <li>• Botões de navegação anterior/próximo ativos</li>
            </ul>
          </div>

          {/* Exemplo de Imagem Única */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Exemplo com Imagem Única (sem carrossel)
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-600">
              <img 
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop"
                alt="Imagem única"
                className="w-full max-h-96 object-contain rounded-lg"
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Quando há apenas uma imagem, o carrossel não é exibido, apenas a imagem única.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}