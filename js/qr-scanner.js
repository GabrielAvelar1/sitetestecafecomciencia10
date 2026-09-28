/**
 * Módulo de Leitor de QR Code para a Portaria do Evento
 * 10° Café com Ciência
 */

let html5QrCode = null;
let isScanning = false;

// Toca bipe de confirmação com Web Audio API
function tocarBipeSucesso() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota Lá (A5)
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15); // A6

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.16);
  } catch (e) {
    console.log('Audio feedback indisponível:', e);
  }
}

// Iniciar Leitor de Câmera
async function iniciarLeitorPortaria() {
  const container = document.getElementById('qrReaderContainer');
  const resultDiv = document.getElementById('qrReaderResult');
  const btnStart = document.getElementById('btnStartScanner');
  const btnStop = document.getElementById('btnStopScanner');

  if (!window.Html5Qrcode) {
    alert('Biblioteca de leitura de QR Code ainda está carregando. Tente novamente em 2 segundos.');
    return;
  }

  if (resultDiv) resultDiv.classList.add('hidden');

  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("qrReaderVideoBox");
    }

    const config = {
      fps: 15,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const edgeSize = Math.max(Math.floor(minEdge * 0.85), 260);
        return { width: edgeSize, height: edgeSize };
      },
      aspectRatio: 1.333333
    };

    // Preferência pela câmera traseira (environment)
    await html5QrCode.start(
      { facingMode: "environment" },
      config,
      aoEscanearCodigo,
      (errorMessage) => {
        // Ignora erros de frame contínuos
      }
    );

    isScanning = true;
    if (btnStart) btnStart.classList.add('hidden');
    if (btnStop) btnStop.classList.remove('hidden');

  } catch (err) {
    console.error('Erro ao acessar câmera:', err);
    alert('Não foi possível acessar a câmera. Verifique as permissões do navegador ou utilize o campo de digitação manual do código logo abaixo.');
  }
}

// Parar Leitor de Câmera
async function pararLeitorPortaria() {
  const btnStart = document.getElementById('btnStartScanner');
  const btnStop = document.getElementById('btnStopScanner');

  if (html5QrCode && isScanning) {
    try {
      await html5QrCode.stop();
      isScanning = false;
    } catch (e) {
      console.warn('Erro ao parar scanner:', e);
    }
  }

  if (btnStart) btnStart.classList.remove('hidden');
  if (btnStop) btnStop.classList.add('hidden');
}

// Callback executado ao ler QR Code com sucesso
async function aoEscanearCodigo(decodedText) {
  // Pausa para evitar múltiplas leituras simultâneas
  if (html5QrCode && isScanning) {
    try {
      await html5QrCode.pause(true);
    } catch (e) {}
  }

  tocarBipeSucesso();
  await processarCodigoCheckin(decodedText);
}

// Fecha o modal de validação e retoma a leitura
function fecharModalValidacao() {
  const modal = document.getElementById('modalValidacaoPortaria');
  if (modal) modal.classList.add('hidden');
  retomarScanner();
}

