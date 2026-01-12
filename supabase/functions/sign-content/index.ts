// =====================================================
// EDGE FUNCTION: sign-content
// Assinatura segura de conteúdo no backend
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { encryptPrivateKey, decryptPrivateKey, signContent } from './crypto.ts';

// Tipos
interface SignContentRequest {
  content: string;
  creatorName: string;
  thumbnail?: string;
  platforms?: string[];
  userId?: string; // Opcional: para testes com service_role
}

interface SignContentResponse {
  success: boolean;
  signedContent?: {
    id: string;
    content: string;
    contentHash: string;
    signature: string;
    publicKey: string;
    createdAt: string;
    creatorName: string;
    verificationCode: string;
    thumbnail?: string;
    platforms?: string[];
    verificationCount: number;
  };
  error?: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔐 [1/10] Edge Function sign-content iniciada');

    // 1. Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Método não permitido. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [2/10] Método HTTP validado: POST');

    // 2. Obter token de autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autenticação não fornecido.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [3/10] Token de autenticação encontrado');

    // 3. Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Detectar se está usando service_role key
    const isServiceRole = authHeader.includes(supabaseServiceKey);
    
    // 🔧 CORREÇÃO: Usar ANON_KEY para usuários normais, SERVICE_ROLE_KEY apenas para admin/testes
    const supabaseKey = isServiceRole ? supabaseServiceKey : supabaseAnonKey;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    });

    console.log('✅ [4/10] Cliente Supabase criado', { 
      isServiceRole,
      usingKey: isServiceRole ? 'SERVICE_ROLE_KEY' : 'ANON_KEY'
    });

    // 4. Validar usuário autenticado
    let userId: string;
    
    if (isServiceRole) {
      // Modo de teste com service_role: buscar primeiro usuário válido
      console.log('🔧 [TEST MODE] Usando service_role key - buscando usuário de teste');
      
      const body: SignContentRequest = await req.json();
      
      if (body.userId) {
        // Se userId foi fornecido no body, usar ele
        userId = body.userId;
        console.log('✅ [5/10] userId fornecido no body:', userId);
      } else {
        // Buscar o primeiro usuário que tem key_pairs
        const { data: keyPairs, error: keyPairsError } = await supabase
          .from('key_pairs')
          .select('user_id')
          .limit(1)
          .single();
        
        if (keyPairsError || !keyPairs) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Nenhum usuário com chaves encontrado. Forneça userId no body da requisição.' 
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        userId = keyPairs.user_id;
        console.log('✅ [5/10] Usuário de teste encontrado:', userId);
      }
      
      // Recriar o body para uso posterior
      req = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(body),
      });
    } else {
      // Modo normal: validar JWT do usuário
      console.log('🔐 [AUTH] Validando token JWT do usuário...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('❌ Erro de autenticação:', authError);
        console.error('❌ Detalhes do erro:', {
          message: authError?.message,
          status: authError?.status,
          authHeader: authHeader.substring(0, 50) + '...',
        });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Usuário não autenticado.',
            details: authError?.message 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userId = user.id;
      console.log('✅ [5/10] Usuário autenticado:', userId);
    }

    // 5. Parse do body
    const body: SignContentRequest = await req.json();
    const { content, creatorName, thumbnail, platforms } = body;

    if (!content || !creatorName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Conteúdo e nome do criador são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [6/10] Request validado:', {
      contentLength: content.length,
      creatorName,
      hasThumbnail: !!thumbnail,
      platforms: platforms?.join(', '),
    });

    // 6. Buscar chave privada criptografada do usuário
    const { data: keyPairData, error: keyError } = await supabase
      .from('key_pairs')
      .select('id, public_key, encrypted_private_key, private_key')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (keyError || !keyPairData) {
      console.error('❌ Erro ao buscar chaves:', keyError);
      return new Response(
        JSON.stringify({ success: false, error: 'Chaves do usuário não encontradas.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [7/10] Chaves encontradas para usuário:', userId);

    // 7. Descriptografar chave privada
    let privateKey: string;
    
    if (keyPairData.encrypted_private_key) {
      // Nova implementação: chave criptografada
      console.log('🔓 Descriptografando chave privada...');
      privateKey = await decryptPrivateKey(keyPairData.encrypted_private_key);
    } else if (keyPairData.private_key) {
      // Fallback: chave em texto plano (durante migração)
      console.warn('⚠️ Usando chave privada em texto plano (modo legado)');
      privateKey = keyPairData.private_key;
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Chave privada não disponível.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [8/10] Chave privada descriptografada com sucesso');

    // 8. Assinar conteúdo
    const signatureResult = await signContent(
      content,
      privateKey,
      keyPairData.public_key,
      creatorName,
      userId,
      thumbnail,
      platforms
    );

    if (!signatureResult.success || !signatureResult.signedContent) {
      console.error('❌ Erro ao assinar conteúdo:', signatureResult.error);
      return new Response(
        JSON.stringify({ success: false, error: signatureResult.error || 'Erro ao assinar conteúdo.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [9/10] Conteúdo assinado com sucesso');

    // 9. Registrar em audit log
    try {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'SIGN_CONTENT',
        details: {
          content_id: signatureResult.signedContent.id,
          verification_code: signatureResult.signedContent.verificationCode,
          content_length: content.length,
          has_thumbnail: !!thumbnail,
          platforms: platforms || [],
          test_mode: isServiceRole,
        },
      });
      console.log('✅ [10/10] Audit log registrado');
    } catch (auditError) {
      console.warn('⚠️ Erro ao registrar audit log:', auditError);
      // Não falha a operação se audit log falhar
    }

    // 10. Retornar resposta
    const response: SignContentResponse = {
      success: true,
      signedContent: signatureResult.signedContent,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [ERRO CRÍTICO] Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});