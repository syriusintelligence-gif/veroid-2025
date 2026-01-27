/**
 * 🆕 DOCUMENT PREVIEW GENERATOR
 * Gera preview visual para documentos de texto (DOCX, PDF, TXT, etc.)
 * Exibe ícone representativo e informações do arquivo no certificado
 */

/**
 * Mapeamento de extensões para ícones e cores
 */
const DOCUMENT_ICONS: Record<string, { icon: string; color: string; bgColor: string }> = {
  // Documentos Word
  'doc': { icon: '📄', color: '#2B579A', bgColor: '#E7F0FF' },
  'docx': { icon: '📄', color: '#2B579A', bgColor: '#E7F0FF' },
  
  // PDFs
  'pdf': { icon: '📋', color: '#DC3545', bgColor: '#FFE5E8' },
  
  // Texto
  'txt': { icon: '📝', color: '#6C757D', bgColor: '#F8F9FA' },
  'md': { icon: '📝', color: '#6C757D', bgColor: '#F8F9FA' },
  
  // Planilhas
  'xls': { icon: '📊', color: '#217346', bgColor: '#E8F5E9' },
  'xlsx': { icon: '📊', color: '#217346', bgColor: '#E8F5E9' },
  'csv': { icon: '📊', color: '#217346', bgColor: '#E8F5E9' },
  
  // Apresentações
  'ppt': { icon: '📽️', color: '#D24726', bgColor: '#FFEBE5' },
  'pptx': { icon: '📽️', color: '#D24726', bgColor: '#FFEBE5' },
  
  // OpenDocument
  'odt': { icon: '📄', color: '#0B5394', bgColor: '#E7F0FF' },
  'ods': { icon: '📊', color: '#0B5394', bgColor: '#E7F0FF' },
  'odp': { icon: '📽️', color: '#0B5394', bgColor: '#E7F0FF' },
  
  // Outros formatos de texto
  'rtf': { icon: '📝', color: '#6C757D', bgColor: '#F8F9FA' },
  'json': { icon: '{ }', color: '#FFC107', bgColor: '#FFF9E5' },
  'xml': { icon: '<>', color: '#FF6B35', bgColor: '#FFE8E0' },
  
  // Fallback
  'default': { icon: '📎', color: '#6C757D', bgColor: '#F8F9FA' }
};

/**
 * Extrai a extensão do arquivo
 */
function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Formata o tamanho do arquivo para exibição
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Gera um preview visual para documentos
 * Retorna um Data URL com SVG representando o documento
 */
export function generateDocumentPreview(
  fileName: string,
  fileSize: number,
  mimeType: string
): string {
  const extension = getFileExtension(fileName);
  const iconData = DOCUMENT_ICONS[extension] || DOCUMENT_ICONS['default'];
  
  // Trunca nome do arquivo se muito longo
  const displayName = fileName.length > 30 
    ? fileName.substring(0, 27) + '...' 
    : fileName;
  
  const formattedSize = formatFileSize(fileSize);
  
  // Gera SVG do preview
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="800" height="600" fill="${iconData.bgColor}"/>
      
      <!-- Borda decorativa -->
      <rect x="20" y="20" width="760" height="560" 
            fill="white" 
            stroke="${iconData.color}" 
            stroke-width="4" 
            rx="16"/>
      
      <!-- Ícone do documento (grande) -->
      <text x="400" y="220" 
            font-size="120" 
            text-anchor="middle" 
            dominant-baseline="middle">
        ${iconData.icon}
      </text>
      
      <!-- Nome do arquivo -->
      <text x="400" y="320" 
            font-family="Arial, sans-serif" 
            font-size="28" 
            font-weight="bold" 
            fill="${iconData.color}" 
            text-anchor="middle">
        ${displayName}
      </text>
      
      <!-- Tipo de arquivo (extensão) -->
      <rect x="350" y="350" width="100" height="40" 
            fill="${iconData.color}" 
            rx="8"/>
      <text x="400" y="375" 
            font-family="Arial, sans-serif" 
            font-size="20" 
            font-weight="bold" 
            fill="white" 
            text-anchor="middle" 
            dominant-baseline="middle">
        .${extension.toUpperCase()}
      </text>
      
      <!-- Tamanho do arquivo -->
      <text x="400" y="430" 
            font-family="Arial, sans-serif" 
            font-size="24" 
            fill="#666" 
            text-anchor="middle">
        📊 ${formattedSize}
      </text>
      
      <!-- Indicador de documento assinado -->
      <rect x="300" y="480" width="200" height="50" 
            fill="#10B981" 
            rx="25"/>
      <text x="400" y="508" 
            font-family="Arial, sans-serif" 
            font-size="20" 
            font-weight="bold" 
            fill="white" 
            text-anchor="middle" 
            dominant-baseline="middle">
        ✓ Documento Assinado
      </text>
    </svg>
  `;
  
  // Converte SVG para Data URL
  const encodedSvg = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  
  return `data:image/svg+xml,${encodedSvg}`;
}

/**
 * Verifica se um arquivo é um documento (não imagem/vídeo)
 */
export function isDocumentFile(mimeType: string): boolean {
  const documentMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/rtf',
    'text/rtf',
    'application/json',
    'application/xml',
    'text/xml'
  ];
  
  return documentMimeTypes.includes(mimeType);
}

/**
 * Obtém informações de exibição do documento
 */
export function getDocumentDisplayInfo(fileName: string, mimeType: string): {
  icon: string;
  color: string;
  bgColor: string;
  typeName: string;
} {
  const extension = getFileExtension(fileName);
  const iconData = DOCUMENT_ICONS[extension] || DOCUMENT_ICONS['default'];
  
  // Mapeamento de tipos
  const typeNames: Record<string, string> = {
    'doc': 'Documento Word',
    'docx': 'Documento Word',
    'pdf': 'Documento PDF',
    'txt': 'Arquivo de Texto',
    'md': 'Markdown',
    'xls': 'Planilha Excel',
    'xlsx': 'Planilha Excel',
    'csv': 'Planilha CSV',
    'ppt': 'Apresentação PowerPoint',
    'pptx': 'Apresentação PowerPoint',
    'odt': 'Documento OpenDocument',
    'ods': 'Planilha OpenDocument',
    'odp': 'Apresentação OpenDocument',
    'rtf': 'Rich Text Format',
    'json': 'Arquivo JSON',
    'xml': 'Arquivo XML'
  };
  
  return {
    ...iconData,
    typeName: typeNames[extension] || 'Documento'
  };
}