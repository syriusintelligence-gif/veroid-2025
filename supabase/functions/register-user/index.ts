// =====================================================
// EDGE FUNCTION: register-user
// Vero iD - Registro seguro de usuários
// =====================================================
// Esta função usa SERVICE ROLE KEY para inserir usuários
// na tabela users, contornando restrições RLS durante o cadastro.
//
// ATUALIZAÇÃO: Agora registra dados de compliance da
// declaração de maioridade (aceite, timestamp, IP, User-Agent)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip',
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
  // Campos de Declaração de Maioridade (Compliance)
  age_declaration_accepted?: boolean;
  age_declaration_user_agent?: string;
}

/**
 * Extrai o IP do cliente dos headers da requisição
 * Suporta proxies e load balancers (Cloudflare, etc.)
 */
function getClientIP(req: Request): string | null {
  // Ordem de prioridade para obter o IP real
  const ipHeaders = [
    'cf-connecting-ip',      // Cloudflare
    'x-real-ip',             // Nginx proxy
    'x-forwarded-for',       // Standard proxy header
    'x-client-ip',           // Apache
    'true-client-ip',        // Akamai
  ];

  for (const header of ipHeaders) {
    const value = req.headers.get(header);
    if (value) {
      // x-forwarded-for pode conter múltiplos IPs, pegar o primeiro
      const ip = value.split(',')[0].trim();
      if (ip) {
        console.log(`📍 IP obtido via ${header}: ${ip}`);
        return ip;
      }
    }
  }

  console.log('⚠️ Não foi possível obter o IP do cliente');
  return null;
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

    // Obtém IP do cliente para compliance
    const clientIP = getClientIP(req);
    
    // Obtém User-Agent (enviado pelo frontend)
    const userAgent = body.age_declaration_user_agent || req.headers.get('user-agent') || null;

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
    console.log('✅ Declaração de maioridade aceita:', body.age_declaration_accepted ?? false);

    // Prepara dados de compliance da declaração de maioridade
    const ageDeclarationAccepted = body.age_declaration_accepted ?? false;
    const ageDeclarationAcceptedAt = ageDeclarationAccepted ? new Date().toISOString() : null;

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
        // Campos de Declaração de Maioridade (Compliance)
        age_declaration_accepted: ageDeclarationAccepted,
        age_declaration_accepted_at: ageDeclarationAcceptedAt,
        age_declaration_ip: clientIP,
        age_declaration_user_agent: userAgent,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao inserir usuário:', error);
      throw new Error(`Erro ao inserir usuário: ${error.message}`);
    }

    console.log('✅ Usuário registrado com sucesso!');
    console.log('📊 ID:', data.id);
    console.log('📋 Declaração de maioridade registrada:', {
      accepted: ageDeclarationAccepted,
      acceptedAt: ageDeclarationAcceptedAt,
      ip: clientIP ? `${clientIP.substring(0, 8)}...` : 'N/A',
    });

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