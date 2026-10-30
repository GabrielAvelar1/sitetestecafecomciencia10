/**
 * Aplicação Principal - 10° Café com Ciência
 * Lógica do formulário, Sistema de Contas, Credencial com QR Code, Mobile Menu e Certificados
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  configurarPix();
  configurarMascaraTelefone();
  configurarUploadComprovante();
  configurarFormulario();
  checarParametrosUrl();
  atualizarInterfaceUsuario();
  inicializarGoogleIdentityServices();

  // Sincroniza configurações do sistema (ex: inscrições abertas ou encerradas)
  if (window.LigaDB?.obterConfiguracoesSistema) {
    window.LigaDB.obterConfiguracoesSistema().then(() => {
      atualizarStatusInscricoesUI();
    }).catch(err => {
      console.warn('Erro ao carregar configurações de inscrição:', err);
      atualizarStatusInscricoesUI();
    });
  } else {
    atualizarStatusInscricoesUI();
  }

  window.addEventListener('inscricoes_status_changed', () => {
    atualizarStatusInscricoesUI();
  });

  window.addEventListener('auth_state_changed', () => {
    atualizarInterfaceUsuario();
  });

  // Listener para retorno de OAuth do Google via Supabase
  const sb = window.LigaDB?.getSupabase ? window.LigaDB.getSupabase() : null;
  if (sb && sb.auth) {
    sb.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        const u = session.user;
        const dadosGoogle = {
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email.split('@')[0],
          picture: u.user_metadata?.avatar_url || ''
        };
        const usuario = await window.LigaDB.fazerLoginComGoogle(dadosGoogle);
        if (window.location.hash.includes('access_token')) {
          history.replaceState(null, '', window.location.pathname);
        }
        if (usuario.protocolo) {
          abrirAreaDoAluno(usuario);
        }
      }
    });
  }
});

// ============================================================================
// CONTROLE DE INTERFACE POR USUÁRIO (ALUNO VS ORGANIZADOR VS VISITANTE)
// ============================================================================
function atualizarInterfaceUsuario() {
  const usuario = window.LigaDB?.getUsuarioLogado ? window.LigaDB.getUsuarioLogado() : null;
  const isOrg = usuario && usuario.role === 'organizador';

  // Ocultar ou exibir todos os elementos exclusivos da comissão da Liga
  const elementosLiga = document.querySelectorAll('.liga-only, #btnPainelLigaDesktop, #btnPainelLigaMobile, #btnPainelLigaFooter, #sepPainelLigaFooter');
  elementosLiga.forEach(el => {
    if (isOrg) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  const btnPainelLigaDesk = document.getElementById('btnPainelLigaDesktop');
  const btnPainelLigaMob = document.getElementById('btnPainelLigaMobile');
  const userAreaDesk = document.getElementById('userAreaDesktop');
  const userAreaMob = document.getElementById('userAreaMobile');

  if (usuario) {
    const primeiroNome = usuario.nome_completo ? usuario.nome_completo.split(' ')[0] : 'Participante';
    preencherFormularioComUsuario(usuario);

    if (isOrg) {
      // Organizador logado: mostra o Painel da Liga
      if (btnPainelLigaDesk) btnPainelLigaDesk.classList.remove('hidden');
      if (btnPainelLigaMob) btnPainelLigaMob.classList.remove('hidden');

      if (userAreaDesk) {
        userAreaDesk.innerHTML = `
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs font-semibold text-amber-900 bg-amber-100 px-2.5 py-1.5 rounded-xl border border-amber-200 whitespace-nowrap">
              Liga: ${primeiroNome}
            </span>
            <button onclick="window.LigaDB.fazerLogout()" title="Sair da conta" class="p-1.5 text-stone-500 hover:text-red-600 rounded-lg hover:bg-stone-100 transition">
              <i data-lucide="log-out" class="w-4 h-4"></i>
            </button>
          </div>
        `;
      }
      if (userAreaMob) {
        userAreaMob.innerHTML = `
          <div class="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
            <span class="text-xs font-bold text-amber-900">Membro da Liga: ${primeiroNome}</span>
            <button onclick="window.LigaDB.fazerLogout()" class="text-xs text-red-600 font-semibold hover:underline">Sair</button>
          </div>
        `;
      }
    } else {
      // Aluno logado: esconde o Painel da Liga e mostra a sua credencial / área do aluno
      if (btnPainelLigaDesk) btnPainelLigaDesk.classList.add('hidden');
      if (btnPainelLigaMob) btnPainelLigaMob.classList.add('hidden');

      if (userAreaDesk) {
        userAreaDesk.innerHTML = `
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="abrirAreaDoAluno()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-coffee-950 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-300 transition shadow-xs whitespace-nowrap" title="Ver minha inscrição e credencial com QR Code">
              <i data-lucide="qr-code" class="w-4 h-4 text-coffee-700"></i>
              <span>Minha Inscrição (${primeiroNome})</span>
            </button>
            <button onclick="window.LigaDB.fazerLogout()" title="Sair da conta" class="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-100 transition">
              <i data-lucide="log-out" class="w-4 h-4"></i>
            </button>
          </div>
        `;
      }
      if (userAreaMob) {
        userAreaMob.innerHTML = `
          <div class="flex items-center justify-between p-3 bg-coffee-50 rounded-xl border border-coffee-200">
            <button onclick="fecharMenuMobile(); abrirAreaDoAluno();" class="text-xs font-bold text-coffee-900 flex items-center gap-1.5">
              <i data-lucide="qr-code" class="w-4 h-4 text-coffee-700"></i>
              <span>Minha Inscrição / Credencial (${primeiroNome})</span>
            </button>
            <button onclick="window.LigaDB.fazerLogout()" class="text-xs text-red-600 font-semibold hover:underline">Sair</button>
          </div>
        `;
      }
    }
  } else {
    // Visitante não logado: esconde o Painel da Liga e mostra botão de login com Google
    if (btnPainelLigaDesk) btnPainelLigaDesk.classList.add('hidden');
    if (btnPainelLigaMob) btnPainelLigaMob.classList.add('hidden');

    if (userAreaDesk) {
      userAreaDesk.innerHTML = `
        <button onclick="iniciarLoginGoogle()" class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-coffee-950 bg-stone-100 hover:bg-stone-200 rounded-xl border border-stone-200 transition shrink-0 whitespace-nowrap">
          <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
          <span>Entrar com o Google</span>
        </button>
      `;
    }
    if (userAreaMob) {
      userAreaMob.innerHTML = `
        <button onclick="fecharMenuMobile(); iniciarLoginGoogle();" class="w-full py-2.5 px-4 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
          <span>Entrar com o Google</span>
        </button>
      `;
    }
  }

  if (window.lucide) window.lucide.createIcons();
}

function preencherFormularioComUsuario(usuario) {
  if (!usuario) return;
  const inputNome = document.getElementById('nome');
  const inputEmail = document.getElementById('email');
  const inputTelefone = document.getElementById('telefone');

  if (inputNome && !inputNome.value && usuario.nome_completo) {
    inputNome.value = usuario.nome_completo;
  }
  if (inputEmail && !inputEmail.value && usuario.email) {
    inputEmail.value = usuario.email;
  }
  if (inputTelefone && !inputTelefone.value && usuario.telefone) {
    inputTelefone.value = usuario.telefone;
  }
}

// ============================================================================
// MENU HAMBÚRGUER MOBILE
// ============================================================================
function toggleMenuMobile() {
  const menu = document.getElementById('menuMobile');
  if (!menu) return;

  const isHidden = menu.classList.contains('hidden');
  if (isHidden) {
    menu.classList.remove('hidden');
  } else {
    menu.classList.add('hidden');
  }
}

function fecharMenuMobile() {
  const menu = document.getElementById('menuMobile');
  if (menu) menu.classList.add('hidden');
}

// ============================================================================
// CHECAR PARÂMETROS DE URL
// ============================================================================
function checarParametrosUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const consultarCod = urlParams.get('consultar');
  const portaria = urlParams.get('portaria');

  if (consultarCod) {
    setTimeout(() => {
      abrirModalConsulta(consultarCod);
    }, 400);
  } else if (portaria === '1') {
    setTimeout(() => {
      abrirPainelAdmin('portaria');
    }, 400);
  }
}

// ============================================================================
// CONFIGURAÇÃO DO PIX (PADRÃO BANCO CENTRAL - BR CODE / EMVCo)
// ============================================================================
function configurarPix() {
  const chavePixEl = document.getElementById('chavePixText');
  const titularPixEl = document.getElementById('titularPixText');
  const btnCopiarPix = document.getElementById('btnCopiarPix');
  const btnCopiarCopiaECola = document.getElementById('btnCopiarCopiaECola');
  const qrCodeImg = document.getElementById('pixQrCode');

  let config;
  if (window.EDICAO_ATUAL === 12) {
    config = window.LigaDB?.PIX_CONFIG_12 || {
      chave: 'e4dafbbe-4395-413b-aac8-8dd5878d1db9',
      tipoChave: 'Aleatória',
      titular: 'ANA CAROLINA MESQUITA ARA',
      cidade: 'Sao Paulo',
      valor: '10.00',
      payloadCopiaECola: '00020126580014br.gov.bcb.pix0136e4dafbbe-4395-413b-aac8-8dd5878d1db95204000053039865802BR5925ANA CAROLINA MESQUITA ARA6009Sao Paulo62290525REC6ACF6FE413C668839679276304BAF1'
    };
  } else if (window.EDICAO_ATUAL === 11) {
    config = window.LigaDB?.PIX_CONFIG_11 || {
      chave: '70014901641',
      tipoChave: 'CPF',
      titular: 'Organização Café com Ciência',
      cidade: 'Belo Horizonte',
      valor: '10.00'
    };
  } else {
    config = window.LigaDB?.PIX_CONFIG || {
      chave: 'cadumancia@gmail.com',
      tipoChave: 'E-mail',
      titular: 'Organização Café com Ciência',
      cidade: 'Belo Horizonte',
      valor: '10.00'
    };
  }

  const payloadPix = config.payloadCopiaECola || (window.LigaDB?.gerarPayloadPix 
    ? window.LigaDB.gerarPayloadPix(config) 
    : '00020101021226420014br.gov.bcb.pix0120cadumancia@gmail.com520400005303986540510.005802BR5916CAFE COM CIENCIA6014BELO HORIZONTE62070503***63044319');

  if (chavePixEl) chavePixEl.textContent = config.chave;
  if (titularPixEl) titularPixEl.textContent = `${config.titular} (R$ ${config.valor})`;

  if (qrCodeImg) {
    const qrData = encodeURIComponent(payloadPix);
    qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${qrData}&color=2B1810&bgcolor=FFFFFF&margin=2`;
  }

  // Botão 1: Copiar Pix Copia e Cola (Payload padrão Bacen)
  if (btnCopiarCopiaECola) {
    btnCopiarCopiaECola.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(payloadPix);
        const originalHtml = btnCopiarCopiaECola.innerHTML;
        btnCopiarCopiaECola.innerHTML = `
          <i data-lucide="check" class="w-4 h-4 text-emerald-200"></i>
          <span class="text-white font-semibold">Código Pix Copiado!</span>
        `;
        btnCopiarCopiaECola.classList.add('ring-2', 'ring-emerald-400');
        if (window.lucide) window.lucide.createIcons();

        mostrarToast('Código Pix Copia e Cola copiado! Abra o app do seu banco, acesse a opção "Pix Copia e Cola" e cole.');

        setTimeout(() => {
          btnCopiarCopiaECola.innerHTML = originalHtml;
          btnCopiarCopiaECola.classList.remove('ring-2', 'ring-emerald-400');
          if (window.lucide) window.lucide.createIcons();
        }, 3000);
      } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = payloadPix;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        mostrarToast('Código Pix Copia e Cola copiado!');
      }
    });
  }

  // Botão 2: Copiar apenas a Chave Pix direta (E-mail)
  if (btnCopiarPix) {
    btnCopiarPix.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(config.chave);
        const originalText = btnCopiarPix.innerHTML;
        btnCopiarPix.innerHTML = `
          <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i>
          <span class="text-emerald-700 font-semibold">Copiado!</span>
        `;
        btnCopiarPix.classList.add('bg-emerald-50', 'border-emerald-300');
        if (window.lucide) window.lucide.createIcons();

        mostrarToast('Chave Pix copiada com sucesso! Abra o app do seu banco e transfira para o e-mail.');

        setTimeout(() => {
          btnCopiarPix.innerHTML = originalText;
          btnCopiarPix.classList.remove('bg-emerald-50', 'border-emerald-300');
          if (window.lucide) window.lucide.createIcons();
        }, 3000);
      } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = config.chave;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        mostrarToast('Chave Pix copiada!');
      }
    });
  }
}

// ============================================================================
// MÁSCARA DE WHATSAPP
// ============================================================================
function configurarMascaraTelefone() {
  const inputTel = document.getElementById('telefone');
  if (!inputTel) return;

  inputTel.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }

    e.target.value = value;
  });
}

// ============================================================================
// UPLOAD DE COMPROVANTE
// ============================================================================
let comprovanteArquivoSelecionado = null;

function configurarUploadComprovante() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('comprovanteInput');
  const previewContainer = document.getElementById('uploadPreviewContainer');
  const emptyContainer = document.getElementById('uploadEmptyContainer');
  const previewThumb = document.getElementById('previewThumb');
  const previewFileName = document.getElementById('previewFileName');
  const previewFileSize = document.getElementById('previewFileSize');
  const btnRemoverArquivo = document.getElementById('btnRemoverArquivo');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#btnRemoverArquivo')) return;
    fileInput.click();
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();

          dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processarArquivoComprovante(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processarArquivoComprovante(e.target.files[0]);
    }
  });

  if (btnRemoverArquivo) {
    btnRemoverArquivo.addEventListener('click', (e) => {
      e.stopPropagation();
      comprovanteArquivoSelecionado = null;
      fileInput.value = '';
      previewContainer.classList.add('hidden');
      emptyContainer.classList.remove('hidden');
    });
  }

  function processarArquivoComprovante(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Formato inválido. Por favor, envie uma foto (JPG, PNG) ou PDF do comprovante.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('O arquivo é muito grande. O limite máximo é de 8MB.');
      return;
    }

    comprovanteArquivoSelecionado = file;

    previewFileName.textContent = file.name;
    previewFileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewThumb.src = e.target.result;
        previewThumb.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    } else {
      previewThumb.classList.add('hidden');
    }

    emptyContainer.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }
}

// ============================================================================
// FORMULÁRIO DE INSCRIÇÃO (SEM PRECISAR DE SENHA · GOOGLE-FIRST)
// ============================================================================
function configurarFormulario() {
  const form = document.getElementById('formInscricao');
  const btnSubmit = document.getElementById('btnSubmitInscricao');
  const radioSim = document.getElementById('alunoArnaldoSim');
  const radioNao = document.getElementById('alunoArnaldoNao');
  const containerOutra = document.getElementById('containerOutraFaculdade');
  const inputOutra = document.getElementById('outraFaculdadeNome');

  if (!form) return;

  // Alternância do campo de outra faculdade
  function atualizarExibicaoOutraFaculdade() {
    if (radioNao && radioNao.checked) {
      if (containerOutra) containerOutra.classList.remove('hidden');
      if (inputOutra) {
        inputOutra.required = true;
        setTimeout(() => inputOutra.focus(), 100);
      }
    } else {
      if (containerOutra) containerOutra.classList.add('hidden');
      if (inputOutra) {
        inputOutra.required = false;
        inputOutra.value = '';
      }
    }
    if (window.lucide) window.lucide.createIcons();
  }

  if (radioSim) radioSim.addEventListener('change', atualizarExibicaoOutraFaculdade);
  if (radioNao) radioNao.addEventListener('change', atualizarExibicaoOutraFaculdade);

  // Preenche dados se já houver usuário logado
  const usuarioInicial = window.LigaDB.getUsuarioLogado();
  if (usuarioInicial) preencherFormularioComUsuario(usuarioInicial);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const edicaoForm = window.EDICAO_ATUAL || 10;
    if (window.LigaDB?.estaoInscricoesEncerradas && window.LigaDB.estaoInscricoesEncerradas(edicaoForm)) {
      alert("⚠️ As inscrições para a " + edicaoForm + "ª Edição do Café com Ciência estão encerradas.");
      return;
    }

    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();

    if (nome.split(' ').filter(Boolean).length < 2) {
      alert('Por favor, informe seu nome completo (nome e sobrenome) para emissão do certificado.');
      document.getElementById('nome').focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Por favor, informe um endereço de e-mail válido.');
      document.getElementById('email').focus();
      return;
    }

    const cleanTel = telefone.replace(/\D/g, '');
    if (cleanTel.length < 10) {
      alert('Por favor, informe um número de telefone com DDD válido.');
      document.getElementById('telefone').focus();
      return;
    }

    // Validação da Instituição de Ensino
    let instituicao = 'Faculdade Arnaldo';
    if (radioNao && radioNao.checked) {
      const nomeOutra = inputOutra ? inputOutra.value.trim() : '';
      if (!nomeOutra) {
        alert('Por favor, informe o nome ou sigla da sua faculdade/instituição.');
        if (inputOutra) inputOutra.focus();
        return;
      }
      instituicao = nomeOutra;
    }

    // VALIDAÇÃO ESTRITA: OBRIGATÓRIO ANEXAR COMPROVANTE
    if (!comprovanteArquivoSelecionado) {
      alert('⚠️ ATENÇÃO: É estritamente obrigatório anexar a imagem ou PDF do comprovante do Pix de R$ 10,00 para garantir sua vaga.');
      const dropzone = document.getElementById('dropzone');
      if (dropzone) {
        dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
        dropzone.classList.add('border-red-500', 'bg-red-50', 'ring-4', 'ring-red-200');
        setTimeout(() => {
          dropzone.classList.remove('border-red-500', 'bg-red-50', 'ring-4', 'ring-red-200');
        }, 4000);
      }
      return;
    }

    const btnOriginalHTML = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `
      <div class="flex items-center justify-center gap-2">
        <i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>
        <span>Gerando sua Credencial Oficial com QR Code...</span>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    try {
      const resultado = await window.LigaDB.registrarInscricao({
        nome_completo: nome,
        email: email,
        telefone: telefone,
        instituicao: instituicao,
        comprovanteFile: comprovanteArquivoSelecionado,
        edicao: window.EDICAO_ATUAL || 10
      });

      exibirCredencialSucesso(resultado.data);

      // Disparo automático de e-mail de confirmação via Resend / Gmail (em segundo plano)
      if (window.EmailService && window.EmailService.isEmailAutoInscricao()) {
        window.EmailService.enviarEmailInscricao(resultado.data).catch(e => {
          console.warn('Aviso: E-mail de confirmação não disparado:', e.message);
        });
      }

      form.reset();
      if (radioSim) radioSim.checked = true;
      if (containerOutra) containerOutra.classList.add('hidden');
      if (inputOutra) inputOutra.value = '';
      comprovanteArquivoSelecionado = null;
      document.getElementById('uploadPreviewContainer').classList.add('hidden');
      document.getElementById('uploadEmptyContainer').classList.remove('hidden');

    } catch (error) {
      console.error('Erro na submissão:', error);
      alert('Aviso: ' + (error.message || 'Tente novamente'));
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = btnOriginalHTML;
      if (window.lucide) window.lucide.createIcons();
    }
  });
}


function obterMetadadosEdicaoAluno(aluno) {
  let edicao = 10;
  if (aluno?.protocolo) {
    const proto = aluno.protocolo.toUpperCase();
    if (proto.startsWith('CC12-')) edicao = 12;
    else if (proto.startsWith('CC11-')) edicao = 11;
    else if (proto.startsWith('CC10-')) edicao = 10;
  } else if (aluno?.edicao) {
    edicao = parseInt(aluno.edicao, 10);
  } else if (typeof window !== 'undefined' && window.EDICAO_ATUAL) {
    edicao = window.EDICAO_ATUAL;
  }

  if (edicao === 12) {
    return {
      edicao: 12,
      titulo: '12° Café com Ciência',
      tema: 'Diagnóstico e Planejamento na Reabilitação Oral',
      dataHora: '18 de Novembro · 16:00 horas',
      dataCurta: '18/11 às 16h',
      palestrante: 'Dra. Thaissa Calab',
      local: 'UniArnaldo - Campus Anchieta (Sala 306)',
      url: '12cafe.html',
      dataObj: new Date(2026, 10, 18, 20, 0)
    };
  }

  if (edicao === 11) {
    return {
      edicao: 11,
      titulo: '11° Café com Ciência',
      tema: '10 anos do projeto NAM em Belo Horizonte',
      dataHora: '13 de Novembro · 15:00 horas',
      dataCurta: '13/11 às 15h',
      palestrante: 'Prof. Dr. Henrique Pretti',
      local: 'UniArnaldo - Campus Anchieta (Sala 306)',
      url: '11cafe.html',
      dataObj: new Date(2026, 10, 13, 20, 0)
    };
  }

  return {
    edicao: 10,
    titulo: '10° Café com Ciência',
    tema: 'Atendimento Odontológico de Pacientes Hospitalizados',
    dataHora: '30 de Outubro · 15:00 horas',
    dataCurta: '30/10 às 15h',
    palestrante: 'Profa. Carolina Diniz',
    local: 'UniArnaldo - Campus Anchieta (Sala 306)',
    url: 'index.html',
    dataObj: new Date(2026, 9, 30, 20, 0)
  };
}

// ============================================================================
// EXIBIR CREDENCIAL DE INSCRIÇÃO COM QR CODE EM TAMANHO REAL (ALTA DEFINIÇÃO)
// ============================================================================
function exibirCredencialSucesso(aluno) {
  const modal = document.getElementById('credencialModal');
  const target = document.getElementById('credencialContent');

  if (!modal || !target || !aluno) return;

  const meta = obterMetadadosEdicaoAluno(aluno);
  const tituloEvento = meta.titulo;
  const dataEvento = meta.dataHora;
  const localEvento = meta.local;
  const palestranteEvento = meta.palestrante;
  const eventoPassado = new Date() > meta.dataObj;

  // QR Code em alta definição (350x350) com margem adequada para leitura fácil por câmeras
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(aluno.protocolo)}&color=2B1810&bgcolor=FFFFFF&margin=2`;

  target.innerHTML = `
    <div id="credencialCardPrint" class="bg-white rounded-3xl p-6 sm:p-8 border-2 border-coffee-200 shadow-2xl relative overflow-hidden">
      
      <!-- Barra de Navegação: Voltar para Minhas Inscrições -->
      <div class="flex items-center justify-between pb-3.5 mb-3 border-b border-coffee-100">
        <button 
          onclick="fecharCredencialModal(); abrirAreaDoAluno();" 
          class="inline-flex items-center gap-1.5 text-xs font-bold text-coffee-800 hover:text-coffee-950 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition active:scale-95 shadow-2xs"
          title="Ver todas as minhas palestras e comprovantes"
        >
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Minhas Inscrições</span>
        </button>
        <div class="flex items-center gap-2">
          ${eventoPassado ? `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
              ✓ Evento Concluído
            </span>
          ` : ''}
          <span class="text-[11px] font-mono font-bold text-coffee-900 bg-coffee-50 px-2 py-0.5 rounded-md border border-coffee-200">
            ${meta.edicao}ª Edição
          </span>
        </div>
      </div>
      
      <!-- Topo da Credencial -->
      <div class="flex items-center justify-between pb-4 border-b border-coffee-100">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-xl bg-white p-1 border border-coffee-200 shadow-sm shrink-0">
            <img src="logo.png" alt="Logo" class="w-full h-full object-contain" />
          </div>
          <div>
            <h4 class="font-bold text-coffee-950 text-sm leading-tight">${tituloEvento}</h4>
            <span class="text-[11px] text-stone-500">Credencial Oficial de Inscrição</span>
          </div>
        </div>

        <span class="px-3 py-1 rounded-full text-xs font-mono font-bold bg-coffee-100 text-coffee-900 border border-coffee-300">
          ${aluno.protocolo}
        </span>
      </div>

      <!-- Informações do Aluno -->
      <div class="py-5 text-center">
        <span class="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">Participante Inscrito</span>
        <h3 class="text-2xl font-black text-coffee-900 leading-tight">${aluno.nome_completo}</h3>
        <p class="text-xs text-stone-500 mt-1 font-mono">${aluno.email}</p>
        <div class="mt-2.5 flex justify-center">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${(window.LigaDB?.extrairInstituicaoAluno ? window.LigaDB.extrairInstituicaoAluno(aluno) : (aluno.instituicao || 'Faculdade Arnaldo')).toLowerCase().includes('arnaldo') ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'}">
            <i data-lucide="${(window.LigaDB?.extrairInstituicaoAluno ? window.LigaDB.extrairInstituicaoAluno(aluno) : (aluno.instituicao || 'Faculdade Arnaldo')).toLowerCase().includes('arnaldo') ? 'graduation-cap' : 'building-2'}" class="w-3.5 h-3.5"></i>
            ${window.LigaDB?.extrairInstituicaoAluno ? window.LigaDB.extrairInstituicaoAluno(aluno) : (aluno.instituicao || 'Faculdade Arnaldo')}
          </span>
        </div>
      </div>

      <!-- AVISO DE STATUS DO COMPROVANTE -->
      ${aluno.status_pagamento === 'aprovado' ? `
        <div class="mb-4 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300 text-xs text-emerald-950 space-y-1 text-left">
          <div class="flex items-center gap-1.5 font-bold text-emerald-800">
            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600 shrink-0"></i>
            <span>Pagamento Validado pela Liga</span>
          </div>
          <p class="text-[11px] leading-relaxed text-emerald-900">
            Seu pagamento Pix foi <strong>conferido e validado com sucesso</strong> pela organização da liga! Sua vaga está 100% garantida. Apresente este QR Code na portaria da palestra.
          </p>
        </div>
      ` : `
        <div class="mb-4 p-3.5 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-950 space-y-1 text-left">
          <div class="flex items-center gap-1.5 font-bold text-amber-900">
            <i data-lucide="shield-check" class="w-4 h-4 text-amber-600 shrink-0"></i>
            <span>Comprovante Pix em Análise Manual</span>
          </div>
          <p class="text-[11px] leading-relaxed text-amber-850">
            Seu comprovante foi recebido pela organização da liga para conferência. <strong>Esta credencial e seu QR Code oficial em tamanho real já estão assegurados com você para o dia da palestra!</strong>
          </p>
        </div>
      `}

      <!-- QR Code Oficial em Tamanho Real para Portaria -->
      <div class="bg-coffee-50/80 p-5 sm:p-6 rounded-3xl border border-coffee-200 flex flex-col items-center justify-center text-center my-3">
        <div class="p-3 bg-white rounded-2xl shadow-xl border-2 border-coffee-200 mb-2.5">
          <img src="${qrUrl}" alt="QR Code da Credencial" class="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto" />
        </div>
        <div class="flex items-center gap-1.5 text-sm font-bold text-coffee-950 mt-1">
          <i data-lucide="scan-line" class="w-4 h-4 text-coffee-700"></i>
          <span>Apresente este QR Code na portaria da palestra</span>
        </div>
        <p class="text-xs text-stone-500 mt-1 max-w-xs leading-relaxed">QR Code em alta definição para leitura rápida e sem reflexo na entrada</p>
      </div>

      <!-- Detalhes do Evento -->
      <div class="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1.5 my-3">
        <div class="flex items-center gap-2 font-medium">
          <i data-lucide="calendar" class="w-3.5 h-3.5 text-coffee-600"></i>
          <span><strong>Data:</strong> ${dataEvento}</span>
        </div>
        <div class="flex items-center gap-2 font-medium">
          <i data-lucide="map-pin" class="w-3.5 h-3.5 text-coffee-600"></i>
          <span><strong>Local:</strong> ${localEvento}</span>
        </div>
        <div class="flex items-center gap-2 font-medium">
          <i data-lucide="user-check" class="w-3.5 h-3.5 text-coffee-600"></i>
          <span><strong>Palestra:</strong> ${palestranteEvento}</span>
        </div>
      </div>

      <!-- Ações: Imprimir / Certificado / Sair -->
      <div class="space-y-2 pt-2">
        ${aluno.presenca_confirmada ? (
          (window.LigaDB?.estaoCertificadosLiberados && window.LigaDB.estaoCertificadosLiberados()) ? `
            <a href="certificados.html?protocolo=${aluno.protocolo}" target="_blank" class="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2">
              <i data-lucide="award" class="w-5 h-5"></i>
              <span>Visualizar / Baixar Certificado Oficial (4h)</span>
            </a>
          ` : `
            <div class="p-3.5 bg-amber-50/90 rounded-2xl border border-amber-300 text-xs text-amber-950 space-y-1 text-left">
              <div class="flex items-center gap-1.5 font-bold text-amber-900">
                <i data-lucide="clock" class="w-4 h-4 text-amber-600 shrink-0"></i>
                <span>Presença Confirmada · Certificado em Assinatura</span>
              </div>
              <p class="text-[11px] leading-relaxed text-amber-850">
                Sua presença foi confirmada pela organização! Os certificados oficiais de 4 horas estão em fase de coleta de assinaturas da coordenação e serão liberados em breve aqui no site.
              </p>
            </div>
          `
        ) : ''}

        <button onclick="window.print()" class="w-full py-3 px-4 bg-stone-900 hover:bg-black text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm">
          <i data-lucide="printer" class="w-4 h-4"></i>
          <span>Imprimir / Salvar Credencial em PDF</span>
        </button>

        <button onclick="fecharCredencialModal(); abrirAreaDoAluno();" class="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-coffee-950 font-bold text-xs rounded-xl border border-amber-300 transition flex items-center justify-center gap-2">
          <i data-lucide="layers" class="w-4 h-4 text-amber-700"></i>
          <span>Ver Todas as Minhas Inscrições</span>
        </button>

        <div class="flex items-center justify-between pt-1 text-xs text-stone-500">
          <span>Identificação: ${aluno.protocolo}</span>
          <button onclick="window.LigaDB.fazerLogout()" class="text-red-600 font-semibold hover:underline">
            Sair da Conta
          </button>
        </div>
      </div>

    </div>
  `;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';


  if (window.lucide) window.lucide.createIcons();
}

function fecharCredencialModal() {
  const modal = document.getElementById('credencialModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

async function abrirCredencialPorProtocolo(protocolo) {
  try {
    const aluno = await window.LigaDB.buscarInscricao(protocolo);
    if (aluno) {
      exibirCredencialSucesso(aluno);
    } else {
      alert('Inscrição não encontrada para o protocolo: ' + protocolo);
    }
  } catch (e) {
    alert('Erro ao buscar dados: ' + e.message);
  }
}

// ============================================================================
// SISTEMA DE CONTAS: LOGIN COM GOOGLE
// ============================================================================
function abrirModalLogin() {
  const modal = document.getElementById('loginModal');
  const erro = document.getElementById('erroLogin');
  if (erro) erro.classList.add('hidden');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function fecharModalLogin() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function parseJwtGoogle(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function inicializarGoogleIdentityServices() {
  if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
    return;
  }

  // IMPORTANTE: Só inicializa o GIS se o desenvolvedor tiver configurado um Client ID REAL do Google Cloud
  // Sem um Client ID registrado no Google Console, o Google bloqueia a requisição com "Erro 401: invalid_client".
  const clientId = window.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.includes('google-client') || clientId.includes('placeholder')) {
    return;
  }

  try {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        if (response && response.credential) {
          const payload = parseJwtGoogle(response.credential);
          if (payload) {
            fecharModalGoogleAuth();
            fecharModalLogin();
            const usuario = await window.LigaDB.fazerLoginComGoogle({
              name: payload.name || payload.given_name || 'Participante Google',
              email: payload.email,
              picture: payload.picture || ''
            });
            window.LigaDB.salvarContaGoogleRecente(payload.name, payload.email, payload.picture);
            if (usuario.role === 'organizador') {
              mostrarToast('Bem-vindo, comissão da Liga!');
              abrirPainelAdmin('inscricoes');
            } else if (usuario.protocolo) {
              mostrarToast(`Bem-vindo, ${usuario.nome_completo.split(' ')[0]}!`);
              abrirAreaDoAluno(usuario);
            } else {
              mostrarToast(`Conta Google conectada com sucesso! Conclua sua inscrição.`);
              preencherFormularioComUsuario(usuario);
              const secao = document.getElementById('inscricao');
              if (secao) secao.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true
    });

    const gsiContainer = document.getElementById('googleGsiBtnContainer');
    if (gsiContainer) {
      google.accounts.id.renderButton(gsiContainer, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: 280
      });
    }
  } catch (e) {
    console.warn('GIS ignorado:', e);
  }
}

// ============================================================================
// POP-UP NATIVO DO GOOGLE (GOOGLE IDENTITY SERVICES TOKEN CLIENT)
// ============================================================================
async function loginNativoGooglePopup() {
  const clientId = window.LigaDB?.getGoogleClientId ? window.LigaDB.getGoogleClientId() : '';
  
  if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
    abrirModalGoogleAuth();
    return true;
  }

  if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
    mostrarToast('Iniciando contas do Google...');
    let tries = 0;
    const checkGis = setInterval(() => {
      tries++;
      if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        clearInterval(checkGis);
        loginNativoGooglePopup();
      } else if (tries >= 10) {
        clearInterval(checkGis);
        abrirModalGoogleAuth();
      }
    }, 200);
    return true;
  }

  try {
    mostrarToast('Abrindo janela do Google...');
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile openid',
      prompt: 'select_account',
      callback: async (tokenResponse) => {
        if (tokenResponse && tokenResponse.error) {
          console.warn('Google popup cancelado ou erro:', tokenResponse.error);
          return;
        }

        if (tokenResponse && tokenResponse.access_token) {
          try {
            mostrarToast('Conectando sua conta Google...');
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });

            if (!res.ok) throw new Error('Não foi possível obter dados do Google.');
            const profile = await res.json();

            fecharModalLogin();
            fecharModalGoogleAuth();
            fecharTutorialGoogleOAuth();

            const usuario = await window.LigaDB.fazerLoginComGoogle({
              name: profile.name || profile.given_name || profile.email.split('@')[0],
              email: profile.email,
              picture: profile.picture || ''
            });

            window.LigaDB.salvarContaGoogleRecente(profile.name, profile.email, profile.picture);

            if (usuario.role === 'organizador') {
              mostrarToast('Bem-vindo, membro da Liga!');
              abrirPainelAdmin('inscricoes');
            } else if (usuario.protocolo) {
              mostrarToast(`Bem-vindo, ${usuario.nome_completo.split(' ')[0]}!`);
              abrirAreaDoAluno(usuario);
            } else {
              mostrarToast(`Conta Google conectada com sucesso! Conclua sua inscrição.`);
              preencherFormularioComUsuario(usuario);
              const secao = document.getElementById('inscricao');
              if (secao) secao.scrollIntoView({ behavior: 'smooth' });
            }
          } catch (e) {
            console.error('Erro ao processar login Google:', e);
            alert('Erro ao autenticar com Google: ' + e.message);
          }
        }
      }
    });

    // Dispara a janela pop-up oficial do Google!
    tokenClient.requestAccessToken({ prompt: 'select_account' });
    return true;
  } catch (err) {
    console.error('Erro ao abrir popup do Google:', err);
    alert('Erro ao abrir janela do Google: ' + err.message);
    return false;
  }
}

async function iniciarLoginGoogle() {
  fecharModalLogin();

  // 1. Se houver um Client ID do Google Cloud configurado no site, abre a janela pop-up nativa oficial!
  if (window.LigaDB && window.LigaDB.isGoogleConfigured && window.LigaDB.isGoogleConfigured()) {
    const abriu = loginNativoGooglePopup();
    if (abriu) return;
  }

  // 2. Se estiver rodando em servidor HTTP/HTTPS e tiver Supabase configurado, tenta OAuth com select_account
  const isCustomConfigured = window.LigaDB && typeof window.LigaDB.isSupabaseConfigured === 'function' && window.LigaDB.isSupabaseConfigured();
  if (isCustomConfigured && window.location.protocol.startsWith('http')) {
    try {
      const res = await window.LigaDB.iniciarLoginGoogleOAuth();
      if (res) return;
    } catch (e) {
      console.warn('Supabase OAuth Google fallback:', e);
    }
  }

  // 3. Caso ainda não tenha o Client ID cadastrado, exibe o seletor visual com botão direto para o tutorial
  abrirModalGoogleAuth();
}

function abrirTutorialGoogleOAuth() {
  const modal = document.getElementById('modalTutorialGoogleOAuth');
  const input = document.getElementById('inputGoogleClientIdTutorial');
  if (input && window.LigaDB?.getGoogleClientId) {
    input.value = window.LigaDB.getGoogleClientId();
  }
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function fecharTutorialGoogleOAuth() {
  const modal = document.getElementById('modalTutorialGoogleOAuth');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function salvarGoogleClientIdFromTutorial() {
  const input = document.getElementById('inputGoogleClientIdTutorial');
  const clientId = input?.value.trim();

  if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
    alert('Por favor, informe um Google Client ID válido (deve terminar com .apps.googleusercontent.com)');
    input?.focus();
    return;
  }

  window.LigaDB.salvarGoogleClientId(clientId);
  mostrarToast('Google Client ID salvo com sucesso! Abrindo pop-up...');
  fecharTutorialGoogleOAuth();
  setTimeout(() => {
    loginNativoGooglePopup();
  }, 400);
}

function abrirModalGoogleAuth() {
  const modal = document.getElementById('modalGoogleAuth');
  if (!modal) return;

  const lista = document.getElementById('listaContasGoogle');
  const formOutra = document.getElementById('formOutraContaGoogle');
  if (formOutra) formOutra.classList.add('hidden');

  // Coleta contas salvas/recentes
  let contas = [];
  try {
    contas = JSON.parse(localStorage.getItem('cafe_contas_google_recentes') || '[]');
  } catch (e) {}

  // Adiciona a conta ativa do usuário se ainda não estiver na lista
  const contaAtiva = {
    nome: 'Conta Google',
    email: 'chamardevoltastorm02@gmail.com',
    avatar: ''
  };
  if (!contas.some(c => c.email.toLowerCase() === contaAtiva.email.toLowerCase())) {
    contas.push(contaAtiva);
  }

  // Adiciona contas já cadastradas no formulário ou na sessão para facilitar
  const formNome = document.getElementById('nome')?.value.trim();
  const formEmail = document.getElementById('email')?.value.trim();
  if (formEmail && formEmail.includes('@') && !contas.some(c => c.email.toLowerCase() === formEmail.toLowerCase())) {
    contas.unshift({
      nome: formNome || formEmail.split('@')[0],
      email: formEmail,
      avatar: ''
    });
  }

  if (lista) {
    lista.innerHTML = contas.map((conta, index) => {
      const inicial = (conta.nome || conta.email || 'G').charAt(0).toUpperCase();
      const cores = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600'];
      const corFundo = cores[index % cores.length];

      return `
        <button 
          type="button"
          onclick="selecionarContaGoogleRapida('${conta.nome.replace(/'/g, "\\'")}', '${conta.email.replace(/'/g, "\\'")}', '${conta.avatar || ''}')"
          class="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-stone-50 active:bg-stone-100 transition text-left group border border-transparent hover:border-stone-200"
        >
          ${conta.avatar ? `
            <img src="${conta.avatar}" alt="${conta.nome}" class="w-10 h-10 rounded-full object-cover shrink-0 border border-stone-200 shadow-sm" />
          ` : `
            <div class="w-10 h-10 rounded-full ${corFundo} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
              ${inicial}
            </div>
          `}
          <div class="flex-1 min-w-0">
            <h5 class="text-xs font-bold text-stone-900 group-hover:text-coffee-950 truncate">${conta.nome}</h5>
            <p class="text-[11px] text-stone-500 truncate font-mono">${conta.email}</p>
          </div>
          <i data-lucide="chevron-right" class="w-4 h-4 text-stone-400 group-hover:text-coffee-800 transition shrink-0"></i>
        </button>
      `;
    }).join('');
  }

  // Preenche inputs caso o usuário queira usar outra conta
  const inputNome = document.getElementById('googleInputNome');
  const inputEmail = document.getElementById('googleInputEmail');
  if (inputNome && formNome) inputNome.value = formNome;
  if (inputEmail && formEmail) inputEmail.value = formEmail;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (window.lucide) window.lucide.createIcons();
}

async function selecionarContaGoogleRapida(nome, email, avatar = '') {
  try {
    mostrarToast(`Entrando como ${nome.split(' ')[0]}...`);
    window.LigaDB.salvarContaGoogleRecente(nome, email, avatar);
    
    const usuario = await window.LigaDB.fazerLoginComGoogle({
      name: nome,
      email: email,
      picture: avatar
    });

    fecharModalGoogleAuth();

    if (usuario.role === 'organizador') {
      mostrarToast('Bem-vindo, membro da Liga!');
      abrirPainelAdmin('inscricoes');
    } else if (usuario.protocolo) {
      mostrarToast(`Bem-vindo, ${usuario.nome_completo.split(' ')[0]}!`);
      abrirAreaDoAluno(usuario);
    } else {
      mostrarToast(`Conta Google conectada com sucesso! Conclua sua inscrição.`);
      preencherFormularioComUsuario(usuario);
      const secaoInscricao = document.getElementById('inscricao');
      if (secaoInscricao) {
        secaoInscricao.scrollIntoView({ behavior: 'smooth' });
      }
    }
  } catch (err) {
    alert('Erro ao selecionar conta: ' + err.message);
  }
}

function toggleInputOutraContaGoogle() {
  const formOutra = document.getElementById('formOutraContaGoogle');
  if (formOutra) {
    formOutra.classList.toggle('hidden');
    if (!formOutra.classList.contains('hidden')) {
      const inputEmail = document.getElementById('googleInputEmail');
      if (inputEmail) setTimeout(() => inputEmail.focus(), 100);
    }
  }
}

function fecharModalGoogleAuth() {
  const modal = document.getElementById('modalGoogleAuth');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

async function confirmarLoginGooglePrompt() {
  const inputNome = document.getElementById('googleInputNome');
  const inputEmail = document.getElementById('googleInputEmail');
  const nome = inputNome?.value.trim() || 'Participante Google';
  const email = inputEmail?.value.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    alert('Por favor, informe um endereço de e-mail válido para a sua Conta Google.');
    inputEmail?.focus();
    return;
  }

  const btn = document.getElementById('btnConfirmarGoogle');
  const original = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Conectando...</span>';
  if (window.lucide) window.lucide.createIcons();

  try {
    const usuario = await window.LigaDB.fazerLoginComGoogle({
      name: nome,
      email: email,
      picture: ''
    });

    fecharModalGoogleAuth();

    if (usuario.role === 'organizador') {
      mostrarToast('Bem-vindo, membro da Liga!');
      abrirPainelAdmin('inscricoes');
    } else if (usuario.protocolo) {
      mostrarToast(`Bem-vindo, ${usuario.nome_completo.split(' ')[0]}!`);
      abrirAreaDoAluno(usuario);
    } else {
      mostrarToast(`Conta Google conectada com sucesso! Conclua sua inscrição.`);
      preencherFormularioComUsuario(usuario);
      const secaoInscricao = document.getElementById('inscricao');
      if (secaoInscricao) {
        secaoInscricao.scrollIntoView({ behavior: 'smooth' });
      }
    }
  } catch (err) {
    alert('Erro ao conectar: ' + err.message);
  } finally {
    if (btn) btn.innerHTML = original;
    if (window.lucide) window.lucide.createIcons();
  }
}

// ============================================================================
// SISTEMA DE CONTAS: ÁREA DO ALUNO (PAINEL PESSOAL & MÚLTIPLAS INSCRIÇÕES)
// ============================================================================
async function abrirAreaDoAluno(usuarioForcado = null) {
  const usuario = usuarioForcado || window.LigaDB.getUsuarioLogado();

  if (!usuario) {
    abrirModalLogin();
    return;
  }

  const modal = document.getElementById('areaAlunoModal');
  const content = document.getElementById('areaAlunoContent');
  if (!modal || !content) return;

  // Exibe tela de carregamento rápida
  content.innerHTML = `
    <div class="py-12 text-center text-stone-500 space-y-3">
      <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-coffee-600 mx-auto"></i>
      <p class="text-sm font-semibold text-coffee-900">Carregando seus comprovantes e inscrições...</p>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Busca TODAS as inscrições deste aluno no banco
  let inscricoes = [];
  try {
    inscricoes = await window.LigaDB.buscarTodasInscricoes(usuario.email || usuario.protocolo || '');
  } catch (e) {
    console.warn('Erro ao consultar inscrições:', e);
  }

  // Fallback caso não tenha achado pelo email mas o usuário tenha protocolo na sessão
  if (inscricoes.length === 0 && usuario.protocolo) {
    inscricoes = [usuario];
  }

  // Se o aluno não possui nenhuma inscrição (logou com Google antes de se inscrever)
  if (inscricoes.length === 0) {
    renderizarAreaAlunoSemInscricao(content, usuario);
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Se o aluno possui 1 ou mais inscrições, renderiza o hub completo com todos os comprovantes
  renderizarAreaAlunoComInscricoes(content, usuario, inscricoes);
  if (window.lucide) window.lucide.createIcons();
}

function renderizarAreaAlunoComInscricoes(content, usuario, inscricoes) {
  const nomeAluno = inscricoes[0]?.nome_completo || usuario.nome_completo || 'Participante';
  const emailAluno = inscricoes[0]?.email || usuario.email || '';
  const totalInscricoes = inscricoes.length;

  // Identifica inscrições do aluno por edição
  const temEdicao10 = inscricoes.some(i => (i.protocolo && i.protocolo.startsWith('CC10-')) || (i.edicao && parseInt(i.edicao, 10) === 10));
  const temEdicao11 = inscricoes.some(i => (i.protocolo && i.protocolo.startsWith('CC11-')) || (i.edicao && parseInt(i.edicao, 10) === 11));
  const temEdicao12 = inscricoes.some(i => (i.protocolo && i.protocolo.startsWith('CC12-')) || (i.edicao && parseInt(i.edicao, 10) === 12));

  // Ordena por edição cronológica: 10, 11 e 12
  const inscricoesOrdenadas = [...inscricoes].sort((a, b) => {
    const edA = obterMetadadosEdicaoAluno(a).edicao;
    const edB = obterMetadadosEdicaoAluno(b).edicao;
    return edA - edB;
  });

  const cardsHtml = inscricoesOrdenadas.map(inscricao => {
    const meta = obterMetadadosEdicaoAluno(inscricao);
    const edicaoNum = meta.edicao;
    const tituloPalestra = meta.titulo;
    const temaPalestra = meta.tema;
    const palestrante = meta.palestrante;
    const dataHora = meta.dataHora;
    const local = meta.local;
    const eventoPassado = new Date() > meta.dataObj;

    const statusPagamentoHtml = inscricao.status_pagamento === 'aprovado'
      ? `<span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
           <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i> Pagamento Validado
         </span>`
      : `<span class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300">
           <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-amber-600"></i> Comprovante em Análise
         </span>`;

    const statusPresencaHtml = inscricao.presenca_confirmada
      ? `<span class="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-300">
           <i data-lucide="award" class="w-3.5 h-3.5 text-blue-600"></i> Presença Confirmada
         </span>`
      : '';

    const badgeEventoHtml = eventoPassado
      ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-300">
           ✓ Evento Realizado · Comprovante Arquivado
         </span>`
      : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
           ⏳ Próximo Evento · Apresente na Entrada
         </span>`;

    const certificadoLiberado = (window.LigaDB?.estaoCertificadosLiberados && window.LigaDB.estaoCertificadosLiberados()) || inscricao.presenca_confirmada;

    return `
      <div class="bg-white rounded-2xl p-4 sm:p-5 border-2 ${edicaoNum >= 11 ? 'border-amber-200 hover:border-amber-400' : 'border-coffee-200 hover:border-coffee-400'} shadow-sm transition space-y-3.5 text-left">
        
        <!-- Topo do Card -->
        <div class="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${edicaoNum >= 11 ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-coffee-100 text-coffee-950 border border-coffee-300'}">
                ${edicaoNum}ª Edição
              </span>
              ${badgeEventoHtml}
            </div>
            <h4 class="font-extrabold text-sm sm:text-base text-coffee-950 leading-snug">
              ${tituloPalestra}: ${temaPalestra}
            </h4>
          </div>

          <span class="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 border border-stone-200 shrink-0">
            ${inscricao.protocolo}
          </span>
        </div>

        <!-- Detalhes do Evento -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600">
          <div class="flex items-center gap-1.5">
            <i data-lucide="user-check" class="w-4 h-4 text-coffee-600 shrink-0"></i>
            <span><strong>Palestrante:</strong> ${palestrante}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <i data-lucide="calendar" class="w-4 h-4 text-coffee-600 shrink-0"></i>
            <span><strong>Data:</strong> ${dataHora}</span>
          </div>
          <div class="flex items-center gap-1.5 sm:col-span-2">
            <i data-lucide="map-pin" class="w-4 h-4 text-coffee-600 shrink-0"></i>
            <span><strong>Local:</strong> ${local}</span>
          </div>
        </div>

        <!-- Status Pagamento e Presença -->
        <div class="flex items-center gap-2 flex-wrap pt-1">
          ${statusPagamentoHtml}
          ${statusPresencaHtml}
        </div>

        <!-- Botões de Ação -->
        <div class="pt-2 flex flex-col sm:flex-row gap-2">
          <button 
            onclick="abrirCredencialPorProtocolo('${inscricao.protocolo}')"
            class="flex-1 py-2.5 px-3 bg-coffee-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 active:scale-98"
          >
            <i data-lucide="qr-code" class="w-4 h-4 text-amber-300"></i>
            <span>Ver Comprovante & QR Code</span>
          </button>

          ${certificadoLiberado ? `
            <a 
              href="certificados.html?protocolo=${inscricao.protocolo}" 
              target="_blank" 
              class="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
            >
              <i data-lucide="award" class="w-4 h-4"></i>
              <span>Baixar Certificado (4h)</span>
            </a>
          ` : `
            <span class="py-2 px-3 bg-stone-100 text-stone-400 font-medium text-[11px] rounded-xl flex items-center justify-center gap-1 cursor-not-allowed" title="Certificado liberado após o evento e confirmação de presença">
              <i data-lucide="award" class="w-3.5 h-3.5"></i>
              <span>Certificado 4h (Pós-evento)</span>
            </span>
          `}
        </div>

      </div>
    `;
  }).join('');

  // Sugestões de próximas edições ainda não inscritas
  let bannersSugeridos = [];
  if (!temEdicao10) {
    bannersSugeridos.push(`
      <div class="p-3.5 bg-gradient-to-r from-amber-50 to-stone-50 rounded-2xl border-2 border-amber-300 text-left space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900">10ª Edição · Inscrições Abertas</span>
          <span class="text-xs font-bold text-amber-900 font-mono">R$ 10,00</span>
        </div>
        <h5 class="text-xs sm:text-sm font-bold text-coffee-950">10° Café: Os Direitos dos Pacientes na Odontologia</h5>
        <p class="text-[11px] text-stone-600">Com a <strong>Profa. Carolina Diniz</strong> em 30 de Outubro às 15h. Certificado de 4 horas!</p>
        <a href="index.html#inscricao" onclick="fecharAreaDoAluno()" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-coffee-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow">
          <span>Garantir Vaga no 10° Café</span>
          <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </a>
      </div>
    `);
  }
  if (!temEdicao11) {
    bannersSugeridos.push(`
      <div class="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-300 text-left space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900">11ª Edição · Inscrições Abertas</span>
          <span class="text-xs font-bold text-amber-900 font-mono">R$ 10,00</span>
        </div>
        <h5 class="text-xs sm:text-sm font-bold text-coffee-950">11° Café: 10 anos do projeto NAM em Belo Horizonte</h5>
        <p class="text-[11px] text-stone-600">Com o <strong>Prof. Dr. Henrique Pretti</strong> em 13 de Novembro às 15h. Certificado de 4 horas!</p>
        <a href="11cafe.html#inscricao" onclick="fecharAreaDoAluno()" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-coffee-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow">
          <span>Garantir Vaga no 11° Café</span>
          <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </a>
      </div>
    `);
  }
  if (!temEdicao12) {
    bannersSugeridos.push(`
      <div class="p-3.5 bg-gradient-to-r from-stone-50 to-amber-50 rounded-2xl border-2 border-amber-300 text-left space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900">12ª Edição · Inscrições Abertas</span>
          <span class="text-xs font-bold text-amber-900 font-mono">R$ 10,00</span>
        </div>
        <h5 class="text-xs sm:text-sm font-bold text-coffee-950">12° Café: Diagnóstico e Planejamento na Reabilitação Oral</h5>
        <p class="text-[11px] text-stone-600">Com a <strong>Dra. Thaissa Calab</strong> em 18 de Novembro às 16h. Certificado de 4 horas!</p>
        <a href="12cafe.html#inscricao" onclick="fecharAreaDoAluno()" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-coffee-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow">
          <span>Garantir Vaga no 12° Café</span>
          <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </a>
      </div>
    `);
  }

  let bannerOutraEdicaoHtml = '';
  if (bannersSugeridos.length > 0) {
    bannerOutraEdicaoHtml = `<div class="space-y-3 pt-1">${bannersSugeridos.join('')}</div>`;
  } else {
    bannerOutraEdicaoHtml = `
      <div class="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300 text-xs text-emerald-950 text-left flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
          <i data-lucide="award" class="w-5 h-5"></i>
        </div>
        <div>
          <p class="font-bold text-emerald-900">Ciclo Completo de Palestras!</p>
          <p class="text-[11px] text-emerald-800">Você garantiu sua participação na 10ª, 11ª e 12ª edição. Seus comprovantes e certificados de 12 horas no total ficam arquivados permanentemente aqui.</p>
        </div>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="space-y-5">
      
      <!-- Cabeçalho do Aluno -->
      <div class="flex items-center justify-between border-b border-coffee-100 pb-4">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 font-black flex items-center justify-center border border-amber-300 shrink-0 text-base">
            ${nomeAluno.charAt(0).toUpperCase()}
          </div>
          <div class="min-w-0">
            <h3 class="text-base sm:text-lg font-black text-coffee-950 leading-tight truncate">
              ${nomeAluno}
            </h3>
            <p class="text-xs text-stone-500 font-mono truncate">${emailAluno}</p>
          </div>
        </div>

        <button onclick="window.LigaDB.fazerLogout()" class="text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition shrink-0" title="Sair da conta">
          Sair
        </button>
      </div>

      <!-- Resumo Informativo -->
      <div class="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-700 text-left flex items-center justify-between gap-3">
        <div>
          <p class="font-bold text-coffee-950">Seus Comprovantes de Inscrição (${totalInscricoes})</p>
          <p class="text-[11px] text-stone-500 mt-0.5">
            Acesse seus comprovantes com QR Code oficial e certificados a qualquer momento, mesmo após o término dos eventos.
          </p>
        </div>
        <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-coffee-100 text-coffee-900 shrink-0">
          ${totalInscricoes} ${totalInscricoes === 1 ? 'Palestra' : 'Palestras'}
        </span>
      </div>

      <!-- Lista de Inscrições / Comprovantes -->
      <div class="space-y-3.5">
        ${cardsHtml}
      </div>

      <!-- Sugestão da Outra Palestra (se aplicável) -->
      ${bannerOutraEdicaoHtml}

      <!-- Rodapé -->
      <div class="pt-2 text-center text-[11px] text-stone-400 border-t border-stone-100">
        Café com Ciência · Liga Odontológica UniArnaldo
      </div>

    </div>
  `;
}

function renderizarAreaAlunoSemInscricao(content, usuario) {
  content.innerHTML = `
    <div class="space-y-6 text-center py-2">
      <div class="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
        <i data-lucide="user-check" class="w-8 h-8"></i>
      </div>

      <div>
        <h3 class="text-xl font-black text-coffee-950">${usuario.nome_completo || 'Aluno Conectado'}</h3>
        <p class="text-xs text-stone-500 font-mono">${usuario.email || ''}</p>
        <span class="inline-block mt-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-xs font-semibold">
          ✓ Conta Google Conectada
        </span>
      </div>

      <div class="p-4 bg-amber-50/90 rounded-2xl border border-amber-200 text-xs text-amber-900 text-left space-y-2">
        <p class="font-bold flex items-center gap-1.5 text-amber-950">
          <i data-lucide="info" class="w-4 h-4 text-amber-600 shrink-0"></i>
          Você ainda não se inscreveu nas palestras:
        </p>
        <p class="leading-relaxed">
          Sua conta está conectada, mas você ainda não concluiu o pagamento do Pix (R$ 10,00) para gerar sua credencial oficial com QR Code. Escolha a palestra abaixo para se inscrever:
        </p>
      </div>

      <div class="space-y-3 pt-1 text-left">
        <!-- Card 10° Café -->
        <a href="index.html#inscricao" onclick="fecharAreaDoAluno()" class="p-3.5 rounded-2xl border border-stone-200 hover:border-coffee-500 hover:bg-stone-50 transition flex items-center justify-between gap-3 group">
          <div>
            <span class="text-[10px] uppercase font-bold text-coffee-700 bg-coffee-50 px-2 py-0.5 rounded border border-coffee-200">10ª Edição · 30/Out</span>
            <h5 class="text-xs font-bold text-stone-900 mt-1">Atendimento Odontológico de Pacientes Hospitalizados</h5>
            <p class="text-[11px] text-stone-500">Profa. Carolina Diniz · 15:00h</p>
          </div>
          <span class="px-3 py-1.5 bg-coffee-800 group-hover:bg-coffee-900 text-white rounded-xl text-xs font-bold shrink-0">
            Inscrever (R$ 10)
          </span>
        </a>

        <!-- Card 11° Café -->
        <a href="11cafe.html#inscricao" onclick="fecharAreaDoAluno()" class="p-3.5 rounded-2xl border border-amber-200 hover:border-amber-500 hover:bg-amber-50/50 transition flex items-center justify-between gap-3 group">
          <div>
            <span class="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">11ª Edição · 06/Nov</span>
            <h5 class="text-xs font-bold text-stone-900 mt-1">Diagnóstico e Planejamento na Reabilitação Oral</h5>
            <p class="text-[11px] text-stone-500">Dra. Thaissa Calab · 16:00h</p>
          </div>
          <span class="px-3 py-1.5 bg-amber-700 group-hover:bg-amber-800 text-white rounded-xl text-xs font-bold shrink-0">
            Inscrever (R$ 10)
          </span>
        </a>
      </div>

      <div class="pt-2">
        <button onclick="window.LigaDB.fazerLogout()" class="w-full py-2 px-4 text-stone-400 hover:text-red-600 text-xs font-semibold transition">
          Sair da Conta Google
        </button>
      </div>
    </div>
  `;
}

function fecharAreaDoAluno() {
  const modal = document.getElementById('areaAlunoModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// ============================================================================
// CONSULTA RÁPIDA DE INSCRIÇÃO & CREDENCIAL OFICIAL
// ============================================================================
function abrirModalConsulta(codigoInicial = '') {
  const modal = document.getElementById('consultaModal');
  const input = document.getElementById('inputBuscaInscricao');
  const resultDiv = document.getElementById('resultadoConsultaInscricao');

  if (resultDiv) resultDiv.classList.add('hidden');
  if (input && codigoInicial) input.value = codigoInicial;

  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (input) input.focus();
    if (codigoInicial) executarBuscaInscricao();
  }
}

function fecharModalConsulta() {
  const modal = document.getElementById('consultaModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

async function executarBuscaInscricao() {
  const input = document.getElementById('inputBuscaInscricao');
  const resultDiv = document.getElementById('resultadoConsultaInscricao');
  const termo = input?.value.trim();

  if (!termo) {
    alert('Digite seu e-mail, telefone ou protocolo (ex: CC10-123456, CC11-123456 ou CC12-123456)');
    return;
  }

  resultDiv.classList.remove('hidden');
  resultDiv.innerHTML = `
    <div class="py-6 text-center text-stone-500">
      <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-coffee-600 mx-auto mb-2"></i>
      <span>Localizando inscrição no sistema...</span>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();

  try {
    const inscricoes = await window.LigaDB.buscarTodasInscricoes(termo);

    if (!inscricoes || inscricoes.length === 0) {
      resultDiv.innerHTML = `
        <div class="p-4 bg-stone-50 border border-stone-200 rounded-2xl text-center space-y-2 text-xs">
          <i data-lucide="search-x" class="w-8 h-8 text-stone-400 mx-auto"></i>
          <h5 class="font-bold text-stone-800 text-sm">Nenhuma inscrição encontrada</h5>
          <p class="text-stone-500">Verifique se digitou o e-mail ou protocolo corretamente, ou realize sua inscrição agora.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Se encontrou mais de 1 inscrição (ex: 10ª e 11ª edições)
    if (inscricoes.length > 1) {
      fecharModalConsulta();
      abrirAreaDoAluno(inscricoes[0]);
      mostrarToast(`Encontramos ${inscricoes.length} inscrições para os seus dados!`);
      return;
    }

    // Se encontrou 1 inscrição: exibe a credencial diretamente
    fecharModalConsulta();
    exibirCredencialSucesso(inscricoes[0]);
    mostrarToast('Inscrição localizada! Sua credencial com QR Code está na tela.');

  } catch (err) {
    resultDiv.innerHTML = `
      <div class="p-3 bg-red-50 text-red-700 text-xs rounded-xl">
        Erro na consulta: ${err.message}
      </div>
    `;
  }
}

// Toast
function mostrarToast(mensagem) {
  let toast = document.getElementById('toastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 transform translate-y-20 opacity-0 border border-stone-700';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <i data-lucide="info" class="w-5 h-5 text-amber-400 shrink-0"></i>
    <span class="text-sm font-medium">${mensagem}</span>
  `;
  if (window.lucide) window.lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3500);
}

// Expõe globalmente
window.toggleMenuMobile = toggleMenuMobile;
window.fecharMenuMobile = fecharMenuMobile;
window.abrirModalLogin = abrirModalLogin;
window.fecharModalLogin = fecharModalLogin;
window.iniciarLoginGoogle = iniciarLoginGoogle;
window.abrirModalGoogleAuth = abrirModalGoogleAuth;
window.fecharModalGoogleAuth = fecharModalGoogleAuth;
window.selecionarContaGoogleRapida = selecionarContaGoogleRapida;
window.toggleInputOutraContaGoogle = toggleInputOutraContaGoogle;
window.confirmarLoginGooglePrompt = confirmarLoginGooglePrompt;
window.inicializarGoogleIdentityServices = inicializarGoogleIdentityServices;
window.executarLoginUsuario = iniciarLoginGoogle;
window.abrirAreaDoAluno = abrirAreaDoAluno;
window.fecharAreaDoAluno = fecharAreaDoAluno;
window.abrirModalConsulta = abrirModalConsulta;
window.fecharModalConsulta = fecharModalConsulta;
window.executarBuscaInscricao = executarBuscaInscricao;
window.fecharCredencialModal = fecharCredencialModal;
window.abrirCredencialPorProtocolo = abrirCredencialPorProtocolo;
window.loginNativoGooglePopup = loginNativoGooglePopup;
window.abrirTutorialGoogleOAuth = abrirTutorialGoogleOAuth;
window.fecharTutorialGoogleOAuth = fecharTutorialGoogleOAuth;
window.salvarGoogleClientIdFromTutorial = salvarGoogleClientIdFromTutorial;

// ============================================================================
// CONTROLE VISUAL DE ENCERRAMENTO DE INSCRIÇÕES (PUBLIC PAGES)
// ============================================================================
function atualizarStatusInscricoesUI() {
  const edicao = window.EDICAO_ATUAL || 10;
  const formInscricao = document.getElementById('formInscricao');
  const btnSubmit = document.getElementById('btnSubmitInscricao');
  
  if (!formInscricao) return;

  const encerradas = window.LigaDB?.estaoInscricoesEncerradas ? window.LigaDB.estaoInscricoesEncerradas(edicao) : false;
  let avisoEl = document.getElementById('avisoInscricoesEncerradas');

  if (encerradas) {
    // Desabilita todos os inputs e botões do formulário exceto botões de consulta
    const formElements = formInscricao.querySelectorAll('input, select, textarea, button');
    formElements.forEach(el => {
      if (el.id !== 'btnVerificarAcessoAluno' && !el.closest('#modalAreaAluno') && !el.closest('#modalCredencialOficial')) {
        el.disabled = true;
      }
    });

    if (btnSubmit) {
      btnSubmit.disabled = true;
      if (!btnSubmit.dataset.originalHtml) {
        btnSubmit.dataset.originalHtml = btnSubmit.innerHTML;
      }
      btnSubmit.className = 'w-full py-4 px-6 rounded-2xl bg-stone-300 text-stone-600 font-bold text-sm sm:text-base cursor-not-allowed shadow-none flex items-center justify-center gap-2 border border-stone-300';
      btnSubmit.innerHTML = `
        <i data-lucide="ban" class="w-5 h-5 text-red-500"></i>
        <span>Inscrições Encerradas para a ${edicao}ª Edição</span>
      `;
    }

    // Exibe banner chamativo no topo do formulário
    if (!avisoEl) {
      avisoEl = document.createElement('div');
      avisoEl.id = 'avisoInscricoesEncerradas';
      avisoEl.className = 'mb-6 p-5 sm:p-6 bg-red-50 border-2 border-red-300 rounded-3xl text-red-950 shadow-md animate-fade-in';
      avisoEl.innerHTML = `
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <i data-lucide="alert-triangle" class="w-6 h-6"></i>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-200 text-red-900">
                Prazo Esgotado
              </span>
              <h4 class="text-base sm:text-lg font-black text-red-900">Inscrições Encerradas</h4>
            </div>
            <p class="text-xs sm:text-sm text-red-800 leading-relaxed font-medium">
              As inscrições online para a <strong>${edicao}ª Edição do Café com Ciência</strong> foram encerradas pela comissão organizadora.
            </p>
            <div class="mt-3 pt-3 border-t border-red-200/80 flex flex-wrap items-center gap-3 text-xs text-red-900">
              <span class="font-bold">Já realizou sua inscrição anteriormente?</span>
              <a href="portal.html" class="inline-flex items-center gap-1 font-bold underline hover:text-red-950">
                <span>Ver Minha Credencial no Portal</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </a>
              <span class="text-red-400">•</span>
              <span>Dúvidas: cafecomcienciaresend@gmail.com</span>
            </div>
          </div>
        </div>
      `;
      formInscricao.parentNode.insertBefore(avisoEl, formInscricao);
    }
  } else {
    // Reabre e restaura formulário
    if (avisoEl) {
      avisoEl.remove();
    }

    const formElements = formInscricao.querySelectorAll('input, select, textarea, button');
    formElements.forEach(el => {
      el.disabled = false;
    });

    if (btnSubmit) {
      btnSubmit.disabled = false;
      if (btnSubmit.dataset.originalHtml) {
        btnSubmit.innerHTML = btnSubmit.dataset.originalHtml;
      }
      btnSubmit.className = 'w-full py-4 px-6 rounded-2xl bg-coffee-800 hover:bg-coffee-900 text-amber-100 font-bold text-sm sm:text-base shadow-xl hover:shadow-2xl hover:shadow-coffee-900/30 transition transform active:scale-[0.99] flex items-center justify-center gap-2 group border border-amber-600/30';
    }
  }

  if (window.lucide) window.lucide.createIcons();
}

window.atualizarStatusInscricoesUI = atualizarStatusInscricoesUI;
