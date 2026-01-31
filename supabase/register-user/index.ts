// =====================================================
// EDGE FUNCTION: register-user
// Vero iD - Registro seguro de usuários
// =====================================================
// Esta função usa SERVICE ROLE KEY para inserir usuários
// na tabela users, contornando restrições RLS durante o cadastro.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RegisterUserRequest {
  id: string;
  nome_completo: string;
  nome_publico: string;
  email: string;
  cpf_cnpj: string;
  telefone: string;
  documento_url: string;
  selfie_url: string;
  verified?: boolean;
  is_admin?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔐 [EDGE FUNCTION] Iniciando registro de usuário...');

    // Valida método HTTP
    if (req.method !== 'POST') {
      throw new Error('Método não permitido. Use POST.');
    }

    // Parse do body
    const body: RegisterUserRequest = await req.json();
    console.log('📧 Email:', body.email);

    // Validações básicas
    if (!body.id || !body.email || !body.nome_completo) {
      throw new Error('Dados obrigatórios faltando: id, email, nome_completo');
    }

    // Cria cliente Supabase com SERVICE ROLE KEY
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('💾 Inserindo usuário na tabela users...');

    // Insere o usuário usando SERVICE ROLE (sem restrições RLS)
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: body.id,
        nome_completo: body.nome_completo,
        nome_publico: body.nome_publico,
        email: body.email.toLowerCase(),
        cpf_cnpj: body.cpf_cnpj,
        telefone: body.telefone,
        documento_url: body.documento_url,
        selfie_url: body.selfie_url,
        verified: body.verified ?? true,
        is_admin: body.is_admin ?? false,
        blocked: false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao inserir usuário:', error);
      throw new Error(`Erro ao inserir usuário: ${error.message}`);
    }

    console.log('✅ Usuário registrado com sucesso!');
    console.log('📊 ID:', data.id);

    return new Response(
      JSON.stringify({
        success: true,
        user: data,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});