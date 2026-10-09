/**
 * Gerenciador de Banco de Dados, Supabase & Sistema de Contas
 * 10° Café com Ciência: Os Direitos dos Pacientes na Odontologia
 */

// ============================================================================
// 1. CONFIGURAÇÕES PRINCIPAIS DO SUPABASE (PRODUÇÃO)
// ============================================================================
const SUPABASE_CONFIG = {
  url: 'https://zcbylqggrxocdevddtlx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjYnlscWdncnhvY2RldmRkdGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxOTM2MzIsImV4cCI6MjEwNTc2OTYzMn0.FS5e7VlodcABs72X4xfTvwVW8eFn-E8JdZ9ZQNNxba0',
  tableName: 'inscricoes',
  bucketName: 'comprovantes'
};

// Google OAuth 2.0 Client ID Padrão Oficial do Evento
const GOOGLE_CLIENT_ID_PADRAO = '76820645389-2gg574uebbs4s08jmtoqfp88e8olrcbm.apps.googleusercontent.com';

// ============================================================================
// 2. CONFIGURAÇÕES DO PIX
// ============================================================================
const PIX_CONFIG = {
  chave: 'cadumancia@gmail.com',
  tipoChave: 'E-mail',
  titular: 'Organização Café com Ciência',
  cidade: 'Belo Horizonte',
  valor: '10.00',
  mensagem: '10 Cafe com Ciencia'
};

// ============================================================================
// GERADOR DE PAYLOAD PIX PADRÃO BANCO CENTRAL (BR CODE / EMVCo)
// Permite que qualquer aplicativo bancário reconheça o QR Code e o Pix Copia e Cola
// ============================================================================
function formatarCampoEMV(id, valor) {
  const len = String(valor.length).padStart(2, '0');
  return id + len + valor;
}

function calcularCRC16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function normalizarParaEMV(str, maxLen) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, '') // somente caracteres alfanumericos e espacos
    .trim()
    .toUpperCase()
    .slice(0, maxLen);
}

function gerarPayloadPix(dados = {}) {
  const chave = (dados.chave || PIX_CONFIG.chave).trim();
  const nome = normalizarParaEMV(dados.titular || PIX_CONFIG.titular, 25) || 'CAFE COM CIENCIA';
  const cidade = normalizarParaEMV(dados.cidade || PIX_CONFIG.cidade, 15) || 'BELO HORIZONTE';
  const valor = dados.valor || PIX_CONFIG.valor;
  const txid = normalizarParaEMV(dados.txid || '***', 25) || '***';

  const gui = formatarCampoEMV('00', 'br.gov.bcb.pix');
  const chavePix = formatarCampoEMV('01', chave);
  const merchantAccountInfo = formatarCampoEMV('26', gui + chavePix);

  let payload = '';
  payload += formatarCampoEMV('00', '01'); // Versao do Payload
  payload += formatarCampoEMV('01', '12'); // QR Code Estatico Reutilizavel
  payload += merchantAccountInfo;
  payload += formatarCampoEMV('52', '0000'); // Merchant Category Code
  payload += formatarCampoEMV('53', '986');  // Moeda Real (BRL)

  if (valor && parseFloat(valor) > 0) {
    const valorFormatado = parseFloat(valor).toFixed(2);
    payload += formatarCampoEMV('54', valorFormatado);
  }

  payload += formatarCampoEMV('58', 'BR'); // Pais
  payload += formatarCampoEMV('59', nome); // Nome do Recebedor
  payload += formatarCampoEMV('60', cidade); // Cidade
  payload += formatarCampoEMV('62', formatarCampoEMV('05', txid)); // TXID / Referencia
  payload += '6304'; // Inicio da Tag de Checksum

  return payload + calcularCRC16(payload);
}

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

function getGoogleClientId() {
  const custom = localStorage.getItem('cafe_google_client_id');
  if (custom && custom.trim() && !custom.includes('placeholder')) {
    return custom.trim();
  }
  if (window.GOOGLE_CLIENT_ID && !window.GOOGLE_CLIENT_ID.includes('placeholder') && !window.GOOGLE_CLIENT_ID.includes('google-client')) {
    return window.GOOGLE_CLIENT_ID.trim();
  }
  return GOOGLE_CLIENT_ID_PADRAO;
}

