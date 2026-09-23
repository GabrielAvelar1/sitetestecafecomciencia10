-- ==========================================================
-- SCRIPT DE CORREÇÃO E ATUALIZAÇÃO - SUPABASE
-- Adiciona as colunas 'role' e 'senha' na tabela já existente
-- ==========================================================

-- 1. Adicionar colunas novas com segurança (caso a tabela já exista)
ALTER TABLE public.inscricoes ADD COLUMN IF NOT EXISTS senha TEXT DEFAULT '1234';
ALTER TABLE public.inscricoes ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'aluno';

-- 2. Garantir que a coluna 'email' seja única (necessário para login e evitar duplicatas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inscricoes_email_key'
    ) THEN
        ALTER TABLE public.inscricoes ADD CONSTRAINT inscricoes_email_key UNIQUE (email);
    END IF;
END $$;

-- 3. Criar os índices de busca
CREATE INDEX IF NOT EXISTS idx_inscricoes_role ON public.inscricoes(role);
CREATE INDEX IF NOT EXISTS idx_inscricoes_email ON public.inscricoes(lower(email));
CREATE INDEX IF NOT EXISTS idx_inscricoes_protocolo ON public.inscricoes(protocolo);

-- 4. Habilitar RLS
ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;

-- 5. Inserir ou atualizar a conta do organizador da liga
INSERT INTO public.inscricoes (
    protocolo, 
    nome_completo, 
    email, 
    telefone, 
    senha, 
    role, 
    status_pagamento
) VALUES (
    'LIGA-ADMIN', 
    'Comissão Organizadora', 
    'cafecomciencia.liga@gmail.com', 
    '(31) 99999-9999', 
    'cafe2026', 
    'organizador', 
    'aprovado'
) ON CONFLICT (email) DO UPDATE 
SET role = 'organizador', senha = 'cafe2026';
