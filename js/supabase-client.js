/**
 * Gerenciador de Banco de Dados, Supabase & Sistema de Contas
 * 10° Café com Ciência: Os Direitos dos Pacientes na Odontologia
 */

// ============================================================================
// 1. CONFIGURAÇÕES PRINCIPAIS DO SUPABASE
// ============================================================================
const SUPABASE_CONFIG = {
  url: 'https://SEU_PROJETO.supabase.co',
  anonKey: 'SUA_CHAVE_ANON_DO_SUPABASE',
  tableName: 'inscricoes',
  bucketName: 'comprovantes'
};

// ============================================================================
// 2. CONFIGURAÇÕES DO PIX
// ============================================================================
const PIX_CONFIG = {
  chave: 'cafecomciencia.liga@gmail.com',
  tipoChave: 'E-mail',
  titular: 'Organização Café com Ciência',
  cidade: 'Belo Horizonte',
  valor: '10.00',
  mensagem: '10 Cafe com Ciencia'
};

// ============================================================================
// 3. INICIALIZAÇÃO DINÂMICA DO CLIENTE SUPABASE
// ============================================================================
let supabaseClient = null;

function getSupabaseCredentials() {
  const customUrl = localStorage.getItem('cafe_supabase_url');
  const customKey = localStorage.getItem('cafe_supabase_anon_key');

  const url = (customUrl && !customUrl.includes('SEU_PROJETO')) ? customUrl : SUPABASE_CONFIG.url;
  const anonKey = (customKey && !customKey.includes('SUA_CHAVE_ANON')) ? customKey : SUPABASE_CONFIG.anonKey;

  return { url, anonKey };
}

function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseCredentials();
  return (
    url &&
    !url.includes('SEU_PROJETO') &&
    anonKey &&
    !anonKey.includes('SUA_CHAVE_ANON') &&
    window.supabase &&
    typeof window.supabase.createClient === 'function'
  );
}

function getSupabase() {
  if (!supabaseClient && isSupabaseConfigured()) {
    try {
      const { url, anonKey } = getSupabaseCredentials();
      supabaseClient = window.supabase.createClient(url, anonKey);
    } catch (e) {
      console.warn('Erro ao inicializar Supabase:', e);
      return null;
    }
  }
  return supabaseClient;
}

function salvarCredenciaisSupabase(url, key) {
  if (url && key) {
    localStorage.setItem('cafe_supabase_url', url.trim());
    localStorage.setItem('cafe_supabase_anon_key', key.trim());
    supabaseClient = null;
    return true;
  }
  return false;
}

// ============================================================================
// 4. SISTEMA DE AUTENTICAÇÃO E SESSÃO COM GOOGLE
// ============================================================================
const ORGANIZADOR_PADRAO = {
  email: 'cafecomciencia.liga@gmail.com',
  senha: 'cafe2026',
  nome_completo: 'Comissão Organizadora',
  role: 'organizador'
};

