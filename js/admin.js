/**
 * Painel Administrativo Completo da Liga - Café com Ciência
 * Inscrições, Portaria QR Code, Certificados e Disparador de Lembretes
 */

let inscricoesCache = [];
let abaAtivaAtual = 'inscricoes';

// Abrir Painel Admin (Navega para a página dedicada admin.html)
function abrirPainelAdmin(abaInicial = 'inscricoes') {
  if (window.location.pathname.endsWith('admin.html')) {
    trocarAbaAdmin(abaInicial);
    return;
  }
  window.location.href = 'admin.html' + (abaInicial ? '#' + abaInicial : '');
}

// Modal de Login do Organizador (quando acionado na home)
function abrirModalLoginOrganizador(abaAposLogin = 'inscricoes') {
  if (window.location.pathname.endsWith('admin.html')) {
    const loginScreen = document.getElementById('adminLoginScreen');
    if (loginScreen) loginScreen.classList.remove('hidden');
    return;
  }
  window.location.href = 'admin.html' + (abaAposLogin ? '#' + abaAposLogin : '');
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
  }
  // Para a câmera se estiver ativa
  if (window.QRScannerPortaria) {
    window.QRScannerPortaria.pararLeitorPortaria();
  }
}

// Trocar Abas no Painel Admin
function trocarAbaAdmin(aba) {
  abaAtivaAtual = aba;
  const abas = ['inscricoes', 'portaria', 'lembretes', 'resend_teste'];
  
  abas.forEach(nome => {
    const btn = document.getElementById(`tabBtn_${nome}`);
    const view = document.getElementById(`tabView_${nome}`);
    if (btn) {
      if (nome === aba) {
        btn.classList.add('bg-white', 'text-coffee-950', 'shadow-sm', 'font-bold');
        btn.classList.remove('text-stone-300', 'text-stone-400', 'hover:text-white', 'hover:bg-white/10');
      } else {
        btn.classList.remove('bg-white', 'text-coffee-950', 'shadow-sm', 'font-bold');
        btn.classList.add('text-stone-300', 'hover:text-white');
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
    setTimeout(() => {
      const input = document.getElementById('inputCodigoManual');
      if (input) input.focus();
    }, 100);
  } else if (aba === 'lembretes') {
    atualizarPreviewMensagemLembrete();
  } else if (aba === 'resend_teste') {
    carregarConfiguracoesResendAdmin();
  }

  if (window.lucide) window.lucide.createIcons();
}

// ============================================================================
// CONTROLE DE LIBERAÇÃO DE CERTIFICADOS
// ============================================================================
function atualizarVisualStatusCertificados() {
  const isLiberado = window.LigaDB?.estaoCertificadosLiberados ? window.LigaDB.estaoCertificadosLiberados() : false;
  const texto = document.getElementById('textoStatusCertificados');
  const icon = document.getElementById('iconStatusCertificados');
  const btn = document.getElementById('btnAlternarCertificados');
  const banner = document.getElementById('bannerStatusCertificados');

  if (texto && icon && btn && banner) {
    if (isLiberado) {
      banner.className = 'p-3.5 sm:p-4 bg-emerald-50 border-b border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs';
      icon.className = 'w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0';
      icon.innerHTML = '<i data-lucide="unlock" class="w-4 h-4"></i>';
      texto.innerHTML = 'Certificados de Participação: <span class="text-emerald-700 font-black">✓ LIBERADOS PARA OS ALUNOS</span>';
      btn.className = 'w-full sm:w-auto px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shrink-0';
      btn.innerHTML = '<i data-lucide="lock" class="w-4 h-4"></i><span>Bloquear Certificados Novamente</span>';
    } else {
      banner.className = 'p-3.5 sm:p-4 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs';
      icon.className = 'w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0';
      icon.innerHTML = '<i data-lucide="lock" class="w-4 h-4"></i>';
      texto.innerHTML = 'Certificados de Participação: <span class="text-amber-900 font-bold">🔒 Bloqueados para Assinatura</span>';
      btn.className = 'w-full sm:w-auto px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shrink-0';
      btn.innerHTML = '<i data-lucide="unlock" class="w-4 h-4"></i><span>Liberar Certificados para Participantes</span>';
    }
    if (window.lucide) window.lucide.createIcons();
  }
}

function alternarLiberacaoCertificadosAdmin() {
  const atual = window.LigaDB?.estaoCertificadosLiberados ? window.LigaDB.estaoCertificadosLiberados() : false;
  const novo = !atual;

  if (novo) {
    if (!confirm('Atenção: Deseja realmente LIBERAR as declarações de presença para todos os participantes que tiveram a presença confirmada? Certifique-se de que os certificados já possuem as devidas assinaturas.')) {
      return;
    }
  } else {
    if (!confirm('Deseja BLOQUEAR temporariamente a emissão dos certificados aos participantes?')) {
      return;
    }
  }

  window.LigaDB.alternarLiberacaoCertificados(novo);
  atualizarVisualStatusCertificados();
  carregarInscricoesAdmin();
  if (typeof mostrarToast === 'function') {
    mostrarToast(novo ? 'Certificados liberados para os alunos!' : 'Certificados bloqueados.');
  }

  // Disparo opcional de e-mails de certificado para os presentes
  if (novo) {
    setTimeout(async () => {
      const presentes = (inscricoesCache || []).filter(i => i.presenca_confirmada);
      if (presentes.length > 0) {
        const querEnviar = confirm(`Certificados liberados com sucesso!\n\nDeseja enviar automaticamente o e-mail oficial com o link do Certificado para todos os ${presentes.length} participantes com presença confirmada?`);
        if (querEnviar) {
          if (!window.EmailService || !window.EmailService.isResendConfigurado()) {
            alert('Atenção: A chave do Resend ainda não foi configurada. Acesse a aba "Lembretes" no Painel da Liga para salvar sua chave da API Resend.');
            return;
          }
          let enviados = 0;
          for (const aluno of presentes) {
            try {
              await window.EmailService.enviarEmailCertificado(aluno);
              enviados++;
              await new Promise(r => setTimeout(r, 200));
            } catch (e) {
              console.warn('Erro ao enviar certificado para ' + aluno.email, e);
            }
          }
          alert(`E-mails de certificados enviados para ${enviados} de ${presentes.length} participantes!`);
        }
      }
    }, 300);
  }
}

// Carregar Inscrições
async function carregarInscricoesAdmin() {
  atualizarVisualStatusCertificados();
  carregarConfiguracoesResendAdmin();

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

              <!-- Enviar E-mail via Resend -->
              <button onclick="enviarEmailIndividualAdmin('${item.id}')" title="Enviar E-mail via Resend (Credencial, Lembrete ou Certificado)" class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition">
                <i data-lucide="mail" class="w-4 h-4"></i>
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
    texto: `Olá [NOME]! Tudo bem? Passando para lembrar que falta apenas 1 semana para o *10° Café com Ciência: Os Direitos dos Pacientes na Odontologia* com a Profa. Carolina Diniz.\n\n📅 Data: 30 de Outubro às 15:00\n📍 Local: UniArnaldo - Campus Anchieta (Sala 306)\n🎫 Seu Protocolo de Inscrição: [PROTOCOLO]\n\nAcesse sua credencial com QR Code para entrada no evento:\n[LINK_CREDENCIAL]\n\nNos vemos lá!`
  },
  'vespera': {
    titulo: 'Lembrete: É amanhã!',
    texto: `Oi [NOME]! O grande dia está chegando! Amanhã (30/10) às 15h teremos o *10° Café com Ciência* na UniArnaldo (Sala 306).\n\n⚠️ *Aviso Importante*: Tenha em mãos a sua Credencial com o QR Code para fazer o check-in na portaria:\n[LINK_CREDENCIAL]\n\nTeremos coffee break especial e emissão de certificado oficial após a palestra!`
  },
  'hoje_portaria': {
    titulo: 'Lembrete: É hoje! Portaria aberta',
    texto: `Olá [NOME]! O *10° Café com Ciência* acontece HOJE às 15h00 na Sala 306 da UniArnaldo (Campus Anchieta)!\n\nChegue com 15 minutos de antecedência e apresente seu QR Code na entrada:\n[LINK_CREDENCIAL]\n\nAté logo!`
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

  // Google OAuth Config
  const inputGoogleId = document.getElementById('inputGoogleClientId');
  const badgeGoogle = document.getElementById('badgeStatusConfigGoogle');
  const googleId = window.LigaDB?.getGoogleClientId ? window.LigaDB.getGoogleClientId() : '';

  if (inputGoogleId) inputGoogleId.value = googleId;

  if (badgeGoogle) {
    if (window.LigaDB?.isGoogleConfigured && window.LigaDB.isGoogleConfigured()) {
      badgeGoogle.innerHTML = `<span class="text-emerald-600 font-bold flex items-center gap-1"><i data-lucide="check-circle" class="w-4 h-4"></i> Pop-up Nativo do Google Configurado e Ativo</span>`;
    } else {
      badgeGoogle.innerHTML = `<span class="text-amber-600 font-bold flex items-center gap-1"><i data-lucide="alert-circle" class="w-4 h-4"></i> Pop-up do Google não configurado (clique em Tutorial para ativar)</span>`;
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

function salvarConfiguracaoGoogleAdmin() {
  const input = document.getElementById('inputGoogleClientId');
  const val = input?.value.trim() || '';
  if (val && !val.includes('.apps.googleusercontent.com')) {
    alert('Atenção: o Google Client ID costuma terminar com .apps.googleusercontent.com');
  }
  window.LigaDB.salvarGoogleClientId(val);
  alert('Google Client ID salvo com sucesso!');
  carregarConfiguracoesSupabase();
}

function testarPopupGoogleAdmin() {
  if (typeof window.loginNativoGooglePopup === 'function') {
    window.loginNativoGooglePopup();
  } else {
    alert('Função de pop-up não encontrada.');
  }
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

// ============================================================================
// MODAL DE RESET TOTAL DO BANCO DE DADOS (PROTEGIDO POR SENHA)
// ============================================================================
function abrirModalResetarBanco() {
  const modal = document.getElementById('modalResetBanco');
  const input = document.getElementById('inputSenhaResetBanco');
  const erro = document.getElementById('erroResetBanco');
  const sucesso = document.getElementById('sucessoResetBanco');
  const btn = document.getElementById('btnConfirmarReset');

  if (erro) {
    erro.textContent = '';
    erro.classList.add('hidden');
  }
  if (sucesso) {
    sucesso.textContent = '';
    sucesso.classList.add('hidden');
  }
  if (input) {
    input.value = '';
  }
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i><span>Confirmar e Apagar Tudo</span>';
  }

  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      if (input) input.focus();
    }, 100);
  }
  if (window.lucide) window.lucide.createIcons();
}

function fecharModalResetBanco() {
  const modal = document.getElementById('modalResetBanco');
  if (modal) {
    modal.classList.add('hidden');
  }
}

async function confirmarResetBancoDeDados() {
  const input = document.getElementById('inputSenhaResetBanco');
  const erro = document.getElementById('erroResetBanco');
  const sucesso = document.getElementById('sucessoResetBanco');
  const btn = document.getElementById('btnConfirmarReset');

  const senha = input ? input.value.trim() : '';

  if (!senha) {
    if (erro) {
      erro.textContent = 'Por favor, digite a senha cafe2026 para confirmar.';
      erro.classList.remove('hidden');
    }
    if (input) input.focus();
    return;
  }

  if (senha !== 'cafe2026') {
    if (erro) {
      erro.textContent = 'Senha incorreta! Acesso não autorizado para resetar o banco de dados.';
      erro.classList.remove('hidden');
    }
    if (input) {
      input.value = '';
      input.focus();
    }
    return;
  }

  if (erro) erro.classList.add('hidden');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Apagando banco e comprovantes...</span>';
    if (window.lucide) window.lucide.createIcons();
  }

  try {
    const res = await window.LigaDB.resetarBancoDeDados(senha);

    if (sucesso) {
      sucesso.innerHTML = `
        <div class="flex items-center gap-2">
          <i data-lucide="check-circle" class="w-4 h-4 text-emerald-700"></i>
          <span>Banco limpo com sucesso! ${res.inscricoesApagadas} inscrições e ${res.arquivosApagados} arquivos de comprovantes apagados.</span>
        </div>
      `;
      sucesso.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons();
    }

    // Recarrega lista
    await carregarInscricoesAdmin();

    setTimeout(() => {
      fecharModalResetBanco();
    }, 1800);

  } catch (err) {
    if (erro) {
      if (err.message === 'RLS_DELETE_BLOQUEADO') {
        const sqlCodigo = 'CREATE POLICY "Permitir exclusao de inscricoes" ON public.inscricoes FOR DELETE TO anon, authenticated USING (true);\\nCREATE POLICY "Permitir exclusao de comprovantes" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = \\\'comprovantes\\\');';
        erro.innerHTML = `
          <div class="space-y-2 text-left">
            <p class="font-bold text-red-900 flex items-center gap-1.5">
              <i data-lucide="shield-alert" class="w-4 h-4 text-red-600 shrink-0"></i>
              Permissão de exclusão pendente no Supabase (RLS)
            </p>
            <p class="text-[11px] text-red-800 leading-relaxed">
              O Supabase bloqueou a exclusão porque a regra de permissão <strong>DELETE</strong> precisa ser criada uma vez no <strong>SQL Editor</strong> do Supabase.
            </p>
            <div class="bg-stone-900 text-stone-200 p-2.5 rounded-xl font-mono text-[10px] space-y-1 select-all break-all">
              <div>CREATE POLICY "Permitir exclusao de inscricoes" ON public.inscricoes FOR DELETE TO anon, authenticated USING (true);</div>
              <div>CREATE POLICY "Permitir exclusao de comprovantes" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'comprovantes');</div>
            </div>
            <button type="button" onclick="navigator.clipboard.writeText('${sqlCodigo.replace(/'/g, "\\'")}'); alert('Comando SQL copiado com sucesso! Abra o SQL Editor no painel do Supabase, cole e clique em Run.');" class="w-full py-2 px-3 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copiar Código SQL para o Supabase
            </button>
            <p class="text-[10px] text-stone-500 text-center">Após executar no Supabase, basta clicar em "Confirmar e Apagar" novamente.</p>
          </div>
        `;
      } else {
        erro.textContent = err.message || 'Erro ao tentar apagar dados do banco.';
      }
      erro.classList.remove('hidden');
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i><span>Tentar Novamente</span>';
    }
    if (window.lucide) window.lucide.createIcons();
  }
}

// Limpar dados demo / resetar banco
function limparDadosDemo() {
  abrirModalResetarBanco();
}

// ============================================================================
// GERENCIADOR DE E-MAILS TRANSACIONAIS (RESEND) NO PAINEL ADMIN
// ============================================================================
function carregarConfiguracoesResendAdmin() {
  if (!window.EmailService) return;

  const inputFrom = document.getElementById('inputResendFrom');
  const checkInscricao = document.getElementById('checkEmailAutoInscricao');
  const checkPresenca = document.getElementById('checkEmailAutoPresenca');
  const badgeStatus = document.getElementById('badgeStatusConfigResend');

  if (inputFrom) inputFrom.value = window.EmailService.getResendFrom();
  if (checkInscricao) checkInscricao.checked = window.EmailService.isEmailAutoInscricao();
  if (checkPresenca) checkPresenca.checked = window.EmailService.isEmailAutoPresenca();

  if (badgeStatus) {
    badgeStatus.innerHTML = `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Chave Resend Conectada & Ativa
      </span>
    `;
  }

  if (window.lucide) window.lucide.createIcons();
}

function salvarConfiguracaoResendAdmin() {
  if (!window.EmailService) return;

  const inputFrom = document.getElementById('inputResendFrom');
  const checkInscricao = document.getElementById('checkEmailAutoInscricao');
  const checkPresenca = document.getElementById('checkEmailAutoPresenca');

  const from = inputFrom?.value.trim() || '';
  if (from) window.EmailService.salvarConfigResend(undefined, from);
  window.EmailService.salvarTogglesEmail(checkInscricao?.checked, checkPresenca?.checked);

  if (typeof mostrarToast === 'function') {
    mostrarToast('Configurações de e-mail salvas com sucesso!');
  } else {
    alert('Configurações de e-mail salvas com sucesso!');
  }
  carregarConfiguracoesResendAdmin();
}

async function testarEnvioResendAdmin() {
  if (!window.EmailService) return;

  const selectModelo = document.getElementById('selectModeloTesteEmail');
  const inputEmail = document.getElementById('inputEmailDestinoTeste');
  const btn = document.getElementById('btnTestarEnvioEmail');
  const statusDiv = document.getElementById('statusEnvioTesteEmail');

  const modelo = selectModelo ? selectModelo.value : 'vespera';
  let emailDestino = inputEmail ? inputEmail.value.trim() : '';

  if (!emailDestino) {
    emailDestino = prompt('Digite o e-mail que receberá a mensagem de teste:', 'cadumancia@gmail.com');
    if (inputEmail && emailDestino) inputEmail.value = emailDestino;
  }

  if (!emailDestino || !emailDestino.trim()) {
    alert('Por favor, informe um e-mail de destino válido.');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Disparando e-mail pelo Resend...</span>';
    if (window.lucide) window.lucide.createIcons();
  }

  if (statusDiv) {
    statusDiv.classList.add('hidden');
    statusDiv.className = 'mt-3 p-3.5 rounded-xl text-xs font-medium';
  }

  try {
    const res = await window.EmailService.testarEnvioEmail(emailDestino.trim(), modelo);
    
    if (statusDiv) {
      statusDiv.className = 'mt-3 p-3.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 block';
      statusDiv.innerHTML = `
        <div class="flex items-center gap-2">
          <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600 shrink-0"></i>
          <span><strong>E-mail de teste enviado com sucesso para ${emailDestino}!</strong> Verifique sua caixa de entrada. (ID: ${res?.id || 'OK'})</span>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    } else {
      alert(`Sucesso! E-mail de teste (${modelo}) entregue pelo Resend para ${emailDestino}!\nID do Envio: ${res?.id || 'OK'}`);
    }
  } catch (err) {
    console.error('Erro no envio de teste:', err);
    let errMsg = err.message || 'Falha ao enviar e-mail.';
    let dicaExtra = '';
    
    if (errMsg.includes('validation_error') || errMsg.includes('domain') || errMsg.includes('only send testing emails')) {
      dicaExtra = '<br><span class="text-[11px] text-amber-700 mt-1 block">💡 <strong>Dica do Resend:</strong> No modo de teste gratuito com remetente onboarding@resend.dev, o Resend só entrega mensagens para o e-mail cadastrado na sua conta do Resend.</span>';
    }

    if (statusDiv) {
      statusDiv.className = 'mt-3 p-3.5 rounded-xl text-xs font-medium bg-red-50 text-red-800 border border-red-200 block';
      statusDiv.innerHTML = `
        <div class="flex items-start gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 text-red-600 shrink-0 mt-0.5"></i>
          <div>
            <strong>Falha no envio:</strong> ${errMsg}
            ${dicaExtra}
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    } else {
      alert(`Falha ao enviar e-mail de teste: ${errMsg}`);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i><span>Enviar E-mail de Teste Agora</span>';
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

function abrirPreviaEmailAdmin() {
  if (!window.EmailService) return;
  const selectModelo = document.getElementById('selectModeloTesteEmail');
  const inputEmail = document.getElementById('inputEmailDestinoTeste');
  const modelo = selectModelo ? selectModelo.value : 'vespera';
  const emailDestino = inputEmail ? inputEmail.value.trim() : 'participante@teste.com';

  const previewData = window.EmailService.obterHtmlModeloTeste(modelo, emailDestino);
  
  const modal = document.getElementById('modalPreviaEmail');
  const iframe = document.getElementById('iframePreviaEmail');
  const subjectSpan = document.getElementById('assuntoPreviaEmail');

  if (modal && iframe) {
    if (subjectSpan) subjectSpan.textContent = previewData.subject;
    modal.classList.remove('hidden');
    iframe.srcdoc = previewData.html;
    if (window.lucide) window.lucide.createIcons();
  } else {
    const novaAba = window.open('', '_blank');
    if (novaAba) {
      novaAba.document.write(previewData.html);
      novaAba.document.close();
    }
  }
}

function fecharPreviaEmailAdmin() {
  const modal = document.getElementById('modalPreviaEmail');
  if (modal) modal.classList.add('hidden');
}

// Disparo Individual de E-mail para um Aluno da Tabela
async function enviarEmailIndividualAdmin(id) {
  const aluno = inscricoesCache.find(i => i.id === id);
  if (!aluno) return;

  if (!window.EmailService || !window.EmailService.isResendConfigurado()) {
    alert('A API do Resend ainda não está configurada. Salve sua chave API na seção de configurações do Resend na aba "Lembretes".');
    return;
  }

  const msg = `Selecione qual e-mail deseja disparar para:\n${aluno.nome_completo} (${aluno.email})\n\n` +
    `1: Credencial Oficial com QR Code (Confirmação de Inscrição)\n` +
    `2: Confirmação de Presença (Validação da Portaria)\n` +
    `3: Lembrete do Evento (Conforme modelo selecionado)\n` +
    `4: Certificado Oficial de 4 Horas\n\n` +
    `Digite o número da opção (1, 2, 3 ou 4):`;

  const opcao = prompt(msg, '1');
  if (!opcao) return;

  try {
    if (opcao === '1') {
      await window.EmailService.enviarEmailInscricao(aluno);
      alert(`E-mail com a Credencial enviado com sucesso para ${aluno.email}!`);
    } else if (opcao === '2') {
      await window.EmailService.enviarEmailPresencaConfirmada(aluno);
      alert(`E-mail de confirmação de presença enviado com sucesso para ${aluno.email}!`);
    } else if (opcao === '3') {
      const tipo = document.getElementById('selectTipoLembrete')?.value || 'vespera';
      await window.EmailService.enviarEmailLembrete(aluno, tipo);
      alert(`E-mail de lembrete enviado com sucesso para ${aluno.email}!`);
    } else if (opcao === '4') {
      await window.EmailService.enviarEmailCertificado(aluno);
      alert(`E-mail com o Certificado Oficial enviado com sucesso para ${aluno.email}!`);
    } else {
      alert('Opção inválida.');
    }
  } catch (err) {
    alert('Erro ao enviar e-mail: ' + err.message);
  }
}

// Disparo em Lote de E-mails via Resend
async function dispararEmailsEmLoteResend() {
  if (!inscricoesCache || inscricoesCache.length === 0) {
    alert('Nenhum inscrito na lista para enviar e-mails.');
    return;
  }

  if (!window.EmailService || !window.EmailService.isResendConfigurado()) {
    alert('A chave da API do Resend ainda não foi configurada. Insira sua chave API no formulário de configurações do Resend abaixo.');
    return;
  }

  const select = document.getElementById('selectTipoLembrete');
  const tipo = select?.value || 'vespera';

  const confirmMsg = `Deseja enviar e-mails via Resend para todos os ${inscricoesCache.length} inscritos?\n\nModelo selecionado: ${tipo.toUpperCase()}`;
  if (!confirm(confirmMsg)) return;

  let enviados = 0;
  let erros = 0;

  for (let i = 0; i < inscricoesCache.length; i++) {
    const aluno = inscricoesCache[i];
    if (aluno && aluno.email) {
      try {
        if (tipo === 'certificado') {
          if (aluno.presenca_confirmada) {
            await window.EmailService.enviarEmailCertificado(aluno);
            enviados++;
          }
        } else {
          await window.EmailService.enviarEmailLembrete(aluno, tipo);
          enviados++;
        }
        await new Promise(r => setTimeout(r, 200)); // Intervalo suave para respeitar limites do Resend
      } catch (e) {
        console.warn(`Erro no envio para ${aluno.email}:`, e);
        erros++;
      }
    }
  }

  alert(`Disparo concluído!\n\n✓ ${enviados} e-mails enviados com sucesso pelo Resend.\n${erros > 0 ? `⚠️ ${erros} falhas de envio.` : ''}`);
}

window.salvarConfiguracaoGoogleAdmin = salvarConfiguracaoGoogleAdmin;
window.testarPopupGoogleAdmin = testarPopupGoogleAdmin;
window.limparDadosDemo = limparDadosDemo;
window.abrirModalResetarBanco = abrirModalResetarBanco;
window.fecharModalResetBanco = fecharModalResetBanco;
window.confirmarResetBancoDeDados = confirmarResetBancoDeDados;
window.exportarParaCSV = exportarParaCSV;
window.salvarConfiguracoesSupabase = salvarConfiguracoesSupabase;
window.alternarLiberacaoCertificadosAdmin = alternarLiberacaoCertificadosAdmin;
window.atualizarVisualStatusCertificados = atualizarVisualStatusCertificados;
window.carregarConfiguracoesResendAdmin = carregarConfiguracoesResendAdmin;
window.salvarConfiguracaoResendAdmin = salvarConfiguracaoResendAdmin;
window.testarEnvioResendAdmin = testarEnvioResendAdmin;
window.enviarEmailIndividualAdmin = enviarEmailIndividualAdmin;
window.dispararEmailsEmLoteResend = dispararEmailsEmLoteResend;
window.abrirPreviaEmailAdmin = abrirPreviaEmailAdmin;
window.fecharPreviaEmailAdmin = fecharPreviaEmailAdmin;


