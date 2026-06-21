/**
 * ============================================
 * COMPONENTE: KeyIdenticon
 * ============================================
 *
 * Gera um identicon SVG único e determinístico a partir de um hash
 * (geralmente o publicKeyHash da chave criptográfica).
 *
 * - Mesmo hash → mesmo identicon (sempre)
 * - Hashes diferentes → padrões/cores visualmente distintos
 * - Sem dependências externas (SVG puro)
 * - Apenas visual: NÃO altera nenhum dado
 *
 * Padrão usado: grid 5x5 simétrico (espelhado horizontalmente),
 * estilo clássico de identicon (similar ao GitHub).
 * ============================================
 */

import { useMemo } from 'react';

interface KeyIdenticonProps {
  /** Hash hexadecimal usado como semente do identicon (ex: publicKeyHash) */
  hash: string;
  /** Tamanho do identicon em pixels (largura/altura). Default: 64 */
  size?: number;
  /** Classes adicionais para o container */
  className?: string;
  /** Cor de fundo. Default: '#f3f4f6' (gray-100) */
  backgroundColor?: string;
}

/**
 * Converte um par hexadecimal (2 chars) em número 0-255.
 */
function hexPairToInt(hex: string, index: number): number {
  const pair = hex.substring(index, index + 2);
  const n = parseInt(pair, 16);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Deriva uma cor HSL agradável a partir do hash.
 * Garante saturação e luminosidade dentro de uma faixa visualmente segura.
 */
function deriveColorFromHash(hash: string): string {
  const safeHash = hash || '0'.repeat(16);
  const h = hexPairToInt(safeHash, 0); // 0-255 → matiz
  const s = hexPairToInt(safeHash, 2); // 0-255 → saturação
  const l = hexPairToInt(safeHash, 4); // 0-255 → luminosidade

  const hue = Math.floor((h / 255) * 360);
  const saturation = 55 + Math.floor((s / 255) * 30); // 55-85%
  const lightness = 40 + Math.floor((l / 255) * 20); // 40-60%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Gera a matriz 5x5 simétrica (espelhada horizontalmente) a partir do hash.
 * Cada célula é true (preencher) ou false (vazia).
 */
function buildPatternFromHash(hash: string): boolean[][] {
  const safeHash = hash || '0'.repeat(16);
  // Usa os primeiros 15 nibbles (15 chars hex) para preencher 15 células
  // (3 colunas únicas x 5 linhas = 15 células; as outras 2 colunas são espelhos)
  const rows = 5;
  const uniqueCols = 3; // colunas 0, 1, 2 (col 3 = mirror de col 1, col 4 = mirror de col 0)
  const matrix: boolean[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: boolean[] = [false, false, false, false, false];
    for (let c = 0; c < uniqueCols; c++) {
      const idx = r * uniqueCols + c;
      const charHex = safeHash.charAt(idx % safeHash.length);
      const value = parseInt(charHex, 16);
      // Preenche se o valor for par (~50% de células preenchidas)
      const filled = Number.isFinite(value) && value % 2 === 0;
      row[c] = filled;
      // Espelha
      if (c === 0) row[4] = filled;
      if (c === 1) row[3] = filled;
    }
    matrix.push(row);
  }

  return matrix;
}

export function KeyIdenticon({
  hash,
  size = 64,
  className = '',
  backgroundColor = '#f3f4f6',
}: KeyIdenticonProps) {
  // Garante hash em minúsculas e sem espaços
  const normalizedHash = useMemo(() => (hash || '').toLowerCase().replace(/[^0-9a-f]/g, ''), [hash]);

  const color = useMemo(() => deriveColorFromHash(normalizedHash), [normalizedHash]);
  const pattern = useMemo(() => buildPatternFromHash(normalizedHash), [normalizedHash]);

  const cells = 5;
  const cellSize = 100 / cells; // viewBox 100x100, células de 20x20

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Identicon visual da chave ${normalizedHash.substring(0, 8)}`}
      style={{ backgroundColor, borderRadius: 8 }}
    >
      <rect x="0" y="0" width="100" height="100" fill={backgroundColor} />
      {pattern.map((row, rowIndex) =>
        row.map((filled, colIndex) =>
          filled ? (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex * cellSize}
              y={rowIndex * cellSize}
              width={cellSize}
              height={cellSize}
              fill={color}
            />
          ) : null
        )
      )}
    </svg>
  );
}

export default KeyIdenticon;