function getUsuarioLogado() {
  try {
    const raw = localStorage.getItem('cafe_session_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function salvarSessaoUsuario(usuario) {
  if (usuario) {
    const seguro = { ...usuario };
    delete seguro.senha;
    localStorage.setItem('cafe_session_user', JSON.stringify(seguro));
  } else {
    localStorage.removeItem('cafe_session_user');
  }
  window.dispatchEvent(new CustomEvent('auth_state_changed', { detail: usuario }));
}

function fazerLogout() {
  localStorage.removeItem('cafe_session_user');
  window.dispatchEvent(new CustomEvent('auth_state_changed', { detail: null }));
  window.location.reload();
}

function isOrganizadorLogado() {
  const user = getUsuarioLogado();
  return user && user.role === 'organizador';
}

/**
 * Login com Conta Google
 * Vincula à inscrição existente ou cria conta antecipada de participante
 */
async function fazerLoginComGoogle(dadosGoogle = {}) {
  const emailGoogle = (dadosGoogle.email || '').trim().toLowerCase();
  const nomeGoogle = (dadosGoogle.name || dadosGoogle.nome || '').trim();
  const avatarGoogle = dadosGoogle.picture || dadosGoogle.avatar || '';

  if (!emailGoogle) throw new Error('E-mail do Google não identificado.');

  // Verifica se é o e-mail oficial da liga
  const isOrganizador = (emailGoogle === ORGANIZADOR_PADRAO.email);

  const sb = getSupabase();
  if (sb) {
    // 1. Procura se o aluno já se inscreveu
    const { data: inscritos } = await sb
      .from(SUPABASE_CONFIG.tableName)
      .select('*')
      .ilike('email', emailGoogle)
      .limit(1);

    if (inscritos && inscritos.length > 0) {
      const aluno = inscritos[0];
      if (avatarGoogle) aluno.avatar = avatarGoogle;
      if (isOrganizador) aluno.role = 'organizador';
      salvarSessaoUsuario(aluno);
      return aluno;
    }

    // 2. Se ainda não se inscreveu, cria a sessão de participante pré-cadastrado
    const usuarioNovo = {
      id: 'google-' + Date.now(),
      nome_completo: nomeGoogle || 'Participante Google',
      email: emailGoogle,
      avatar: avatarGoogle,
      role: isOrganizador ? 'organizador' : 'aluno',
      auth_provider: 'google',
      inscrito: false
    };
    salvarSessaoUsuario(usuarioNovo);
    return usuarioNovo;

  } else {
    // Modo Local
    const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
    let usuario = inscricoes.find(i => i.email && i.email.toLowerCase() === emailGoogle);

    if (usuario) {
      if (avatarGoogle) usuario.avatar = avatarGoogle;
      if (isOrganizador) usuario.role = 'organizador';
      salvarSessaoUsuario(usuario);
      return usuario;
    }

    usuario = {
      id: 'google-' + Date.now(),
      nome_completo: nomeGoogle || 'Participante Google',
      email: emailGoogle,
      avatar: avatarGoogle,
      role: isOrganizador ? 'organizador' : 'aluno',
      auth_provider: 'google',
      inscrito: false
    };
    salvarSessaoUsuario(usuario);
    return usuario;
  }
}

async function fazerLogin(email, senha) {
  if (!email || !senha) throw new Error('Informe o e-mail e a senha.');
  const emailLimpo = email.trim().toLowerCase();
  const senhaLimpa = senha.trim();

  if (emailLimpo === ORGANIZADOR_PADRAO.email && senhaLimpa === ORGANIZADOR_PADRAO.senha) {
    const orgUser = { ...ORGANIZADOR_PADRAO, id: 'org-admin' };
    salvarSessaoUsuario(orgUser);
    return orgUser;
  }

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from(SUPABASE_CONFIG.tableName)
      .select('*')
      .ilike('email', emailLimpo)
      .eq('senha', senhaLimpa)
      .limit(1);

    if (error || !data || data.length === 0) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const usuario = data[0];
    salvarSessaoUsuario(usuario);
    return usuario;
  } else {
    const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
    const usuario = inscricoes.find(u => 
      u.email && u.email.toLowerCase() === emailLimpo && u.senha === senhaLimpa
    );

    if (!usuario) {
      throw new Error('E-mail ou senha incorretos.');
    }

    salvarSessaoUsuario(usuario);
    return usuario;
  }
}

// ============================================================================
// 5. REGISTRO DE INSCRIÇÃO (SEM PRECISAR DE SENHA)
// ============================================================================
function gerarProtocolo() {
  const aleatorio = Math.floor(100000 + Math.random() * 900000);
  return `CC10-${aleatorio}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

async function registrarInscricao({ nome_completo, email, telefone, comprovanteFile }) {
  if (!comprovanteFile) {
    throw new Error('O anexo do comprovante de pagamento Pix de R$ 10,00 é estritamente obrigatório.');
  }

  const protocolo = gerarProtocolo();
  const emailLimpo = email.trim().toLowerCase();
  const sb = getSupabase();

  if (sb) {
    try {
      const { data: existente } = await sb
        .from(SUPABASE_CONFIG.tableName)
        .select('id, email, protocolo')
        .ilike('email', emailLimpo)
        .limit(1);

      if (existente && existente.length > 0) {
        throw new Error('Já existe uma inscrição registrada para este e-mail. Acesse sua conta com o Google para ver sua credencial.');
      }

      let comprovanteUrl = '';
      let comprovanteNome = comprovanteFile ? comprovanteFile.name : 'comprovante.jpg';

      if (comprovanteFile) {
        const ext = comprovanteFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const filePath = `comprovantes/${fileName}`;

        const { error: uploadError } = await sb.storage
          .from(SUPABASE_CONFIG.bucketName)
          .upload(filePath, comprovanteFile);

        if (!uploadError) {
          const { data: publicUrlData } = sb.storage
            .from(SUPABASE_CONFIG.bucketName)
            .getPublicUrl(filePath);
          comprovanteUrl = publicUrlData?.publicUrl || '';
        }
      }

      const { data: insertData, error: insertError } = await sb
        .from(SUPABASE_CONFIG.tableName)
        .insert([
          {
            protocolo: protocolo,
            nome_completo: nome_completo.trim(),
            email: emailLimpo,
            telefone: telefone.trim(),
            senha: 'google-oauth',
            role: 'aluno',
            valor: parseFloat(PIX_CONFIG.valor),
            status_pagamento: 'pendente', // Comprovante em análise pela comissão
            comprovante_url: comprovanteUrl,
            comprovante_nome: comprovanteNome,
            presenca_confirmada: false,
            certificado_emitido: false,
            lembrete_enviado: false
          }
        ])
        .select();

      if (insertError) {
        console.error('Erro ao salvar no Supabase:', insertError);
        throw new Error('Falha ao registrar inscrição no banco de dados.');
      }

      const novoUsuario = insertData[0];
      salvarSessaoUsuario(novoUsuario);

      return {
        success: true,
        isDemo: false,
        data: novoUsuario
      };
    } catch (err) {
      console.error('Erro na integração Supabase:', err);
      throw err;
    }
  } else {
    // Modo Local
    const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
    const existente = inscricoes.find(i => i.email && i.email.toLowerCase() === emailLimpo);
    if (existente) {
      throw new Error('Já existe uma inscrição registrada para este e-mail. Faça login com o Google para ver sua credencial.');
    }

    let comprovanteBase64 = '';
    if (comprovanteFile) {
      try {
        comprovanteBase64 = await fileToBase64(comprovanteFile);
      } catch (e) {
        console.warn('Erro ao ler base64:', e);
      }
    }

    const novaInscricao = {
      id: 'demo-' + Date.now(),
      created_at: new Date().toISOString(),
      protocolo: protocolo,
      nome_completo: nome_completo.trim(),
      email: emailLimpo,
      telefone: telefone.trim(),
      senha: 'google-oauth',
      role: 'aluno',
      valor: parseFloat(PIX_CONFIG.valor),
      status_pagamento: 'pendente', // Comprovante em análise pela comissão
      comprovante_url: comprovanteBase64,
      comprovante_nome: comprovanteFile ? comprovanteFile.name : 'comprovante.jpg',
      presenca_confirmada: false,
      presenca_horario: null,
      presenca_validador: null,
      certificado_emitido: false,
      certificado_codigo: null,
      lembrete_enviado: false,
      isDemo: true
    };

    inscricoes.unshift(novaInscricao);
    localStorage.setItem('cafe_ciencia_inscricoes', JSON.stringify(inscricoes));
    salvarSessaoUsuario(novaInscricao);

    return {
      success: true,
      isDemo: true,
      data: novaInscricao
    };
  }
}

// ============================================================================
// 6. BUSCA E CONSULTA DE INSCRIÇÃO
// ============================================================================
async function buscarInscricao(termo) {
  if (!termo) return null;
  const termoLimpo = termo.trim().toLowerCase();
  const termoTel = termo.replace(/\D/g, '');

  const sb = getSupabase();
  if (sb) {
    try {
      let query = sb.from(SUPABASE_CONFIG.tableName).select('*');

      if (termoLimpo.startsWith('cc10-')) {
        query = query.ilike('protocolo', termoLimpo);
      } else if (termoLimpo.includes('@')) {
        query = query.ilike('email', termoLimpo);
      } else {
        query = query.or(`protocolo.ilike.%${termoLimpo}%,email.ilike.%${termoLimpo}%,telefone.ilike.%${termoTel || termoLimpo}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1);
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (e) {
      console.warn('Erro ao consultar Supabase:', e);
    }
  }

  // Fallback Local
  const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
  return inscricoes.find(i => 
    (i.protocolo && i.protocolo.toLowerCase() === termoLimpo) ||
    (i.email && i.email.toLowerCase() === termoLimpo) ||
    (i.telefone && i.telefone.replace(/\D/g, '') === termoTel && termoTel.length >= 8)
  ) || null;
}

