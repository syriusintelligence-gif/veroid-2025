import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface InstructionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstructionsModal({ open, onOpenChange }: InstructionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-900">
            <FileText className="h-6 w-6 text-purple-600" />
            Guia Rápido de Instruções
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-700">
            Baixe nosso guia rápido completo para aprender como usar todas as funcionalidades da plataforma Vero iD.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => window.open('/docs/guia-rapido.pdf', '_blank')}
            >
              <FileText className="mr-2 h-5 w-5" />
              Visualizar Guia Rápido
            </Button>
            
            <Button 
              variant="outline"
              className="flex-1 border-2 border-purple-600 text-purple-700 hover:bg-purple-50 font-semibold"
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/docs/guia-rapido.pdf';
                link.download = 'Vero-iD-Guia-Rapido.pdf';
                link.click();
              }}
            >
              <FileText className="mr-2 h-5 w-5" />
              Baixar PDF
            </Button>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
            <p className="text-sm font-semibold text-purple-900 mb-2">
              📚 O que você encontrará no guia:
            </p>
            <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
              <li>Como gerar suas chaves criptográficas</li>
              <li>Passo a passo para assinar conteúdos</li>
              <li>Como verificar autenticidade de documentos</li>
              <li>Gerenciamento de certificados digitais</li>
              <li>Dicas de segurança e melhores práticas</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}