function salvarGoogleClientId(clientId) {
  if (clientId && clientId.trim()) {
    localStorage.setItem('cafe_google_client_id', clientId.trim());
    return true;
  } else {
    localStorage.removeItem('cafe_google_client_id');
    return false;
  }
}

function isGoogleConfigured() {
  const id = getGoogleClientId();
  return Boolean(id && id.includes('.apps.googleusercontent.com'));
}

// Controle de Liberação dos Certificados de Participação
function estaoCertificadosLiberados() {
  return localStorage.getItem('cafe_certificados_liberados') === 'true';
}

function alternarLiberacaoCertificados(novoStatus) {
  localStorage.setItem('cafe_certificados_liberados', novoStatus ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('certificados_status_changed', { detail: novoStatus }));
  return novoStatus;
}

// ============================================================================
// 4. SISTEMA DE AUTENTICAÇÃO E SESSÃO COM GOOGLE
// ============================================================================
const ORGANIZADOR_PADRAO = {
  email: 'organizacaocafecomciencia@gmail.com',
  senha: 'cafecomciencia2026@10',
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

function salvarContaGoogleRecente(nome, email, avatar = '') {
  try {
    const contas = JSON.parse(localStorage.getItem('cafe_contas_google_recentes') || '[]');
    const emailLimpo = (email || '').toLowerCase().trim();
    if (!emailLimpo) return;
    const index = contas.findIndex(c => c.email.toLowerCase() === emailLimpo);
    if (index !== -1) {
      contas[index] = { nome: nome || contas[index].nome, email: emailLimpo, avatar: avatar || contas[index].avatar };
    } else {
      contas.unshift({ nome: nome || emailLimpo.split('@')[0], email: emailLimpo, avatar });
    }
    localStorage.setItem('cafe_contas_google_recentes', JSON.stringify(contas.slice(0, 5)));
  } catch (e) {}
}

async function iniciarLoginGoogleOAuth() {
  const sb = getSupabase();
  if (sb && sb.auth && isSupabaseConfigured() && window.location.protocol.startsWith('http')) {
    const currentUrl = window.location.origin + window.location.pathname;
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: currentUrl,
        queryParams: {
          prompt: 'select_account'
        }
      }
    });
    if (error) throw error;
    return data;
  }
  return false;
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

  salvarContaGoogleRecente(nomeGoogle, emailGoogle, avatarGoogle);

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

function extrairInstituicaoAluno(aluno) {
  if (!aluno) return 'Faculdade Arnaldo';
  if (aluno.instituicao && typeof aluno.instituicao === 'string' && aluno.instituicao.trim()) {
    return aluno.instituicao.trim();
  }
  if (aluno.observacoes && typeof aluno.observacoes === 'string' && aluno.observacoes.trim()) {
    const obs = aluno.observacoes.trim();
    if (obs.toLowerCase().startsWith('faculdade:')) {
      const extraido = obs.substring(10).trim();
      if (extraido) return extraido;
    }
    if (obs.toLowerCase() === 'faculdade arnaldo') {
      return 'Faculdade Arnaldo';
    }
    return obs;
  }
  return 'Faculdade Arnaldo';
}

