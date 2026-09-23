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

  window.addEventListener('auth_state_changed', () => {
    atualizarInterfaceUsuario();
  });
});

// ============================================================================
// CONTROLE DE INTERFACE POR USUÁRIO (ALUNO VS ORGANIZADOR VS VISITANTE)
// ============================================================================
function atualizarInterfaceUsuario() {
  const usuario = window.LigaDB.getUsuarioLogado();
  const btnPainelLigaDesk = document.getElementById('btnPainelLigaDesktop');
  const btnPainelLigaMob = document.getElementById('btnPainelLigaMobile');
  const userAreaDesk = document.getElementById('userAreaDesktop');
  const userAreaMob = document.getElementById('userAreaMobile');

  if (usuario) {
    const primeiroNome = usuario.nome_completo ? usuario.nome_completo.split(' ')[0] : 'Participante';
    preencherFormularioComUsuario(usuario);

    if (usuario.role === 'organizador') {
      // Organizador logado: mostra o Painel da Liga
      if (btnPainelLigaDesk) btnPainelLigaDesk.classList.remove('hidden');
      if (btnPainelLigaMob) btnPainelLigaMob.classList.remove('hidden');

      if (userAreaDesk) {
        userAreaDesk.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200">
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
          <div class="flex items-center gap-2">
            <button onclick="abrirAreaDoAluno()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-coffee-950 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-300 transition shadow-xs">
              <i data-lucide="user-check" class="w-4 h-4 text-coffee-700"></i>
              <span>Olá, ${primeiroNome}</span>
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
              <i data-lucide="user-check" class="w-4 h-4 text-coffee-700"></i>
              <span>Minha Conta (${primeiroNome})</span>
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
        <button onclick="abrirModalLogin()" class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-coffee-950 bg-stone-100 hover:bg-stone-200 rounded-xl border border-stone-200 transition">
          <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
          <span>Entrar com o Google</span>
        </button>
      `;
    }
    if (userAreaMob) {
      userAreaMob.innerHTML = `
        <button onclick="fecharMenuMobile(); abrirModalLogin();" class="w-full py-2.5 px-4 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs">
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
// CONFIGURAÇÃO DO PIX
// ============================================================================
function configurarPix() {
  const chavePixEl = document.getElementById('chavePixText');
  const titularPixEl = document.getElementById('titularPixText');
  const btnCopiarPix = document.getElementById('btnCopiarPix');
  const qrCodeImg = document.getElementById('pixQrCode');

  const config = window.LigaDB?.PIX_CONFIG || {
    chave: 'cafecomciencia.liga@gmail.com',
    titular: 'Organização Café com Ciência',
    valor: '10.00'
  };

  if (chavePixEl) chavePixEl.textContent = config.chave;
  if (titularPixEl) titularPixEl.textContent = `${config.titular} (R$ ${config.valor})`;

  if (qrCodeImg) {
    const qrData = encodeURIComponent(config.chave);
    qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}&color=2B1810&bgcolor=FFFFFF&margin=1`;
  }

  if (btnCopiarPix) {
    btnCopiarPix.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(config.chave);
        
        const originalText = btnCopiarPix.innerHTML;
        btnCopiarPix.innerHTML = `
          <i data-lucide="check" class="w-4 h-4 text-emerald-600"></i>
          <span class="text-emerald-700 font-semibold">Chave Copiada!</span>
        `;
        btnCopiarPix.classList.add('bg-emerald-50', 'border-emerald-300');
        if (window.lucide) window.lucide.createIcons();

        mostrarToast('Chave Pix copiada com sucesso! Abra o app do seu banco e cole.');

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

  if (!form) return;

  // Preenche dados se já houver usuário logado
  const usuarioInicial = window.LigaDB.getUsuarioLogado();
  if (usuarioInicial) preencherFormularioComUsuario(usuarioInicial);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

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
        comprovanteFile: comprovanteArquivoSelecionado
      });

      exibirCredencialSucesso(resultado.data);

      form.reset();
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

// ============================================================================
// EXIBIR CREDENCIAL DE INSCRIÇÃO COM QR CODE EM TAMANHO REAL (ALTA DEFINIÇÃO)
// ============================================================================
function exibirCredencialSucesso(aluno) {
  const modal = document.getElementById('credencialModal');
  const target = document.getElementById('credencialContent');

  if (!modal || !target || !aluno) return;

  // QR Code em alta definição (350x350) com margem adequada para leitura fácil por câmeras
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(aluno.protocolo)}&color=2B1810&bgcolor=FFFFFF&margin=2`;

  target.innerHTML = `
    <div id="credencialCardPrint" class="bg-white rounded-3xl p-6 sm:p-8 border-2 border-coffee-200 shadow-2xl relative overflow-hidden">
      
      <!-- Topo da Credencial -->
      <div class="flex items-center justify-between pb-4 border-b border-coffee-100">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-xl bg-white p-1 border border-coffee-200 shadow-sm shrink-0">
            <img src="logo.png" alt="Logo" class="w-full h-full object-contain" />
          </div>
          <div>
            <h4 class="font-bold text-coffee-950 text-sm leading-tight">10° Café com Ciência</h4>
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
      </div>

      <!-- AVISO DE COMPROVANTE EM ANÁLISE (FICA COM O ALUNO) -->
      <div class="mb-4 p-3.5 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-950 space-y-1 text-left">
        <div class="flex items-center gap-1.5 font-bold text-amber-900">
          <i data-lucide="shield-check" class="w-4 h-4 text-amber-600 shrink-0"></i>
          <span>Comprovante Pix em Análise Manual</span>
        </div>
        <p class="text-[11px] leading-relaxed text-amber-850">
          Seu comprovante foi recebido pela organização da liga para conferência. <strong>Esta credencial e seu QR Code oficial em tamanho real já estão assegurados com você para o dia da palestra!</strong>
        </p>
      </div>

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
          <span><strong>Data:</strong> 30 de Outubro · 15:00 horas</span>
        </div>
        <div class="flex items-center gap-2 font-medium">
          <i data-lucide="map-pin" class="w-3.5 h-3.5 text-coffee-600"></i>
          <span><strong>Local:</strong> UniArnaldo - Campus Anchieta (Sala 202)</span>
        </div>
        <div class="flex items-center gap-2 font-medium">
          <i data-lucide="user-check" class="w-3.5 h-3.5 text-coffee-600"></i>
          <span><strong>Palestra:</strong> Profa. Carolina Diniz</span>
        </div>
      </div>

      <!-- Ações: Imprimir / Certificado / Sair -->
      <div class="space-y-2 pt-2">
        ${aluno.presenca_confirmada ? `
          <a href="certificados.html?protocolo=${aluno.protocolo}" target="_blank" class="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2">
            <i data-lucide="award" class="w-5 h-5"></i>
            <span>Visualizar / Baixar Certificado Oficial (4h)</span>
          </a>
        ` : ''}

        <button onclick="window.print()" class="w-full py-3 px-4 bg-stone-900 hover:bg-black text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm">
          <i data-lucide="printer" class="w-4 h-4"></i>
          <span>Imprimir / Salvar Credencial em PDF</span>
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

  if (typeof confetti === 'function') {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#C69255', '#4A2E1B', '#0D9488', '#009ce4']
    });
  }

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

function iniciarLoginGoogle() {
  const sb = window.LigaDB.getSupabase();
  // Se o Supabase estiver online com provedor Google OAuth ativo
  if (sb && sb.auth && typeof sb.auth.signInWithOAuth === 'function' && window.location.protocol.startsWith('http')) {
    try {
      sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });
      return;
    } catch (e) {
      console.warn('Fallback para seletor direto Google:', e);
    }
  }

  // Modal com seletor Google direto (suporta demo local e ambiente web)
  fecharModalLogin();
  abrirModalGoogleAuth();
}

function abrirModalGoogleAuth() {
  const modal = document.getElementById('modalGoogleAuth');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const inputNome = document.getElementById('googleInputNome');
    const inputEmail = document.getElementById('googleInputEmail');
    if (inputEmail) inputEmail.focus();
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
      exibirCredencialSucesso(usuario);
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
// SISTEMA DE CONTAS: ÁREA DO ALUNO (PAINEL PESSOAL & CREDENCIAL COMPLETA)
// ============================================================================
async function abrirAreaDoAluno() {
  const usuario = window.LigaDB.getUsuarioLogado();

  if (!usuario) {
    abrirModalLogin();
    return;
  }

  // Busca dados mais recentes no banco
  let alunoAtualizado = usuario;
  try {
    const fresh = await window.LigaDB.buscarInscricao(usuario.protocolo || usuario.email);
    if (fresh) alunoAtualizado = { ...usuario, ...fresh };
  } catch (e) {}

  // Se o aluno já tem inscrição registrada, abre DIRETAMENTE a credencial em tamanho real!
  if (alunoAtualizado.protocolo) {
    exibirCredencialSucesso(alunoAtualizado);
    return;
  }

  // Se o usuário logou com Google antes de se inscrever, mostra o status pré-inscrito
  const modal = document.getElementById('areaAlunoModal');
  const content = document.getElementById('areaAlunoContent');
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="space-y-6 text-center py-2">
      <div class="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
        <i data-lucide="user-check" class="w-8 h-8"></i>
      </div>

      <div>
        <h3 class="text-xl font-black text-coffee-950">${alunoAtualizado.nome_completo}</h3>
        <p class="text-xs text-stone-500 font-mono">${alunoAtualizado.email}</p>
        <span class="inline-block mt-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-xs font-semibold">
          ✓ Conta Google Conectada
        </span>
      </div>

      <div class="p-4 bg-amber-50/90 rounded-2xl border border-amber-200 text-xs text-amber-900 text-left space-y-2">
        <p class="font-bold flex items-center gap-1.5 text-amber-950">
          <i data-lucide="info" class="w-4 h-4 text-amber-600 shrink-0"></i>
          Quase lá! Conclua sua inscrição:
        </p>
        <p class="leading-relaxed">
          Você já está conectado ao sistema, mas ainda não concluiu o pagamento do Pix de R$ 10,00 para gerar sua credencial oficial com o QR Code de entrada.
        </p>
      </div>

      <div class="space-y-2 pt-2">
        <a href="#inscricao" onclick="fecharAreaDoAluno()" class="w-full py-3.5 px-4 gradient-cta text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2">
          <i data-lucide="arrow-right-circle" class="w-5 h-5"></i>
          <span>Garantir Vaga e Fazer Inscrição Agora (R$ 10)</span>
        </a>
        <button onclick="window.LigaDB.fazerLogout()" class="w-full py-2 px-4 text-stone-400 hover:text-red-600 text-xs font-semibold transition">
          Sair da Conta Google
        </button>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
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
    alert('Digite seu e-mail, telefone ou protocolo (ex: CC10-123456)');
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
    const aluno = await window.LigaDB.buscarInscricao(termo);

    if (!aluno) {
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

    // Fecha o modal de busca e exibe DIRETAMENTE a credencial em tamanho real com o grande QR code
    fecharModalConsulta();
    exibirCredencialSucesso(aluno);
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
window.executarLoginUsuario = executarLoginUsuario;
window.abrirAreaDoAluno = abrirAreaDoAluno;
window.fecharAreaDoAluno = fecharAreaDoAluno;
window.abrirModalConsulta = abrirModalConsulta;
window.fecharModalConsulta = fecharModalConsulta;
window.executarBuscaInscricao = executarBuscaInscricao;
window.fecharCredencialModal = fecharCredencialModal;
window.abrirCredencialPorProtocolo = abrirCredencialPorProtocolo;
