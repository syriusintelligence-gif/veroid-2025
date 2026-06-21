/**
 * ============================================
 * HELPER: keyVisual
 * ============================================
 *
 * Funções utilitárias para exibir chaves públicas de forma visualmente
 * distinta nos certificados (página, modal de verificação e HTML baixável).
 *
 * Recursos:
 * - getKeyVisualSeed(publicKey): retorna uma seed estável (16 hex chars)
 *   para alimentar o KeyIdenticon de forma consistente entre Dashboard,
 *   Certificate e VerificationResult.
 * - getKeyShortSuffix(publicKey, n): retorna os últimos N caracteres (default 20).
 * - generateIdenticonSVG(seed, options): gera uma string SVG inline
 *   determinística (mesmo padrão usado no componente React `KeyIdenticon`)
 *   para uso em HTMLs estáticos baixáveis (qrcode.ts).
 *
 * IMPORTANTE: a função `generateIdenticonSVG` produz EXATAMENTE o mesmo
 * padrão visual que o componente `KeyIdenticon.tsx` para garantir
 * consistência total entre todas as superfícies do app.
 * ============================================
 */

/**
 * Deriva uma seed hexadecimal estável a partir da chave pública para uso
 * no identicon. Como `SignedContent.publicKey` é uma string em base64/PEM,
 * usamos um hash simples (FNV-1a) sobre a chave inteira para gerar
 * 16 caracteres hexadecimais determinísticos.
 *
 * Mesma chave → mesma seed → mesmo identicon, sempre.
 */
export function getKeyVisualSeed(publicKey: string): string {
  if (!publicKey) return '0'.repeat(16);

  // FNV-1a 64-bit (implementado com dois inteiros 32-bit para precisão segura em JS)
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < publicKey.length; i++) {
    const c = publicKey.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= (c + i);
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }

  const hex1 = h1.toString(16).padStart(8, '0');
  const hex2 = h2.toString(16).padStart(8, '0');
  return (hex1 + hex2).toLowerCase();
}

/**
 * Retorna os últimos N caracteres da chave pública (default: 20).
 */
export function getKeyShortSuffix(publicKey: string, n: number = 20): string {
  if (!publicKey) return '';
  return publicKey.slice(-n);
}

/**
 * 🆕 Versão SHA-256 da seed visual da chave pública.
 *
 * IMPORTANTE: esta função produz EXATAMENTE o mesmo identificador de 16
 * caracteres hexadecimais que o Dashboard exibe (campo `publicKeyHash`
 * gerado em `src/lib/crypto.ts` durante `generateKeyPair`).
 *
 * Como o Dashboard calcula o SHA-256 sobre o JSON da chave pública (JWK)
 * antes de aplicar o prefixo `VID-PUB-` e o `btoa`, precisamos reverter
 * essa transformação aqui:
 *   1. remover o prefixo `VID-PUB-` (se presente)
 *   2. aplicar `atob` para obter o JSON original
 *   3. calcular SHA-256 do JSON
 *   4. retornar os 16 primeiros caracteres hex
 *
 * Em qualquer falha (chave em formato legado/diferente), fazemos fallback
 * para SHA-256 da string completa, garantindo que o resultado seja
 * sempre determinístico — nunca quebra o fluxo existente.
 *
 * É assíncrona porque `crypto.subtle.digest` é assíncrono.
 */
export async function getKeyVisualSeedSHA256(publicKey: string): Promise<string> {
  if (!publicKey) return '0'.repeat(16);

  try {
    let payload = publicKey;

    // Tenta reverter o formato `VID-PUB-<base64(JWK JSON)>` para obter o JWK JSON
    if (publicKey.startsWith('VID-PUB-')) {
      const base64Part = publicKey.substring('VID-PUB-'.length);
      try {
        payload = atob(base64Part);
      } catch {
        // Se atob falhar, mantém a string original como payload
        payload = publicKey;
      }
    }

    const buffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(payload)
    );
    const hex = Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.substring(0, 16);
  } catch (err) {
    console.error('[getKeyVisualSeedSHA256] Falha ao calcular SHA-256:', err);
    // Fallback final: usa a versão FNV-1a síncrona para manter algo determinístico
    return getKeyVisualSeed(publicKey);
  }
}

/* ============================================================
 * GERAÇÃO DE IDENTICON SVG (para HTML estático baixável)
 * ============================================================ */

function hexPairToInt(hex: string, index: number): number {
  const pair = hex.substring(index, index + 2);
  const n = parseInt(pair, 16);
  return Number.isFinite(n) ? n : 0;
}

function deriveColorFromHash(hash: string): string {
  const safeHash = hash || '0'.repeat(16);
  const h = hexPairToInt(safeHash, 0);
  const s = hexPairToInt(safeHash, 2);
  const l = hexPairToInt(safeHash, 4);

  const hue = Math.floor((h / 255) * 360);
  const saturation = 55 + Math.floor((s / 255) * 30);
  const lightness = 40 + Math.floor((l / 255) * 20);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function buildPatternFromHash(hash: string): boolean[][] {
  const safeHash = hash || '0'.repeat(16);
  const rows = 5;
  const uniqueCols = 3;
  const matrix: boolean[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: boolean[] = [false, false, false, false, false];
    for (let c = 0; c < uniqueCols; c++) {
      const idx = r * uniqueCols + c;
      const charHex = safeHash.charAt(idx % safeHash.length);
      const value = parseInt(charHex, 16);
      const filled = Number.isFinite(value) && value % 2 === 0;
      row[c] = filled;
      if (c === 0) row[4] = filled;
      if (c === 1) row[3] = filled;
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * Gera uma string SVG inline determinística para o identicon, usando a
 * MESMA lógica do componente React `KeyIdenticon.tsx`. Use este helper
 * quando precisar embutir o identicon em HTML estático (ex: certificado
 * baixável gerado em `qrcode.ts`).
 */
export function generateIdenticonSVG(
  seed: string,
  options: { size?: number; backgroundColor?: string } = {}
): string {
  const size = options.size ?? 64;
  const backgroundColor = options.backgroundColor ?? '#f3f4f6';

  const normalized = (seed || '').toLowerCase().replace(/[^0-9a-f]/g, '');
  const safe = normalized.length > 0 ? normalized : '0'.repeat(16);

  const color = deriveColorFromHash(safe);
  const pattern = buildPatternFromHash(safe);

  const cells = 5;
  const cellSize = 100 / cells;

  const rects: string[] = [];
  rects.push(
    `<rect x="0" y="0" width="100" height="100" fill="${backgroundColor}"/>`
  );

  for (let r = 0; r < pattern.length; r++) {
    for (let c = 0; c < pattern[r].length; c++) {
      if (pattern[r][c]) {
        const x = c * cellSize;
        const y = r * cellSize;
        rects.push(
          `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" style="background-color:${backgroundColor};border-radius:8px;display:block;">${rects.join('')}</svg>`;
}