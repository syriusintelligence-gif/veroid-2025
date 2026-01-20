/**
 * 🧹 EDGE FUNCTION: LIMPEZA AUTOMÁTICA DE ARQUIVOS TEMPORÁRIOS
 * 
 * Esta Edge Function deleta automaticamente arquivos do bucket temp-uploads
 * que tenham mais de 24 horas de idade.
 * 
 * Deve ser executada diariamente via Cron Job (pg_cron).
 * 
 * @module cleanup-temp-uploads
 * @version 1.0.0
 * @phase FASE 5 - Limpeza Automática
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Interface para resultado de limpeza
 */
interface CleanupResult {
  success: boolean;
  deleted: number;
  files: string[];
  errors: string[];
  executionTime: number;
  timestamp: string;
}

/**
 * Converte bytes para formato legível
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Handler principal da Edge Function
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log('🧹 [Cleanup] Iniciando limpeza de arquivos temporários...');
  console.log('📅 [Cleanup] Timestamp:', timestamp);

  try {
    // 1. Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Método não permitido. Use POST.',
        }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Criar cliente Supabase com Service Role Key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('✅ [Cleanup] Cliente Supabase criado com Service Role Key');

    // 3. Calcular timestamp de 24 horas atrás
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    console.log('⏰ [Cleanup] Buscando arquivos anteriores a:', twentyFourHoursAgo.toISOString());

    // 4. Listar todos os arquivos do bucket temp-uploads
    const { data: files, error: listError } = await supabase.storage
      .from('temp-uploads')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (listError) {
      throw new Error(`Erro ao listar arquivos: ${listError.message}`);
    }

    console.log(`📊 [Cleanup] Total de arquivos encontrados: ${files?.length || 0}`);

    if (!files || files.length === 0) {
      const executionTime = Date.now() - startTime;
      console.log('✅ [Cleanup] Nenhum arquivo para limpar');

      return new Response(
        JSON.stringify({
          success: true,
          deleted: 0,
          files: [],
          errors: [],
          executionTime,
          timestamp,
          message: 'Nenhum arquivo temporário encontrado',
        } as CleanupResult),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Filtrar arquivos com mais de 24 horas
    const oldFiles = files.filter((file) => {
      const fileCreatedAt = new Date(file.created_at);
      return fileCreatedAt < twentyFourHoursAgo;
    });

    console.log(`🗑️ [Cleanup] Arquivos antigos (>24h): ${oldFiles.length}`);

    if (oldFiles.length === 0) {
      const executionTime = Date.now() - startTime;
      console.log('✅ [Cleanup] Nenhum arquivo antigo para deletar');

      return new Response(
        JSON.stringify({
          success: true,
          deleted: 0,
          files: [],
          errors: [],
          executionTime,
          timestamp,
          message: 'Nenhum arquivo antigo encontrado',
        } as CleanupResult),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. Preparar lista de paths para deletar
    const filePaths = oldFiles.map((file) => file.name);
    const totalSize = oldFiles.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);

    console.log('📋 [Cleanup] Arquivos a deletar:', filePaths);
    console.log('💾 [Cleanup] Tamanho total:', formatBytes(totalSize));

    // 7. Deletar arquivos em lote
    const { data: deleteData, error: deleteError } = await supabase.storage
      .from('temp-uploads')
      .remove(filePaths);

    const errors: string[] = [];

    if (deleteError) {
      console.error('❌ [Cleanup] Erro ao deletar arquivos:', deleteError);
      errors.push(deleteError.message);
    }

    // 8. Verificar quais arquivos foram deletados com sucesso
    const deletedCount = deleteData?.length || 0;
    const executionTime = Date.now() - startTime;

    console.log(`✅ [Cleanup] Arquivos deletados: ${deletedCount}/${filePaths.length}`);
    console.log(`⏱️ [Cleanup] Tempo de execução: ${executionTime}ms`);

    // 9. Retornar resultado
    const result: CleanupResult = {
      success: errors.length === 0,
      deleted: deletedCount,
      files: filePaths,
      errors,
      executionTime,
      timestamp,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    console.error('❌ [Cleanup] Erro crítico:', errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        deleted: 0,
        files: [],
        errors: [errorMessage],
        executionTime,
        timestamp,
      } as CleanupResult),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});