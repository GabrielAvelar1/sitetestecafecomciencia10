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

const PIX_CONFIG_11 = {
  chave: '70014901641',
  tipoChave: 'CPF',
  titular: 'Organização Café com Ciência',
  cidade: 'Belo Horizonte',
  valor: '10.00',
  mensagem: '11 Cafe com Ciencia'
};

const PIX_CONFIG_12 = {
  payloadCopiaECola: '00020126580014br.gov.bcb.pix0136e4dafbbe-4395-413b-aac8-8dd5878d1db95204000053039865802BR5925ANA CAROLINA MESQUITA ARA6009Sao Paulo62290525REC6ACF6FE413C668839679276304BAF1',
  chave: 'e4dafbbe-4395-413b-aac8-8dd5878d1db9',
  tipoChave: 'Aleatória',
  titular: 'ANA CAROLINA MESQUITA ARA',
  cidade: 'Sao Paulo',
  valor: '10.00',
  mensagem: '12 Cafe com Ciencia'
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

async function alternarLiberacaoCertificados(novoStatus) {
  localStorage.setItem('cafe_certificados_liberados', novoStatus ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('certificados_status_changed', { detail: novoStatus }));

  // Sincroniza com o Supabase na nuvem
  const sb = getSupabase();
  if (sb) {
    try {
      const cfgAtual = (await obterConfiguracoesSistema()) || {};
      cfgAtual.certificados_liberados = !!novoStatus;
      await sb
        .from(SUPABASE_CONFIG.tableName)
        .update({
          observacoes: JSON.stringify(cfgAtual),
          ultimo_lembrete_em: new Date().toISOString()
        })
        .eq('protocolo', 'SISTEMA-CONFIG');
    } catch (e) {
      console.warn('Erro ao sincronizar status de certificados no Supabase:', e);
    }
  }

  return novoStatus;
}

// ============================================================================
// CONTROLE DE CONFIGURAÇÕES GLOBAIS (INSCRIÇÕES ENCERRADAS & CERTIFICADOS)
// ============================================================================
let configSistemaCache = null;

async function obterConfiguracoesSistema() {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from(SUPABASE_CONFIG.tableName)
        .select('*')
        .eq('protocolo', 'SISTEMA-CONFIG')
        .limit(1);

      if (!error && data && data.length > 0 && data[0].observacoes) {
        try {
          const cfg = JSON.parse(data[0].observacoes);
          configSistemaCache = cfg;
          if (cfg.inscricoes_10) localStorage.setItem('cafe_inscricoes_encerradas_10', cfg.inscricoes_10 === 'encerradas' ? 'true' : 'false');
          if (cfg.inscricoes_11) localStorage.setItem('cafe_inscricoes_encerradas_11', cfg.inscricoes_11 === 'encerradas' ? 'true' : 'false');
          if (cfg.inscricoes_12) localStorage.setItem('cafe_inscricoes_encerradas_12', cfg.inscricoes_12 === 'encerradas' ? 'true' : 'false');
          if (cfg.edicao_ativa_portaria) localStorage.setItem('cafe_edicao_ativa_portaria', String(cfg.edicao_ativa_portaria));
          if (typeof cfg.certificados_liberados === 'boolean') {
            localStorage.setItem('cafe_certificados_liberados', cfg.certificados_liberados ? 'true' : 'false');
          }
          return cfg;
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Aviso ao consultar configurações do sistema:', e);
    }
  }

  return {
    inscricoes_10: localStorage.getItem('cafe_inscricoes_encerradas_10') === 'true' ? 'encerradas' : 'abertas',
    inscricoes_11: localStorage.getItem('cafe_inscricoes_encerradas_11') === 'true' ? 'encerradas' : 'abertas',
    inscricoes_12: localStorage.getItem('cafe_inscricoes_encerradas_12') === 'true' ? 'encerradas' : 'abertas',
    edicao_ativa_portaria: localStorage.getItem('cafe_edicao_ativa_portaria') ? parseInt(localStorage.getItem('cafe_edicao_ativa_portaria'), 10) : 12,
    certificados_liberados: localStorage.getItem('cafe_certificados_liberados') === 'true'
  };
}

async function obterEdicaoAtivaPortaria() {
  try {
    const cfg = await obterConfiguracoesSistema();
    if (cfg && cfg.edicao_ativa_portaria) {
      return parseInt(cfg.edicao_ativa_portaria, 10);
    }
  } catch (e) {}

  const salvaLocal = localStorage.getItem('cafe_edicao_ativa_portaria');
  if (salvaLocal) {
    return parseInt(salvaLocal, 10);
  }
  return 12;
}

async function definirEdicaoAtivaPortaria(edicao) {
  const num = parseInt(edicao, 10) || 12;
  localStorage.setItem('cafe_edicao_ativa_portaria', String(num));

  const sb = getSupabase();
  if (sb) {
    try {
      const cfgAtual = (await obterConfiguracoesSistema()) || {};
      cfgAtual.edicao_ativa_portaria = num;

      const { data: existente } = await sb
        .from(SUPABASE_CONFIG.tableName)
        .select('id')
        .eq('protocolo', 'SISTEMA-CONFIG')
        .limit(1);

      if (existente && existente.length > 0) {
        await sb
          .from(SUPABASE_CONFIG.tableName)
          .update({
            observacoes: JSON.stringify(cfgAtual),
            ultimo_lembrete_em: new Date().toISOString()
          })
          .eq('protocolo', 'SISTEMA-CONFIG');
      } else {
        await sb
          .from(SUPABASE_CONFIG.tableName)
          .insert([{
            protocolo: 'SISTEMA-CONFIG',
            nome_completo: 'Configurações Globais do Sistema',
            email: 'admin@cafecomciencia.com',
            telefone: '31999999999',
            observacoes: JSON.stringify(cfgAtual),
            presenca_confirmada: false,
            pago: true
          }]);
      }
    } catch (e) {
      console.warn('Erro ao salvar edicao_ativa_portaria no Supabase:', e);
    }
  }

  window.dispatchEvent(new CustomEvent('portaria_edicao_changed', {
    detail: { edicao: num }
  }));

  return num;
}

function obterInfoEdicao(edicao) {
  const n = parseInt(edicao, 10) || 12;
  const catalogo = {
    10: {
      num: 10,
      prefixo: 'CC10',
      titulo: '10° Café com Ciência',
      subtitulo: 'A Importância do Pré-Natal Odontológico',
      palestrante: 'Profa. Dra. Carolina Diniz',
      link: 'index.html'
    },
    11: {
      num: 11,
      prefixo: 'CC11',
      titulo: '11° Café com Ciência',
      subtitulo: 'Disfunção Temporomandibular e Dor Orofacial',
      palestrante: 'Prof. Dr. Henrique Pretti',
      link: '11cafe.html'
    },
    12: {
      num: 12,
      prefixo: 'CC12',
      titulo: '12° Café com Ciência',
      subtitulo: 'Diagnóstico e Planejamento na Reabilitação Oral',
      palestrante: 'Dra. Thaissa Calab',
      link: '12cafe.html'
    },
    13: {
      num: 13,
      prefixo: 'CC13',
      titulo: '13° Café com Ciência',
      subtitulo: 'Próxima Edição Oficial',
      palestrante: 'Liga Acadêmica de Odontologia',
      link: 'portal.html'
    }
  };

  if (catalogo[n]) return catalogo[n];
  return {
    num: n,
    prefixo: `CC${n}`,
    titulo: `${n}° Café com Ciência`,
    subtitulo: `${n}ª Edição Oficial`,
    palestrante: 'Liga Acadêmica de Odontologia',
    link: 'portal.html'
  };
}

function estaoInscricoesEncerradas(edicao = 10) {
  const n = parseInt(edicao, 10);
  const ed = (n === 12 || n === 11) ? n : 10;
  return localStorage.getItem(`cafe_inscricoes_encerradas_${ed}`) === 'true';
}

async function alternarInscricoesEncerradas(edicao = 10, novoStatusEncerradas = true) {
  const n = parseInt(edicao, 10);
  const ed = (n === 12 || n === 11) ? n : 10;
  const statusStr = novoStatusEncerradas ? 'encerradas' : 'abertas';

  // 1. Atualiza localStorage local
  localStorage.setItem(`cafe_inscricoes_encerradas_${ed}`, novoStatusEncerradas ? 'true' : 'false');

  // 2. Atualiza Supabase na nuvem para sincronizar com todos os celulares e computadores
  const sb = getSupabase();
  if (sb) {
    try {
      const cfgAtual = (await obterConfiguracoesSistema()) || {};
      cfgAtual[`inscricoes_${ed}`] = statusStr;

      const { data: existente } = await sb
        .from(SUPABASE_CONFIG.tableName)
        .select('id')
        .eq('protocolo', 'SISTEMA-CONFIG')
        .limit(1);

      if (existente && existente.length > 0) {
        await sb
          .from(SUPABASE_CONFIG.tableName)
          .update({
            observacoes: JSON.stringify(cfgAtual),
            ultimo_lembrete_em: new Date().toISOString()
          })
          .eq('protocolo', 'SISTEMA-CONFIG');
      } else {
        await sb
          .from(SUPABASE_CONFIG.tableName)
          .insert([{
            protocolo: 'SISTEMA-CONFIG',
            nome_completo: 'Configurações Globais do Sistema',
            email: 'config.sistema@cafecomciencia.local',
            telefone: '(00) 00000-0000',
            senha: 'sistema-config',
            role: 'organizador',
            status_pagamento: 'aprovado',
            observacoes: JSON.stringify(cfgAtual)
          }]);
      }
    } catch (e) {
      console.warn('Erro ao sincronizar status de inscrições no Supabase:', e);
    }
  }

  window.dispatchEvent(new CustomEvent('inscricoes_status_changed', { 
    detail: { edicao: ed, status: statusStr, encerradas: novoStatusEncerradas } 
  }));

  return novoStatusEncerradas;
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
      .order('created_at', { ascending: false })
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
function gerarProtocolo(edicao = 10) {
  const aleatorio = Math.floor(100000 + Math.random() * 900000);
  const n = parseInt(edicao, 10);
  const prefixo = n === 12 ? 'CC12' : (n === 11 ? 'CC11' : 'CC10');
  return `${prefixo}-${aleatorio}`;
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

async function registrarInscricao({ nome_completo, email, telefone, instituicao, comprovanteFile, edicao = 10 }) {
  if (!comprovanteFile) {
    throw new Error('O anexo do comprovante de pagamento Pix de R$ 10,00 é estritamente obrigatório.');
  }

  const n = parseInt(edicao, 10);
  const numEdicao = (n === 12 || n === 11) ? n : 10;

  if (estaoInscricoesEncerradas(numEdicao)) {
    throw new Error(`As inscrições para o ${numEdicao}° Café com Ciência foram encerradas pela comissão organizadora.`);
  }
  const protocolo = gerarProtocolo(numEdicao);
  const emailLimpo = email.trim().toLowerCase();
  const instituicaoLimpa = (instituicao && instituicao.trim()) ? instituicao.trim() : 'Faculdade Arnaldo';
  
  const prefixoTag = numEdicao === 12 ? '[12° Café] ' : (numEdicao === 11 ? '[11° Café] ' : '');
  const obsValor = `${prefixoTag}${(instituicaoLimpa === 'Faculdade Arnaldo') ? 'Faculdade Arnaldo' : `Faculdade: ${instituicaoLimpa}`}`;
  const sb = getSupabase();

  if (sb) {
    try {
      // 1. Verifica se já existe inscrição para ESTE e-mail NESTA MESMA edição
      const { data: existente } = await sb
        .from(SUPABASE_CONFIG.tableName)
        .select('id, email, protocolo')
        .ilike('email', emailLimpo);

      const prefixoEsperado = `CC${numEdicao}-`;
      const jaInscritoNestaEdicao = (existente || []).some(item => 
        item.protocolo && item.protocolo.startsWith(prefixoEsperado)
      );

      if (jaInscritoNestaEdicao) {
        throw new Error(`Já existe uma inscrição registrada para este e-mail no ${numEdicao}° Café com Ciência. Acesse sua conta ou consulte sua credencial.`);
      }

      // 2. Upload do Comprovante para o Supabase Storage (com tratamento seguro e contentType)
      let comprovanteUrl = '';
      let comprovanteNome = comprovanteFile ? (comprovanteFile.name || 'comprovante.jpg') : 'comprovante.jpg';

      if (comprovanteFile) {
        try {
          const ext = (comprovanteFile.name && comprovanteFile.name.includes('.')) 
            ? comprovanteFile.name.split('.').pop().toLowerCase() 
            : 'jpg';
          const fileName = `${numEdicao}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

          const { error: uploadError } = await sb.storage
            .from(SUPABASE_CONFIG.bucketName)
            .upload(fileName, comprovanteFile, {
              cacheControl: '3600',
              upsert: true,
              contentType: comprovanteFile.type || 'image/jpeg'
            });

          if (!uploadError) {
            const { data: publicUrlData } = sb.storage
              .from(SUPABASE_CONFIG.bucketName)
              .getPublicUrl(fileName);
            comprovanteUrl = publicUrlData?.publicUrl || '';
          } else {
            console.warn('Aviso no upload do Storage (tentando fallback local):', uploadError);
          }
        } catch (storageErr) {
          console.warn('Storage indisponível, prosseguindo com fallback:', storageErr);
        }
      }

      // Se o bucket falhou ou não gerou URL, converte para base64 como contingência
      if (!comprovanteUrl && comprovanteFile) {
        try {
          comprovanteUrl = await fileToBase64(comprovanteFile);
        } catch (e) {
          console.warn('Falha na conversão base64 do comprovante:', e);
        }
      }

      // Payload base completo com 'instituicao' sempre inclusa
      const basePayload = {
        protocolo: protocolo,
        nome_completo: nome_completo.trim(),
        email: emailLimpo,
        telefone: telefone.trim(),
        instituicao: instituicaoLimpa,
        senha: 'google-oauth',
        role: 'aluno',
        valor: 10.00,
        status_pagamento: 'pendente',
        comprovante_url: comprovanteUrl,
        comprovante_nome: comprovanteNome,
        presenca_confirmada: false,
        certificado_emitido: false,
        lembrete_enviado: false,
        observacoes: obsValor
      };

      let insertData = null;

      // 1ª Tentativa: Inserção com payload padrão garantido
      let { data: dInsert, error: errInsert } = await sb
        .from(SUPABASE_CONFIG.tableName)
        .insert([basePayload])
        .select();

      if (errInsert) {
        console.warn('Tentativa primária de inserção retornou erro:', errInsert);

        // Fallback 1: Caso a coluna 'instituicao' não exista em versões antigas do schema
        if (errInsert.code === '42703' || (errInsert.message && errInsert.message.toLowerCase().includes('instituicao'))) {
          const payloadSemInst = { ...basePayload };
          delete payloadSemInst.instituicao;
          const { data: dSemInst, error: errSemInst } = await sb
            .from(SUPABASE_CONFIG.tableName)
            .insert([payloadSemInst])
            .select();

          if (!errSemInst && dSemInst && dSemInst.length > 0) {
            insertData = dSemInst;
          } else {
            console.error('Erro crítico no Supabase (sem instituicao):', errSemInst);
            throw new Error('Falha ao registrar inscrição no banco de dados: ' + (errSemInst?.message || 'Erro de conexão'));
          }
        } else {
          console.error('Erro crítico no Supabase:', errInsert);
          throw new Error('Falha ao registrar inscrição no banco de dados: ' + (errInsert?.message || 'Erro desconhecido'));
        }
      } else {
        insertData = dInsert;
      }

      const novoUsuario = {
        ...insertData[0],
        email: emailLimpo,
        instituicao: instituicaoLimpa,
        edicao: numEdicao
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
    // Modo Local (Fallback para testes sem Supabase conectado)
    const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
    const prefixoEsperado = `CC${numEdicao}-`;
    const existente = inscricoes.find(i => 
      i.email && i.email.toLowerCase() === emailLimpo && i.protocolo && i.protocolo.startsWith(prefixoEsperado)
    );
    if (existente) {
      throw new Error(`Já existe uma inscrição registrada para este e-mail no ${numEdicao}° Café com Ciência.`);
    }

    let comprovanteBase64 = '';
    if (comprovanteFile) {
      try {
        comprovanteBase64 = await fileToBase64(comprovanteFile);
      } catch (e) {}
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
      edicao: numEdicao,
      senha: 'google-oauth',
      role: 'aluno',
      valor: 10.00,
      status_pagamento: 'pendente',
      comprovante_url: comprovanteBase64,
      comprovante_nome: comprovanteFile ? comprovanteFile.name : 'comprovante.jpg',
      presenca_confirmada: false,
      certificado_emitido: false,
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
// ACERVO HISTÓRICO PERMANENTE (10° E 11° CAFÉ COM CIÊNCIA)
// Garante acesso perpétuo às declarações oficiais em PDF e credenciais de inscrição
// mesmo após limpeza periódica do banco de dados para economia de espaço.
// ============================================================================
const HISTORICO_INSCRICOES = [{"id":"017a3e5c-8f46-446f-836d-f8173cc1f5f0","created_at":"2026-09-29T22:03:38.227475+00:00","protocolo":"CC10-385765","nome_completo":"Gabriele dos Reis Beato","email":"gabrielereis402@gmail.com","telefone":"(31) 98342-8322","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1790719416751_coezo.png","comprovante_nome":"IMG_0123.png","presenca_confirmada":true,"presenca_horario":"2026-10-30T17:44:57.356+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-385765","certificado_data_emissao":"2026-10-30T17:44:57.356+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:17:21.761+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":null,"senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"566e8caf-d58e-4125-87d9-04d82501d2b5","created_at":"2026-09-30T10:19:49.400951+00:00","protocolo":"CC10-175382","nome_completo":"Chelsea Lyssa de Souza Lino","email":"chelsealyssa03@gmail.com","telefone":"(31) 98590-2741","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1790763588122_z1l4x.png","comprovante_nome":"IMG_2073.png","presenca_confirmada":true,"presenca_horario":"2026-10-30T17:39:49.058+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-175382","certificado_data_emissao":"2026-10-30T17:39:49.058+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:17:26.643+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":null,"senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"7e70aee5-b793-413a-84cb-b78c5dacad64","created_at":"2026-10-01T21:00:59.224139+00:00","protocolo":"CC10-326623","nome_completo":"Ana Clara Gonçalves de Oliveira","email":"anaclaragoncalves0109@gmail.com","telefone":"(55) 98854-4473","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1790888457680_cefap.jpeg","comprovante_nome":"IMG_0008.jpeg","presenca_confirmada":false,"presenca_horario":"2026-10-30T20:37:27.947+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC10-326623","certificado_data_emissao":"2026-10-30T20:37:27.947+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T21:20:31.451+00:00","tipo_ultimo_lembrete":"vespera","observacoes":null,"senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"a4657b6b-8354-40cf-86fd-4fa94c0737fe","created_at":"2026-10-05T21:51:12.217534+00:00","protocolo":"CC10-568458","nome_completo":"Jannes Evaristo Azevedo","email":"jannesevaris@gmail.com","telefone":"(33) 99148-9358","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1791237070225_ysqdf.png","comprovante_nome":"IMG_7997.png","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:17:34.957+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":null,"senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"25e65f1e-62b7-4067-b165-e70d38f5973f","created_at":"2026-10-05T22:11:36.161766+00:00","protocolo":"CC10-352983","nome_completo":"Istefany Gomes de Almeida","email":"istefanygalmeida@gmail.com","telefone":"(33) 98750-9280","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1791238294424_0ni0o.jpeg","comprovante_nome":"IMG_2300.jpeg","presenca_confirmada":true,"presenca_horario":"2026-10-30T18:08:30.971+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-352983","certificado_data_emissao":"2026-10-30T18:08:30.971+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:17:39.608+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":null,"senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"097e3d29-87ee-4b3a-9bf6-6749abe95a6f","created_at":"2026-10-05T23:39:40.501269+00:00","protocolo":"CC10-158891","nome_completo":"Iasmin Gomes de Almeida","email":"mimgomes845@gmail.com","telefone":"(33) 98875-2773","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1791243578566_kh85d.jpeg","comprovante_nome":"IMG_1208.jpeg","presenca_confirmada":true,"presenca_horario":"2026-10-30T18:05:33.303+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-158891","certificado_data_emissao":"2026-10-30T18:05:33.303+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:17:44.8+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":null,"senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"a56ddcf4-7282-4a17-b04b-258113699109","created_at":"2026-10-06T14:25:09.585764+00:00","protocolo":"CC10-989324","nome_completo":"Yasmim Pereira dos Santos Morais","email":"yasmimpereira128@gmail.com","telefone":"(31) 99968-4895","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1791296708593_sgfq5.jpeg","comprovante_nome":"IMG_2820.jpeg","presenca_confirmada":true,"presenca_horario":"2026-10-30T17:58:14.198+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-989324","certificado_data_emissao":"2026-10-30T17:58:14.198+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:17:48.956+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":null,"senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"9f222e16-7a11-4124-bcc5-1404286c5056","created_at":"2026-10-06T14:26:07.202163+00:00","protocolo":"CC10-239152","nome_completo":"Julia Lustosa","email":"jlustosa412@gmail.com","telefone":"(31) 99862-2999","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1791296765278_s72jv.jpeg","comprovante_nome":"23919101-a30e-466d-b98b-a65334975850.jpeg","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:17:53.051+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":null,"senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"b6d0c01d-98f9-44e1-bff5-e0403d5bd4b6","created_at":"2026-10-06T14:26:38.637341+00:00","protocolo":"CC10-242238","nome_completo":"Ana Luiza Martins","email":"hilario.analuiza@gmail.com","telefone":"(31) 97542-3244","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1791296796705_b5z00.png","comprovante_nome":"IMG_6651.png","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:17:56.974+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":null,"senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"db898734-6c63-418f-a536-e7e13ad9bcdf","created_at":"2026-10-06T14:29:41.860276+00:00","protocolo":"CC10-180840","nome_completo":"Deborah Ketlyn Alves Lage","email":"deborahlageodontologia@gmail.com","telefone":"(31) 99961-8697","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1791296976539_f9xfl.png","comprovante_nome":"IMG_1501.png","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:00.817+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":null,"senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"cad4fd95-5e75-4120-af1b-58677a657061","created_at":"2026-10-07T01:01:48.643527+00:00","protocolo":"CC10-449586","nome_completo":"Ana Beatriz Assunção Moreira","email":"beatrizassm@gmail.com","telefone":"(31) 97217-1957","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1791334906922_5cime.jpeg","comprovante_nome":"716898c8-32db-4c2e-a17f-b41e78ee620d.jpeg","presenca_confirmada":true,"presenca_horario":"2026-10-30T19:11:02.381+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC10-449586","certificado_data_emissao":"2026-10-30T19:11:02.381+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:04.049+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":null,"senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"0efb9736-816a-45b6-bcc8-2f4241f46216","created_at":"2026-10-08T10:45:28.676888+00:00","protocolo":"CC10-905991","nome_completo":"Isabela Costa Morais","email":"isabelamorais0303@gmail.com","telefone":"(33) 98854-3962","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1791456327016_fz6ck.png","comprovante_nome":"IMG_3088.png","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:08.025+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":null,"senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"6335c3b5-8544-47af-b5a3-38d2dc567d05","created_at":"2026-10-08T10:48:31.722014+00:00","protocolo":"CC10-682042","nome_completo":"Rui Caldeira Júnior","email":"ruicaldeirajuior7@gmail.com","telefone":"(33) 99851-3439","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1791456509769_hlhw4.png","comprovante_nome":"IMG_3653.png","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:11.991+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":null,"senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"d1edaa33-6fd8-4184-b997-e56ec5155f15","created_at":"2026-10-14T20:50:08.257287+00:00","protocolo":"CC10-298243","nome_completo":"Paola Martins Lages Silva","email":"paolalages2102@gmail.com","telefone":"(33) 99991-0318","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792011005377_v7vyd.jpg","comprovante_nome":"inbound845632492107263990.jpg","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:15.855+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"24786cf4-9afb-4ae9-8f53-ceac899f7ea1","created_at":"2026-10-14T22:35:47.980712+00:00","protocolo":"CC10-534963","nome_completo":"Geovana Oliveira Ferreira","email":"geovanaof14@gmail.com","telefone":"(31) 98308-5507","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792017346266_lcnmu.jpg","comprovante_nome":"inbound8805861238683615893.jpg","presenca_confirmada":true,"presenca_horario":"2026-10-30T17:39:43.555+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-534963","certificado_data_emissao":"2026-10-30T17:39:43.555+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:19.608+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"e51e516e-2afa-4505-9773-92123dfee85f","created_at":"2026-10-15T17:37:20.569924+00:00","protocolo":"CC10-190206","nome_completo":"AILA FERNANDES RAMOS E SILVA","email":"ailafrs@gmail.com","telefone":"(31) 98779-6059","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792085839207_x3vzw.jpeg","comprovante_nome":"Comprovante Aila 10 cafe com ciência.jpeg","presenca_confirmada":true,"presenca_horario":"2026-10-30T19:08:23.859+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC10-190206","certificado_data_emissao":"2026-10-30T19:08:23.859+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:23.674+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"8b09ec0b-569a-44cd-aceb-0f087e0dc104","created_at":"2026-10-16T12:02:58.605983+00:00","protocolo":"CC10-287757","nome_completo":"Ana clara ferreira Santos","email":"anaclarasanttos039@gmail.com","telefone":"(31) 98573-0440","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792152170838_fr4hp.png","comprovante_nome":"IMG_6493.png","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:28.472+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade: Anhanguera betim","senha":"google-oauth","role":"aluno","instituicao":"Anhanguera betim","edicao":10},{"id":"86b57ca6-6dd2-4282-9afa-a0e8fef770b5","created_at":"2026-10-16T15:12:36.554422+00:00","protocolo":"CC10-812167","nome_completo":"Júlia Soares Souto","email":"jusoaressouto06@gmail.com","telefone":"(31) 99996-4297","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792163554241_ucybh.jpg","comprovante_nome":"inbound8486665224665488924.jpg","presenca_confirmada":true,"presenca_horario":"2026-10-30T17:58:33.982+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-812167","certificado_data_emissao":"2026-10-30T17:58:33.982+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:33.138+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"92bb03b3-51e7-4871-a09e-06b27a3049e0","created_at":"2026-10-17T22:16:40.767229+00:00","protocolo":"CC10-162029","nome_completo":"Karoline Sathler Rocha Godinho","email":"karolinesathlerr@gmail.com","telefone":"(31) 97317-4083","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792275399062_fydu8.png","comprovante_nome":"IMG_7635.png","presenca_confirmada":true,"presenca_horario":"2026-10-30T17:55:46.452+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-162029","certificado_data_emissao":"2026-10-30T17:55:46.452+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:37.074+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"85a51ca5-528d-4086-8ab2-3997205676c0","created_at":"2026-10-18T23:53:14.859334+00:00","protocolo":"CC10-278341","nome_completo":"Aimée Germano Torres Sales","email":"aimeesales21@gmail.com","telefone":"(31) 99471-2920","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792367593688_qqpf4.jpg","comprovante_nome":"IMG-20261018-WA0024.jpg","presenca_confirmada":true,"presenca_horario":"2026-10-30T17:58:02.55+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-278341","certificado_data_emissao":"2026-10-30T17:58:02.55+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:41.02+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"335c05a6-6cde-4214-a181-b31f1e5472cb","created_at":"2026-10-19T16:41:44.950864+00:00","protocolo":"CC10-651812","nome_completo":"Thaís Suellen Cesar Rocha","email":"thaissuellen22@outlook.com","telefone":"(31) 99179-9410","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792428103504_8vmui.jpeg","comprovante_nome":"IMG_4647.jpeg","presenca_confirmada":true,"presenca_horario":"2026-10-30T17:31:29.748+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-651812","certificado_data_emissao":"2026-10-30T17:31:29.748+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:45.014+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"59deb0ef-4eb8-41ef-82eb-b628886880f3","created_at":"2026-10-19T19:02:33.931582+00:00","protocolo":"CC10-652337","nome_completo":"Stephany Vitória Silveira","email":"stephany.visil@gmail.com","telefone":"(31) 98025-2370","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792436552675_9awtq.jpg","comprovante_nome":"inbound6375033727686140765.jpg","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:48.89+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"60ac21e1-6b51-4c8e-add0-baa8711372ad","created_at":"2026-10-20T15:48:40.627231+00:00","protocolo":"CC10-354717","nome_completo":"Emanuelle Vitória Rodrigues Silva","email":"emanuelleodontologia@hotmail.com","telefone":"(31) 98761-2177","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792511317137_zlgtr.png","comprovante_nome":"IMG_0791.png","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:52.773+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"e4a4d740-292a-48c8-bfbd-72a36c19d81f","created_at":"2026-10-22T22:09:39.794536+00:00","protocolo":"CC10-293974","nome_completo":"Fernando Angelo Silva Almeida","email":"feangelo.2005@gmail.com","telefone":"(31) 99506-0192","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792706978634_p7lk0.pdf","comprovante_nome":"Comprovante-C57DFF6B-EB6C-487E-AC2A-420DC28919BF.pdf","presenca_confirmada":true,"presenca_horario":"2026-10-30T18:02:09.007+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-293974","certificado_data_emissao":"2026-10-30T18:02:09.007+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:18:56.606+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"13e429cc-3892-46f8-89d1-857a2ad6d6b5","created_at":"2026-10-22T22:17:31.791822+00:00","protocolo":"CC10-884684","nome_completo":"Alana Cristina Mattos","email":"alanacristinas125@gmail.com","telefone":"(38) 99857-1417","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792707450424_0868b.png","comprovante_nome":"IMG_1920.png","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:19:00.529+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"aea2f2f4-4b8b-40ef-9874-89af48fc244f","created_at":"2026-10-23T10:31:27.265967+00:00","protocolo":"CC10-293141","nome_completo":"Laura Ávila Soares","email":"lauravillas2003@gmail.com","telefone":"(31) 99777-7455","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792751485948_wtds6.png","comprovante_nome":"IMG_7692.png","presenca_confirmada":true,"presenca_horario":"2026-10-30T18:12:10.396+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC10-293141","certificado_data_emissao":"2026-10-30T18:12:10.396+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:19:04.411+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"bbfd25f5-5c3b-4110-806b-ee10f4fc9168","created_at":"2026-10-23T12:33:35.550054+00:00","protocolo":"CC10-157895","nome_completo":"Bianca da Silva Monteiro","email":"biancasilvamonteiro213@gmail.com","telefone":"(33) 98704-1775","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/10_1792758814432_4erxw.png","comprovante_nome":"IMG_4492.png","presenca_confirmada":true,"presenca_horario":"2026-10-30T18:06:10.989+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-157895","certificado_data_emissao":"2026-10-30T18:06:10.989+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:19:07.652+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"c8eecc1b-9f92-460e-a360-6675ba03ed80","created_at":"2026-10-23T12:48:43.054628+00:00","protocolo":"CC10-205127","nome_completo":"Giovanna Maria Carvalho Leão Magno","email":"giovannamagno21042006@gmail.com","telefone":"(33) 99922-5387","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/10_1792759732854_htndg.png","comprovante_nome":"IMG_4567.png","presenca_confirmada":true,"presenca_horario":"2026-10-30T18:07:47.976+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-205127","certificado_data_emissao":"2026-10-30T18:07:47.976+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:19:11.463+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"2090abb3-1d8a-48f6-abf8-ace1e1393869","created_at":"2026-10-23T14:41:35.376242+00:00","protocolo":"CC10-187125","nome_completo":"Nicolas Miranda Mendes","email":"nicolasmendes78057@gmail.com","telefone":"(31) 99562-9542","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/10_1792766493950_o48zw.JPG","comprovante_nome":"Comprovante .JPG","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:19:15.36+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"eb4c2011-45b8-4b05-978b-eec2827be8cb","created_at":"2026-10-23T19:44:57.789846+00:00","protocolo":"CC10-873560","nome_completo":"Alice Rodrigues de Oliveira Barros","email":"alicerodsb17@gmail.com","telefone":"(31) 98820-1414","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/10_1792784695814_n02l2.jpeg","comprovante_nome":"IMG_8561.jpeg","presenca_confirmada":true,"presenca_horario":"2026-10-30T19:10:43.45+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC10-873560","certificado_data_emissao":"2026-10-30T19:10:43.45+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:19:20.658+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"8ff70cc6-f5ef-4fa1-a601-8c293c78ea4e","created_at":"2026-10-26T13:33:03.487284+00:00","protocolo":"CC10-669098","nome_completo":"Thales Wilson","email":"thaleswilson.gomes@gmail.com","telefone":"(31) 98796-3759","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793021582317_2vke4.jpg","comprovante_nome":"IMG-20261026-WA0027.jpg","presenca_confirmada":true,"presenca_horario":"2026-10-30T19:09:08.707+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC10-669098","certificado_data_emissao":"2026-10-30T19:09:08.707+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:19:24.522+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"2c5cbab9-c31b-46a6-8142-28f43f7a2f74","created_at":"2026-10-27T11:22:01.419215+00:00","protocolo":"CC10-595316","nome_completo":"Maria Eduarda Alves Rocha","email":"dudarochaprincesa@gmail.com","telefone":"(31) 97355-8307","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793100119148_1upb4.png","comprovante_nome":"Comprovante café .png","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:19:28.478+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"fbe44936-9b67-4a32-8f07-d0041aa0b91c","created_at":"2026-10-27T11:35:46.522774+00:00","protocolo":"CC10-719037","nome_completo":"clara becalli","email":"claraabecallis@gmail.com","telefone":"(31) 99123-2482","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793100944779_lwtli.jpeg","comprovante_nome":"IMG_8656.jpeg","presenca_confirmada":true,"presenca_horario":"2026-10-30T18:00:00.419+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-719037","certificado_data_emissao":"2026-10-30T18:00:00.419+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:19:31.702+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"00e11e45-54bd-47de-b61c-411e535b22d1","created_at":"2026-10-27T19:06:29.287019+00:00","protocolo":"CC10-330135","nome_completo":"Sara Emanuely de Oliveira Tadeu","email":"saraemanuely.oliveira@gmail.com","telefone":"(31) 99217-3815","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793127987710_nc6wb.png","comprovante_nome":"IMG_9174.png","presenca_confirmada":true,"presenca_horario":"2026-10-30T18:03:05.508+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-330135","certificado_data_emissao":"2026-10-30T18:03:05.508+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:19:36.612+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"4db3b565-e187-45d1-8cf5-6ea04e15b0e4","created_at":"2026-10-28T00:24:28.350819+00:00","protocolo":"CC10-910839","nome_completo":"Aline Soares vidal Amorim","email":"alinevidal22@gmail.com","telefone":"(31) 98355-0111","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793147065770_n9wty.jpeg","comprovante_nome":"IMG_3432.jpeg","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T18:33:07.815+00:00","tipo_ultimo_lembrete":"vespera","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"d0b3895d-aa1f-4b41-a4d7-3b89b5cf7ab9","created_at":"2026-10-29T23:34:50.831296+00:00","protocolo":"CC10-684680","nome_completo":"Pedro Henrique da Silva Cota","email":"pedrohenriquedasilvacota@gmail.com","telefone":"(31) 98632-0889","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793316889225_05a3g.jpg","comprovante_nome":"Screenshot_20261029_203355.jpg","presenca_confirmada":true,"presenca_horario":"2026-10-30T17:59:59.547+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-684680","certificado_data_emissao":"2026-10-30T17:59:59.547+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T08:19:44.057+00:00","tipo_ultimo_lembrete":"hoje_portaria","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"d3d81ff9-5a05-452d-af49-c36b8413d8ff","created_at":"2026-10-30T10:14:36.388593+00:00","protocolo":"CC10-936401","nome_completo":"Gabriel Avelar de Oliveira","email":"gabriel.avlr@outlook.com","telefone":"(31) 99795-4995","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793355274833_fxxc8.png","comprovante_nome":"IMG_1880.png","presenca_confirmada":true,"presenca_horario":"2026-10-30T18:48:53.926+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC10-936401","certificado_data_emissao":"2026-10-30T18:48:53.926+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"f4336f27-27c5-4994-b0b6-2fbe9bfd5490","created_at":"2026-10-30T11:04:20.712312+00:00","protocolo":"CC10-508082","nome_completo":"Beatriz da Silva Duarte","email":"bibisilvaduarte2013@gmail.com","telefone":"(31) 99300-3013","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793358259138_c9xn5.jpeg","comprovante_nome":"IMG_7710.jpeg","presenca_confirmada":true,"presenca_horario":"2026-10-30T18:02:02.995+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-508082","certificado_data_emissao":"2026-10-30T18:02:02.995+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"033baaf1-ce51-4f9f-9cb6-23eabca0daf4","created_at":"2026-10-30T14:44:42.627593+00:00","protocolo":"CC10-200915","nome_completo":"Júnia Paula Andrade Furtado","email":"juniaandradef@icloud.com","telefone":"(31) 99796-3602","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793371481006_cvlau.png","comprovante_nome":"IMG_3573.png","presenca_confirmada":true,"presenca_horario":"2026-10-30T19:11:16.205+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC10-200915","certificado_data_emissao":"2026-10-30T19:11:16.205+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"c0d09e04-106d-4297-bcf6-9dfc064b107e","created_at":"2026-10-30T15:33:11.909921+00:00","protocolo":"CC10-756168","nome_completo":"Camila silva de Paulo","email":"silvacamila1710@gmail.com","telefone":"(31) 98120-3448","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793374390471_87mbi.png","comprovante_nome":"IMG_9578.png","presenca_confirmada":true,"presenca_horario":"2026-10-30T19:02:35.437+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC10-756168","certificado_data_emissao":"2026-10-30T19:02:35.437+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"6474b763-517e-42de-a582-0ae5cf2d0959","created_at":"2026-10-30T15:33:48.672581+00:00","protocolo":"CC10-347357","nome_completo":"Amanda Márcia Almeida Mesquita","email":"mandinha8@outlook.com","telefone":"(31) 99999-5270","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793374426885_b2dml.pdf","comprovante_nome":"pix.pdf","presenca_confirmada":true,"presenca_horario":"2026-10-30T19:10:28.889+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC10-347357","certificado_data_emissao":"2026-10-30T19:10:28.889+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"15e33b70-afba-4af0-b84f-4ddac3ae7a62","created_at":"2026-10-30T16:40:24.693405+00:00","protocolo":"CC10-710439","nome_completo":"Bruno Oliveira Meireles","email":"brunomeireles2003@gmail.com","telefone":"(32) 99821-5415","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793378422729_x3gr0.png","comprovante_nome":"IMG_1661.png","presenca_confirmada":true,"presenca_horario":"2026-10-30T19:01:44.964+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC10-710439","certificado_data_emissao":"2026-10-30T19:01:44.964+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"a4f67fbc-ca95-469d-aabc-4a85c077af86","created_at":"2026-10-30T17:17:36.236395+00:00","protocolo":"CC10-977044","nome_completo":"Maíra Pinheiro Neves","email":"mairapinheironeves@gmail.com","telefone":"(31) 99745-5017","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793380654363_9txnq.png","comprovante_nome":"IMG_2520.png","presenca_confirmada":true,"presenca_horario":"2026-10-30T17:58:31.504+00:00","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC10-977044","certificado_data_emissao":"2026-10-30T17:58:31.504+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T21:05:01.716+00:00","tipo_ultimo_lembrete":"vespera","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"a3a16f6f-86a3-41b3-a300-41068679ebd7","created_at":"2026-10-30T18:55:41.760955+00:00","protocolo":"CC10-650626","nome_completo":"Ghaya Maryeva Boaventura Alves","email":"ghayamaryeva17@gmail.com","telefone":"(31) 99647-9752","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/10_1793386540627_okqd8.jpg","comprovante_nome":"inbound2782272116519844087.jpg","presenca_confirmada":true,"presenca_horario":"2026-10-30T18:56:50.401+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC10-650626","certificado_data_emissao":"2026-10-30T18:56:50.401+00:00","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-30T21:04:53.976+00:00","tipo_ultimo_lembrete":"vespera","observacoes":"Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":10},{"id":"72ad26ba-9651-4884-b4ec-561b3c614250","created_at":"2026-10-23T10:35:19.643087+00:00","protocolo":"CC11-519805","nome_completo":"Ana Carolina Mesquita Araujo","email":"anacmesquita@outlook.com.br","telefone":"(31) 99349-0482","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/1792751718636_4gdi7.png","comprovante_nome":"IMG_1434.png","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"74ccfcc8-a808-44b3-b907-ccb6c14c25ce","created_at":"2026-10-23T11:21:44.06815+00:00","protocolo":"CC11-121635","nome_completo":"Laura Ávila Soares","email":"soniamaria@yahoo.com","telefone":"(31) 99777-7455","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/11_1792754502453_ee18c.png","comprovante_nome":"IMG_7693.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T19:16:54.781+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-121635","certificado_data_emissao":"2026-11-13T19:16:54.781+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"60921716-0801-4eee-885c-e35dcef9a55e","created_at":"2026-10-23T13:51:33.96484+00:00","protocolo":"CC11-781985","nome_completo":"AILA FERNANDES RAMOS E SILVA","email":"ailafrs@gmail.com","telefone":"(31) 98779-6059","valor":10,"status_pagamento":"aprovado","comprovante_url":"comprovantes_historicos/comprovante_CC11-781985.jpg","comprovante_nome":"comprovante.jpg","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-781985","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"83c58cca-513a-4b65-af63-c109bb832b88","created_at":"2026-10-23T19:21:02.244661+00:00","protocolo":"CC11-211015","nome_completo":"Gabriele dos Reis Beato","email":"gabrielereis402@gmail.com","telefone":"(31) 98342-8322","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/comprovantes/11_1792783259644_15kun.png","comprovante_nome":"IMG_0661.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-211015","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"72d22c2e-dbab-4086-a3d4-43fb6af4405f","created_at":"2026-10-26T13:38:45.557117+00:00","protocolo":"CC11-273289","nome_completo":"Thales Wilson","email":"thaleswilson.gomes@gmail.com","telefone":"(31) 98796-3759","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793021924066_hwy6d.jpg","comprovante_nome":"IMG-20261026-WA0029.jpg","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-273289","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"fee0d396-3a51-46d5-ac14-0178cb829358","created_at":"2026-10-27T01:48:54.043286+00:00","protocolo":"CC11-421574","nome_completo":"Aylla Francielle","email":"ayllafrancielles@gmail.com","telefone":"(31) 99251-9159","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793065731280_bousq.jpeg","comprovante_nome":"Imagem JPEG-4D3C-8002-30-0.jpeg","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:18:46.921+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-421574","certificado_data_emissao":"2026-11-13T18:18:46.921+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"ae559482-4505-42f9-9ae9-1fae24234a7c","created_at":"2026-10-27T12:57:35.995466+00:00","protocolo":"CC11-146512","nome_completo":"Carolina Freitas Moura","email":"carolfmd16@gmail.com","telefone":"(31) 97533-5337","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793105854597_3w73a.jpeg","comprovante_nome":"8bab0364-a276-466a-af65-4c31e15db1b0.jpeg","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"33abde49-f63f-45b2-9813-04f44ae0c5d0","created_at":"2026-10-27T14:33:29.470364+00:00","protocolo":"CC11-822978","nome_completo":"Eduardo Erick Portela","email":"eduardoerickportela@gmail.com","telefone":"(31) 99867-1301","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793111607452_dp2x2.jpeg","comprovante_nome":"IMG_3456.jpeg","presenca_confirmada":true,"presenca_horario":"2026-11-13T19:03:40.347+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-822978","certificado_data_emissao":"2026-11-13T19:03:40.347+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"8388e0bc-21c3-42b3-b7d7-adbac9d97276","created_at":"2026-10-27T15:03:56.308406+00:00","protocolo":"CC11-291626","nome_completo":"Júlia Soares Souto","email":"jusoaressouto06@gmail.com","telefone":"(31) 99996-4297","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793113434360_t5sz9.jpg","comprovante_nome":"1793113142179.jpg","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:00:47.392+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-291626","certificado_data_emissao":"2026-11-13T18:00:47.392+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"05fd5e57-48a0-43fa-80ce-035c6bd87176","created_at":"2026-10-27T21:41:52.67855+00:00","protocolo":"CC11-694740","nome_completo":"Marcela Pinheiro Alves","email":"marcelappaa@gmail.com","telefone":"(31) 97107-6884","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793137310955_ffnvo.jpeg","comprovante_nome":"IMG_9076.jpeg","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"ae667f54-0fe1-4713-8726-54f0d1d7a41a","created_at":"2026-10-28T00:26:27.955747+00:00","protocolo":"CC11-171396","nome_completo":"Aline Soares vidal Amorim","email":"alinevidal22@gmail.com","telefone":"(31) 98355-0111","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793147185855_221i1.png","comprovante_nome":"IMG_3433.png","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-31T18:51:12.751+00:00","tipo_ultimo_lembrete":"vespera","observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"4066a041-edaa-42cc-94f6-d4fb1d0e5e09","created_at":"2026-10-28T21:30:47.838021+00:00","protocolo":"CC11-794371","nome_completo":"Aline Soares Eloy de Queiroz","email":"aline8081@gmail.com.br","telefone":"(31) 98707-9538","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793223045409_0oas4.png","comprovante_nome":"IMG_1618.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-794371","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":true,"ultimo_lembrete_em":"2026-10-31T18:51:17.982+00:00","tipo_ultimo_lembrete":"vespera","observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"3e1e4d5f-3c46-4127-acd6-f065eb8dff7c","created_at":"2026-10-29T02:03:14.085099+00:00","protocolo":"CC11-922049","nome_completo":"Giovana caroline dos santos sampaio","email":"giovanacaroline495@gmail.com","telefone":"(31) 97364-8962","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793239393138_pfve3.jpg","comprovante_nome":"IMG-20261028-WA0017.jpg","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-922049","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"44c24ceb-3ba6-4761-9288-67d7284fb0fd","created_at":"2026-10-29T14:03:14.011897+00:00","protocolo":"CC11-588699","nome_completo":"Renata Venuto","email":"renataaraujovenuto@gmail.com","telefone":"(31) 99368-3405","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793282592322_mdkr2.png","comprovante_nome":"IMG_7116.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:20:00.527+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-588699","certificado_data_emissao":"2026-11-13T18:20:00.527+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"284330db-987a-43d9-a320-c6141ee72b72","created_at":"2026-10-30T00:03:20.208166+00:00","protocolo":"CC11-252134","nome_completo":"Karoline Sathler Rocha Godinho","email":"karolinesathlerr@gmail.com","telefone":"(31) 97317-4083","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793318598370_dbg8v.png","comprovante_nome":"IMG_7846.png","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"2c406f0c-1a53-4ab1-8f7e-636445e331f6","created_at":"2026-10-30T18:57:02.759694+00:00","protocolo":"CC11-102932","nome_completo":"Sophia Agnes Borba Oliveira da Cunha Fernandes","email":"sophiaagnesborba@gmail.com","telefone":"(65) 99696-0334","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793386621859_43l04.png","comprovante_nome":"IMG_9145.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-102932","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"dd0d6334-84c0-479b-b2fb-d8be17419659","created_at":"2026-10-30T21:43:14.14083+00:00","protocolo":"CC11-101148","nome_completo":"Fernando Angelo Silva Almeida","email":"feangelo.2005@gmail.com","telefone":"(31) 99506-0192","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793396384661_1jgcv.pdf","comprovante_nome":"comprovante Fernando.pdf","presenca_confirmada":true,"presenca_horario":"2026-11-13T20:21:11.492+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-101148","certificado_data_emissao":"2026-11-13T20:21:11.492+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"fe25775c-5e57-44df-b443-bff8694c2be7","created_at":"2026-11-03T13:18:14.174866+00:00","protocolo":"CC11-594436","nome_completo":"Maria Fernanda Gonçalves Oliveira","email":"mfgoliveira20@gmail.com","telefone":"(31) 98437-8553","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793711892203_q8pcd.png","comprovante_nome":"IMG_0254.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-594436","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"c3739ac1-e045-4d79-bbce-26b0020b11f3","created_at":"2026-11-04T16:22:46.99097+00:00","protocolo":"CC11-144867","nome_completo":"Alice Rodrigues de Oliveira Barros","email":"alicerodsb17@gmail.com","telefone":"(31) 98820-1414","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793809365555_14ceb.jpeg","comprovante_nome":"IMG_9079.jpeg","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"3fb79239-789f-4d5d-9c87-ee28226378ed","created_at":"2026-11-04T19:58:41.880738+00:00","protocolo":"CC11-704199","nome_completo":"Carolina Silva Machado","email":"carol2005amaral@gmail.com","telefone":"(31) 99877-3850","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793822319769_6u1nm.jpeg","comprovante_nome":"IMG_1251.jpeg","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:19:22.805+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-704199","certificado_data_emissao":"2026-11-13T18:19:22.805+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"366110c0-afe0-422e-8841-b3657692a642","created_at":"2026-11-04T21:00:47.875286+00:00","protocolo":"CC11-196424","nome_completo":"Natália Soares Carvalho","email":"natisoares092015@gmail.com","telefone":"(31) 98215-5227","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793826046742_f5rvv.pdf","comprovante_nome":"comprovante_picpay_pix_04-11-2026-18-00-16.pdf","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-196424","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"407a236f-7281-431b-833b-cbc830280729","created_at":"2026-11-05T09:32:39.878585+00:00","protocolo":"CC11-252887","nome_completo":"Larissa Gonçalves de Oliveira","email":"lariigoncalvess18@gmail.com","telefone":"(31) 98486-5918","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793871158748_tewrr.jpg","comprovante_nome":"inbound4697786871766234766.jpg","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:06:35.657+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-252887","certificado_data_emissao":"2026-11-13T18:06:35.657+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"6d75ae27-9cb4-44cf-8790-b9fa881106bb","created_at":"2026-11-05T10:13:50.631827+00:00","protocolo":"CC11-113365","nome_completo":"Luiza Martins Sousa","email":"luizamartinssousa16@gmail.com","telefone":"(37) 99929-5436","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1793873628224_ekm4d.png","comprovante_nome":"IMG_5649.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:17:24.562+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-113365","certificado_data_emissao":"2026-11-13T18:17:24.562+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"b6000976-72ca-4085-aa4e-281df2033efb","created_at":"2026-11-07T14:51:21.564976+00:00","protocolo":"CC11-495501","nome_completo":"Ana Clara Gonçalves de Oliveira","email":"anaclaragoncalves0109@gmail.com","telefone":"(31) 98854-4473","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794063079751_y30zo.jpeg","comprovante_nome":"IMG_0441.jpeg","presenca_confirmada":true,"presenca_horario":"2026-11-13T19:03:58.673+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-495501","certificado_data_emissao":"2026-11-13T19:03:58.673+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"fa322390-5106-4747-9a0c-9632f4795edc","created_at":"2026-11-07T19:05:52.007309+00:00","protocolo":"CC11-628046","nome_completo":"Liriel Pires Santos","email":"piressantosliriel@gmail.com","telefone":"(38) 99970-6112","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794078350953_vuc02.pdf","comprovante_nome":"Comprovante Santander.pdf","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:19:12.211+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-628046","certificado_data_emissao":"2026-11-13T18:19:12.211+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"e0277c1a-78b6-4b41-96b7-a0ca6d5add6a","created_at":"2026-11-08T15:40:57.801658+00:00","protocolo":"CC11-404373","nome_completo":"Karine Oliveira","email":"karineoliveirastudy@gmail.com","telefone":"(31) 99631-5939","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794152455562_tp9m9.jpg","comprovante_nome":"Screenshot_20261108_123901_WhatsApp.jpg","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-404373","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"440f0af4-b9a8-4c9d-bf99-6be8faa6285d","created_at":"2026-11-09T12:11:59.804582+00:00","protocolo":"CC11-470893","nome_completo":"Fábio Fonseca Torres Queiroz","email":"fabioftorres2011@gmail.com","telefone":"(31) 99532-3624","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794226317788_cv6n0.pdf","comprovante_nome":"inbound1604655404126951289.pdf","presenca_confirmada":false,"presenca_horario":null,"presenca_validador":"Portaria Oficial","certificado_emitido":false,"certificado_codigo":null,"certificado_data_emissao":null,"lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"92afcf39-7754-4329-854d-80d41e24995a","created_at":"2026-11-09T14:12:21.548221+00:00","protocolo":"CC11-272253","nome_completo":"Giovanna Maria Carvalho Leão Magno","email":"giovannamagno21042006@gmail.com","telefone":"(33) 99922-5387","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794233551400_ap8li.png","comprovante_nome":"IMG_4893.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:01:22.815+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-272253","certificado_data_emissao":"2026-11-13T18:01:22.815+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"326e8073-8d3f-4863-875d-db736463e649","created_at":"2026-11-09T14:36:33.412751+00:00","protocolo":"CC11-149183","nome_completo":"Gabriella Andrade Gontijo","email":"gabriellagontijo2003@gmail.com","telefone":"(31) 98606-9561","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794234991614_q3vwc.jpeg","comprovante_nome":"IMG_3771.jpeg","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-149183","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"bb43a532-3ea3-4172-9a7a-f4f62d8f9bea","created_at":"2026-11-09T15:40:55.800305+00:00","protocolo":"CC11-454936","nome_completo":"Geovana Oliveira Ferreira","email":"geovanaof14@gmail.com","telefone":"(31) 98308-5507","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794238854335_o7s47.jpg","comprovante_nome":"inbound9180749564860718690.jpg","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:16:21.588+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-454936","certificado_data_emissao":"2026-11-13T18:16:21.588+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"3210854b-4f34-4633-a620-2293600ffe5a","created_at":"2026-11-10T01:38:27.097837+00:00","protocolo":"CC11-918953","nome_completo":"Bianca da Silva Monteiro","email":"biancasilvamonteiro213@gmail.com","telefone":"(33) 98704-1775","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794274705271_h4qpz.png","comprovante_nome":"IMG_4688.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:01:39.098+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-918953","certificado_data_emissao":"2026-11-13T18:01:39.098+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"97fd26c8-8589-4ce3-8c1d-ed2ce2e1733c","created_at":"2026-11-10T14:19:39.64596+00:00","protocolo":"CC11-871729","nome_completo":"Ana Luiza de Andrade Barbosa","email":"aninhaandradd2019@gmail.com","telefone":"(38) 99120-6413","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794320379542_biki8.jpg","comprovante_nome":"inbound4308356111763550692.jpg","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:16:06.63+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-871729","certificado_data_emissao":"2026-11-13T18:16:06.63+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"65bc455a-a40d-4507-8176-211d89a23ce0","created_at":"2026-11-10T14:19:47.758195+00:00","protocolo":"CC11-844365","nome_completo":"Chelsea Lyssa de Souza Lino","email":"chelsealyssa03@gmail.com","telefone":"(31) 98590-2741","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794320385650_2igh7.png","comprovante_nome":"IMG_3332.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:15:36.123+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-844365","certificado_data_emissao":"2026-11-13T18:15:36.123+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"86d6e4ed-246e-414d-a0e6-f14251456153","created_at":"2026-11-10T14:20:26.453139+00:00","protocolo":"CC11-288737","nome_completo":"Thaís Nogueira Reis","email":"thaisdosreis2020@gmail.com","telefone":"(31) 98269-3460","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794320424395_1a9q7.png","comprovante_nome":"IMG_2794.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-288737","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"bde17c12-98a7-4d5f-89e4-0f2f8ea90cab","created_at":"2026-11-10T23:54:19.085722+00:00","protocolo":"CC11-200985","nome_completo":"Cely Regina Martins Rocha de Lacerda","email":"celylacerda4@gmail.com","telefone":"(32) 99906-1372","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794354855734_euyiu.png","comprovante_nome":"IMG_1108.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:15:15.027+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-200985","certificado_data_emissao":"2026-11-13T18:15:15.027+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"f9d38b8f-ddd7-405b-95e7-b86687d03ec6","created_at":"2026-11-12T10:46:46.386438+00:00","protocolo":"CC11-724478","nome_completo":"Thaís Suellen Cesar Rocha","email":"thaissuellen22@outlook.com","telefone":"(31) 99095-6253","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794480405099_z8ovk.jpeg","comprovante_nome":"IMG_5056.jpeg","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:14:53.004+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-724478","certificado_data_emissao":"2026-11-13T18:14:53.004+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"4feb274b-5c17-4e84-8b91-cfa078e4d85b","created_at":"2026-11-12T13:24:20.782405+00:00","protocolo":"CC11-729133","nome_completo":"Luiz Eduardo Evangelista Rafael","email":"luizeduardo88.edu.le@gmail.com","telefone":"(37) 99968-6897","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794489858325_521v2.png","comprovante_nome":"IMG_7521.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-729133","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"b46ee574-c895-462b-84e4-84b172c9bf02","created_at":"2026-11-12T22:58:09.841319+00:00","protocolo":"CC11-529387","nome_completo":"Luísa Gomes","email":"luisaoligomes05@gmail.com","telefone":"(31) 98714-5855","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794524287507_9k1ch.jpeg","comprovante_nome":"IMG_5570.jpeg","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:07:03.712+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-529387","certificado_data_emissao":"2026-11-13T18:07:03.712+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"8a04eccf-71c6-400f-8170-3a927b5fff23","created_at":"2026-11-13T10:58:41.693322+00:00","protocolo":"CC11-903401","nome_completo":"Pedro Henrique Silva Carvalho","email":"pedro.carvalho280@live.com","telefone":"(31) 99668-9194","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794567520392_hf9c6.jpeg","comprovante_nome":"IMG_2479.jpeg","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-903401","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"16884674-00ae-49ce-9e73-b0794c63b805","created_at":"2026-11-13T12:53:16.075278+00:00","protocolo":"CC11-205927","nome_completo":"Maria Luísa Ribeiro dos Santos","email":"maluuhribeiro@outlook.com","telefone":"(31) 99978-2125","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794574394884_ndai3.jpeg","comprovante_nome":"IMG_4358.jpeg","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:14:31.617+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-205927","certificado_data_emissao":"2026-11-13T18:14:31.617+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"09f9069c-1c7a-4f02-b6c8-cc3efe79b344","created_at":"2026-11-13T12:59:55.985048+00:00","protocolo":"CC11-610803","nome_completo":"Ghaya Maryeva Boaventura Alves","email":"ghayamaryeva17@gmail.com","telefone":"(31) 99647-9752","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794574795342_etwt8.jpg","comprovante_nome":"inbound4519724628651764128.jpg","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:01:53.032+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-610803","certificado_data_emissao":"2026-11-13T18:01:53.032+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"506478f5-b084-4026-921a-41af62725317","created_at":"2026-11-13T13:17:09.161714+00:00","protocolo":"CC11-315485","nome_completo":"clara becalli","email":"claraabecallis@gmail.com","telefone":"(31) 99123-2482","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794575827406_ft0oh.jpeg","comprovante_nome":"IMG_9229.jpeg","presenca_confirmada":true,"presenca_horario":"2026-11-13T17:00:00.000Z","presenca_validador":"Portaria Oficial","certificado_emitido":true,"certificado_codigo":"CERT-CC11-315485","certificado_data_emissao":"2026-11-13T17:00:00.000Z","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"2ab60fbb-5f29-4744-b18f-2e78757a1ddf","created_at":"2026-11-13T16:28:49.318469+00:00","protocolo":"CC11-849875","nome_completo":"Pedro Henrique da Silva Cota","email":"pedrohenriquedasilvacota@gmail.com","telefone":"(31) 98632-0889","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794587328505_x1w90.jpg","comprovante_nome":"Screenshot_20261113_132801.jpg","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:02:20.062+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-849875","certificado_data_emissao":"2026-11-13T18:02:20.062+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11},{"id":"294def71-a5d4-42f1-a899-fbc8a2e8d372","created_at":"2026-11-13T16:35:13.86626+00:00","protocolo":"CC11-702011","nome_completo":"Gabriel Avelar de Oliveira","email":"gabriel.avlr@outlook.com","telefone":"(31) 99795-4995","valor":10,"status_pagamento":"aprovado","comprovante_url":"https://zcbylqggrxocdevddtlx.supabase.co/storage/v1/object/public/comprovantes/11_1794587712143_wj3mb.png","comprovante_nome":"IMG_1922.png","presenca_confirmada":true,"presenca_horario":"2026-11-13T18:00:23.523+00:00","presenca_validador":"Painel da Liga","certificado_emitido":true,"certificado_codigo":"CERT-CC11-702011","certificado_data_emissao":"2026-11-13T18:00:23.523+00:00","lembrete_enviado":false,"ultimo_lembrete_em":null,"tipo_ultimo_lembrete":null,"observacoes":"[11° Café] Faculdade Arnaldo","senha":"google-oauth","role":"aluno","instituicao":"Faculdade Arnaldo","edicao":11}];


// ============================================================================
// 6. BUSCA E CONSULTA DE INSCRIÇÃO (UNIFICADA: SUPABASE + ACERVO HISTÓRICO)
// ============================================================================
async function buscarInscricao(termo) {
  if (!termo) return null;
  const termoLimpo = termo.trim().toLowerCase();
  const termoTel = termo.replace(/\D/g, '');

  // 1. Se o termo for um protocolo histórico (CC10- ou CC11-), busca diretamente no acervo histórico
  if (termoLimpo.startsWith('cc10-') || termoLimpo.startsWith('cc11-')) {
    const matchHistorico = HISTORICO_INSCRICOES.find(i => 
      i.protocolo && i.protocolo.toLowerCase() === termoLimpo
    );
    if (matchHistorico) {
      return {
        ...matchHistorico,
        instituicao: extrairInstituicaoAluno(matchHistorico)
      };
    }
  }

  // 2. Consulta no Supabase (edições ativas, especialmente 12° Café)
  const sb = getSupabase();
  if (sb) {
    try {
      let query = sb.from(SUPABASE_CONFIG.tableName).select('*').neq('role', 'organizador');

      if (termoLimpo.startsWith('cc12-')) {
        query = query.ilike('protocolo', termoLimpo);
      } else if (termoLimpo.includes('@')) {
        query = query.ilike('email', termoLimpo);
      } else {
        query = query.or('protocolo.ilike.%' + termoLimpo + '%,email.ilike.%' + termoLimpo + '%,telefone.ilike.%' + (termoTel || termoLimpo) + '%');
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1);
      if (!error && data && data.length > 0) {
        return {
          ...data[0],
          instituicao: extrairInstituicaoAluno(data[0])
        };
      }
    } catch (e) {
      console.warn('Erro ao consultar Supabase:', e);
    }
  }

  // 3. Fallback no Acervo Histórico (busca por e-mail, telefone, nome ou protocolo parcial)
  const matchHistoricoGeral = HISTORICO_INSCRICOES.find(i => 
    i.role !== 'organizador' && (
      (i.protocolo && i.protocolo.toLowerCase() === termoLimpo) ||
      (i.email && i.email.toLowerCase() === termoLimpo) ||
      (i.telefone && termoTel.length >= 8 && i.telefone.replace(/\D/g, '') === termoTel) ||
      (termoLimpo.length >= 3 && (
        (i.email && i.email.toLowerCase().includes(termoLimpo)) ||
        (i.nome_completo && i.nome_completo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(termoLimpo.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) ||
        (i.protocolo && i.protocolo.toLowerCase().includes(termoLimpo))
      ))
    )
  );
  if (matchHistoricoGeral) {
    return {
      ...matchHistoricoGeral,
      instituicao: extrairInstituicaoAluno(matchHistoricoGeral)
    };
  }

  // 4. Fallback no LocalStorage
  const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
  const matchLocal = inscricoes.find(i => 
    i.role !== 'organizador' && (
      (i.protocolo && i.protocolo.toLowerCase() === termoLimpo) ||
      (i.email && i.email.toLowerCase() === termoLimpo) ||
      (i.telefone && termoTel.length >= 8 && i.telefone.replace(/\D/g, '') === termoTel)
    )
  );
  return matchLocal ? { ...matchLocal, instituicao: extrairInstituicaoAluno(matchLocal) } : null;
}

// Retorna TODAS as inscrições de um participante (por e-mail, telefone ou protocolo)
// Unifica inscrições ativas no Supabase (12° Café) com o acervo histórico (10° e 11° Café)
async function buscarTodasInscricoes(termo) {
  if (!termo) return [];
  const termoLimpo = termo.trim().toLowerCase();
  const termoTel = termo.replace(/\D/g, '');

  let emailReferencia = termoLimpo.includes('@') ? termoLimpo : null;
  let telefoneReferencia = termoTel.length >= 8 ? termoTel : null;
  const mapaResultados = new Map();

  function adicionarResultado(item) {
    if (!item || item.role === 'organizador') return;
    const proto = (item.protocolo || '').toUpperCase();
    const chave = proto || item.id;
    if (chave && !mapaResultados.has(chave)) {
      mapaResultados.set(chave, {
        ...item,
        instituicao: extrairInstituicaoAluno(item)
      });
      if (!emailReferencia && item.email && item.email.includes('@')) {
        emailReferencia = item.email.trim().toLowerCase();
      }
      if (!telefoneReferencia && item.telefone) {
        const telLimpo = item.telefone.replace(/\D/g, '');
        if (telLimpo.length >= 8) telefoneReferencia = telLimpo;
      }
    }
  }

  // 1. Se a busca foi por protocolo histórico específico (CC10- ou CC11-)
  if (termoLimpo.startsWith('cc10-') || termoLimpo.startsWith('cc11-')) {
    const itemHist = HISTORICO_INSCRICOES.find(i => i.protocolo && i.protocolo.toLowerCase() === termoLimpo);
    if (itemHist) {
      adicionarResultado(itemHist);
    }
  }

  // 2. Consulta no Supabase (edições ativas, ex: 12° Café)
  const sb = getSupabase();
  if (sb) {
    try {
      let query = sb.from(SUPABASE_CONFIG.tableName).select('*').neq('role', 'organizador');

      if (termoLimpo.startsWith('cc12-')) {
        const { data: dProto } = await sb.from(SUPABASE_CONFIG.tableName).select('*').ilike('protocolo', termoLimpo).limit(1);
        if (dProto && dProto.length > 0) {
          dProto.forEach(adicionarResultado);
        }
      } else if (emailReferencia) {
        const { data } = await sb.from(SUPABASE_CONFIG.tableName).select('*').neq('role', 'organizador').ilike('email', emailReferencia).order('created_at', { ascending: false });
        if (data && data.length > 0) data.forEach(adicionarResultado);
      } else {
        const { data } = await query.or('protocolo.ilike.%' + termoLimpo + '%,email.ilike.%' + termoLimpo + '%,telefone.ilike.%' + (termoTel || termoLimpo) + '%').order('created_at', { ascending: false });
        if (data && data.length > 0) data.forEach(adicionarResultado);
      }

      // Se descobrimos o e-mail durante a busca por protocolo, busca também as outras inscrições no Supabase por esse e-mail
      if (emailReferencia && !termoLimpo.includes('@')) {
        const { data: maisDoAluno } = await sb.from(SUPABASE_CONFIG.tableName).select('*').neq('role', 'organizador').ilike('email', emailReferencia);
        if (maisDoAluno && maisDoAluno.length > 0) maisDoAluno.forEach(adicionarResultado);
      }
    } catch (e) {
      console.warn('Erro ao consultar Supabase:', e);
    }
  }

  // 3. Busca no Acervo Histórico (10° e 11° Café)
  HISTORICO_INSCRICOES.forEach(item => {
    if (item.role === 'organizador') return;
    const itemProto = (item.protocolo || '').toLowerCase();
    const itemEmail = (item.email || '').toLowerCase().trim();
    const itemTel = (item.telefone || '').replace(/\D/g, '');

    // Corresponde por e-mail de referência
    if (emailReferencia && itemEmail === emailReferencia) {
      adicionarResultado(item);
      return;
    }
    // Corresponde pelo termo digitado diretamente
    if (termoLimpo && (itemProto === termoLimpo || itemEmail === termoLimpo)) {
      adicionarResultado(item);
      return;
    }
    // Corresponde por telefone
    if (telefoneReferencia && itemTel === telefoneReferencia) {
      adicionarResultado(item);
      return;
    }
    // Corresponde por protocolo parcial, email parcial ou nome
    if (termoLimpo.length >= 3) {
      const nomeNorm = (item.nome_completo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const termoNorm = termoLimpo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (itemProto.includes(termoLimpo) || itemEmail.includes(termoLimpo) || (termoLimpo.length >= 4 && nomeNorm.includes(termoNorm))) {
        adicionarResultado(item);
        return;
      }
    }
  });

  // 4. Fallback no LocalStorage
  const inscricoesLocal = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
  inscricoesLocal.forEach(item => {
    if (item.role === 'organizador') return;
    const itemProto = (item.protocolo || '').toLowerCase();
    const itemEmail = (item.email || '').toLowerCase().trim();
    const itemTel = (item.telefone || '').replace(/\D/g, '');

    if (emailReferencia && itemEmail === emailReferencia) adicionarResultado(item);
    else if (termoLimpo && (itemProto === termoLimpo || itemEmail === termoLimpo)) adicionarResultado(item);
    else if (telefoneReferencia && itemTel === telefoneReferencia) adicionarResultado(item);
  });

  const listaFinal = Array.from(mapaResultados.values());

  // Ordena por edição cronológica decrescente: 12, 11 e 10
  listaFinal.sort((a, b) => {
    const protoA = (a.protocolo || '').toUpperCase();
    const protoB = (b.protocolo || '').toUpperCase();
    const edA = a.edicao ? parseInt(a.edicao, 10) : (protoA.startsWith('CC12-') ? 12 : (protoA.startsWith('CC11-') ? 11 : 10));
    const edB = b.edicao ? parseInt(b.edicao, 10) : (protoB.startsWith('CC12-') ? 12 : (protoB.startsWith('CC11-') ? 11 : 10));
    return edB - edA;
  });

  return listaFinal;
}

// ============================================================================
// 7. VALIDAÇÃO DE PRESENÇA (CHECK-IN POR QR CODE OU NFC NA PORTARIA)
// ============================================================================
async function validarPresencaPorQRCode(codigo, validadorNome = 'Portaria Oficial', edicaoEsperada = null) {
  if (!codigo) throw new Error('Código do QR Code ou identificação não fornecido.');

  let protocolo = String(codigo).trim();

  // 1. Extração robusta se for uma URL completa ou link com parâmetros (?p=..., ?protocolo=...)
  if (protocolo.includes('?')) {
    try {
      const urlQuery = protocolo.split('?')[1];
      const urlParams = new URLSearchParams(urlQuery);
      if (urlParams.get('p')) {
        protocolo = urlParams.get('p');
      } else if (urlParams.get('protocolo')) {
        protocolo = urlParams.get('protocolo');
      } else if (urlParams.get('checkin')) {
        protocolo = urlParams.get('checkin');
      } else if (urlParams.get('codigo')) {
        protocolo = urlParams.get('codigo');
      }
    } catch (e) {}
  }

  // 2. Determina a edição esperada da portaria
  if (!edicaoEsperada) {
    edicaoEsperada = await obterEdicaoAtivaPortaria();
  }
  const numEdicaoEsperada = parseInt(edicaoEsperada, 10) || 12;
  const prefixoEsperado = `CC${numEdicaoEsperada}-`;

  // 3. Verificação de prefixo se for protocolo oficial CCxx-XXXXXX
  const matchOficial = protocolo.match(/CC(\d{2})-[A-Z0-9]+/i);
  if (matchOficial) {
    const edicaoDoCodigo = parseInt(matchOficial[1], 10);
    if (edicaoDoCodigo !== numEdicaoEsperada) {
      throw new Error(`Este código pertence ao ${edicaoDoCodigo}° Café com Ciência. A portaria está recebendo os inscritos da ${numEdicaoEsperada}ª Edição.`);
    }
    protocolo = matchOficial[0].toUpperCase();
  }

  const sb = getSupabase();
  let aluno = null;

  if (sb) {
    let listaCandidatos = [];

    if (matchOficial) {
      const { data, error } = await sb
        .from(SUPABASE_CONFIG.tableName)
        .select('*')
        .ilike('protocolo', protocolo)
        .limit(1);
      if (!error && data && data.length > 0) {
        listaCandidatos = data;
      }
    } else {
      const termoLimpo = protocolo.toLowerCase().trim();
      let q = sb.from(SUPABASE_CONFIG.tableName).select('*').neq('role', 'organizador');
      if (termoLimpo.includes('@')) {
        q = q.ilike('email', termoLimpo);
      } else {
        const digitos = termoLimpo.replace(/\D/g, '');
        q = q.or(`protocolo.ilike.%${termoLimpo}%,email.ilike.%${termoLimpo}%,telefone.ilike.%${digitos || termoLimpo}%`);
      }
      const { data, error } = await q.order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        listaCandidatos = data;
      }
    }

    if (listaCandidatos.length === 0) {
      throw new Error(`Inscrição não encontrada para o código ou e-mail: ${protocolo}`);
    }

    // Filtrar especificamente para a edição esperada da portaria
    aluno = listaCandidatos.find(item => 
      (item.protocolo && item.protocolo.toUpperCase().startsWith(prefixoEsperado)) ||
      parseInt(item.edicao, 10) === numEdicaoEsperada
    );

    if (!aluno) {
      const outraEdicao = listaCandidatos[0].edicao || (listaCandidatos[0].protocolo ? listaCandidatos[0].protocolo.substring(2, 4) : '');
      const nomeEncontrado = listaCandidatos[0].nome_completo || 'Participante';
      throw new Error(`Olá, ${nomeEncontrado}! Identificamos seu cadastro em edição anterior (${outraEdicao}° Café), mas não localizamos inscrição ativa na ${numEdicaoEsperada}ª Edição.`);
    }

    if (aluno.presenca_confirmada) {
      return {
        jaConfirmado: true,
        aluno: aluno,
        edicao: numEdicaoEsperada,
        mensagem: `Atenção: A presença de ${aluno.nome_completo} no ${numEdicaoEsperada}° Café já foi registrada anteriormente!`
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
      aluno: updated[0] || aluno,
      edicao: numEdicaoEsperada,
      mensagem: `Presença de ${aluno.nome_completo} confirmada com sucesso no ${numEdicaoEsperada}° Café com Ciência! Certificado liberado.`
    };

  } else {
    // Fallback Local
    const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
    let listaCandidatos = [];

    if (matchOficial) {
      listaCandidatos = inscricoes.filter(i => i.protocolo && i.protocolo.toUpperCase() === protocolo);
    } else {
      const termoLimpo = protocolo.toLowerCase().trim();
      listaCandidatos = inscricoes.filter(i => 
        i.role !== 'organizador' && (
          (i.protocolo && i.protocolo.toLowerCase() === termoLimpo) ||
          (i.email && i.email.toLowerCase() === termoLimpo) ||
          (i.telefone && i.telefone.replace(/\D/g, '') === termoLimpo.replace(/\D/g, ''))
        )
      );
    }

    if (listaCandidatos.length === 0) {
      throw new Error(`Inscrição não encontrada para o código ou e-mail: ${protocolo}`);
    }

    aluno = listaCandidatos.find(item => 
      (item.protocolo && item.protocolo.toUpperCase().startsWith(prefixoEsperado)) ||
      parseInt(item.edicao, 10) === numEdicaoEsperada
    );

    if (!aluno) {
      const outraEdicao = listaCandidatos[0].edicao || (listaCandidatos[0].protocolo ? listaCandidatos[0].protocolo.substring(2, 4) : '');
      const nomeEncontrado = listaCandidatos[0].nome_completo || 'Participante';
      throw new Error(`Olá, ${nomeEncontrado}! Identificamos seu cadastro em edição anterior (${outraEdicao}° Café), mas não localizamos inscrição ativa na ${numEdicaoEsperada}ª Edição.`);
    }

    if (aluno.presenca_confirmada) {
      return {
        jaConfirmado: true,
        aluno: aluno,
        edicao: numEdicaoEsperada,
        mensagem: `Atenção: A presença de ${aluno.nome_completo} no ${numEdicaoEsperada}° Café já foi registrada anteriormente!`
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
      edicao: numEdicaoEsperada,
      mensagem: `Presença de ${aluno.nome_completo} confirmada com sucesso no ${numEdicaoEsperada}° Café com Ciência! Certificado liberado.`
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


// ============================================================================
// MAPEAMENTO OFICIAL DAS DECLARAÇÕES EM PDF ENVIADAS POR E-MAIL (EXCLUSIVO 10° CAFÉ)
// As declarações em PDF correspondem única e exclusivamente aos inscritos do 10° Café.
// Nunca deve vazar para as edições 11 ou 12, mesmo que o participante use o mesmo e-mail.
// ============================================================================
const DECLARACOES_PDF_MAP = {
  "CC10-650626": "declaracoes_individuais/declaracao_CC10-650626_Ghaya_Maryeva_Boaventura_Alves.pdf",
  "CC10-977044": "declaracoes_individuais/declaracao_CC10-977044_Maira_Pinheiro_Neves.pdf",
  "CC10-710439": "declaracoes_individuais/declaracao_CC10-710439_Bruno_Oliveira_Meireles.pdf",
  "CC10-347357": "declaracoes_individuais/declaracao_CC10-347357_Amanda_Marcia_Almeida_Mesquita.pdf",
  "CC10-756168": "declaracoes_individuais/declaracao_CC10-756168_Camila_silva_de_Paulo.pdf",
  "CC10-200915": "declaracoes_individuais/declaracao_CC10-200915_Junia_Paula_Andrade_Furtado.pdf",
  "CC10-508082": "declaracoes_individuais/declaracao_CC10-508082_Beatriz_da_Silva_Duarte.pdf",
  "CC10-936401": "declaracoes_individuais/declaracao_CC10-936401_Gabriel_Avelar_de_Oliveira.pdf",
  "CC10-684680": "declaracoes_individuais/declaracao_CC10-684680_Pedro_Henrique_da_Silva_Cota.pdf",
  "CC10-330135": "declaracoes_individuais/declaracao_CC10-330135_Sara_Emanuely_de_Oliveira_Tadeu.pdf",
  "CC10-719037": "declaracoes_individuais/declaracao_CC10-719037_clara_becalli.pdf",
  "CC10-669098": "declaracoes_individuais/declaracao_CC10-669098_Thales_Wilson.pdf",
  "CC10-873560": "declaracoes_individuais/declaracao_CC10-873560_Alice_Rodrigues_de_Oliveira_Barros.pdf",
  "CC10-205127": "declaracoes_individuais/declaracao_CC10-205127_Giovanna_Maria_Carvalho_Leao_Magno.pdf",
  "CC10-157895": "declaracoes_individuais/declaracao_CC10-157895_Bianca_da_Silva_Monteiro.pdf",
  "CC10-293141": "declaracoes_individuais/declaracao_CC10-293141_Laura_Avila_Soares.pdf",
  "CC10-293974": "declaracoes_individuais/declaracao_CC10-293974_Fernando_Angelo_Silva_Almeida.pdf",
  "CC10-651812": "declaracoes_individuais/declaracao_CC10-651812_Thais_Suellen_Cesar_Rocha.pdf",
  "CC10-278341": "declaracoes_individuais/declaracao_CC10-278341_Aimee_Germano_Torres_Sales.pdf",
  "CC10-162029": "declaracoes_individuais/declaracao_CC10-162029_Karoline_Sathler_Rocha_Godinho.pdf",
  "CC10-812167": "declaracoes_individuais/declaracao_CC10-812167_Julia_Soares_Souto.pdf",
  "CC10-190206": "declaracoes_individuais/declaracao_CC10-190206_AILA_FERNANDES_RAMOS_E_SILVA.pdf",
  "CC10-534963": "declaracoes_individuais/declaracao_CC10-534963_Geovana_Oliveira_Ferreira.pdf",
  "CC10-449586": "declaracoes_individuais/declaracao_CC10-449586_Ana_Beatriz_Assuncao_Moreira.pdf",
  "CC10-989324": "declaracoes_individuais/declaracao_CC10-989324_Yasmim_Pereira_dos_Santos_Morais.pdf",
  "CC10-158891": "declaracoes_individuais/declaracao_CC10-158891_Iasmin_Gomes_de_Almeida.pdf",
  "CC10-352983": "declaracoes_individuais/declaracao_CC10-352983_Istefany_Gomes_de_Almeida.pdf",
  "CC10-175382": "declaracoes_individuais/declaracao_CC10-175382_Chelsea_Lyssa_de_Souza_Lino.pdf",
  "CC10-385765": "declaracoes_individuais/declaracao_CC10-385765_Gabriele_dos_Reis_Beato.pdf",
  "CC10-ORG-CADU": "declaracoes_individuais/declaracao_SEM-PROTOCOLO-PAG30_Carlos_Eduardo_Figueira_Mancia.pdf",

  // --- 11° CAFÉ COM CIÊNCIA ---
  "CC11-702011": "declaracoes_individuais/declaracao_CC11-702011_Gabriel_Avelar_de_Oliveira.pdf",
  "CC11-849875": "declaracoes_individuais/declaracao_CC11-849875_Pedro_Henrique_da_Silva_Cota.pdf",
  "CC11-315485": "declaracoes_individuais/declaracao_CC11-315485_clara_becalli.pdf",
  "CC11-610803": "declaracoes_individuais/declaracao_CC11-610803_Ghaya_Maryeva_Boaventura_Alves.pdf",
  "CC11-205927": "declaracoes_individuais/declaracao_CC11-205927_Maria_Luisa_Ribeiro_dos_Santos.pdf",
  "CC11-903401": "declaracoes_individuais/declaracao_CC11-903401_Pedro_Henrique_Silva_Carvalho.pdf",
  "CC11-529387": "declaracoes_individuais/declaracao_CC11-529387_Luisa_Gomes.pdf",
  "CC11-729133": "declaracoes_individuais/declaracao_CC11-729133_Luiz_Eduardo_Evangelista_Rafael.pdf",
  "CC11-724478": "declaracoes_individuais/declaracao_CC11-724478_Thais_Suellen_Cesar_Rocha.pdf",
  "CC11-200985": "declaracoes_individuais/declaracao_CC11-200985_Cely_Regina_Martins_Rocha_de_Lacerda.pdf",
  "CC11-288737": "declaracoes_individuais/declaracao_CC11-288737_Thais_Nogueira_Reis.pdf",
  "CC11-844365": "declaracoes_individuais/declaracao_CC11-844365_Chelsea_Lyssa_de_Souza_Lino.pdf",
  "CC11-871729": "declaracoes_individuais/declaracao_CC11-871729_Ana_Luiza_de_Andrade_Barbosa.pdf",
  "CC11-918953": "declaracoes_individuais/declaracao_CC11-918953_Bianca_da_Silva_Monteiro.pdf",
  "CC11-454936": "declaracoes_individuais/declaracao_CC11-454936_Geovana_Oliveira_Ferreira.pdf",
  "CC11-149183": "declaracoes_individuais/declaracao_CC11-149183_Gabriella_Andrade_Gontijo.pdf",
  "CC11-272253": "declaracoes_individuais/declaracao_CC11-272253_Giovanna_Maria_Carvalho_Leao_Magno.pdf",
  "CC11-404373": "declaracoes_individuais/declaracao_CC11-404373_Karine_Oliveira.pdf",
  "CC11-628046": "declaracoes_individuais/declaracao_CC11-628046_Liriel_Pires_Santos.pdf",
  "CC11-495501": "declaracoes_individuais/declaracao_CC11-495501_Ana_Clara_Goncalves_de_Oliveira.pdf",
  "CC11-113365": "declaracoes_individuais/declaracao_CC11-113365_Luiza_Martins_Sousa.pdf",
  "CC11-252887": "declaracoes_individuais/declaracao_CC11-252887_Larissa_Goncalves_de_Oliveira.pdf",
  "CC11-196424": "declaracoes_individuais/declaracao_CC11-196424_Natalia_Soares_Carvalho.pdf",
  "CC11-704199": "declaracoes_individuais/declaracao_CC11-704199_Carolina_Silva_Machado.pdf",
  "CC11-594436": "declaracoes_individuais/declaracao_CC11-594436_Maria_Fernanda_Goncalves_Oliveira.pdf",
  "CC11-101148": "declaracoes_individuais/declaracao_CC11-101148_Fernando_Angelo_Silva_Almeida.pdf",
  "CC11-102932": "declaracoes_individuais/declaracao_CC11-102932_Sophia_Agnes_Borba_Oliveira_da_Cunha_Fernandes.pdf",
  "CC11-588699": "declaracoes_individuais/declaracao_CC11-588699_Renata_Venuto.pdf",
  "CC11-922049": "declaracoes_individuais/declaracao_CC11-922049_Giovana_caroline_dos_santos_sampaio.pdf",
  "CC11-794371": "declaracoes_individuais/declaracao_CC11-794371_Aline_Soares_Eloy_de_Queiroz.pdf",
  "CC11-291626": "declaracoes_individuais/declaracao_CC11-291626_Julia_Soares_Souto.pdf",
  "CC11-822978": "declaracoes_individuais/declaracao_CC11-822978_Eduardo_Erick_Portela.pdf",
  "CC11-421574": "declaracoes_individuais/declaracao_CC11-421574_Aylla_Francielle.pdf",
  "CC11-273289": "declaracoes_individuais/declaracao_CC11-273289_Thales_Wilson.pdf",
  "CC11-211015": "declaracoes_individuais/declaracao_CC11-211015_Gabriele_dos_Reis_Beato.pdf",
  "CC11-781985": "declaracoes_individuais/declaracao_CC11-781985_AILA_FERNANDES_RAMOS_E_SILVA.pdf",
  "CC11-121635": "declaracoes_individuais/declaracao_CC11-121635_Laura_Avila_Soares.pdf"
};

function obterLinkDeclaracaoPdf(protocolo) {
  if (!protocolo) return null;
  const protoUpper = String(protocolo).trim().toUpperCase();
  // As declarações em PDF pertencem ao 10° Café (CC10-) e 11° Café (CC11-)
  if (!protoUpper.startsWith('CC10-') && !protoUpper.startsWith('CC11-')) {
    return null;
  }
  return DECLARACOES_PDF_MAP[protoUpper] || null;
}

// Expõe globalmente
window.LigaDB = {
  SUPABASE_CONFIG,
  PIX_CONFIG,
  PIX_CONFIG_11,
  PIX_CONFIG_12,
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
  buscarTodasInscricoes,
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
  obterConfiguracoesSistema,
  obterEdicaoAtivaPortaria,
  definirEdicaoAtivaPortaria,
  obterInfoEdicao,
  estaoInscricoesEncerradas,
  alternarInscricoesEncerradas,
  extrairInstituicaoAluno,
  obterLinkDeclaracaoPdf,
  DECLARACOES_PDF_MAP,
  HISTORICO_INSCRICOES
};

