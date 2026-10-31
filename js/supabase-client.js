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
    certificados_liberados: localStorage.getItem('cafe_certificados_liberados') === 'true'
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
// 6. BUSCA E CONSULTA DE INSCRIÇÃO
// ============================================================================
async function buscarInscricao(termo) {
  if (!termo) return null;
  const termoLimpo = termo.trim().toLowerCase();
  const termoTel = termo.replace(/\D/g, '');

  const sb = getSupabase();
  if (sb) {
    try {
      let query = sb.from(SUPABASE_CONFIG.tableName).select('*').neq('role', 'organizador');

      if (termoLimpo.startsWith('cc10-') || termoLimpo.startsWith('cc11-') || termoLimpo.startsWith('cc12-')) {
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
    i.role !== 'organizador' && (
      (i.protocolo && i.protocolo.toLowerCase() === termoLimpo) ||
      (i.email && i.email.toLowerCase() === termoLimpo) ||
      (i.telefone && i.telefone.replace(/\D/g, '') === termoTel && termoTel.length >= 8)
    )
  ) || null;
}

// Retorna TODAS as inscrições de um participante (por e-mail, telefone ou protocolo)
async function buscarTodasInscricoes(termo) {
  if (!termo) return [];
  const termoLimpo = termo.trim().toLowerCase();
  const termoTel = termo.replace(/\D/g, '');

  const sb = getSupabase();
  if (sb) {
    try {
      let query = sb.from(SUPABASE_CONFIG.tableName).select('*').neq('role', 'organizador');

      if (termoLimpo.startsWith('cc10-') || termoLimpo.startsWith('cc11-') || termoLimpo.startsWith('cc12-')) {
        // Quando busca por protocolo, localiza o aluno e busca TODAS as suas inscrições pelo e-mail vinculado
        const { data: dProto } = await sb.from(SUPABASE_CONFIG.tableName).select('*').ilike('protocolo', termoLimpo).limit(1);
        if (dProto && dProto.length > 0 && dProto[0].email) {
          const { data: todasDoAluno } = await sb
            .from(SUPABASE_CONFIG.tableName)
            .select('*')
            .neq('role', 'organizador')
            .ilike('email', dProto[0].email.trim())
            .order('created_at', { ascending: false });
          if (todasDoAluno && todasDoAluno.length > 0) return todasDoAluno;
        }
        if (dProto && dProto.length > 0) return dProto;
      } else if (termoLimpo.includes('@')) {
        query = query.ilike('email', termoLimpo);
      } else {
        query = query.or(`protocolo.ilike.%${termoLimpo}%,email.ilike.%${termoLimpo}%,telefone.ilike.%${termoTel || termoLimpo}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) return data;
    } catch (e) {
      console.warn('Erro ao consultar Supabase:', e);
    }
  }

  // Fallback Local
  const inscricoes = JSON.parse(localStorage.getItem('cafe_ciencia_inscricoes') || '[]');
  return inscricoes.filter(i => 
    i.role !== 'organizador' && (
      (i.protocolo && i.protocolo.toLowerCase() === termoLimpo) ||
      (i.email && i.email.toLowerCase() === termoLimpo) ||
      (i.telefone && i.telefone.replace(/\D/g, '') === termoTel && termoTel.length >= 8)
    )
  );
}

// ============================================================================
// 7. VALIDAÇÃO DE PRESENÇA (CHECK-IN POR QR CODE NA PORTARIA)
// ============================================================================
async function validarPresencaPorQRCode(codigo, validadorNome = 'Portaria Oficial') {
  if (!codigo) throw new Error('Código do QR Code não fornecido.');

  let protocolo = String(codigo).trim();

  // 1. Extração robusta se for uma URL completa ou link com parâmetros
  if (protocolo.includes('?')) {
    try {
      const urlQuery = protocolo.split('?')[1];
      const urlParams = new URLSearchParams(urlQuery);
      if (urlParams.get('protocolo')) {
        protocolo = urlParams.get('protocolo');
      } else if (urlParams.get('checkin')) {
        protocolo = urlParams.get('checkin');
      } else if (urlParams.get('codigo')) {
        protocolo = urlParams.get('codigo');
      }
    } catch (e) {}
  }

  // 2. Extração via Regex: localiza padrão oficial CC10-XXXXXX, CC11-XXXXXX ou CC12-XXXXXX
  const matchOficial = protocolo.match(/CC\d{2}-[A-Z0-9]+/i);
  if (matchOficial) {
    protocolo = matchOficial[0];
  }

  protocolo = protocolo.toUpperCase().trim();

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


// ============================================================================
// MAPEAMENTO OFICIAL DAS DECLARAÇÕES EM PDF ENVIADAS POR E-MAIL
// ============================================================================
const DECLARACOES_PDF_MAP = {
  "CC10-650626": "declaracoes_individuais/declaracao_CC10-650626_Ghaya_Maryeva_Boaventura_Alves.pdf",
  "ghayamaryeva17@gmail.com": "declaracoes_individuais/declaracao_CC10-650626_Ghaya_Maryeva_Boaventura_Alves.pdf",
  "CC10-977044": "declaracoes_individuais/declaracao_CC10-977044_Maira_Pinheiro_Neves.pdf",
  "mairapinheironeves@gmail.com": "declaracoes_individuais/declaracao_CC10-977044_Maira_Pinheiro_Neves.pdf",
  "CC10-710439": "declaracoes_individuais/declaracao_CC10-710439_Bruno_Oliveira_Meireles.pdf",
  "brunomeireles2003@gmail.com": "declaracoes_individuais/declaracao_CC10-710439_Bruno_Oliveira_Meireles.pdf",
  "CC10-347357": "declaracoes_individuais/declaracao_CC10-347357_Amanda_Marcia_Almeida_Mesquita.pdf",
  "mandinha8@outlook.com": "declaracoes_individuais/declaracao_CC10-347357_Amanda_Marcia_Almeida_Mesquita.pdf",
  "CC10-756168": "declaracoes_individuais/declaracao_CC10-756168_Camila_silva_de_Paulo.pdf",
  "silvacamila1710@gmail.com": "declaracoes_individuais/declaracao_CC10-756168_Camila_silva_de_Paulo.pdf",
  "CC10-200915": "declaracoes_individuais/declaracao_CC10-200915_Junia_Paula_Andrade_Furtado.pdf",
  "juniaandradef@icloud.com": "declaracoes_individuais/declaracao_CC10-200915_Junia_Paula_Andrade_Furtado.pdf",
  "CC10-508082": "declaracoes_individuais/declaracao_CC10-508082_Beatriz_da_Silva_Duarte.pdf",
  "bibisilvaduarte2013@gmail.com": "declaracoes_individuais/declaracao_CC10-508082_Beatriz_da_Silva_Duarte.pdf",
  "CC10-936401": "declaracoes_individuais/declaracao_CC10-936401_Gabriel_Avelar_de_Oliveira.pdf",
  "gabriel.avlr@outlook.com": "declaracoes_individuais/declaracao_CC10-936401_Gabriel_Avelar_de_Oliveira.pdf",
  "CC10-684680": "declaracoes_individuais/declaracao_CC10-684680_Pedro_Henrique_da_Silva_Cota.pdf",
  "pedrohenriquedasilvacota@gmail.com": "declaracoes_individuais/declaracao_CC10-684680_Pedro_Henrique_da_Silva_Cota.pdf",
  "CC10-330135": "declaracoes_individuais/declaracao_CC10-330135_Sara_Emanuely_de_Oliveira_Tadeu.pdf",
  "saraemanuely.oliveira@gmail.com": "declaracoes_individuais/declaracao_CC10-330135_Sara_Emanuely_de_Oliveira_Tadeu.pdf",
  "CC10-719037": "declaracoes_individuais/declaracao_CC10-719037_clara_becalli.pdf",
  "claraabecallis@gmail.com": "declaracoes_individuais/declaracao_CC10-719037_clara_becalli.pdf",
  "CC10-669098": "declaracoes_individuais/declaracao_CC10-669098_Thales_Wilson.pdf",
  "thaleswilson.gomes@gmail.com": "declaracoes_individuais/declaracao_CC10-669098_Thales_Wilson.pdf",
  "CC10-873560": "declaracoes_individuais/declaracao_CC10-873560_Alice_Rodrigues_de_Oliveira_Barros.pdf",
  "alicerodsb17@gmail.com": "declaracoes_individuais/declaracao_CC10-873560_Alice_Rodrigues_de_Oliveira_Barros.pdf",
  "CC10-205127": "declaracoes_individuais/declaracao_CC10-205127_Giovanna_Maria_Carvalho_Leao_Magno.pdf",
  "giovannamagno21042006@gmail.com": "declaracoes_individuais/declaracao_CC10-205127_Giovanna_Maria_Carvalho_Leao_Magno.pdf",
  "CC10-157895": "declaracoes_individuais/declaracao_CC10-157895_Bianca_da_Silva_Monteiro.pdf",
  "biancasilvamonteiro213@gmail.com": "declaracoes_individuais/declaracao_CC10-157895_Bianca_da_Silva_Monteiro.pdf",
  "CC10-293141": "declaracoes_individuais/declaracao_CC10-293141_Laura_Avila_Soares.pdf",
  "lauravillas2003@gmail.com": "declaracoes_individuais/declaracao_CC10-293141_Laura_Avila_Soares.pdf",
  "CC10-293974": "declaracoes_individuais/declaracao_CC10-293974_Fernando_Angelo_Silva_Almeida.pdf",
  "feangelo.2005@gmail.com": "declaracoes_individuais/declaracao_CC10-293974_Fernando_Angelo_Silva_Almeida.pdf",
  "CC10-651812": "declaracoes_individuais/declaracao_CC10-651812_Thais_Suellen_Cesar_Rocha.pdf",
  "thaissuellen22@outlook.com": "declaracoes_individuais/declaracao_CC10-651812_Thais_Suellen_Cesar_Rocha.pdf",
  "CC10-278341": "declaracoes_individuais/declaracao_CC10-278341_Aimee_Germano_Torres_Sales.pdf",
  "aimeesales21@gmail.com": "declaracoes_individuais/declaracao_CC10-278341_Aimee_Germano_Torres_Sales.pdf",
  "CC10-162029": "declaracoes_individuais/declaracao_CC10-162029_Karoline_Sathler_Rocha_Godinho.pdf",
  "karolinesathlerr@gmail.com": "declaracoes_individuais/declaracao_CC10-162029_Karoline_Sathler_Rocha_Godinho.pdf",
  "CC10-812167": "declaracoes_individuais/declaracao_CC10-812167_Julia_Soares_Souto.pdf",
  "jusoaressouto06@gmail.com": "declaracoes_individuais/declaracao_CC10-812167_Julia_Soares_Souto.pdf",
  "CC10-190206": "declaracoes_individuais/declaracao_CC10-190206_AILA_FERNANDES_RAMOS_E_SILVA.pdf",
  "ailafrs@gmail.com": "declaracoes_individuais/declaracao_CC10-190206_AILA_FERNANDES_RAMOS_E_SILVA.pdf",
  "CC10-534963": "declaracoes_individuais/declaracao_CC10-534963_Geovana_Oliveira_Ferreira.pdf",
  "geovanaof14@gmail.com": "declaracoes_individuais/declaracao_CC10-534963_Geovana_Oliveira_Ferreira.pdf",
  "CC10-449586": "declaracoes_individuais/declaracao_CC10-449586_Ana_Beatriz_Assuncao_Moreira.pdf",
  "beatrizassm@gmail.com": "declaracoes_individuais/declaracao_CC10-449586_Ana_Beatriz_Assuncao_Moreira.pdf",
  "CC10-989324": "declaracoes_individuais/declaracao_CC10-989324_Yasmim_Pereira_dos_Santos_Morais.pdf",
  "yasmimpereira128@gmail.com": "declaracoes_individuais/declaracao_CC10-989324_Yasmim_Pereira_dos_Santos_Morais.pdf",
  "CC10-158891": "declaracoes_individuais/declaracao_CC10-158891_Iasmin_Gomes_de_Almeida.pdf",
  "mimgomes845@gmail.com": "declaracoes_individuais/declaracao_CC10-158891_Iasmin_Gomes_de_Almeida.pdf",
  "CC10-352983": "declaracoes_individuais/declaracao_CC10-352983_Istefany_Gomes_de_Almeida.pdf",
  "istefanygalmeida@gmail.com": "declaracoes_individuais/declaracao_CC10-352983_Istefany_Gomes_de_Almeida.pdf",
  "CC10-175382": "declaracoes_individuais/declaracao_CC10-175382_Chelsea_Lyssa_de_Souza_Lino.pdf",
  "chelsealyssa03@gmail.com": "declaracoes_individuais/declaracao_CC10-175382_Chelsea_Lyssa_de_Souza_Lino.pdf",
  "CC10-385765": "declaracoes_individuais/declaracao_CC10-385765_Gabriele_dos_Reis_Beato.pdf",
  "gabrielereis402@gmail.com": "declaracoes_individuais/declaracao_CC10-385765_Gabriele_dos_Reis_Beato.pdf",
  "NÃO ENCONTRADO": "declaracoes_individuais/declaracao_SEM-PROTOCOLO-PAG30_Carlos_Eduardo_Figueira_Mancia.pdf",
  "cadumancia@gmail.com": "declaracoes_individuais/declaracao_SEM-PROTOCOLO-PAG30_Carlos_Eduardo_Figueira_Mancia.pdf",
  "CC10-ORG-CADU": "declaracoes_individuais/declaracao_SEM-PROTOCOLO-PAG30_Carlos_Eduardo_Figueira_Mancia.pdf"
};

function obterLinkDeclaracaoPdf(protocoloOuEmail) {
  if (!protocoloOuEmail) return null;
  const termo = String(protocoloOuEmail).trim();
  if (DECLARACOES_PDF_MAP[termo]) return DECLARACOES_PDF_MAP[termo];
  const termoUpper = termo.toUpperCase();
  if (DECLARACOES_PDF_MAP[termoUpper]) return DECLARACOES_PDF_MAP[termoUpper];
  const termoLower = termo.toLowerCase();
  if (DECLARACOES_PDF_MAP[termoLower]) return DECLARACOES_PDF_MAP[termoLower];
  return null;
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
  estaoInscricoesEncerradas,
  alternarInscricoesEncerradas,
  extrairInstituicaoAluno,
  obterLinkDeclaracaoPdf,
  DECLARACOES_PDF_MAP
};