async function registrarInscricao({ nome_completo, email, telefone, instituicao, comprovanteFile }) {
  if (!comprovanteFile) {
    throw new Error('O anexo do comprovante de pagamento Pix de R$ 10,00 é estritamente obrigatório.');
  }

  const protocolo = gerarProtocolo();
  const emailLimpo = email.trim().toLowerCase();
  const instituicaoLimpa = (instituicao && instituicao.trim()) ? instituicao.trim() : 'Faculdade Arnaldo';
  const obsValor = (instituicaoLimpa === 'Faculdade Arnaldo') ? 'Faculdade Arnaldo' : `Faculdade: ${instituicaoLimpa}`;
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

      const basePayload = {
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
        lembrete_enviado: false,
        observacoes: obsValor
      };

      // Tenta inserir incluindo 'instituicao'. Se a coluna ainda não existir no Postgres,
      // faz fallback transparente para basePayload (onde o dado fica preservado em 'observacoes').
      let insertData = null;
      const { data: dComInst, error: errComInst } = await sb
        .from(SUPABASE_CONFIG.tableName)
        .insert([{ ...basePayload, instituicao: instituicaoLimpa }])
        .select();

      if (errComInst) {
        if (errComInst.code === '42703' || (errComInst.message && errComInst.message.toLowerCase().includes('instituicao'))) {
          const { data: dFallback, error: errFallback } = await sb
            .from(SUPABASE_CONFIG.tableName)
            .insert([basePayload])
            .select();
          if (errFallback) {
            console.error('Erro ao salvar no Supabase (fallback):', errFallback);
            throw new Error('Falha ao registrar inscrição no banco de dados.');
          }
          insertData = dFallback;
        } else {
          console.error('Erro ao salvar no Supabase:', errComInst);
          throw new Error('Falha ao registrar inscrição no banco de dados.');
        }
      } else {
        insertData = dComInst;
      }

      const novoUsuario = {
        ...insertData[0],
        instituicao: instituicaoLimpa
      };
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
      instituicao: instituicaoLimpa,
      observacoes: obsValor,
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
  let lista = [];
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
    lista = data || [];
  } else {
    const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
    lista = inscricoes.filter(i => i.role !== 'organizador');
  }

  // Garante que todos os participantes (incluindo os inscritos anteriores) tenham a instituição definida (padrão 'Faculdade Arnaldo')
  return lista.map(item => ({
    ...item,
    instituicao: extrairInstituicaoAluno(item)
  }));
}

