-- =====================================================
-- SCRIPT DE CONFIGURAÇÃO DO BANCO DE DADOS SUPABASE
-- Vero iD - Sistema de Autenticação e Assinatura Digital
-- =====================================================

-- Habilita a extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: users
-- Armazena informações dos usuários do sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    nome_publico TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    cpf_cnpj TEXT UNIQUE NOT NULL,
    telefone TEXT NOT NULL,
    documento_url TEXT NOT NULL,
    selfie_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    verified BOOLEAN DEFAULT true NOT NULL,
    is_admin BOOLEAN DEFAULT false NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_cpf_cnpj ON public.users(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);

-- =====================================================
-- TABELA: key_pairs
-- Armazena pares de chaves criptográficas dos usuários
-- =====================================================
CREATE TABLE IF NOT EXISTS public.key_pairs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índice para busca por usuário
CREATE INDEX IF NOT EXISTS idx_key_pairs_user_id ON public.key_pairs(user_id);

-- =====================================================
-- TABELA: signed_contents
-- Armazena conteúdos assinados digitalmente
-- =====================================================
CREATE TABLE IF NOT EXISTS public.signed_contents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    signature TEXT NOT NULL,
    public_key TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    creator_name TEXT NOT NULL,
    verification_code TEXT NOT NULL UNIQUE,
    thumbnail TEXT,
    platforms TEXT[],
    verification_count INTEGER DEFAULT 0 NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_signed_contents_user_id ON public.signed_contents(user_id);
CREATE INDEX IF NOT EXISTS idx_signed_contents_verification_code ON public.signed_contents(verification_code);
CREATE INDEX IF NOT EXISTS idx_signed_contents_timestamp ON public.signed_contents(timestamp DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- Políticas de segurança para controle de acesso
-- =====================================================

-- Habilita RLS nas tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signed_contents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS: users
-- =====================================================

-- Permite que qualquer pessoa leia informações públicas dos usuários
CREATE POLICY "Permitir leitura pública de usuários"
ON public.users FOR SELECT
TO public
USING (true);

-- Permite que qualquer pessoa crie um novo usuário (registro)
CREATE POLICY "Permitir criação de novos usuários"
ON public.users FOR INSERT
TO public
WITH CHECK (true);

-- Permite que usuários atualizem apenas seus próprios dados
CREATE POLICY "Permitir atualização de próprios dados"
ON public.users FOR UPDATE
TO public
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Permite que apenas admins deletem usuários
CREATE POLICY "Apenas admins podem deletar usuários"
ON public.users FOR DELETE
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- =====================================================
-- POLÍTICAS RLS: key_pairs
-- =====================================================

-- Permite que usuários leiam apenas suas próprias chaves
CREATE POLICY "Usuários podem ler suas próprias chaves"
ON public.key_pairs FOR SELECT
TO public
USING (user_id = auth.uid());

-- Permite que usuários criem suas próprias chaves
CREATE POLICY "Usuários podem criar suas próprias chaves"
ON public.key_pairs FOR INSERT
TO public
WITH CHECK (user_id = auth.uid());

-- Permite que usuários atualizem apenas suas próprias chaves
CREATE POLICY "Usuários podem atualizar suas próprias chaves"
ON public.key_pairs FOR UPDATE
TO public
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Permite que usuários deletem apenas suas próprias chaves
CREATE POLICY "Usuários podem deletar suas próprias chaves"
ON public.key_pairs FOR DELETE
TO public
USING (user_id = auth.uid());

-- =====================================================
-- POLÍTICAS RLS: signed_contents
-- =====================================================

-- Permite que qualquer pessoa leia conteúdos assinados (para verificação pública)
CREATE POLICY "Permitir leitura pública de conteúdos assinados"
ON public.signed_contents FOR SELECT
TO public
USING (true);

-- Permite que usuários criem seus próprios conteúdos assinados
CREATE POLICY "Usuários podem criar seus próprios conteúdos"
ON public.signed_contents FOR INSERT
TO public
WITH CHECK (user_id = auth.uid());

-- Permite que usuários atualizem apenas seus próprios conteúdos
CREATE POLICY "Usuários podem atualizar seus próprios conteúdos"
ON public.signed_contents FOR UPDATE
TO public
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Permite que usuários deletem apenas seus próprios conteúdos
CREATE POLICY "Usuários podem deletar seus próprios conteúdos"
ON public.signed_contents FOR DELETE
TO public
USING (user_id = auth.uid());

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para incrementar contador de verificações
CREATE OR REPLACE FUNCTION increment_verification_count(content_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.signed_contents
    SET verification_count = verification_count + 1
    WHERE id = content_id;
END;
$$;

-- Função para buscar conteúdo por código de verificação
CREATE OR REPLACE FUNCTION get_content_by_verification_code(code TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    content_hash TEXT,
    signature TEXT,
    public_key TEXT,
    timestamp TIMESTAMPTZ,
    creator_name TEXT,
    verification_code TEXT,
    thumbnail TEXT,
    platforms TEXT[],
    verification_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.id,
        sc.user_id,
        sc.content,
        sc.content_hash,
        sc.signature,
        sc.public_key,
        sc.timestamp,
        sc.creator_name,
        sc.verification_code,
        sc.thumbnail,
        sc.platforms,
        sc.verification_count
    FROM public.signed_contents sc
    WHERE sc.verification_code = code;
END;
$$;

-- =====================================================
-- DADOS INICIAIS: Criar usuário administrador
-- =====================================================

-- Insere usuário administrador padrão (se não existir)
INSERT INTO public.users (
    id,
    nome_completo,
    nome_publico,
    email,
    cpf_cnpj,
    telefone,
    documento_url,
    selfie_url,
    verified,
    is_admin
)
VALUES (
    uuid_generate_v4(),
    'Administrador do Sistema',
    'Admin',
    'admin@veroid.com',
    '00000000000000',
    '(00) 00000-0000',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRvY3VtZW50bzwvdGV4dD48L3N2Zz4=',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNlbGZpZTwvdGV4dD48L3N2Zz4=',
    true,
    true
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.users IS 'Tabela de usuários do sistema Vero iD';
COMMENT ON TABLE public.key_pairs IS 'Pares de chaves criptográficas dos usuários';
COMMENT ON TABLE public.signed_contents IS 'Conteúdos assinados digitalmente pelos usuários';

COMMENT ON COLUMN public.users.is_admin IS 'Indica se o usuário tem privilégios de administrador';
COMMENT ON COLUMN public.signed_contents.verification_code IS 'Código curto de 8 caracteres para verificação rápida';
COMMENT ON COLUMN public.signed_contents.verification_count IS 'Contador de quantas vezes o conteúdo foi verificado';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================