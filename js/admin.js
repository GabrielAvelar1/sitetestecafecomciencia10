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
  const abas = ['inscricoes', 'portaria', 'lembretes', 'resend_teste', 'certificados'];
  
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
    carregarHistoricoEmailsResend();
  } else if (aba === 'certificados') {
    inicializarEstudioCertificados();
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


// ============================================================================
// CONTROLE DE STATUS DAS INSCRIÇÕES (ENCERRAR / REABRIR)
// ============================================================================
function obterEdicaoAtivaAdmin() {
  if (typeof edicaoFiltroAdmin !== 'undefined') {
    if (edicaoFiltroAdmin === '12') return 12;
    if (edicaoFiltroAdmin === '11') return 11;
    if (edicaoFiltroAdmin === '10') return 10;
  }
  return 10;
}

function atualizarVisualStatusInscricoes() {
  const edicao = obterEdicaoAtivaAdmin();
  const isEncerrada = window.LigaDB?.estaoInscricoesEncerradas ? window.LigaDB.estaoInscricoesEncerradas(edicao) : false;

  const banner = document.getElementById('bannerStatusInscricoes');
  const icon = document.getElementById('iconStatusInscricoes');
  const texto = document.getElementById('textoStatusInscricoes');
  const desc = document.getElementById('descStatusInscricoes');
  const btn = document.getElementById('btnAlternarInscricoes');
  const labelBtn = document.getElementById('labelBtnAlternarInscricoes');

  if (banner && texto && btn) {
    if (isEncerrada) {
      banner.className = 'p-4 sm:p-5 bg-red-50 rounded-2xl border-2 border-red-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs';
      if (icon) {
        icon.className = 'w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0';
        icon.innerHTML = '<i data-lucide="lock" class="w-5 h-5"></i>';
      }
      texto.innerHTML = `Inscrições da ${edicao}ª Edição: <span class="text-red-700 font-black">🔴 ENCERRADAS (Bloqueadas no Site)</span>`;
      if (desc) {
        desc.textContent = `Novos cadastros e pagamentos Pix para o ${edicao}° Café estão bloqueados no site para visitantes.`;
      }
      btn.className = 'w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm shrink-0 active:scale-95';
      btn.innerHTML = `<i data-lucide="unlock" class="w-4 h-4"></i><span>Reabrir Inscrições do ${edicao}° Café</span>`;
    } else {
      banner.className = 'p-4 sm:p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs';
      if (icon) {
        icon.className = 'w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0';
        icon.innerHTML = '<i data-lucide="check-circle" class="w-5 h-5"></i>';
      }
      texto.innerHTML = `Inscrições da ${edicao}ª Edição: <span class="text-emerald-700 font-black">🟢 ABERTAS NO SITE</span>`;
      if (desc) {
        desc.textContent = `O formulário de inscrição e o pagamento Pix estão ativos e aceitando novos participantes no site.`;
      }
      btn.className = 'w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm shrink-0 active:scale-95';
      btn.innerHTML = `<i data-lucide="lock" class="w-4 h-4"></i><span>Encerrar Inscrições do ${edicao}° Café</span>`;
    }
    if (window.lucide) window.lucide.createIcons();
  }
}

async function alternarInscricoesAdmin() {
  const edicao = obterEdicaoAtivaAdmin();
  const isEncerrada = window.LigaDB?.estaoInscricoesEncerradas ? window.LigaDB.estaoInscricoesEncerradas(edicao) : false;
  const novoStatusEncerrada = !isEncerrada;

  if (novoStatusEncerrada) {
    const confirmMsg = `⚠️ ATENÇÃO: Deseja realmente ENCERRAR as inscrições do ${edicao}° Café com Ciência?\n\nIsso bloqueará novos cadastros e pagamentos Pix no site imediatamente para esta edição.`;
    if (!confirm(confirmMsg)) return;
  } else {
    const confirmMsg = `Deseja REABRIR as inscrições do ${edicao}° Café com Ciência?\n\nO formulário e o Pix de R$ 10,00 voltarão a aceitar cadastros no site.`;
    if (!confirm(confirmMsg)) return;
  }

  if (window.LigaDB?.alternarInscricoesEncerradas) {
    await window.LigaDB.alternarInscricoesEncerradas(edicao, novoStatusEncerrada);
  }

  atualizarVisualStatusInscricoes();
  if (typeof mostrarToast === 'function') {
    mostrarToast(novoStatusEncerrada ? `Inscrições do ${edicao}° Café encerradas!` : `Inscrições do ${edicao}° Café reabertas!`);
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
  if (window.LigaDB?.obterConfiguracoesSistema) {
    window.LigaDB.obterConfiguracoesSistema().then(() => {
      atualizarVisualStatusInscricoes();
      atualizarVisualStatusCertificados();
    }).catch(() => {
      atualizarVisualStatusInscricoes();
    });
  } else {
    atualizarVisualStatusInscricoes();
  }
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

let edicaoFiltroAdmin = '10'; // '10', '11', '12' ou 'todas'

function selecionarEdicaoAdmin(edicao) {
  edicaoFiltroAdmin = edicao;

  const btn10 = document.getElementById('btnEdicao_10');
  const btn11 = document.getElementById('btnEdicao_11');
  const btn12 = document.getElementById('btnEdicao_12');
  const btnTodas = document.getElementById('btnEdicao_todas');
  const nomeLabel = document.getElementById('adminNomeEdicaoSelecionada');

  [btn10, btn11, btn12, btnTodas].forEach(b => {
    if (b) {
      b.classList.remove('bg-white', 'text-coffee-950', 'shadow-xs', 'font-bold');
      b.classList.add('text-stone-600', 'font-semibold');
    }
  });

  if (edicao === '10' && btn10) {
    btn10.classList.add('bg-white', 'text-coffee-950', 'shadow-xs', 'font-bold');
    btn10.classList.remove('text-stone-600', 'font-semibold');
    if (nomeLabel) nomeLabel.textContent = '10° Café com Ciência (Profa. Carolina Diniz · 30/10)';
  } else if (edicao === '11' && btn11) {
    btn11.classList.add('bg-white', 'text-coffee-950', 'shadow-xs', 'font-bold');
    btn11.classList.remove('text-stone-600', 'font-semibold');
    if (nomeLabel) nomeLabel.textContent = '11° Café com Ciência (Prof. Dr. Henrique Pretti · 13/11)';
  } else if (edicao === '12' && btn12) {
    btn12.classList.add('bg-white', 'text-coffee-950', 'shadow-xs', 'font-bold');
    btn12.classList.remove('text-stone-600', 'font-semibold');
    if (nomeLabel) nomeLabel.textContent = '12° Café com Ciência (Dra. Thaissa Calab · 18/11)';
  } else if (btnTodas) {
    btnTodas.classList.add('bg-white', 'text-coffee-950', 'shadow-xs', 'font-bold');
    btnTodas.classList.remove('text-stone-600', 'font-semibold');
    if (nomeLabel) nomeLabel.textContent = 'Todas as Palestras e Edições Cadastradas';
  }

  atualizarMetricasPorEdicao();
  atualizarVisualStatusInscricoes();
  filtrarInscricoesTabelaAdmin();
}

function obterInscricoesFiltradasPorEdicao(lista = inscricoesCache) {
  if (!lista) return [];
  if (edicaoFiltroAdmin === '12') {
    return lista.filter(i => (i.protocolo && i.protocolo.startsWith('CC12-')) || i.edicao === 12);
  } else if (edicaoFiltroAdmin === '11') {
    return lista.filter(i => (i.protocolo && i.protocolo.startsWith('CC11-')) || i.edicao === 11);
  } else if (edicaoFiltroAdmin === '10') {
    return lista.filter(i => {
      const proto = (i.protocolo || '').toUpperCase();
      const ed = parseInt(i.edicao, 10);
      return proto.startsWith('CC10-') || ed === 10 || (!proto.startsWith('CC11-') && !proto.startsWith('CC12-') && ed !== 11 && ed !== 12);
    });
  }
  return lista;
}

function atualizarMetricasPorEdicao() {
  const countBadge = document.getElementById('adminTotalInscricoes');
  const totalArrecadado = document.getElementById('adminTotalArrecadado');
  const totalPendentes = document.getElementById('adminTotalPendentes');
  const totalPresencas = document.getElementById('adminTotalPresencas');

  const badge10 = document.getElementById('badgeContagemEdicao10');
  const badge11 = document.getElementById('badgeContagemEdicao11');
  const badge12 = document.getElementById('badgeContagemEdicao12');
  const badgeTodas = document.getElementById('badgeContagemEdicaoTodas');

  if (inscricoesCache) {
    const lista10 = inscricoesCache.filter(i => {
      const proto = (i.protocolo || '').toUpperCase();
      const ed = parseInt(i.edicao, 10);
      return proto.startsWith('CC10-') || ed === 10 || (!proto.startsWith('CC11-') && !proto.startsWith('CC12-') && ed !== 11 && ed !== 12);
    });
    const lista11 = inscricoesCache.filter(i => (i.protocolo && i.protocolo.startsWith('CC11-')) || i.edicao === 11);
    const lista12 = inscricoesCache.filter(i => (i.protocolo && i.protocolo.startsWith('CC12-')) || i.edicao === 12);

    if (badge10) badge10.textContent = `${lista10.length}`;
    if (badge11) badge11.textContent = `${lista11.length}`;
    if (badge12) badge12.textContent = `${lista12.length}`;
    if (badgeTodas) badgeTodas.textContent = `${inscricoesCache.length}`;

    const listaAtual = obterInscricoesFiltradasPorEdicao(inscricoesCache);
    const qtdInscritos = listaAtual.length;
    const qtdPresentes = listaAtual.filter(i => i.presenca_confirmada).length;
    const qtdPendentes = listaAtual.filter(i => i.status_pagamento === 'pendente' || !i.status_pagamento).length;
    const totalValor = listaAtual.filter(i => i.status_pagamento === 'aprovado').reduce((acc, curr) => acc + (parseFloat(curr.valor) || 10), 0);

    if (countBadge) countBadge.textContent = `${qtdInscritos} inscritos`;
    if (totalPresencas) totalPresencas.textContent = `${qtdPresentes} presenças`;
    if (totalPendentes) totalPendentes.textContent = `${qtdPendentes} pendentes`;
    if (totalArrecadado) totalArrecadado.textContent = `R$ ${totalValor.toFixed(2).replace('.', ',')}`;
  }
}

// Carregar Inscrições
async function carregarInscricoesAdmin() {
  atualizarVisualStatusCertificados();
  carregarConfiguracoesResendAdmin();

  const container = document.getElementById('adminInscricoesList');
  const statusAvisos = document.getElementById('adminStatusDb');

  if (!container) return;

  container.innerHTML = `
    <tr>
      <td colspan="9" class="px-6 py-8 text-center text-stone-500">
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
        <span class="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold whitespace-nowrap">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span>Supabase Online</span>
        </span>
      `;
    } else {
      statusAvisos.innerHTML = `
        <button onclick="trocarAbaAdmin('config')" class="inline-flex items-center gap-1.5 text-xs text-amber-300 font-semibold hover:underline whitespace-nowrap" title="Clique para configurar suas credenciais do Supabase">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
          <span>Modo Local</span>
        </button>
      `;
    }
  }

  try {
    inscricoesCache = await window.LigaDB.listarInscricoes();

    atualizarMetricasPorEdicao();
    if (typeof filtrarInscricoesTabelaAdmin === 'function') {
      filtrarInscricoesTabelaAdmin();
    }
  } catch (err) {
    console.error('Erro ao listar:', err);
    container.innerHTML = `
      <tr>
        <td colspan="9" class="px-6 py-6 text-center text-red-600 text-sm">
          Erro ao carregar inscrições. Verifique o console ou a conexão com o Supabase.
        </td>
      </tr>
    `;
  }
}

function renderizarLinhasTabelaAdmin(lista) {
  const container = document.getElementById('adminInscricoesList');
  if (!container) return;

  if (!lista || lista.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="9" class="px-6 py-12 text-center text-stone-400">
          <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 text-stone-300"></i>
          <p class="font-medium text-stone-600">Nenhuma inscrição encontrada.</p>
          <p class="text-xs text-stone-400 mt-1">Verifique os filtros de pesquisa ou aguarde novos participantes.</p>
        </td>
      </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = lista.map(item => {
    const whatsappClean = (item.telefone || '').replace(/\D/g, '');
    const instituicaoNome = window.LigaDB?.extrairInstituicaoAluno ? window.LigaDB.extrairInstituicaoAluno(item) : (item.instituicao || 'Faculdade Arnaldo');
    const isArnaldo = instituicaoNome.toLowerCase().includes('arnaldo');

    const protoUpper = (item.protocolo || '').toUpperCase();
    const edNum = parseInt(item.edicao, 10);
    const isEdicao12 = protoUpper.startsWith('CC12-') || edNum === 12;
    const isEdicao11 = protoUpper.startsWith('CC11-') || edNum === 11;
    const edicaoBadge = isEdicao12
      ? `<span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300" title="12° Café com Ciência (Dra. Thaissa Calab · 18/11)">12° Café</span>`
      : (isEdicao11
        ? `<span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300" title="11° Café com Ciência (Prof. Dr. Henrique Pretti · 13/11)">11° Café</span>`
        : `<span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300" title="10° Café com Ciência (Profa. Carolina Diniz · 30/10)">10° Café</span>`);

    const instituicaoBadge = isArnaldo
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200" title="Aluno(a) Faculdade Arnaldo">
           <i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-amber-700"></i>
           UniArnaldo
         </span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200" title="Instituição: ${instituicaoNome}">
           <i data-lucide="building-2" class="w-3.5 h-3.5 text-blue-700"></i>
           ${instituicaoNome}
         </span>`;
    
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

    // Botão Certificado Oficial com Acesso Rápido ao Editor
    const certificadoBtn = item.presenca_confirmada
      ? `<div class="inline-flex items-center gap-1">
           <a href="certificados.html?protocolo=${item.protocolo}" target="_blank" class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition" title="Abrir certificado oficial">
             <i data-lucide="award" class="w-3.5 h-3.5 text-blue-600"></i> Certificado
           </a>
           <button onclick="abrirEditorCertificadoParaAluno('${item.protocolo}')" class="p-1 rounded-lg text-amber-700 hover:bg-amber-100 transition" title="Editar certificado deste aluno antes de emitir">
             <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
           </button>
         </div>`
      : `<button onclick="abrirEditorCertificadoParaAluno('${item.protocolo}')" class="text-xs text-stone-400 hover:text-stone-700 underline" title="Gerar ou editar declaração personalizada">Personalizar</button>`;

    return `
      <tr class="border-b border-stone-100 hover:bg-stone-50 transition-colors">
        <td class="px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="font-bold text-stone-900">${item.nome_completo}</span>
            ${edicaoBadge}
          </div>
          <div class="text-[11px] font-mono text-coffee-700">${item.protocolo || '-'}</div>
        </td>
        <td class="px-4 py-3 whitespace-nowrap">${instituicaoBadge}</td>
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
}

function filtrarInscricoesTabelaAdmin() {
  const inputBusca = document.getElementById('inputBuscaInscritosAdmin');
  const selectStatus = document.getElementById('selectFiltroStatusAdmin');
  const termo = (inputBusca?.value || '').toLowerCase().trim();
  const status = selectStatus?.value || 'todos';

  if (!inscricoesCache) return;

  // Filtra por edição selecionada
  const listaPorEdicao = obterInscricoesFiltradasPorEdicao(inscricoesCache);

  const filtrados = listaPorEdicao.filter(item => {
    const inst = (window.LigaDB?.extrairInstituicaoAluno ? window.LigaDB.extrairInstituicaoAluno(item) : (item.instituicao || 'Faculdade Arnaldo')).toLowerCase();
    const nome = (item.nome_completo || '').toLowerCase();
    const email = (item.email || '').toLowerCase();
    const prot = (item.protocolo || '').toLowerCase();
    const tel = (item.telefone || '').replace(/\D/g, '');

    const bateTexto = !termo || nome.includes(termo) || email.includes(termo) || prot.includes(termo) || tel.includes(termo) || inst.includes(termo);

    let bateStatus = true;
    if (status === 'aprovados') {
      bateStatus = item.status_pagamento === 'aprovado';
    } else if (status === 'pendentes') {
      bateStatus = item.status_pagamento === 'pendente' || !item.status_pagamento;
    } else if (status === 'presentes') {
      bateStatus = Boolean(item.presenca_confirmada);
    }

    return bateTexto && bateStatus;
  });

  renderizarLinhasTabelaAdmin(filtrados);
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
// MODAL DE CREDENCIAL COM QR CODE (PAINEL ADMIN)
// ============================================================================
async function abrirCredencialPorProtocolo(protocolo) {
  if (!protocolo) return;
  
  let aluno = (inscricoesCache || []).find(i => i.protocolo === protocolo);
  if (!aluno && window.LigaDB?.buscarInscricao) {
    try {
      aluno = await window.LigaDB.buscarInscricao(protocolo);
    } catch (e) {
      console.warn('Erro ao buscar inscrição:', e);
    }
  }

  if (!aluno) {
    alert('Inscrição não encontrada para o protocolo: ' + protocolo);
    return;
  }

  exibirCredencialAdmin(aluno);
}

function exibirCredencialAdmin(aluno) {
  const modal = document.getElementById('modalCredencialAdmin');
  const target = document.getElementById('conteudoCredencialAdmin');
  if (!modal || !target || !aluno) return;

  const proto = (aluno.protocolo || '').toUpperCase();
  const edNum = parseInt(aluno.edicao, 10);
  const is12 = proto.startsWith('CC12-') || edNum === 12;
  const is11 = proto.startsWith('CC11-') || edNum === 11;
  const edicao = is12 ? 12 : (is11 ? 11 : 10);

  const instNome = window.LigaDB?.extrairInstituicaoAluno ? window.LigaDB.extrairInstituicaoAluno(aluno) : (aluno.instituicao || 'Faculdade Arnaldo');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(aluno.protocolo)}&color=2B1810&bgcolor=FFFFFF&margin=2`;
  const zapClean = (aluno.telefone || '').replace(/\D/g, '');

  target.innerHTML = `
    <div class="space-y-4 text-center">
      <!-- Topo com badges -->
      <div class="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-stone-100">
        <span class="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${edicao >= 11 ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-coffee-100 text-coffee-950 border border-coffee-300'}">
          ${edicao}ª Edição
        </span>
        <span class="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 border border-stone-200">
          ${aluno.protocolo}
        </span>
      </div>

      <!-- Dados do Participante -->
      <div class="space-y-1">
        <h3 class="text-xl font-black text-coffee-950 leading-tight">${aluno.nome_completo}</h3>
        <p class="text-xs text-stone-500 font-mono">${aluno.email}</p>
        <div class="pt-1.5 flex items-center justify-center gap-2 flex-wrap">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
            <i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-stone-600"></i>
            ${instNome}
          </span>
          ${zapClean ? `
            <a href="https://wa.me/55${zapClean}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition">
              <i data-lucide="phone" class="w-3.5 h-3.5 text-emerald-600"></i>
              ${aluno.telefone}
            </a>
          ` : ''}
        </div>
      </div>

      <!-- Status Pagamento & Presença -->
      <div class="grid grid-cols-2 gap-2 text-xs pt-1 text-left">
        <div class="p-2.5 rounded-xl border ${aluno.status_pagamento === 'aprovado' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}">
          <span class="block text-[10px] uppercase font-bold text-stone-500">Pagamento Pix</span>
          <span class="font-bold flex items-center gap-1 mt-0.5">
            <i data-lucide="${aluno.status_pagamento === 'aprovado' ? 'check-circle' : 'clock'}" class="w-3.5 h-3.5 ${aluno.status_pagamento === 'aprovado' ? 'text-emerald-600' : 'text-amber-600'}"></i>
            ${aluno.status_pagamento === 'aprovado' ? 'Aprovado (R$ 10)' : 'Pendente'}
          </span>
        </div>
        <div class="p-2.5 rounded-xl border ${aluno.presenca_confirmada ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-stone-50 border-stone-200 text-stone-700'}">
          <span class="block text-[10px] uppercase font-bold text-stone-500">Status Check-in</span>
          <span class="font-bold flex items-center gap-1 mt-0.5">
            <i data-lucide="${aluno.presenca_confirmada ? 'check-check' : 'user-x'}" class="w-3.5 h-3.5 ${aluno.presenca_confirmada ? 'text-blue-600' : 'text-stone-400'}"></i>
            ${aluno.presenca_confirmada ? 'Presença Confirmada' : 'Não Chegou'}
          </span>
        </div>
      </div>

      <!-- QR Code Oficial -->
      <div class="bg-coffee-50/70 p-4 rounded-2xl border border-coffee-200 flex flex-col items-center justify-center my-1">
        <div class="p-2.5 bg-white rounded-xl shadow-md border border-coffee-200 mb-2">
          <img src="${qrUrl}" alt="QR Code Oficial" class="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg mx-auto" />
        </div>
        <span class="text-xs font-mono font-bold text-coffee-950">${aluno.protocolo}</span>
        <p class="text-[11px] text-stone-500 mt-0.5">Apresente este QR Code na portaria da Sala 306</p>
      </div>

      <!-- Botões de Ação Administrativa -->
      <div class="flex items-center gap-2 pt-2">
        ${!aluno.presenca_confirmada ? `
          <button 
            type="button"
            onclick="validarPresencaAdmin('${aluno.protocolo}');" 
            class="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <i data-lucide="check-check" class="w-4 h-4"></i>
            <span>Confirmar Presença</span>
          </button>
        ` : `
          <span class="flex-1 py-2 px-3 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
            <i data-lucide="award" class="w-4 h-4 text-emerald-600"></i>
            <span>Presença Já Validada</span>
          </span>
        `}

        <button 
          type="button"
          onclick="fecharCredencialModalAdmin();" 
          class="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition"
        >
          Fechar
        </button>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  modal.classList.remove('hidden');
}

function fecharCredencialModalAdmin() {
  const modal = document.getElementById('modalCredencialAdmin');
  if (modal) modal.classList.add('hidden');
}

async function validarPresencaAdmin(protocolo) {
  if (!protocolo) return;
  if (!confirm(`Deseja confirmar a presença do participante (${protocolo}) no evento agora?`)) return;

  try {
    const res = await window.LigaDB.validarPresencaPorQRCode(protocolo, 'Painel da Liga');
    alert(res.jaConfirmado ? res.mensagem : `Presença confirmada com sucesso para ${res.aluno.nome_completo}!`);
    fecharCredencialModalAdmin();
    carregarInscricoesAdmin();
  } catch (err) {
    alert('Erro ao confirmar presença: ' + err.message);
  }
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
  'mudanca_data': {
    titulo: 'Comunicado: Alteração de Data (18/11)',
    texto: `Olá [NOME]! Informamos que a data do *11° Café com Ciência* com a Dra. Thaissa Calab foi alterada para *18 de Novembro às 16:00 horas* (UniArnaldo - Campus Anchieta, Sala 306).\n\nSua inscrição e vaga continuam *100% garantidas* com o mesmo protocolo:\n[LINK_CREDENCIAL]\n\nContamos com sua presença!`
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

  const cabecalhos = ['Protocolo', 'Nome Completo', 'Faculdade / Instituição', 'E-mail', 'Telefone', 'Status Pagamento', 'Presenca Confirmada', 'Horario Check-in', 'Codigo Certificado', 'Data Inscricao'];
  const linhas = inscricoesCache.map(i => {
    const inst = window.LigaDB?.extrairInstituicaoAluno ? window.LigaDB.extrairInstituicaoAluno(i) : (i.instituicao || 'Faculdade Arnaldo');
    return [
      `"${i.protocolo || ''}"`,
      `"${i.nome_completo.replace(/"/g, '""')}"`,
      `"${inst.replace(/"/g, '""')}"`,
      `"${i.email}"`,
      `"${i.telefone}"`,
      `"${i.status_pagamento || 'pendente'}"`,
      `"${i.presenca_confirmada ? 'SIM' : 'NÃO'}"`,
      `"${i.presenca_horario ? new Date(i.presenca_horario).toLocaleString('pt-BR') : '-'}"`,
      `"${i.certificado_codigo || '-'}"`,
      `"${new Date(i.created_at).toLocaleString('pt-BR')}"`
    ];
  });

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

  carregarConfiguracoesGmailAdmin();

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
    emailDestino = prompt('Digite o e-mail que receberá a mensagem de teste:', 'cafecomcienciaresend@gmail.com');
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
    const edicaoParaTeste = (typeof edicaoFiltroAdmin !== 'undefined' && edicaoFiltroAdmin === '12') ? 12 : ((typeof edicaoFiltroAdmin !== 'undefined' && edicaoFiltroAdmin === '11') ? 11 : 10);
    const res = await window.EmailService.testarEnvioEmail(emailDestino.trim(), modelo, edicaoParaTeste);
    
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

  const edicaoParaTeste = (typeof edicaoFiltroAdmin !== 'undefined' && edicaoFiltroAdmin === '12') ? 12 : ((typeof edicaoFiltroAdmin !== 'undefined' && edicaoFiltroAdmin === '11') ? 11 : 10);
  const previewData = window.EmailService.obterHtmlModeloTeste(modelo, emailDestino, edicaoParaTeste);
  
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

/**
 * Consulta e exibe o histórico de e-mails disparados via Resend
 */
async function carregarHistoricoEmailsResend() {
  const tbody = document.getElementById('listaHistoricoEmailsResend');
  const countBadge = document.getElementById('totalEmailsEnviadosResend');
  const btnAtualizar = document.getElementById('btnAtualizarHistoricoEmails');

  if (!tbody) return;

  if (btnAtualizar) {
    btnAtualizar.disabled = true;
    btnAtualizar.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>Carregando...</span>';
    if (window.lucide) window.lucide.createIcons();
  }

  try {
    const res = await window.EmailService.listarEmailsEnviados();
    const emails = res?.data || [];

    if (countBadge) {
      countBadge.textContent = `${emails.length} e-mail${emails.length === 1 ? '' : 's'} disparado${emails.length === 1 ? '' : 's'}`;
    }

    if (emails.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="px-4 py-8 text-center text-xs text-stone-400">
            Nenhum e-mail registrado recentemente no Resend. Faça um envio de teste acima!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = emails.map(email => {
      const dataFormatada = email.created_at ? new Date(email.created_at).toLocaleString('pt-BR') : '-';
      const destinatario = Array.isArray(email.to) ? email.to.join(', ') : (email.to || '-');
      
      let statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">Enviado</span>';
      if (email.last_event === 'delivered') {
        statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">✓ Entregue</span>';
      } else if (email.last_event === 'bounced') {
        statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">✕ Erro (Bounced)</span>';
      } else if (email.last_event === 'complained') {
        statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">Spam</span>';
      }

      return `
        <tr class="hover:bg-stone-50/80 transition text-xs border-b border-stone-100">
          <td class="px-4 py-3 font-semibold text-stone-900">${destinatario}</td>
          <td class="px-4 py-3 text-stone-700 max-w-xs truncate" title="${email.subject || ''}">${email.subject || '-'}</td>
          <td class="px-4 py-3 text-center whitespace-nowrap">${statusBadge}</td>
          <td class="px-4 py-3 text-stone-500 whitespace-nowrap text-center">${dataFormatada}</td>
          <td class="px-4 py-3 text-right font-mono text-[10px] text-stone-400 select-all">${email.id ? email.id.slice(0, 13) + '...' : '-'}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Erro ao listar e-mails:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-6 text-center text-xs text-stone-500">
          Não foi possível carregar o histórico agora (${err.message}).<br>
          Você pode acompanhar os relatórios diretamente em <a href="https://resend.com/emails" target="_blank" class="text-blue-600 underline font-bold">resend.com/emails</a>.
        </td>
      </tr>
    `;
  } finally {
    if (btnAtualizar) {
      btnAtualizar.disabled = false;
      btnAtualizar.innerHTML = '<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i><span>Atualizar Histórico</span>';
      if (window.lucide) window.lucide.createIcons();
    }
  }
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
    `4: Certificado Oficial de Participação (4 Horas)\n` +
    `5: Certificado de Organizador (6 Horas - Membro da Liga)\n` +
    `6: Ambos os Certificados (Participação + Organizador - 2 Certificados)\n` +
    `7: Comunicado de Alteração de Data (18/11)\n\n` +
    `Digite o número da opção (1 a 7):`;

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
      await window.EmailService.enviarEmailCertificado(aluno, 'participacao');
      alert(`E-mail com o Certificado de Participação enviado com sucesso para ${aluno.email}!`);
    } else if (opcao === '5') {
      await window.EmailService.enviarEmailCertificado(aluno, 'organizador');
      alert(`E-mail com o Certificado de Organizador enviado com sucesso para ${aluno.email}!`);
    } else if (opcao === '6') {
      await window.EmailService.enviarEmailCertificado(aluno, 'ambos');
      alert(`E-mail com os 2 Certificados (Participação + Organizador) enviado com sucesso para ${aluno.email}!`);
    } else if (opcao === '7') {
      await window.EmailService.enviarEmailMudancaData(aluno);
      alert(`Comunicado de alteração de data enviado com sucesso para ${aluno.email}!`);
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
        } else if (tipo === 'mudanca_data') {
          await window.EmailService.enviarEmailMudancaData(aluno);
          enviados++;
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

  alert(`Disparo concluído!\n\n✓ ${enviados} e-mails enviados com sucesso.\n${erros > 0 ? `⚠️ ${erros} falhas de envio.` : ''}`);
  carregarHistoricoEmailsResend();
}

/**
 * Reenvia a credencial oficial com QR Code para todos os inscritos já cadastrados
 */
async function reenviarCredenciaisTodosInscritosAdmin() {
  if (!inscricoesCache || inscricoesCache.length === 0) {
    alert('Nenhum inscrito carregado na lista para enviar credenciais.');
    return;
  }

  const confirmMsg = `Atenção: Deseja reenviar o e-mail oficial com a Credencial e o QR Code para todos os ${inscricoesCache.length} participantes já inscritos?`;
  if (!confirm(confirmMsg)) return;

  const btn = document.getElementById('btnReenviarCredenciaisLote');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Disparando credenciais...</span>';
    if (window.lucide) window.lucide.createIcons();
  }

  let enviados = 0;
  let erros = 0;
  let ultimoErro = '';

  for (let i = 0; i < inscricoesCache.length; i++) {
    const aluno = inscricoesCache[i];
    if (aluno && aluno.email) {
      try {
        await window.EmailService.enviarEmailInscricao(aluno);
        enviados++;
        await new Promise(r => setTimeout(r, 400));
      } catch (err) {
        console.warn(`Erro no envio para ${aluno.email}:`, err);
        erros++;
        ultimoErro = err.message;
      }
    }
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="mail-check" class="w-4 h-4"></i><span>Reenviar Credencial com QR Code para Todos os 13 Inscritos</span>';
    if (window.lucide) window.lucide.createIcons();
  }

  if (enviados > 0) {
    alert(`Envio concluído com sucesso!\n\n✓ ${enviados} credenciais enviadas aos inscritos!${erros > 0 ? `\n⚠️ ${erros} falhas: ${ultimoErro}` : ''}`);
    carregarHistoricoEmailsResend();
  } else {
    alert(`Nenhum e-mail pôde ser entregue:\n\n${ultimoErro || 'Verifique se as credenciais do Gmail ou do Resend estão preenchidas.'}`);
  }
}

function carregarConfiguracoesGmailAdmin() {
  if (!window.EmailService) return;
  const inputUser = document.getElementById('inputGmailUser');
  const inputPass = document.getElementById('inputGmailAppPass');
  const badgeStatus = document.getElementById('badgeStatusConfigGmail');

  if (inputUser) inputUser.value = window.EmailService.getGmailUser();
  if (inputPass) inputPass.value = window.EmailService.getGmailAppPassword();

  if (badgeStatus) {
    if (window.EmailService.isGmailConfigurado()) {
      badgeStatus.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Gmail Conectado & Operacional
        </span>
      `;
    } else {
      badgeStatus.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          Aguardando Senha de App
        </span>
      `;
    }
  }

  if (window.lucide) window.lucide.createIcons();
}

function salvarConfiguracaoGmailAdmin() {
  if (!window.EmailService) return;
  const inputUser = document.getElementById('inputGmailUser');
  const inputPass = document.getElementById('inputGmailAppPass');

  const user = inputUser?.value.trim() || '';
  const pass = inputPass?.value.trim() || '';

  window.EmailService.salvarConfigGmail(user, pass);
  carregarConfiguracoesGmailAdmin();
  alert('Configurações do Gmail salvas com sucesso! Agora você pode testar o envio.');
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
window.carregarHistoricoEmailsResend = carregarHistoricoEmailsResend;
window.reenviarCredenciaisTodosInscritosAdmin = reenviarCredenciaisTodosInscritosAdmin;
window.carregarConfiguracoesGmailAdmin = carregarConfiguracoesGmailAdmin;
window.salvarConfiguracaoGmailAdmin = salvarConfiguracaoGmailAdmin;
window.filtrarInscricoesTabelaAdmin = filtrarInscricoesTabelaAdmin;
window.abrirCredencialPorProtocolo = abrirCredencialPorProtocolo;
window.exibirCredencialAdmin = exibirCredencialAdmin;
window.fecharCredencialModalAdmin = fecharCredencialModalAdmin;
window.validarPresencaAdmin = validarPresencaAdmin;
window.alternarInscricoesAdmin = alternarInscricoesAdmin;
window.atualizarVisualStatusInscricoes = atualizarVisualStatusInscricoes;



// ============================================================================
// ESTÚDIO & GERADOR DE CERTIFICADOS OFICIAIS (VISUALIZAR, EDITAR & IMPRIMIR)
// ============================================================================

const EDICOES_CERTIFICADOS = {
  '10': {
    titulo: '10° Café com Ciência',
    tema: '"10º CAFÉ COM CIÊNCIA : Os Direitos dos Pacientes na Odontologia"',
    palestrante: 'Profa. Carolina Diniz',
    data: '2026-10-30',
    prefixo: 'CC10'
  },
  '11': {
    titulo: '11° Café com Ciência',
    tema: '"11º CAFÉ COM CIÊNCIA : 10 anos do projeto NAM em Belo Horizonte"',
    palestrante: 'Prof. Dr. Henrique Pretti',
    data: '2026-11-13',
    prefixo: 'CC11'
  },
  '12': {
    titulo: '12° Café com Ciência',
    tema: '"12º CAFÉ COM CIÊNCIA : Diagnóstico e Planejamento na Reabilitação Oral"',
    palestrante: 'Dra. Thaissa Calab',
    data: '2026-11-18',
    prefixo: 'CC12'
  }
};

let certEdicaoAtiva = '10';
let certModalidadeAtiva = 'ambos'; // Padrão 'ambos' para já destacar o suporte aos 2 certificados de membros da liga
let certItensGeradosCache = [];

function formatarDataPorExtensoPt(dataStr) {
  if (!dataStr) return "____ de ______________ de 20__";
  const partes = dataStr.split('-');
  if (partes.length !== 3) return dataStr;
  const [year, month, day] = partes;
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho", 
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  return `${parseInt(day, 10)} de ${meses[parseInt(month, 10) - 1]} de ${year}`;
}

function atualizarDataExtensoCertificados() {
  const input = document.getElementById('certEditorDataEmissao');
  const span = document.getElementById('certEditorDataExtensoPreview');
  if (input && span) {
    span.textContent = 'Belo Horizonte, ' + formatarDataPorExtensoPt(input.value) + '.';
  }
}

function obterTextoPadraoParticipacao(ed, horas = 4) {
  const info = EDICOES_CERTIFICADOS[ed] || EDICOES_CERTIFICADOS['10'];
  return `participou efetivamente da palestra ${info.tema}, ministrada pela ${info.palestrante} e promovida pela Liga Acadêmica Café com Ciência, realizada no Centro Universitário Arnaldo Janssen, com carga horária de ${horas} horas.`;
}

function obterTextoPadraoOrganizador(ed, horas = 6) {
  const info = EDICOES_CERTIFICADOS[ed] || EDICOES_CERTIFICADOS['10'];
  return `participou efetivamente da comissão organizadora do evento ${info.tema}, promovido pelas professoras Patricia Drummond e Camila Mundim e pela Liga Acadêmica Café com Ciência, no Centro Universitário Arnaldo Janssen, com carga horária de ${horas} horas.`;
}

function inicializarEstudioCertificados() {
  const inputData = document.getElementById('certEditorDataEmissao');
  if (inputData && !inputData.value) {
    const info = EDICOES_CERTIFICADOS[certEdicaoAtiva] || EDICOES_CERTIFICADOS['10'];
    inputData.value = info.data || new Date().toISOString().split('T')[0];
  }
  atualizarDataExtensoCertificados();

  const txtPart = document.getElementById('certEditorTextoParticipacao');
  const txtOrg = document.getElementById('certEditorTextoOrganizador');
  if (txtPart && !txtPart.value.trim()) {
    txtPart.value = obterTextoPadraoParticipacao(certEdicaoAtiva, 4);
  }
  if (txtOrg && !txtOrg.value.trim()) {
    txtOrg.value = obterTextoPadraoOrganizador(certEdicaoAtiva, 6);
  }

  // Preencher com exemplos se estiver vazio
  const nomesTextarea = document.getElementById('certEditorNomes');
  if (nomesTextarea && !nomesTextarea.value.trim()) {
    // Carregar presentes da edição ativa automaticamente
    carregarPresentesCertificados(false);
  } else {
    atualizarContagemNomesCertificados();
    gerarPreviaCertificados();
  }
}

function alternarEdicaoCertificado(ed) {
  certEdicaoAtiva = ed;
  ['10', '11', '12'].forEach(item => {
    const btn = document.getElementById(`btnCertEdicao_${item}`);
    if (btn) {
      if (item === ed) {
        btn.className = 'p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 bg-amber-50 border-amber-400 text-amber-950 shadow-xs';
      } else {
        btn.className = 'p-2.5 rounded-xl border border-stone-200 text-xs font-semibold hover:border-amber-400 text-stone-700 transition flex flex-col items-center gap-1 bg-white';
      }
    }
  });

  const info = EDICOES_CERTIFICADOS[ed];
  if (info) {
    const inputData = document.getElementById('certEditorDataEmissao');
    if (inputData) inputData.value = info.data;
    atualizarDataExtensoCertificados();

    const txtPart = document.getElementById('certEditorTextoParticipacao');
    const txtOrg = document.getElementById('certEditorTextoOrganizador');
    const horasPart = document.getElementById('certEditorHorasParticipacao')?.value || 4;
    const horasOrg = document.getElementById('certEditorHorasOrganizador')?.value || 6;

    if (txtPart) txtPart.value = obterTextoPadraoParticipacao(ed, horasPart);
    if (txtOrg) txtOrg.value = obterTextoPadraoOrganizador(ed, horasOrg);
  }

  gerarPreviaCertificados();
}

function alternarModalidadeCertificado(mod) {
  certModalidadeAtiva = mod;
  ['participacao', 'organizador', 'ambos'].forEach(item => {
    const btn = document.getElementById(`btnCertModalidade_${item}`);
    if (btn) {
      if (item === mod) {
        btn.className = item === 'ambos'
          ? 'p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 bg-purple-50 border-purple-400 text-purple-950 shadow-xs'
          : 'p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 bg-amber-50 border-amber-400 text-amber-950 shadow-xs';
      } else {
        btn.className = 'p-2.5 rounded-xl border border-stone-200 text-xs font-semibold hover:border-stone-400 text-stone-700 transition flex flex-col items-center gap-1 bg-white';
      }
    }
  });

  const cPart = document.getElementById('containerTextoParticipacao');
  const cOrg = document.getElementById('containerTextoOrganizador');

  if (mod === 'participacao') {
    if (cPart) cPart.classList.remove('hidden');
    if (cOrg) cOrg.classList.add('hidden');
  } else if (mod === 'organizador') {
    if (cPart) cPart.classList.add('hidden');
    if (cOrg) cOrg.classList.remove('hidden');
  } else {
    // Ambos (Membros da Liga)
    if (cPart) cPart.classList.remove('hidden');
    if (cOrg) cOrg.classList.remove('hidden');
  }

  gerarPreviaCertificados();
}

function carregarPresentesCertificados(showFeedback = true) {
  if (!inscricoesCache || inscricoesCache.length === 0) {
    if (showFeedback) alert('Nenhum dado de inscrição carregado ainda.');
    return;
  }

  const presentes = inscricoesCache.filter(aluno => {
    const isPresente = aluno.presenca_confirmada === true;
    if (certEdicaoAtiva === '10') {
      const p = (aluno.protocolo || '').toUpperCase();
      const ed = aluno.edicao ? parseInt(aluno.edicao, 10) : 0;
      return isPresente && (p.startsWith('CC10-') || ed === 10 || (!p.startsWith('CC11-') && !p.startsWith('CC12-') && ed !== 11 && ed !== 12));
    } else if (certEdicaoAtiva === '11') {
      const p = (aluno.protocolo || '').toUpperCase();
      const ed = aluno.edicao ? parseInt(aluno.edicao, 10) : 0;
      return isPresente && (p.startsWith('CC11-') || ed === 11);
    } else if (certEdicaoAtiva === '12') {
      const p = (aluno.protocolo || '').toUpperCase();
      const ed = aluno.edicao ? parseInt(aluno.edicao, 10) : 0;
      return isPresente && (p.startsWith('CC12-') || ed === 12);
    }
    return isPresente;
  });

  const nomes = presentes.map(p => p.nome_completo).filter(Boolean);
  const nomesTextarea = document.getElementById('certEditorNomes');

  if (nomes.length > 0) {
    if (nomesTextarea) nomesTextarea.value = nomes.join('\n');
    atualizarContagemNomesCertificados();
    gerarPreviaCertificados();
    if (showFeedback) alert(`${nomes.length} participantes com presença confirmada foram carregados para emissão!`);
  } else {
    // Se ainda não houver presenças na portaria hoje, carrega os inscritos aprovados
    const aprovados = inscricoesCache.filter(a => a.status_pagamento === 'aprovado').map(a => a.nome_completo).filter(Boolean);
    if (nomesTextarea && aprovados.length > 0) {
      nomesTextarea.value = aprovados.slice(0, 10).join('\n');
      atualizarContagemNomesCertificados();
      gerarPreviaCertificados();
      if (showFeedback) alert(`Ainda não há presenças validadas nesta edição. Carregamos uma amostra de inscritos para visualização.`);
    } else if (nomesTextarea && !nomesTextarea.value.trim()) {
      nomesTextarea.value = "Daniel Henrique da Silva Guimarães\nMaria de Souza Pereira";
      atualizarContagemNomesCertificados();
      gerarPreviaCertificados();
    }
  }
}

function carregarTodosInscritosCertificados() {
  if (!inscricoesCache || inscricoesCache.length === 0) {
    alert('Nenhum dado de inscrição disponível.');
    return;
  }
  const nomes = inscricoesCache.map(a => a.nome_completo).filter(Boolean);
  const nomesTextarea = document.getElementById('certEditorNomes');
  if (nomesTextarea) {
    nomesTextarea.value = nomes.join('\n');
    atualizarContagemNomesCertificados();
    gerarPreviaCertificados();
    alert(`${nomes.length} inscritos carregados no gerador!`);
  }
}

function carregarMembrosLigaCertificados() {
  alternarModalidadeCertificado('ambos');
  const nomesTextarea = document.getElementById('certEditorNomes');

  // Nomes de organizadores encontrados ou lista da comissão
  const orgs = inscricoesCache.filter(a => a.role === 'organizador').map(a => a.nome_completo).filter(Boolean);
  
  if (orgs.length > 0) {
    if (nomesTextarea) nomesTextarea.value = orgs.join('\n');
  } else {
    if (nomesTextarea && !nomesTextarea.value.trim()) {
      nomesTextarea.value = "Membro da Comissão 1\nMembro da Comissão 2\nMembro da Comissão 3";
    }
  }

  atualizarContagemNomesCertificados();
  gerarPreviaCertificados();
  alert('⭐ Modo DUPLO ativado! Cada membro listado receberá 2 certificados: Participação (4h) e Organizador (6h).');
}

function limparNomesCertificados() {
  const nomesTextarea = document.getElementById('certEditorNomes');
  if (nomesTextarea) nomesTextarea.value = '';
  atualizarContagemNomesCertificados();
  gerarPreviaCertificados();
}

function atualizarContagemNomesCertificados() {
  const nomesTextarea = document.getElementById('certEditorNomes');
  const badge = document.getElementById('badgeContagemNomesCertificados');
  if (!nomesTextarea || !badge) return;
  const nomes = nomesTextarea.value.split('\n').map(n => n.trim()).filter(Boolean);
  const modLabel = certModalidadeAtiva === 'ambos' ? ` (${nomes.length * 2} certificados no total)` : '';
  badge.textContent = `${nomes.length} participante(s) listado(s)${modLabel}`;
}

function restaurarTextosPadraoCertificados() {
  const txtPart = document.getElementById('certEditorTextoParticipacao');
  const txtOrg = document.getElementById('certEditorTextoOrganizador');
  const hPart = document.getElementById('certEditorHorasParticipacao');
  const hOrg = document.getElementById('certEditorHorasOrganizador');

  if (hPart) hPart.value = 4;
  if (hOrg) hOrg.value = 6;
  if (txtPart) txtPart.value = obterTextoPadraoParticipacao(certEdicaoAtiva, 4);
  if (txtOrg) txtOrg.value = obterTextoPadraoOrganizador(certEdicaoAtiva, 6);

  gerarPreviaCertificados();
  alert('Textos originais restaurados!');
}

function gerarPreviaCertificados() {
  const container = document.getElementById('previewCertificadosContainer');
  const badgeTotal = document.getElementById('badgeTotalCertificadosGerados');
  const nomesTextarea = document.getElementById('certEditorNomes');
  if (!container) return;

  const rawNomes = nomesTextarea ? nomesTextarea.value.split('\n').map(n => n.trim()).filter(Boolean) : [];
  const nomes = rawNomes.length > 0 ? rawNomes : ['Participante Exemplo'];

  const dataInput = document.getElementById('certEditorDataEmissao')?.value;
  const dataFormatada = formatarDataPorExtensoPt(dataInput);

  const nomeCoord = document.getElementById('certEditorNomeCoordenador')?.value.trim() || 'Gerdal Roberto de Sousa';
  const cargoCoord = document.getElementById('certEditorCargoCoordenador')?.value.trim() || 'Coordenador do Curso de Odontologia';

  let txtPart = document.getElementById('certEditorTextoParticipacao')?.value.trim() || obterTextoPadraoParticipacao(certEdicaoAtiva, 4);
  let txtOrg = document.getElementById('certEditorTextoOrganizador')?.value.trim() || obterTextoPadraoOrganizador(certEdicaoAtiva, 6);

  if (!txtPart.startsWith(' ') && !txtPart.startsWith(',')) txtPart = ' ' + txtPart;
  if (!txtOrg.startsWith(' ') && !txtOrg.startsWith(',')) txtOrg = ' ' + txtOrg;

  const edInfo = EDICOES_CERTIFICADOS[certEdicaoAtiva] || EDICOES_CERTIFICADOS['10'];
  const prefixo = edInfo.prefixo || 'CC10';

  certItensGeradosCache = [];
  container.innerHTML = '';

  let totalPaginas = 0;

  nomes.forEach((nome, idx) => {
    const codHash = Math.abs((nome.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0))).toString(36).toUpperCase().padStart(6, '0').slice(-6);

    // 1. Se for 'participacao' ou 'ambos', gera o certificado de Participação
    if (certModalidadeAtiva === 'participacao' || certModalidadeAtiva === 'ambos') {
      const certId = `cert_part_${idx}`;
      const codAutenticidade = `CERT-${prefixo}-${codHash}`;
      const htmlCert = `
        <div class="certificate-page flex flex-col justify-between" id="${certId}">
          <!-- Forma Geométrica Azul -->
          <svg class="absolute top-0 left-0 w-[400px] sm:w-[450px] h-auto" viewBox="0 0 450 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="0,0 450,0 180,150 0,60" fill="#009ce4" />
          </svg>

          <!-- Logo Oficial UniArnaldo -->
          <img src="logo_arnaldo.png" alt="Logo UniArnaldo" class="absolute top-8 right-12 h-20 sm:h-24 object-contain" 
               onerror="this.onerror=null; this.src='certificados-site/logo.png';" />

          <!-- Conteúdo Central -->
          <div class="pt-40 sm:pt-48 px-16 sm:px-24 flex-1 flex flex-col items-center">
            <h1 class="text-4xl sm:text-5xl font-bold text-black mb-14 tracking-wide uppercase">Declaração</h1>

            <p class="text-lg sm:text-xl text-center text-black leading-relaxed max-w-4xl font-normal">
              Declaramos que <b class="italic font-bold">${nome}</b>${txtPart}
            </p>

            <p class="text-base sm:text-lg text-center text-black mt-16 font-normal">
              Belo Horizonte, ${dataFormatada}.
            </p>
          </div>

          <!-- Assinatura Oficial -->
          <div class="pb-14 w-full flex flex-col items-center z-10 relative">
            <img src="assinatura.png" alt="Assinatura Coordenação" class="h-16 sm:h-20 object-contain mb-2" 
                 onerror="this.onerror=null; this.src='certificados-site/assinatura.png';" />
            
            <div class="border-t border-black w-2/5 sm:w-[450px] mb-2"></div>
            <p class="text-center text-black text-base sm:text-lg font-normal">${nomeCoord}</p>
            <p class="text-center text-black text-base sm:text-lg font-normal">${cargoCoord}</p>

            <div class="absolute bottom-4 right-8 text-[11px] text-stone-500 font-mono">
              Autenticação: ${codAutenticidade}
            </div>
          </div>
        </div>
      `;

      certItensGeradosCache.push({ nome, tipo: 'participacao', html: htmlCert });
      totalPaginas++;

      const wrapper = document.createElement('div');
      wrapper.className = 'bg-stone-100/70 p-4 sm:p-6 rounded-3xl border border-stone-200 relative';
      wrapper.innerHTML = `
        <div class="no-print flex items-center justify-between pb-3 mb-2 border-b border-stone-200 text-xs">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1">
              <i data-lucide="award" class="w-3.5 h-3.5 text-blue-700"></i>
              Certificado de Participação (4 Horas)
            </span>
            <span class="font-bold text-stone-800">${nome}</span>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="imprimirCertificadosGerados(${certItensGeradosCache.length - 1})" class="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 font-bold text-stone-700 rounded-lg shadow-2xs flex items-center gap-1 transition">
              <i data-lucide="printer" class="w-3.5 h-3.5"></i>
              <span>Imprimir Este</span>
            </button>
          </div>
        </div>
        ${htmlCert}
      `;
      container.appendChild(wrapper);
    }

    // 2. Se for 'organizador' ou 'ambos', gera o certificado de Organizador
    if (certModalidadeAtiva === 'organizador' || certModalidadeAtiva === 'ambos') {
      const certId = `cert_org_${idx}`;
      const codAutenticidade = `CERT-ORG-${prefixo}-${codHash}`;
      const htmlCert = `
        <div class="certificate-page flex flex-col justify-between" id="${certId}">
          <!-- Forma Geométrica Azul -->
          <svg class="absolute top-0 left-0 w-[400px] sm:w-[450px] h-auto" viewBox="0 0 450 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="0,0 450,0 180,150 0,60" fill="#009ce4" />
          </svg>

          <!-- Logo Oficial UniArnaldo -->
          <img src="logo_arnaldo.png" alt="Logo UniArnaldo" class="absolute top-8 right-12 h-20 sm:h-24 object-contain" 
               onerror="this.onerror=null; this.src='certificados-site/logo.png';" />

          <!-- Conteúdo Central -->
          <div class="pt-40 sm:pt-48 px-16 sm:px-24 flex-1 flex flex-col items-center">
            <h1 class="text-4xl sm:text-5xl font-bold text-black mb-14 tracking-wide uppercase">Declaração</h1>

            <p class="text-lg sm:text-xl text-center text-black leading-relaxed max-w-4xl font-normal">
              Declaramos que <b class="italic font-bold">${nome}</b>${txtOrg}
            </p>

            <p class="text-base sm:text-lg text-center text-black mt-16 font-normal">
              Belo Horizonte, ${dataFormatada}.
            </p>
          </div>

          <!-- Assinatura Oficial -->
          <div class="pb-14 w-full flex flex-col items-center z-10 relative">
            <img src="assinatura.png" alt="Assinatura Coordenação" class="h-16 sm:h-20 object-contain mb-2" 
                 onerror="this.onerror=null; this.src='certificados-site/assinatura.png';" />
            
            <div class="border-t border-black w-2/5 sm:w-[450px] mb-2"></div>
            <p class="text-center text-black text-base sm:text-lg font-normal">${nomeCoord}</p>
            <p class="text-center text-black text-base sm:text-lg font-normal">${cargoCoord}</p>

            <div class="absolute bottom-4 right-8 text-[11px] text-purple-700 font-mono font-bold">
              Autenticação: ${codAutenticidade}
            </div>
          </div>
        </div>
      `;

      certItensGeradosCache.push({ nome, tipo: 'organizador', html: htmlCert });
      totalPaginas++;

      const wrapper = document.createElement('div');
      wrapper.className = 'bg-purple-50/50 p-4 sm:p-6 rounded-3xl border border-purple-200 relative';
      wrapper.innerHTML = `
        <div class="no-print flex items-center justify-between pb-3 mb-2 border-b border-purple-200 text-xs">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-purple-700"></i>
              Certificado de Organizador (6 Horas - Membro da Liga)
            </span>
            <span class="font-bold text-stone-800">${nome}</span>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="imprimirCertificadosGerados(${certItensGeradosCache.length - 1})" class="px-3 py-1.5 bg-white border border-purple-300 hover:bg-purple-100 font-bold text-purple-900 rounded-lg shadow-2xs flex items-center gap-1 transition">
              <i data-lucide="printer" class="w-3.5 h-3.5"></i>
              <span>Imprimir Este</span>
            </button>
          </div>
        </div>
        ${htmlCert}
      `;
      container.appendChild(wrapper);
    }
  });

  if (badgeTotal) {
    badgeTotal.textContent = `${totalPaginas} declaração(ões) pronta(s) para impressão`;
  }
  if (window.lucide) window.lucide.createIcons();
}

function imprimirCertificadosGerados(index = null) {
  if (certItensGeradosCache.length === 0) {
    gerarPreviaCertificados();
  }

  const itens = (index !== null && certItensGeradosCache[index])
    ? [certItensGeradosCache[index]]
    : certItensGeradosCache;

  if (itens.length === 0) {
    alert('Nenhuma declaração foi encontrada para impressão. Digite os nomes ou importe os presentes.');
    return;
  }

  // Preenche a área de impressão da própria página para fallback
  const printArea = document.getElementById('areaImpressaoCertificados');
  if (printArea) {
    printArea.innerHTML = itens.map(c => c.html).join('\n');
  }

  // Abre janela isolada de impressão (mesmo padrão limpo que funciona no certificados-site)
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Declarações Oficiais - Impressão</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      background-color: white;
    }
    .certificate-page {
      width: 100%;
      max-width: 1122px;
      aspect-ratio: 1.414;
      background-color: white;
      position: relative;
      margin: 2rem auto;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      color: #000;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      @page {
        size: A4 landscape;
        margin: 0;
      }
      body {
        background-color: white;
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .certificate-page {
        width: 297mm;
        height: 209mm;
        max-width: none;
        margin: 0 auto;
        box-shadow: none;
        page-break-after: always;
        page-break-inside: avoid;
      }
      .certificate-page:last-child {
        page-break-after: auto;
      }
    }
  </style>
</head>
<body class="min-h-screen pb-12">
  <div class="no-print bg-stone-900 text-white p-4 text-center sticky top-0 z-50 flex items-center justify-between px-8 shadow-md">
    <div class="flex items-center gap-3">
      <span class="text-sm font-bold">Prévia para Impressão Oficial (${itens.length} declaração/ões)</span>
    </div>
    <div class="flex items-center gap-2">
      <button onclick="window.print()" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5">
        <span>🖨️ Imprimir / Salvar em PDF</span>
      </button>
      <button onclick="window.close()" class="px-3 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs rounded-xl transition">
        Fechar
      </button>
    </div>
  </div>
  <div id="certificates-container" class="w-full flex flex-col items-center">
    ${itens.map(c => c.html).join('\n')}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`);
      printWindow.document.close();
      return;
    }
  } catch (err) {
    console.warn('Pop-up bloqueado, acionando impressão local com CSS corrigido:', err);
  }

  // Se pop-up for bloqueado, aciona window.print() na própria página
  window.print();
}

async function enviarCertificadosEmailAdmin() {
  const nomesTextarea = document.getElementById('certEditorNomes');
  const nomes = nomesTextarea ? nomesTextarea.value.split('\n').map(n => n.trim().toLowerCase()).filter(Boolean) : [];

  if (nomes.length === 0) {
    alert('Insira pelo menos um nome para envio de e-mails.');
    return;
  }

  if (!inscricoesCache || inscricoesCache.length === 0) {
    alert('Nenhuma inscrição encontrada para associar os e-mails.');
    return;
  }

  // Filtrar alunos cadastrados que correspondam aos nomes da lista
  const correspondentes = inscricoesCache.filter(aluno => {
    const nomeAluno = (aluno.nome_completo || '').toLowerCase();
    return nomes.some(n => nomeAluno.includes(n) || n.includes(nomeAluno));
  });

  if (correspondentes.length === 0) {
    alert('Nenhum participante da lista foi encontrado na base de dados com e-mail cadastrado.');
    return;
  }

  const tipoStr = certModalidadeAtiva === 'ambos' 
    ? 'os 2 certificados (Participação + Organizador)' 
    : (certModalidadeAtiva === 'organizador' ? 'o Certificado de Organizador (6h)' : 'o Certificado de Participação (4h)');

  const confirma = confirm(`Deseja enviar por e-mail ${tipoStr} para ${correspondentes.length} participantes encontrados?\n\nDestinatários:\n${correspondentes.map(c => c.nome_completo + ' (' + c.email + ')').join('\n')}`);
  if (!confirma) return;

  let enviados = 0;
  let erros = 0;

  for (const aluno of correspondentes) {
    try {
      await window.EmailService.enviarEmailCertificado(aluno, certModalidadeAtiva);
      enviados++;
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.warn('Erro ao enviar certificado para ' + aluno.email, e);
      erros++;
    }
  }

  alert(`Envio concluído!\n\nSucesso: ${enviados} e-mails entregues\nFalhas: ${erros}`);
}

function abrirEditorCertificadoParaAluno(protocolo) {
  const aluno = inscricoesCache.find(a => a.protocolo === protocolo);
  if (!aluno) {
    alert('Inscrição não encontrada.');
    return;
  }

  trocarAbaAdmin('certificados');

  // Ajustar edição
  const p = (aluno.protocolo || '').toUpperCase();
  const ed = aluno.edicao ? parseInt(aluno.edicao, 10) : 0;
  if (p.startsWith('CC12-') || ed === 12) {
    alternarEdicaoCertificado('12');
  } else if (p.startsWith('CC11-') || ed === 11) {
    alternarEdicaoCertificado('11');
  } else {
    alternarEdicaoCertificado('10');
  }

  // Preencher nome
  const nomesTextarea = document.getElementById('certEditorNomes');
  if (nomesTextarea) {
    nomesTextarea.value = aluno.nome_completo;
    atualizarContagemNomesCertificados();
  }

  // Se o aluno tiver perfil de organizador, ativa modo 'ambos'
  if (aluno.role === 'organizador') {
    alternarModalidadeCertificado('ambos');
  } else {
    alternarModalidadeCertificado('participacao');
  }

  gerarPreviaCertificados();

  setTimeout(() => {
    const sec = document.getElementById('tabView_certificados');
    if (sec) sec.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

// Exportações para o objeto window
window.inicializarEstudioCertificados = inicializarEstudioCertificados;
window.alternarEdicaoCertificado = alternarEdicaoCertificado;
window.alternarModalidadeCertificado = alternarModalidadeCertificado;
window.carregarPresentesCertificados = carregarPresentesCertificados;
window.carregarTodosInscritosCertificados = carregarTodosInscritosCertificados;
window.carregarMembrosLigaCertificados = carregarMembrosLigaCertificados;
window.limparNomesCertificados = limparNomesCertificados;
window.atualizarContagemNomesCertificados = atualizarContagemNomesCertificados;
window.atualizarDataExtensoCertificados = atualizarDataExtensoCertificados;
window.restaurarTextosPadraoCertificados = restaurarTextosPadraoCertificados;
window.gerarPreviaCertificados = gerarPreviaCertificados;
window.imprimirCertificadosGerados = imprimirCertificadosGerados;
window.enviarCertificadosEmailAdmin = enviarCertificadosEmailAdmin;
window.abrirEditorCertificadoParaAluno = abrirEditorCertificadoParaAluno;
