import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Se as variáveis não estiverem definidas, cria um cliente mock para desenvolvimento
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variáveis de ambiente do Supabase não configuradas. Usando modo de desenvolvimento local.');
  console.warn('Para usar o Supabase, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local');
}

// Cria o cliente Supabase (mesmo que seja com valores vazios para desenvolvimento)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Tipos do banco de dados
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nome_completo: string;
          nome_publico: string;
          email: string;
          cpf_cnpj: string;
          telefone: string;
          documento_url: string;
          selfie_url: string;
          created_at: string;
          verified: boolean;
          is_admin: boolean;
          blocked: boolean;
        };
        Insert: {
          id?: string;
          nome_completo: string;
          nome_publico: string;
          email: string;
          cpf_cnpj: string;
          telefone: string;
          documento_url: string;
          selfie_url: string;
          created_at?: string;
          verified?: boolean;
          is_admin?: boolean;
          blocked?: boolean;
        };
        Update: {
          id?: string;
          nome_completo?: string;
          nome_publico?: string;
          email?: string;
          cpf_cnpj?: string;
          telefone?: string;
          documento_url?: string;
          selfie_url?: string;
          created_at?: string;
          verified?: boolean;
          is_admin?: boolean;
          blocked?: boolean;
        };
      };
      signed_contents: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          content_hash: string;
          signature: string;
          public_key: string;
          timestamp: string;
          creator_name: string;
          verification_code: string;
          thumbnail: string | null;
          platforms: string[] | null;
          verification_count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          content_hash: string;
          signature: string;
          public_key: string;
          timestamp?: string;
          creator_name: string;
          verification_code: string;
          thumbnail?: string | null;
          platforms?: string[] | null;
          verification_count?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          content_hash?: string;
          signature?: string;
          public_key?: string;
          timestamp?: string;
          creator_name?: string;
          verification_code?: string;
          thumbnail?: string | null;
          platforms?: string[] | null;
          verification_count?: number;
        };
      };
      key_pairs: {
        Row: {
          id: string;
          user_id: string;
          public_key: string;
          private_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          public_key: string;
          private_key: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          public_key?: string;
          private_key?: string;
          created_at?: string;
        };
      };
    };
  };
}
