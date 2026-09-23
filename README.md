# 10° Café com Ciência: Os Direitos dos Pacientes na Odontologia
### Plataforma Completa com Sistema de Contas, Credencial com QR Code, Validador de Portaria, Certificado Oficial e Lembretes

---

## 🌟 Funcionalidades da Plataforma

### 1. 👤 Sistema de Contas & Login Facilitado
- **Para o Aluno**:
  - Ao preencher o formulário de inscrição, o aluno define sua **senha de acesso** pessoal.
  - Com o e-mail e a senha, ele pode fazer **login a qualquer momento** clicando em *"Entrar / Minha Conta"*.
  - Ao entrar, abre-se a sua **Área do Aluno** exibindo sua **Credencial com o QR Code oficial**, o status do Pix e o botão para emitir o certificado assim que validada a presença na portaria.
  - Elimina a necessidade de ficar buscando inscrição digitando o e-mail toda vez.

### 2. 🔒 Acesso Restrito ao "Painel da Liga"
- O botão **"Painel da Liga"** fica visível **apenas para as contas dos membros da liga organizadora**.
- Alunos e visitantes comuns não visualizam nem acessam o painel administrativo.
- Credenciais padrão para acesso da comissão:
  - **E-mail:** `cafecomciencia.liga@gmail.com`
  - **Senha:** `cafe2026`
  *(Você pode alterar a senha e o e-mail no arquivo `js/supabase-client.js` ou rodar o script no Supabase).*

### 3. 📱 Design Otimizado para Celular (Menu Hambúrguer)
- Cabeçalho totalmente reformulado com **botão hambúrguer** no celular.
- Gaveta lateral/suspensa com navegação espaçosa, acesso rápido à conta do aluno e botão de inscrição touch-friendly, acabando com a sensação de falta de espaço no mobile.

### 4. 📌 Comprovante Pix em Análise com Credencial Garantida
- A credencial do aluno deixa claro visualmente:
  > *"📌 Comprovante Pix em Análise Manual: Seu comprovante foi recebido pela organização da liga para conferência. Esta credencial e seu QR Code oficial já estão assegurados com você para o dia da palestra!"*
- O aluno guarda sua credencial com ele desde o primeiro instante para apresentar na portaria no dia 30/10.

### 5. 📱 Portaria com Leitor de QR Code
- Membros da liga usam a câmera do celular na aba **"Portaria (QR)"** para escanear a credencial do aluno na entrada.
- Emite bipe sonoro e confirma presença, liberando automaticamente a emissão do **Certificado Oficial de Participação**.

### 6. 🎓 Certificado Oficial Fiel ao Modelo da UniArnaldo
- Emissão em A4 paisagem com o layout exato fornecido (`certificados.html`): arte azul, logo da Arnaldo, assinatura do Prof. Gerdal Roberto de Sousa e código de autenticidade.

### 7. 💬 Disparador de Lembretes no WhatsApp
- Mensagens prontas com tags dinâmicas (`[NOME]`, `[PROTOCOLO]`, `[LINK_CREDENCIAL]`, `[LINK_CERTIFICADO]`) para 7 dias antes, véspera, dia do evento e pós-evento.

---

## 🗄️ Código SQL do Supabase Atualizado (com Contas e Senhas)

```sql
-- 1. Criação/Atualização da Tabela de Inscrições e Contas
CREATE TABLE IF NOT EXISTS public.inscricoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    protocolo TEXT UNIQUE NOT NULL,
    nome_completo TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefone TEXT NOT NULL,
    senha TEXT NOT NULL,
    role TEXT DEFAULT 'aluno' CHECK (role IN ('aluno', 'organizador')),
    valor NUMERIC(10,2) DEFAULT 10.00 NOT NULL,
    status_pagamento TEXT DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'aprovado', 'recusado')),
    comprovante_url TEXT,
    comprovante_nome TEXT,
    presenca_confirmada BOOLEAN DEFAULT FALSE NOT NULL,
    presenca_horario TIMESTAMP WITH TIME ZONE,
    presenca_validador TEXT DEFAULT 'Portaria Oficial',
    certificado_emitido BOOLEAN DEFAULT FALSE NOT NULL,
    certificado_codigo TEXT UNIQUE,
    certificado_data_emissao TIMESTAMP WITH TIME ZONE,
    lembrete_enviado BOOLEAN DEFAULT FALSE NOT NULL,
    ultimo_lembrete_em TIMESTAMP WITH TIME ZONE,
    tipo_ultimo_lembrete TEXT,
    observacoes TEXT
);

CREATE INDEX IF NOT EXISTS idx_inscricoes_email ON public.inscricoes(lower(email));
CREATE INDEX IF NOT EXISTS idx_inscricoes_protocolo ON public.inscricoes(protocolo);
CREATE INDEX IF NOT EXISTS idx_inscricoes_role ON public.inscricoes(role);

ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir insercao publica de inscricao e conta" 
ON public.inscricoes FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Permitir leitura publica de inscricoes e contas" 
ON public.inscricoes FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir atualizacao de presenca e dados" 
ON public.inscricoes FOR UPDATE TO anon, authenticated USING (true);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('comprovantes', 'comprovantes', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Permitir upload publico de comprovantes"
ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'comprovantes');

CREATE POLICY "Permitir visualizacao publica de comprovantes"
ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'comprovantes');

CREATE TABLE IF NOT EXISTS public.lembretes_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    inscricao_id UUID REFERENCES public.inscricoes(id) ON DELETE CASCADE,
    canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'email')),
    tipo_lembrete TEXT NOT NULL,
    destinatario TEXT NOT NULL,
    status TEXT DEFAULT 'enviado'
);

ALTER TABLE public.lembretes_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir manipulacao de logs de lembretes" ON public.lembretes_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Conta Padrão do Organizador da Liga
INSERT INTO public.inscricoes (
    protocolo, nome_completo, email, telefone, senha, role, status_pagamento
) VALUES (
    'LIGA-ADMIN', 'Comissão Organizadora', 'cafecomciencia.liga@gmail.com', '(31) 99999-9999', 'cafe2026', 'organizador', 'aprovado'
) ON CONFLICT (email) DO UPDATE SET role = 'organizador', senha = 'cafe2026';
```