// ============================================================================
// 7. VALIDAÇÃO DE PRESENÇA (CHECK-IN POR QR CODE NA PORTARIA)
// ============================================================================
async function validarPresencaPorQRCode(codigo, validadorNome = 'Portaria Oficial') {
  if (!codigo) throw new Error('Código do QR Code não fornecido.');

  let protocolo = codigo.trim();
  if (protocolo.includes('checkin=')) {
    const urlParams = new URLSearchParams(protocolo.split('?')[1]);
    protocolo = urlParams.get('checkin') || protocolo;
  }
  protocolo = protocolo.toUpperCase();

  const sb = getSupabase();

  if (sb) {
    const { data: inscritos, error: buscaError } = await sb
      .from(SUPABASE_CONFIG.tableName)
      .select('*')
      .ilike('protocolo', protocolo)
      .limit(1);

    if (buscaError || !inscritos || inscritos.length === 0) {
      throw new Error(`Inscrição não encontrada para o código: ${protocolo}`);
    }

    const aluno = inscritos[0];

    if (aluno.presenca_confirmada) {
      return {
        jaConfirmado: true,
        aluno: aluno,
        mensagem: `Atenção: A presença de ${aluno.nome_completo} já foi registrada anteriormente!`
      };
    }

    const horarioCheckin = new Date().toISOString();
    const codigoCertificado = `CERT-${aluno.protocolo}`;

    const { data: updated, error: updateError } = await sb
      .from(SUPABASE_CONFIG.tableName)
      .update({
        presenca_confirmada: true,
        presenca_horario: horarioCheckin,
        presenca_validador: validadorNome,
        certificado_emitido: true,
        certificado_codigo: codigoCertificado,
        certificado_data_emissao: horarioCheckin
      })
      .eq('id', aluno.id)
      .select();

    if (updateError) {
      throw new Error('Falha ao registrar check-in no banco de dados.');
    }

    return {
      sucesso: true,
      jaConfirmado: false,
      aluno: updated[0],
      mensagem: `Presença de ${aluno.nome_completo} confirmada com sucesso! Certificado liberado.`
    };

  } else {
    const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
    const index = inscricoes.findIndex(i => i.protocolo && i.protocolo.toUpperCase() === protocolo);

    if (index === -1) {
      throw new Error(`Inscrição não encontrada para o código: ${protocolo}`);
    }

    const aluno = inscricoes[index];

    if (aluno.presenca_confirmada) {
      return {
        jaConfirmado: true,
        aluno: aluno,
        mensagem: `Atenção: A presença de ${aluno.nome_completo} já foi registrada anteriormente!`
      };
    }

    const horarioCheckin = new Date().toISOString();
    aluno.presenca_confirmada = true;
    aluno.presenca_horario = horarioCheckin;
    aluno.presenca_validador = validadorNome;
    aluno.certificado_emitido = true;
    aluno.certificado_codigo = `CERT-${aluno.protocolo}`;
    aluno.certificado_data_emissao = horarioCheckin;

    localStorage.setItem('cafe_ciencia_inscricoes', JSON.stringify(inscricoes));

    return {
      sucesso: true,
      jaConfirmado: false,
      aluno: aluno,
      mensagem: `Presença de ${aluno.nome_completo} confirmada com sucesso! Certificado liberado.`
    };
  }
}