async function atualizarStatusPagamento(id, novoStatus) {
  const sb = getSupabase();
  if (sb && !id.startsWith('demo-')) {
    const { error } = await sb
      .from(SUPABASE_CONFIG.tableName)
      .update({ status_pagamento: novoStatus })
      .eq('id', id);
    if (error) throw error;
  } else {
    const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
    const index = inscricoes.findIndex(i => i.id === id);
    if (index !== -1) {
      inscricoes[index].status_pagamento = novoStatus;
      localStorage.setItem('cafe_ciencia_inscricoes', JSON.stringify(inscricoes));
    }
  }

  // Se o usuário logado for este mesmo, atualiza também a sessão local
  try {
    const usuarioLogado = getUsuarioLogado();
    if (usuarioLogado && (usuarioLogado.id === id || usuarioLogado.protocolo === id)) {
      usuarioLogado.status_pagamento = novoStatus;
      salvarSessaoUsuario(usuarioLogado);
    }
  } catch (e) {}

  return true;
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

// ============================================================================
// 9. LIMPEZA TOTAL DO BANCO DE DADOS E ARMAZENAMENTO (PROTEGIDO POR SENHA)
// ============================================================================
async function resetarBancoDeDados(senha) {
  if (senha !== 'cafe2026') {
    throw new Error('Senha incorreta! Acesso não autorizado para resetar o banco de dados.');
  }

  const sb = getSupabase();
  const resultados = {
    inscricoesApagadas: 0,
    arquivosApagados: 0,
    logsApagados: 0,
    localLimpo: false
  };

  if (sb) {
    // 1. Apagar logs de lembretes vinculados aos inscritos (evita restrições de chave estrangeira)
    try {
      const { data: logsDeletados, error: errLogs } = await sb
        .from('lembretes_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select();

      if (!errLogs && logsDeletados) {
        resultados.logsApagados = logsDeletados.length;
      }
    } catch (errLogs) {
      console.warn('Aviso ao limpar logs de lembretes:', errLogs);
    }

    // 2. Apagar fotos e comprovantes do Supabase Storage
    try {
      const pathsParaRemover = new Set();

      // a) Lista da pasta comprovantes/
      const { data: arquivosPasta } = await sb.storage
        .from(SUPABASE_CONFIG.bucketName)
        .list('comprovantes', { limit: 1000 });

      if (arquivosPasta && Array.isArray(arquivosPasta)) {
        arquivosPasta.forEach(item => {
          if (item.name && item.name !== '.emptyFolderPlaceholder') {
            pathsParaRemover.add(`comprovantes/${item.name}`);
          }
        });
      }

      // b) Lista da raiz do bucket
      const { data: arquivosRaiz } = await sb.storage
        .from(SUPABASE_CONFIG.bucketName)
        .list('', { limit: 1000 });

      if (arquivosRaiz && Array.isArray(arquivosRaiz)) {
        arquivosRaiz.forEach(item => {
          if (item.name && item.name !== 'comprovantes' && item.name !== '.emptyFolderPlaceholder') {
            pathsParaRemover.add(item.name);
          }
        });
      }

      // c) Extrai caminhos salvos nas inscrições antes de deletá-las
      const { data: todasInscricoes } = await sb
        .from(SUPABASE_CONFIG.tableName)
        .select('comprovante_url');

      if (todasInscricoes && Array.isArray(todasInscricoes)) {
        todasInscricoes.forEach(ins => {
          if (ins.comprovante_url && ins.comprovante_url.includes('/comprovantes/')) {
            const partes = ins.comprovante_url.split('/comprovantes/');
            if (partes.length > 1) {
              const subpath = partes.slice(1).join('/comprovantes/');
              if (subpath) pathsParaRemover.add(subpath);
            }
          }
        });
      }

      const listaRemover = Array.from(pathsParaRemover);
      if (listaRemover.length > 0) {
        const { error: errStorage } = await sb.storage
          .from(SUPABASE_CONFIG.bucketName)
          .remove(listaRemover);

        if (!errStorage) {
          resultados.arquivosApagados = listaRemover.length;
        } else {
          console.warn('Aviso ao remover arquivos do storage:', errStorage);
        }
      }
    } catch (errStorage) {
      console.warn('Erro ao limpar arquivos de comprovantes:', errStorage);
    }

    // 3. Apagar inscrições da tabela 'inscricoes' (preserva apenas a conta do organizador)
    try {
      const emailOrg = 'cafecomciencia.liga@gmail.com';

      // Verifica quantos inscritos existem antes
      const { data: antesInscritos } = await sb
        .from(SUPABASE_CONFIG.tableName)
        .select('id')
        .neq('email', emailOrg)
        .neq('role', 'organizador');

      const totalParaApagar = antesInscritos ? antesInscritos.length : 0;

      const { data: deletados, error: errDelete } = await sb
        .from(SUPABASE_CONFIG.tableName)
        .delete()
        .neq('email', emailOrg)
        .neq('role', 'organizador')
        .select();

      if (errDelete) {
        throw new Error('Falha ao apagar inscrições do Supabase: ' + errDelete.message);
      }

      resultados.inscricoesApagadas = deletados ? deletados.length : 0;

      // Se havia inscritos cadastrados e o Supabase retornou 0 deletados, RLS bloqueou DELETE
      if (totalParaApagar > 0 && resultados.inscricoesApagadas === 0) {
        throw new Error('RLS_DELETE_BLOQUEADO');
      }
    } catch (errInscricoes) {
      console.error('Erro ao deletar inscrições:', errInscricoes);
      throw errInscricoes;
    }
  }

  // 4. Limpar inscrições do localStorage
  localStorage.removeItem('cafe_ciencia_inscricoes');
  resultados.localLimpo = true;

  // 5. Se o usuário atualmente logado for um participante de teste, desloga-o
  const usuarioLogado = getUsuarioLogado();
  if (usuarioLogado && usuarioLogado.role !== 'organizador') {
    localStorage.removeItem('cafe_session_user');
  }

  return resultados;
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
  iniciarLoginGoogleOAuth,
  salvarContaGoogleRecente,
  registrarInscricao,
  buscarInscricao,
  validarPresencaPorQRCode,
  listarInscricoes,
  atualizarStatusPagamento,
  registrarDisparoLembrete,
  resetarBancoDeDados,
  gerarPayloadPix,
  getGoogleClientId,
  salvarGoogleClientId,
  isGoogleConfigured,
  estaoCertificadosLiberados,
  alternarLiberacaoCertificados,
  extrairInstituicaoAluno
};

