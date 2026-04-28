import { supabase } from '@/lib/supabase';

/**
 * Gera um código curto aleatório de 6 caracteres
 */
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Cria um link curto para uma URL longa
 */
export async function createShortUrl(longUrl: string): Promise<string> {
  try {
    let shortCode = generateShortCode();
    let attempts = 0;
    const maxAttempts = 5;

    // Tenta gerar um código único (máximo 5 tentativas)
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('short_urls')
        .select('short_code')
        .eq('short_code', shortCode)
        .single();

      if (!existing) {
        break; // Código único encontrado
      }

      shortCode = generateShortCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Não foi possível gerar um código único');
    }

    // Insere o link curto no banco
    const { error } = await supabase
      .from('short_urls')
      .insert({
        short_code: shortCode,
        long_url: longUrl,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Erro ao criar link curto:', error);
      throw error;
    }

    // Retorna a URL curta completa
    const baseUrl = window.location.origin;
    return `${baseUrl}/c/${shortCode}`;
  } catch (error) {
    console.error('Erro no createShortUrl:', error);
    // Em caso de erro, retorna a URL longa original
    return longUrl;
  }
}

/**
 * Busca a URL longa a partir do código curto
 */
export async function getLongUrl(shortCode: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('short_urls')
      .select('long_url, click_count')
      .eq('short_code', shortCode)
      .single();

    if (error || !data) {
      console.error('Link curto não encontrado:', error);
      return null;
    }

    // Incrementa o contador de cliques
    await supabase
      .from('short_urls')
      .update({ 
        click_count: (data.click_count || 0) + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('short_code', shortCode);

    return data.long_url;
  } catch (error) {
    console.error('Erro ao buscar link curto:', error);
    return null;
  }
}