// ============================================================================
// 8. ADMINISTRAÇÃO E LISTAGEM
// ============================================================================
async function listarInscricoes() {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from(SUPABASE_CONFIG.tableName)
      .select('*')
      .neq('role', 'organizador')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar do Supabase:', error);
      throw error;
    }
    return data || [];
  } else {
    const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
    return inscricoes.filter(i => i.role !== 'organizador');
  }
}

async function atualizarStatusPagamento(id, novoStatus) {
  const sb = getSupabase();
  if (sb && !id.startsWith('demo-')) {
    const { error } = await sb
      .from(SUPABASE_CONFIG.tableName)
      .update({ status_pagamento: novoStatus })
      .eq('id', id);
    if (error) throw error;
    return true;
  } else {
    const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
    const index = inscricoes.findIndex(i => i.id === id);
    if (index !== -1) {
      inscricoes[index].status_pagamento = novoStatus;
      localStorage.setItem('cafe_ciencia_inscricoes', JSON.stringify(inscricoes));
      return true;
    }
    return false;
  }
}

async function registrarDisparoLembrete(id, tipoCanal, tipoLembrete) {
  const agora = new Date().toISOString();
  const sb = getSupabase();

  if (sb && !id.startsWith('demo-')) {
    await sb
      .from(SUPABASE_CONFIG.tableName)
      .update({
        lembrete_enviado: true,
        ultimo_lembrete_em: agora,
        tipo_ultimo_lembrete: tipoLembrete
      })
      .eq('id', id);

    try {
      await sb.from('lembretes_logs').insert([{
        inscricao_id: id,
        canal: tipoCanal,
        tipo_lembrete: tipoLembrete,
        destinatario: id
      }]);
    } catch (e) {
      console.warn('Erro ao salvar log de lembrete:', e);
    }
  } else {
    const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
    const index = inscricoes.findIndex(i => i.id === id);
    if (index !== -1) {
      inscricoes[index].lembrete_enviado = true;
      inscricoes[index].ultimo_lembrete_em = agora;
      inscricoes[index].tipo_ultimo_lembrete = tipoLembrete;
      localStorage.setItem('cafe_ciencia_inscricoes', JSON.stringify(inscricoes));
    }
  }
  return true;
}

// Expõe globalmente
window.LigaDB = {
  SUPABASE_CONFIG,
  PIX_CONFIG,
  ORGANIZADOR_PADRAO,
  getSupabase,
  getSupabaseCredentials,
  isSupabaseConfigured,
  salvarCredenciaisSupabase,
  getUsuarioLogado,
  salvarSessaoUsuario,
  fazerLogout,
  isOrganizadorLogado,
  fazerLogin,
  fazerLoginComGoogle,
  registrarInscricao,
  buscarInscricao,
  validarPresencaPorQRCode,
  listarInscricoes,
  atualizarStatusPagamento,
  registrarDisparoLembrete
};
