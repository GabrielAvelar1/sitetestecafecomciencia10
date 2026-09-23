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
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
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

// Processa o código (tanto via câmera quanto via digitação manual)
async function processarCodigoCheckin(codigoBruto) {
  const resultDiv = document.getElementById('qrReaderResult');
  if (!resultDiv) return;

  resultDiv.classList.remove('hidden');
  resultDiv.innerHTML = `
    <div class="p-4 bg-stone-100 rounded-xl flex items-center justify-center gap-2 text-stone-700">
      <i data-lucide="loader-2" class="w-5 h-5 animate-spin text-amber-700"></i>
      <span>Consultando credencial no banco de dados...</span>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();

  try {
    const resposta = await window.LigaDB.validarPresencaPorQRCode(codigoBruto, 'Portaria Oficial');
    const aluno = resposta.aluno;

    const dataHoraCheckin = new Date(aluno.presenca_horario || Date.now()).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const statusPagamentoBadge = aluno.status_pagamento === 'aprovado'
      ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Pagamento Pix Aprovado</span>`
      : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">Pagamento Pendente</span>`;

    if (resposta.jaConfirmado) {
      resultDiv.innerHTML = `
        <div class="p-5 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-3 animate-pulse-glow">
          <div class="flex items-center gap-3 text-amber-800">
            <i data-lucide="alert-triangle" class="w-8 h-8 shrink-0 text-amber-600"></i>
            <div>
              <h4 class="font-bold text-base">Check-in Já Realizado!</h4>
              <p class="text-xs text-amber-700">Este participante já teve sua presença validada na portaria.</p>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-amber-200 text-xs space-y-1">
            <div class="flex justify-between"><strong>Aluno:</strong> <span>${aluno.nome_completo}</span></div>
            <div class="flex justify-between"><strong>Protocolo:</strong> <span class="font-mono font-bold">${aluno.protocolo}</span></div>
            <div class="flex justify-between"><strong>Horário do Check-in:</strong> <span>${dataHoraCheckin}</span></div>
            <div class="flex justify-between items-center pt-1 border-t border-amber-100">
              <strong>Status Pix:</strong> ${statusPagamentoBadge}
            </div>
          </div>

          <div class="flex gap-2 pt-1">
            <a href="certificados.html?protocolo=${aluno.protocolo}" target="_blank" class="flex-1 text-center py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition">
              Ver Certificado Oficial
            </a>
            <button onclick="retomarScanner()" class="py-2.5 px-4 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-bold text-xs transition">
              Escanear Próximo
            </button>
          </div>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="p-5 bg-emerald-50 border-2 border-emerald-500 rounded-2xl space-y-3">
          <div class="flex items-center gap-3 text-emerald-800">
            <div class="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0">
              <i data-lucide="check" class="w-6 h-6 stroke-[3]"></i>
            </div>
            <div>
              <h4 class="font-black text-lg text-emerald-950">Presença Validada com Sucesso!</h4>
              <p class="text-xs text-emerald-700">Entrada autorizada e certificado de participação liberado.</p>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-emerald-200 text-xs space-y-1.5 text-stone-800">
            <div class="flex justify-between"><strong>Aluno:</strong> <span class="font-bold text-sm text-stone-950">${aluno.nome_completo}</span></div>
            <div class="flex justify-between"><strong>Protocolo:</strong> <span class="font-mono font-bold text-coffee-800">${aluno.protocolo}</span></div>
            <div class="flex justify-between"><strong>E-mail:</strong> <span>${aluno.email}</span></div>
            <div class="flex justify-between items-center pt-1 border-t border-emerald-100">
              <strong>Status Pix:</strong> ${statusPagamentoBadge}
            </div>
          </div>

          <div class="flex gap-2 pt-1">
            <a href="certificados.html?protocolo=${aluno.protocolo}" target="_blank" class="flex-1 text-center py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm">
              <i data-lucide="award" class="w-4 h-4"></i>
              <span>Abrir Certificado Oficial</span>
            </a>
            <button onclick="retomarScanner()" class="py-2.5 px-4 bg-stone-900 hover:bg-black text-white rounded-xl font-bold text-xs transition">
              Escanear Próximo
            </button>
          </div>
        </div>
      `;

      // Atualiza listagem admin se estiver aberta
      if (typeof carregarInscricoesAdmin === 'function') {
        carregarInscricoesAdmin();
      }
    }

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    resultDiv.innerHTML = `
      <div class="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs text-red-700">
        <div class="flex items-center gap-2 font-bold text-sm">
          <i data-lucide="x-circle" class="w-5 h-5 text-red-600"></i>
          <span>Código Não Reconhecido</span>
        </div>
        <p>${err.message || 'Não foi possível validar o código informado.'}</p>
        <button onclick="retomarScanner()" class="mt-2 py-2 px-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition">
          Tentar Novamente
        </button>
      </div>
    `;
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
  retomarScanner
};
