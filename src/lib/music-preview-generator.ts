/**
 * 🎵 MUSIC PREVIEW GENERATOR
 * Gera preview visual para arquivos de música (MP3, WAV, FLAC, etc.)
 * Exibe ícone representativo, título da música e informações do arquivo no certificado
 */

/**
 * Mapeamento de extensões de áudio para ícones e cores
 */
const MUSIC_ICONS: Record<string, { icon: string; color: string; bgColor: string; gradient: string }> = {
  // Formatos de áudio comuns
  'mp3': { icon: '🎵', color: '#FF6B6B', bgColor: '#FFE5E5', gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)' },
  'wav': { icon: '🎼', color: '#4ECDC4', bgColor: '#E5F9F7', gradient: 'linear-gradient(135deg, #4ECDC4 0%, #6FE0D8 100%)' },
  'flac': { icon: '🎧', color: '#9B59B6', bgColor: '#F4E8F9', gradient: 'linear-gradient(135deg, #9B59B6 0%, #B57BC7 100%)' },
  'aac': { icon: '🎵', color: '#3498DB', bgColor: '#E8F4FC', gradient: 'linear-gradient(135deg, #3498DB 0%, #5DADE2 100%)' },
  'm4a': { icon: '🎵', color: '#3498DB', bgColor: '#E8F4FC', gradient: 'linear-gradient(135deg, #3498DB 0%, #5DADE2 100%)' },
  'ogg': { icon: '🎶', color: '#E67E22', bgColor: '#FDF2E8', gradient: 'linear-gradient(135deg, #E67E22 0%, #F39C12 100%)' },
  'wma': { icon: '🎵', color: '#1ABC9C', bgColor: '#E8F8F5', gradient: 'linear-gradient(135deg, #1ABC9C 0%, #48C9B0 100%)' },
  'opus': { icon: '🎶', color: '#E74C3C', bgColor: '#FDECEA', gradient: 'linear-gradient(135deg, #E74C3C 0%, #EC7063 100%)' },
  'aiff': { icon: '🎼', color: '#34495E', bgColor: '#ECF0F1', gradient: 'linear-gradient(135deg, #34495E 0%, #5D6D7E 100%)' },
  
  // Fallback
  'default': { icon: '🎵', color: '#95A5A6', bgColor: '#F8F9FA', gradient: 'linear-gradient(135deg, #95A5A6 0%, #BDC3C7 100%)' }
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
 * Extrai o título da música do nome do arquivo
 * Remove extensão e tenta limpar o nome
 */
function extractMusicTitle(fileName: string): string {
  // Remove extensão
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  
  // Remove números no início (ex: "01 - Song Name" -> "Song Name")
  let title = nameWithoutExt.replace(/^\d+\s*[-_.]?\s*/, '');
  
  // Remove underscores e hífens extras
  title = title.replace(/[_-]+/g, ' ');
  
  // Capitaliza primeira letra de cada palavra
  title = title.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Trunca se muito longo
  if (title.length > 40) {
    title = title.substring(0, 37) + '...';
  }
  
  return title || fileName;
}

/**
 * Formata duração de áudio (se disponível)
 * Por enquanto, retorna string vazia pois não temos metadados
 */
function formatDuration(): string {
  return ''; // Placeholder - poderia ser implementado com biblioteca de metadados
}

/**
 * Gera um preview visual para arquivos de música
 * Retorna um Data URL com SVG representando a música
 */
export function generateMusicPreview(
  fileName: string,
  fileSize: number,
  mimeType: string,
  title?: string
): string {
  const extension = getFileExtension(fileName);
  const iconData = MUSIC_ICONS[extension] || MUSIC_ICONS['default'];
  
  // Usa título fornecido ou extrai do nome do arquivo
  const musicTitle = title || extractMusicTitle(fileName);
  
  const formattedSize = formatFileSize(fileSize);
  const duration = formatDuration();
  
  // Gera SVG do preview com design moderno e atraente
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Gradiente para fundo -->
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${iconData.bgColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:1" />
        </linearGradient>
        
        <!-- Gradiente para círculo principal -->
        <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${iconData.color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${iconData.color};stop-opacity:0.7" />
        </linearGradient>
        
        <!-- Sombra -->
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="10"/>
          <feOffset dx="0" dy="5" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Background com gradiente -->
      <rect width="800" height="600" fill="url(#bgGradient)"/>
      
      <!-- Ondas sonoras decorativas (fundo) -->
      <path d="M 0 300 Q 100 250, 200 300 T 400 300 T 600 300 T 800 300" 
            stroke="${iconData.color}" 
            stroke-width="2" 
            fill="none" 
            opacity="0.1"/>
      <path d="M 0 320 Q 100 270, 200 320 T 400 320 T 600 320 T 800 320" 
            stroke="${iconData.color}" 
            stroke-width="2" 
            fill="none" 
            opacity="0.1"/>
      <path d="M 0 280 Q 100 230, 200 280 T 400 280 T 600 280 T 800 280" 
            stroke="${iconData.color}" 
            stroke-width="2" 
            fill="none" 
            opacity="0.1"/>
      
      <!-- Círculo principal (disco de vinil estilizado) -->
      <circle cx="400" cy="250" r="120" 
              fill="url(#circleGradient)" 
              filter="url(#shadow)"/>
      
      <!-- Círculo interno (centro do disco) -->
      <circle cx="400" cy="250" r="40" 
              fill="white" 
              opacity="0.3"/>
      
      <!-- Ícone do tipo de música (grande) -->
      <text x="400" y="265" 
            font-size="80" 
            text-anchor="middle" 
            dominant-baseline="middle">
        ${iconData.icon}
      </text>
      
      <!-- Título da música -->
      <text x="400" y="410" 
            font-family="Arial, sans-serif" 
            font-size="32" 
            font-weight="bold" 
            fill="${iconData.color}" 
            text-anchor="middle">
        ${musicTitle}
      </text>
      
      <!-- Informações do arquivo -->
      <g transform="translate(400, 460)">
        <!-- Formato do arquivo -->
        <rect x="-120" y="0" width="100" height="35" 
              fill="${iconData.color}" 
              rx="17.5"/>
        <text x="-70" y="22" 
              font-family="Arial, sans-serif" 
              font-size="18" 
              font-weight="bold" 
              fill="white" 
              text-anchor="middle" 
              dominant-baseline="middle">
          .${extension.toUpperCase()}
        </text>
        
        <!-- Tamanho do arquivo -->
        <text x="30" y="22" 
              font-family="Arial, sans-serif" 
              font-size="20" 
              fill="#666" 
              text-anchor="middle" 
              dominant-baseline="middle">
          📊 ${formattedSize}
        </text>
      </g>
      
      <!-- Indicador de música assinada -->
      <rect x="275" y="510" width="250" height="55" 
            fill="#10B981" 
            rx="27.5"
            filter="url(#shadow)"/>
      <text x="400" y="540" 
            font-family="Arial, sans-serif" 
            font-size="22" 
            font-weight="bold" 
            fill="white" 
            text-anchor="middle" 
            dominant-baseline="middle">
        ✓ Música Assinada
      </text>
      
      <!-- Equalizer decorativo (cantos) -->
      <g opacity="0.2">
        <rect x="50" y="480" width="8" height="40" fill="${iconData.color}" rx="4"/>
        <rect x="65" y="460" width="8" height="60" fill="${iconData.color}" rx="4"/>
        <rect x="80" y="470" width="8" height="50" fill="${iconData.color}" rx="4"/>
        
        <rect x="742" y="480" width="8" height="40" fill="${iconData.color}" rx="4"/>
        <rect x="727" y="460" width="8" height="60" fill="${iconData.color}" rx="4"/>
        <rect x="712" y="470" width="8" height="50" fill="${iconData.color}" rx="4"/>
      </g>
    </svg>
  `;
  
  // Converte SVG para Data URL
  const encodedSvg = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  
  return `data:image/svg+xml,${encodedSvg}`;
}

/**
 * Verifica se um arquivo é de música/áudio
 */
export function isMusicFile(mimeType: string): boolean {
  const musicMimeTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/flac',
    'audio/x-flac',
    'audio/aac',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/ogg',
    'audio/opus',
    'audio/webm',
    'audio/wma',
    'audio/x-ms-wma',
    'audio/aiff',
    'audio/x-aiff'
  ];
  
  return musicMimeTypes.includes(mimeType) || mimeType.startsWith('audio/');
}

/**
 * Obtém informações de exibição da música
 */
export function getMusicDisplayInfo(fileName: string, mimeType: string): {
  icon: string;
  color: string;
  bgColor: string;
  typeName: string;
  title: string;
} {
  const extension = getFileExtension(fileName);
  const iconData = MUSIC_ICONS[extension] || MUSIC_ICONS['default'];
  
  // Mapeamento de tipos
  const typeNames: Record<string, string> = {
    'mp3': 'Áudio MP3',
    'wav': 'Áudio WAV',
    'flac': 'Áudio FLAC',
    'aac': 'Áudio AAC',
    'm4a': 'Áudio M4A',
    'ogg': 'Áudio OGG',
    'wma': 'Áudio WMA',
    'opus': 'Áudio OPUS',
    'aiff': 'Áudio AIFF'
  };
  
  return {
    ...iconData,
    typeName: typeNames[extension] || 'Arquivo de Áudio',
    title: extractMusicTitle(fileName)
  };
}