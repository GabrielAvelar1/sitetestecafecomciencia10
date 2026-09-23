/**
 * Painel Administrativo Completo da Liga - Café com Ciência
 * Inscrições, Portaria QR Code, Certificados e Disparador de Lembretes
 */

let inscricoesCache = [];
let abaAtivaAtual = 'inscricoes';

// Abrir Modal Admin (Restrito a Organizadores)
function abrirPainelAdmin(abaInicial = 'inscricoes') {
  if (!window.LigaDB.isOrganizadorLogado()) {
    abrirModalLoginOrganizador(abaInicial);
    return;
  }

  const modal = document.getElementById('adminModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    trocarAbaAdmin(abaInicial);
    carregarInscricoesAdmin();
  }
}

// Modal de Login do Organizador
function abrirModalLoginOrganizador(abaAposLogin = 'inscricoes') {
  const modal = document.getElementById('loginOrganizadorModal');
  if (modal) {
    modal.dataset.abaDestino = abaAposLogin;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const input = document.getElementById('inputSenhaOrg');
      if (input) input.focus();
    }, 100);
  }
}

function fecharModalLoginOrganizador() {
  const modal = document.getElementById('loginOrganizadorModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

async function executarLoginOrganizador() {
  const inputEmail = document.getElementById('inputEmailOrg');
  const inputSenha = document.getElementById('inputSenhaOrg');
  const erroDiv = document.getElementById('erroLoginOrg');

  const email = inputEmail ? inputEmail.value.trim() : window.LigaDB.ORGANIZADOR_PADRAO.email;
  const senha = inputSenha ? inputSenha.value.trim() : '';

  if (!senha) {
    if (erroDiv) {
      erroDiv.textContent = 'Por favor, digite a senha de acesso da organização.';
      erroDiv.classList.remove('hidden');
    }
    return;
  }

  try {
    const user = await window.LigaDB.fazerLogin(email, senha);
    if (user.role !== 'organizador') {
      throw new Error('Esta conta não possui permissão de organizador.');
    }

    fecharModalLoginOrganizador();
    const modal = document.getElementById('loginOrganizadorModal');
    const abaDestino = modal?.dataset.abaDestino || 'inscricoes';
    abrirPainelAdmin(abaDestino);

  } catch (err) {
    if (erroDiv) {
      erroDiv.textContent = err.message || 'Senha incorreta.';
      erroDiv.classList.remove('hidden');
    }
  }
}

// Fechar Modal Admin
function fecharPainelAdmin() {
  const modal = document.getElementById('adminModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    // Para a câmera se estiver ativa
    if (window.QRScannerPortaria) {
      window.QRScannerPortaria.pararLeitorPortaria();
    }
  }
}

// Trocar Abas no Painel Admin
function trocarAbaAdmin(aba) {
  abaAtivaAtual = aba;
  const abas = ['inscricoes', 'portaria', 'lembretes', 'config'];
  
  abas.forEach(nome => {
    const btn = document.getElementById(`tabBtn_${nome}`);
    const view = document.getElementById(`tabView_${nome}`);
    if (btn) {
      if (nome === aba) {
        btn.classList.add('bg-white', 'text-coffee-950', 'shadow-sm', 'font-bold');
        btn.classList.remove('text-stone-400', 'hover:text-white');
      } else {
        btn.classList.remove('bg-white', 'text-coffee-950', 'shadow-sm', 'font-bold');
        btn.classList.add('text-stone-400', 'hover:text-white');
      }
    }
    if (view) {
      if (nome === aba) {
        view.classList.remove('hidden');
      } else {
        view.classList.add('hidden');
      }
    }
  });

  // Inicializações específicas de aba
  if (aba === 'portaria') {
    // Foca no input manual se quiser
    setTimeout(() => {
      const input = document.getElementById('inputCodigoManual');
      if (input) input.focus();
    }, 100);
  } else if (aba === 'config') {
    carregarConfiguracoesSupabase();
  } else if (aba === 'lembretes') {
    atualizarPreviewMensagemLembrete();
  }

  if (window.lucide) window.lucide.createIcons();
}

// Carregar Inscrições
async function carregarInscricoesAdmin() {
  const container = document.getElementById('adminInscricoesList');
  const countBadge = document.getElementById('adminTotalInscricoes');
  const totalArrecadado = document.getElementById('adminTotalArrecadado');
  const totalPresencas = document.getElementById('adminTotalPresencas');
  const statusAvisos = document.getElementById('adminStatusDb');

  if (!container) return;

  container.innerHTML = `
    <tr>
      <td colspan="7" class="px-6 py-8 text-center text-stone-500">
        <div class="flex justify-center items-center gap-2">
          <i data-lucide="loader-2" class="w-5 h-5 animate-spin text-amber-700"></i>
          <span>Carregando inscrições do banco...</span>
        </div>
      </td>
    </tr>
  `;
  if (window.lucide) window.lucide.createIcons();

  // Status de Conexão
  const isSupabase = window.LigaDB.isSupabaseConfigured();
  if (statusAvisos) {
    if (isSupabase) {
      statusAvisos.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Conectado ao Supabase
        </span>
      `;
    } else {
      statusAvisos.innerHTML = `
        <button onclick="trocarAbaAdmin('config')" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition" title="Clique para configurar suas credenciais do Supabase">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          Modo Local (Clique p/ Conectar Supabase)
        </button>
      `;
    }
  }

  try {
    inscricoesCache = await window.LigaDB.listarInscricoes();

    const qtdInscritos = inscricoesCache.length;
    const qtdPresentes = inscricoesCache.filter(i => i.presenca_confirmada).length;
    const totalValor = inscricoesCache.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 10), 0);

    if (countBadge) countBadge.textContent = `${qtdInscritos} inscritos`;
    if (totalPresencas) totalPresencas.textContent = `${qtdPresentes} presenças validadas`;
    if (totalArrecadado) totalArrecadado.textContent = `R$ ${totalValor.toFixed(2).replace('.', ',')}`;

    if (qtdInscritos === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-12 text-center text-stone-400">
            <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 text-stone-300"></i>
            <p class="font-medium text-stone-600">Nenhuma inscrição registrada ainda.</p>
            <p class="text-xs text-stone-400 mt-1">As inscrições enviadas pelo formulário aparecerão aqui automaticamente.</p>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = inscricoesCache.map(item => {
      const whatsappClean = (item.telefone || '').replace(/\D/g, '');
      
      // Status Pagamento
      const statusPagamentoBadge = item.status_pagamento === 'aprovado'
        ? `<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">Aprovado</span>`
        : item.status_pagamento === 'recusado'
        ? `<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">Recusado</span>`
        : `<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">Pendente</span>`;

      // Status Presença
      const presencaBadge = item.presenca_confirmada
        ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-400" title="Check-in realizado em: ${new Date(item.presenca_horario).toLocaleTimeString('pt-BR')}">
             <i data-lucide="check-check" class="w-3 h-3 text-emerald-600"></i> Presente
           </span>`
        : `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500 border border-stone-200">Não chegou</span>`;

      // Botão Comprovante
      const comprovanteBtn = item.comprovante_url
        ? `<button onclick="visualizarComprovante('${item.id}')" class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 transition">
             <i data-lucide="file-check" class="w-3.5 h-3.5 text-amber-700"></i> Ver Pix
           </button>`
        : `<span class="text-xs text-stone-400">Sem anexo</span>`;

      // Botão Certificado Oficial
      const certificadoBtn = item.presenca_confirmada
        ? `<a href="certificados.html?protocolo=${item.protocolo}" target="_blank" class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition" title="Abrir certificado oficial para impressão">
             <i data-lucide="award" class="w-3.5 h-3.5 text-blue-600"></i> Certificado
           </a>`
        : `<span class="text-xs text-stone-300 italic" title="Disponível após o check-in por QR Code na portaria">Pós-Checkin</span>`;

      return `
        <tr class="border-b border-stone-100 hover:bg-stone-50 transition-colors">
          <td class="px-4 py-3">
            <div class="font-bold text-stone-900">${item.nome_completo}</div>
            <div class="text-[11px] font-mono text-coffee-700">${item.protocolo || '-'}</div>
          </td>
          <td class="px-4 py-3 text-stone-600 text-xs">${item.email}</td>
          <td class="px-4 py-3 text-stone-700 text-xs whitespace-nowrap">
            <a href="https://wa.me/55${whatsappClean}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 hover:text-emerald-700 font-medium" title="Abrir conversa no WhatsApp">
              <i data-lucide="phone" class="w-3 h-3 text-emerald-600"></i>
              ${item.telefone}
            </a>
          </td>
          <td class="px-4 py-3 text-center">${statusPagamentoBadge}</td>
          <td class="px-4 py-3 text-center">${presencaBadge}</td>
          <td class="px-4 py-3 text-center">${comprovanteBtn}</td>
          <td class="px-4 py-3 text-center">${certificadoBtn}</td>
          <td class="px-4 py-3 text-right whitespace-nowrap">
            <div class="flex items-center justify-end gap-1">
              <!-- Botão Ver Credencial / QR Code -->
              <button onclick="abrirCredencialPorProtocolo('${item.protocolo}')" title="Ver Credencial com QR Code" class="p-1.5 rounded-lg text-coffee-700 hover:bg-coffee-50 transition">
                <i data-lucide="qr-code" class="w-4 h-4"></i>
              </button>
              
              <!-- Aprovar Pix -->
              <button onclick="alterarStatusPix('${item.id}', 'aprovado')" title="Aprovar pagamento Pix" class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
              </button>

              <!-- Recusar Pix -->
              <button onclick="alterarStatusPix('${item.id}', 'recusado')" title="Recusar pagamento Pix" class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition">
                <i data-lucide="x-circle" class="w-4 h-4"></i>
              </button>

              <!-- Enviar Lembrete no WhatsApp -->
              <button onclick="enviarLembreteIndividual('${item.id}')" title="Mandar lembrete via WhatsApp" class="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition">
                <i data-lucide="message-circle" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error('Erro ao listar:', err);
    container.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-6 text-center text-red-600 text-sm">
          Erro ao carregar inscrições. Verifique o console ou a conexão com o Supabase.
        </td>
      </tr>
    `;
  }
}

// Alterar Status Pix
async function alterarStatusPix(id, novoStatus) {
  try {
    await window.LigaDB.atualizarStatusPagamento(id, novoStatus);
    carregarInscricoesAdmin();
  } catch (err) {
    alert('Erro ao atualizar status: ' + err.message);
  }
}

// Visualizar Comprovante
function visualizarComprovante(id) {
  const item = inscricoesCache.find(i => i.id === id);
  if (!item || !item.comprovante_url) {
    alert('Comprovante não disponível.');
    return;
  }

  const viewerModal = document.getElementById('comprovanteViewerModal');
  const viewerContent = document.getElementById('comprovanteViewerContent');
  const viewerTitle = document.getElementById('comprovanteViewerTitle');

  if (viewerTitle) viewerTitle.textContent = `Comprovante: ${item.nome_completo}`;

  if (item.comprovante_url.startsWith('data:application/pdf')) {
    viewerContent.innerHTML = `
      <iframe src="${item.comprovante_url}" class="w-full h-[70vh] rounded-lg border"></iframe>
    `;
  } else {
    viewerContent.innerHTML = `
      <div class="flex flex-col items-center justify-center p-2">
        <img src="${item.comprovante_url}" alt="Comprovante Pix" class="max-h-[75vh] max-w-full rounded-lg shadow-md object-contain" />
        <a href="${item.comprovante_url}" download="${item.comprovante_nome || 'comprovante.jpg'}" class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-stone-800 text-white text-xs font-semibold rounded-lg hover:bg-stone-700 transition">
          <i data-lucide="download" class="w-4 h-4"></i> Baixar Arquivo Original
        </a>
      </div>
    `;
  }

  if (window.lucide) window.lucide.createIcons();
  if (viewerModal) viewerModal.classList.remove('hidden');
}

function fecharVisualizadorComprovante() {
  const viewerModal = document.getElementById('comprovanteViewerModal');
  if (viewerModal) viewerModal.classList.add('hidden');
}

// ============================================================================
// SISTEMA DE LEMBRETES AUTOMÁTICOS (WHATSAPP E E-MAIL)
// ============================================================================
const MODELOS_LEMBRETES = {
  '7_dias': {
    titulo: 'Lembrete: Faltam 7 dias!',
    texto: `Olá [NOME]! Tudo bem? Passando para lembrar que falta apenas 1 semana para o *10° Café com Ciência: Os Direitos dos Pacientes na Odontologia* com a Profa. Carolina Diniz.\n\n📅 Data: 30 de Outubro às 15:00\n📍 Local: UniArnaldo - Campus Anchieta (Sala 202)\n🎫 Seu Protocolo de Inscrição: [PROTOCOLO]\n\nAcesse sua credencial com QR Code para entrada no evento:\n[LINK_CREDENCIAL]\n\nNos vemos lá!`
  },
  'vespera': {
    titulo: 'Lembrete: É amanhã!',
    texto: `Oi [NOME]! O grande dia está chegando! Amanhã (30/10) às 15h teremos o *10° Café com Ciência* na UniArnaldo (Sala 202).\n\n⚠️ *Aviso Importante*: Tenha em mãos a sua Credencial com o QR Code para fazer o check-in na portaria:\n[LINK_CREDENCIAL]\n\nTeremos coffee break especial e emissão de certificado oficial após a palestra!`
  },
  'hoje_portaria': {
    titulo: 'Lembrete: É hoje! Portaria aberta',
    texto: `Olá [NOME]! O *10° Café com Ciência* acontece HOJE às 15h00 na Sala 202 da UniArnaldo (Campus Anchieta)!\n\nChegue com 15 minutos de antecedência e apresente seu QR Code na entrada:\n[LINK_CREDENCIAL]\n\nAté logo!`
  },
  'certificado': {
    titulo: 'Aviso: Seu Certificado Oficial está disponível!',
    texto: `Parabéns pela participação, [NOME]!\n\nSeu Certificado Oficial de 4 horas do *10° Café com Ciência* já foi autenticado e está liberado para emissão e download:\n\n🎓 Acesse e baixe seu certificado aqui:\n[LINK_CERTIFICADO]\n\nMuito obrigado por fazer parte da 10ª edição com a gente!`
  }
};

function atualizarPreviewMensagemLembrete() {
  const select = document.getElementById('selectTipoLembrete');
  const textarea = document.getElementById('textareaModeloMensagem');
  if (!select || !textarea) return;

  const tipo = select.value;
  const modelo = MODELOS_LEMBRETES[tipo];
  if (modelo) {
    textarea.value = modelo.texto;
  }
}

function gerarMensagemPersonalizada(template, aluno) {
  const urlBase = window.location.origin + window.location.pathname.replace('index.html', '');
  const linkCredencial = `${urlBase}index.html?consultar=${aluno.protocolo}`;
  const linkCertificado = `${urlBase}certificados.html?protocolo=${aluno.protocolo}`;

  return template
    .replace(/\[NOME\]/g, aluno.nome_completo)
    .replace(/\[PROTOCOLO\]/g, aluno.protocolo)
    .replace(/\[LINK_CREDENCIAL\]/g, linkCredencial)
    .replace(/\[LINK_CERTIFICADO\]/g, linkCertificado);
}

// Disparo de WhatsApp Individual
function enviarLembreteIndividual(id) {
  const aluno = inscricoesCache.find(i => i.id === id);
  if (!aluno) return;

  const select = document.getElementById('selectTipoLembrete');
  const textarea = document.getElementById('textareaModeloMensagem');
  const template = textarea?.value || MODELOS_LEMBRETES['vespera'].texto;
  const tipo = select?.value || 'vespera';

  const textoFinal = gerarMensagemPersonalizada(template, aluno);
  const zapClean = (aluno.telefone || '').replace(/\D/g, '');

  if (!zapClean) {
    alert('Aluno não possui telefone cadastrado.');
    return;
  }

  window.LigaDB.registrarDisparoLembrete(aluno.id, 'whatsapp', tipo);
  const linkZap = `https://wa.me/55${zapClean}?text=${encodeURIComponent(textoFinal)}`;
  window.open(linkZap, '_blank');
}

// Disparo em Lote para Todos os Inscritos
function dispararLembretesEmLote() {
  if (!inscricoesCache || inscricoesCache.length === 0) {
    alert('Nenhum inscrito na lista para enviar lembretes.');
    return;
  }

  const select = document.getElementById('selectTipoLembrete');
  const textarea = document.getElementById('textareaModeloMensagem');
  const template = textarea?.value || MODELOS_LEMBRETES['vespera'].texto;
  const tipo = select?.value || 'vespera';

  const confirmMsg = `Deseja abrir a fila de envio de WhatsApp para ${inscricoesCache.length} inscritos? Uma janela será aberta para cada contato.`;
  if (!confirm(confirmMsg)) return;

  let delay = 0;
  inscricoesCache.forEach((aluno, idx) => {
    const zapClean = (aluno.telefone || '').replace(/\D/g, '');
    if (zapClean) {
      setTimeout(() => {
        const textoFinal = gerarMensagemPersonalizada(template, aluno);
        window.LigaDB.registrarDisparoLembrete(aluno.id, 'whatsapp', tipo);
        const linkZap = `https://wa.me/55${zapClean}?text=${encodeURIComponent(textoFinal)}`;
        window.open(linkZap, '_blank');
      }, delay);
      delay += 800; // Intervalo para o navegador permitir abrir janelas
    }
  });
}

// ============================================================================
// CONFIGURAÇÕES DO SUPABASE NA INTERFACE
// ============================================================================
function carregarConfiguracoesSupabase() {
  const creds = window.LigaDB.getSupabaseCredentials();
  const inputUrl = document.getElementById('inputSupabaseUrl');
  const inputKey = document.getElementById('inputSupabaseAnonKey');
  const badgeStatus = document.getElementById('badgeStatusConfigSupabase');

  if (inputUrl && creds.url && !creds.url.includes('SEU_PROJETO')) inputUrl.value = creds.url;
  if (inputKey && creds.anonKey && !creds.anonKey.includes('SUA_CHAVE_ANON')) inputKey.value = creds.anonKey;

  if (badgeStatus) {
    if (window.LigaDB.isSupabaseConfigured()) {
      badgeStatus.innerHTML = `<span class="text-emerald-600 font-bold flex items-center gap-1"><i data-lucide="check-circle" class="w-4 h-4"></i> Supabase Ativo e Operacional</span>`;
    } else {
      badgeStatus.innerHTML = `<span class="text-amber-600 font-bold flex items-center gap-1"><i data-lucide="alert-circle" class="w-4 h-4"></i> Em Modo Demonstração (Local)</span>`;
    }
  }
  if (window.lucide) window.lucide.createIcons();
}

function salvarConfiguracoesSupabase() {
  const inputUrl = document.getElementById('inputSupabaseUrl');
  const inputKey = document.getElementById('inputSupabaseAnonKey');

  const url = inputUrl?.value.trim();
  const key = inputKey?.value.trim();

  if (!url || !key) {
    alert('Por favor, informe a URL do projeto e a Chave anon pública.');
    return;
  }

  window.LigaDB.salvarCredenciaisSupabase(url, key);
  alert('Configurações salvas com sucesso! Recarregando dados...');
  carregarInscricoesAdmin();
  carregarConfiguracoesSupabase();
}

// Exportar CSV
function exportarParaCSV() {
  if (!inscricoesCache || inscricoesCache.length === 0) {
    alert('Não há inscrições para exportar.');
    return;
  }

  const cabecalhos = ['Protocolo', 'Nome Completo', 'E-mail', 'Telefone', 'Status Pagamento', 'Presenca Confirmada', 'Horario Check-in', 'Codigo Certificado', 'Data Inscricao'];
  const linhas = inscricoesCache.map(i => [
    `"${i.protocolo || ''}"`,
    `"${i.nome_completo.replace(/"/g, '""')}"`,
    `"${i.email}"`,
    `"${i.telefone}"`,
    `"${i.status_pagamento || 'pendente'}"`,
    `"${i.presenca_confirmada ? 'SIM' : 'NÃO'}"`,
    `"${i.presenca_horario ? new Date(i.presenca_horario).toLocaleString('pt-BR') : '-'}"`,
    `"${i.certificado_codigo || '-'}"`,
    `"${new Date(i.created_at).toLocaleString('pt-BR')}"`
  ]);

  const csvContent = '\uFEFF' + [cabecalhos.join(';'), ...linhas.map(e => e.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Lista_Presenca_10_Cafe_com_Ciencia_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Limpar dados demo
function limparDadosDemo() {
  if (confirm('Deseja realmente limpar as inscrições salvas no armazenamento local do navegador?')) {
    localStorage.removeItem('cafe_ciencia_inscricoes');
    carregarInscricoesAdmin();
  }
}