// Processa o código (tanto via câmera quanto via digitação manual)
async function processarCodigoCheckin(codigoBruto) {
  const modal = document.getElementById('modalValidacaoPortaria');
  const conteudo = document.getElementById('conteudoValidacaoPortaria');
  const resultDiv = document.getElementById('qrReaderResult');

  // Abre modal centralizado na tela
  if (modal && conteudo) {
    modal.classList.remove('hidden');
    conteudo.innerHTML = `
      <div class="py-12 text-center text-stone-600 space-y-3">
        <i data-lucide="loader-2" class="w-10 h-10 animate-spin text-coffee-700 mx-auto"></i>
        <h4 class="font-bold text-base text-coffee-950">Validando Credencial...</h4>
        <p class="text-xs text-stone-500 font-mono">${codigoBruto}</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  try {
    const resposta = await window.LigaDB.validarPresencaPorQRCode(codigoBruto, 'Portaria Oficial');
    const aluno = resposta.aluno;

    const dataHoraCheckin = new Date(aluno.presenca_horario || Date.now()).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const statusPagamentoBadge = aluno.status_pagamento === 'aprovado'
      ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">✓ Pix Aprovado</span>`
      : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">⏳ Pix Pendente</span>`;

    const htmlResultado = `
      <div class="space-y-4 text-center">
        <!-- Ícone Destaque -->
        <div class="w-16 h-16 rounded-3xl ${resposta.jaConfirmado ? 'bg-amber-100 text-amber-800 border-2 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'} flex items-center justify-center mx-auto shadow-sm">
          <i data-lucide="${resposta.jaConfirmado ? 'alert-triangle' : 'check'}" class="w-8 h-8 stroke-[2.5]"></i>
        </div>

        <div>
          <span class="text-xs uppercase tracking-wider text-stone-400 font-bold block mb-1">Check-in de Portaria</span>
          <h3 class="text-xl sm:text-2xl font-black text-stone-900 leading-tight">${aluno.nome_completo}</h3>
          <div class="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-coffee-50 border border-coffee-200 rounded-full font-mono text-xs font-bold text-coffee-950">
            <span>Código:</span> <span>${aluno.protocolo}</span>
          </div>
        </div>

        <div class="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-left space-y-2">
          <div class="flex justify-between items-center pb-2 border-b border-stone-200">
            <span class="text-stone-500 font-medium">Status Pix:</span>
            ${statusPagamentoBadge}
          </div>
          <div class="flex justify-between items-center pb-2 border-b border-stone-200">
            <span class="text-stone-500 font-medium">Presença:</span>
            <span class="font-bold ${resposta.jaConfirmado ? 'text-amber-800' : 'text-emerald-700'}">
              ${resposta.jaConfirmado ? `Registrada às ${dataHoraCheckin}` : `✓ Confirmada com Sucesso!`}
            </span>
          </div>
          <div class="flex justify-between items-center text-[11px] text-stone-500">
            <span>E-mail:</span>
            <span class="font-mono truncate max-w-[200px]">${aluno.email}</span>
          </div>
        </div>

        <div class="space-y-2 pt-2">
          <button 
            onclick="QRScannerPortaria.fecharModalValidacao()" 
            class="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            <i data-lucide="scan-line" class="w-4 h-4"></i>
            <span>Escanear Próximo Participante</span>
          </button>

          ${aluno.comprovante_url ? `
            <button 
              onclick="visualizarComprovante('${aluno.id}')" 
              class="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <i data-lucide="file-text" class="w-3.5 h-3.5 text-stone-600"></i>
              <span>Ver Comprovante Pix Anexado</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;

    if (conteudo) conteudo.innerHTML = htmlResultado;
    if (resultDiv) {
      resultDiv.classList.remove('hidden');
      resultDiv.innerHTML = htmlResultado;
    }

    // Atualiza listagem admin se estiver aberta
    if (typeof carregarInscricoesAdmin === 'function') {
      carregarInscricoesAdmin();
    }

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    const htmlErro = `
      <div class="space-y-4 text-center">
        <div class="w-16 h-16 rounded-3xl bg-red-100 text-red-800 border-2 border-red-300 flex items-center justify-center mx-auto">
          <i data-lucide="x-circle" class="w-8 h-8"></i>
        </div>
        <div>
          <h3 class="text-lg font-bold text-red-950">Código Não Reconhecido</h3>
          <p class="text-xs text-red-700 mt-1">${err.message || 'Credencial não localizada no sistema.'}</p>
        </div>
        <button 
          onclick="QRScannerPortaria.fecharModalValidacao()" 
          class="w-full py-3 px-4 bg-stone-900 hover:bg-black text-white font-bold text-xs rounded-xl transition"
        >
          Tentar Novamente
        </button>
      </div>
    `;
    if (conteudo) conteudo.innerHTML = htmlErro;
    if (resultDiv) {
      resultDiv.classList.remove('hidden');
      resultDiv.innerHTML = htmlErro;
    }
    if (window.lucide) window.lucide.createIcons();
  }
}

// Retoma o scanner após ler
function retomarScanner() {
  const resultDiv = document.getElementById('qrReaderResult');
  if (resultDiv) resultDiv.classList.add('hidden');

  if (html5QrCode && isScanning) {
    try {
      html5QrCode.resume();
    } catch (e) {}
  }
}

// Submissão manual de código
function validarCodigoManual() {
  const input = document.getElementById('inputCodigoManual');
  if (!input) return;
  const codigo = input.value.trim();
  if (!codigo) {
    alert('Por favor, digite o protocolo (Ex: CC10-123456).');
    return;
  }
  processarCodigoCheckin(codigo);
  input.value = '';
}

window.QRScannerPortaria = {
  iniciarLeitorPortaria,
  pararLeitorPortaria,
  processarCodigoCheckin,
  validarCodigoManual,
  retomarScanner,
  fecharModalValidacao
};
