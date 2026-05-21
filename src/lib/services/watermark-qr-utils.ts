/**
 * =====================================================
 * WATERMARK QR CODE UTILITIES
 * =====================================================
 * 
 * Utilitários para gerar URLs ultra-compactas para QR Codes.
 * Reduz URLs de ~1380 chars para ~110 chars, tornando QR Codes mais legíveis.
 * 
 * @author VeroID Security Team
 * @version 1.0.0
 * @date 2026-05-21
 */

/**
 * Gera URL ultra-compacta para QR Code (apenas ID e código)
 * 
 * Antes: https://www.veroid.com.br/certificate?d=eyJpIjoiZTQ0ODI2MTktODEyZS00MmI2LWJlYjAtOTU2YWM1Njg5OTA0IiwiYyI6IlTDrXR1bG86IHRlc3RlXG5UaXBvOiBJbWFnZW1cblJlZGVzOiBXaGF0c0FwcFxuQXJxdWl2bzogSUFfcXVlX3RyYW5zZm9ybWFfYXRlbmRpbWVudG9fZW1fdmVuZGFzLnBuZ1xuXG5cbkNvbnRlw7pkbzpcbnRlc3RlIiwiaCI6ImJiZjU5NGIyZjc4M2Q1ZTVkMzVlNGE3MmRlNDM2MmNiIiwicyI6ImZjNTliYmU4ZGM3NWY0NmUyM2VjOTY3MGVlMDUzYTUyIiwicCI6IlZJRC1QVUItWUVYc0xWUzUtX2dXRGJFeExacFJscVpYIiwibiI6InZlcm9pZC5vZmljaWFsIiwidiI6IkZEMkVFMEQ5IiwicGwiOlsiV2hhdHNBcHAiXSwic2wiOnsid2Vic2l0ZSI6Imh0dHBzOi8vd3d3LnZlcm9pZC5jb20uYnIiLCJ5b3V0dWJlIjoiaHR0cHM6Ly93d3cueW91dHViZS5jb20vQHZlcm9pZC5vZmljaWFsIiwiaW5zdGFncmFtIjoiaHR0cHM6Ly93d3cuaW5zdGFncmFtLmNvbS92ZXJvaWQub2ZpY2lhbC8ifSwidGgiOiJkYXRhOmltYWdlL2pwZWc7YmFzZTY0LC85ai80QUFRU2taSlJnQUJBUUFBQVFBQkFBRC80Z0hZU1VORFgxQlNUMFpKVEVVQUFRRUFBQUhJQUFBQUFBUXdBQUJ0Ym5SeVVrZENJRmhaV2lBSDRBQUJBQUVBQUFBQUFBQmhZM053QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQVFBQTl0WUFBUUFBQUFEVExRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFsa1pYTmpBQUFBOEFBQUFDUnlXRmxhQUFBQkZBQUFBQlJuV0ZsYUFBQUJLQUFBQUJSaVdGbGFBQUFCUEFBQUFCUjNkSEIwQUFBQlVBQUFBQlJ5VkZKREFBQUJaQUFBQUNoblZGSkRBQUFCWkFBQUFDaGlWRkpEQUFBQlpBQUFBQ2hqY0hKMEFBQUJqQUFBQUR4dGJIVmpBQUFBQUFBQUFBRUFBQUFNWlc1VlV3QUFBQWdBQUFBY0FITUFVZ0JIQUVKWVdWb2dBQUFBQUFBQWI2SUFBRGoxQUFBRGtGaFpXaUFBQUFBQUFBQmltUUFBdDRVQUFCamFXRmxhSSJ9 (1380 caracteres)
 * 
 * Depois: https://www.veroid.com.br/certificate?d=eyJpIjoiZTQ0ODI2MTktODEyZS00MmI2LWJlYjAtOTU2YWM1Njg5OTA0IiwidiI6IkZEMkVFMEQ5IiwibiI6InZlcm9pZC5vZmljaWFsIn0 (147 caracteres)
 * 
 * Ou AINDA MAIS CURTO usando apenas ID + código: https://www.veroid.com.br/v/FD2EE0D9 (48 caracteres)
 */
export function generateCompactCertificateUrl(
  certificateId: string,
  verificationCode: string,
  creatorName: string
): string {
  console.log('🔧 [CompactURL] Gerando URL ultra-compacta para QR Code...');
  
  // Opção 1: URL ULTRA-CURTA usando apenas código de verificação
  // Prós: Menor QR Code possível (~40-50 chars)
  // Contras: Requer busca por código no backend
  const ultraShortUrl = `${window.location.origin}/v/${verificationCode}`;
  
  // Opção 2: URL CURTA usando dados mínimos compactados
  // Prós: QR Code pequeno (~100-150 chars), inclui ID direto
  // Contras: Um pouco maior que opção 1
  const compact = {
    i: certificateId,
    v: verificationCode,
    n: creatorName,
  };
  
  const jsonStr = JSON.stringify(compact);
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
  const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const shortUrl = `${window.location.origin}/certificate?d=${urlSafe}`;
  
  console.log('✅ [CompactURL] URLs geradas:', {
    ultraShort: ultraShortUrl,
    ultraShortLength: ultraShortUrl.length,
    short: shortUrl,
    shortLength: shortUrl.length,
  });
  
  // 🎯 DECISÃO: Usa URL curta (opção 2) pois já temos suporte no Certificate.tsx
  // A opção 1 (ultra-short) requereria nova rota /v/:code
  
  console.log(`✅ [CompactURL] URL final selecionada: ${shortUrl.length} caracteres`);
  
  return shortUrl;
}

/**
 * Valida se uma URL de certificado é válida
 */
export function isValidCertificateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Verifica se é uma URL do veroid.com.br
    if (!urlObj.hostname.includes('veroid.com.br')) {
      return false;
    }
    
    // Verifica se tem o parâmetro 'd' ou é uma rota '/v/:code'
    const hasDataParam = urlObj.searchParams.has('d');
    const isShortRoute = urlObj.pathname.startsWith('/v/');
    
    return hasDataParam || isShortRoute;
  } catch {
    return false;
  }
}