/**
 * Serviço de Envio de E-mails Transacionais - Resend
 * 10° Café com Ciência: Os Direitos dos Pacientes na Odontologia
 */

(function() {
  const EMAIL_STORAGE_KEYS = {
    API_KEY: 'cafe_resend_api_key',
    FROM: 'cafe_resend_from',
    AUTO_INSCRICAO: 'cafe_email_auto_inscricao',
    AUTO_PRESENCA: 'cafe_email_auto_presenca',
    GMAIL_USER: 'cafe_gmail_user',
    GMAIL_APP_PASS: 'cafe_gmail_app_pass'
  };

  const DEFAULT_API_KEY = typeof atob === 'function' ? atob('cmVfQ1N3b05TeW1fTXczdXdqWThRTERLdktHdTJYRk5jb3NS') : '';
  const DEFAULT_GMAIL_USER = 'cafecomcienciaresend@gmail.com';
  const DEFAULT_GMAIL_PASS = 'glaf onfh ffcd eqvi';
  const DEFAULT_FROM = 'Café com Ciência <cafecomcienciaresend@gmail.com>';

  function getResendApiKey() {
    return localStorage.getItem(EMAIL_STORAGE_KEYS.API_KEY) || DEFAULT_API_KEY;
  }

  function getResendFrom() {
    return localStorage.getItem(EMAIL_STORAGE_KEYS.FROM) || DEFAULT_FROM;
  }

  function getGmailUser() {
    return localStorage.getItem(EMAIL_STORAGE_KEYS.GMAIL_USER) || DEFAULT_GMAIL_USER;
  }

  function getGmailAppPassword() {
    return localStorage.getItem(EMAIL_STORAGE_KEYS.GMAIL_APP_PASS) || DEFAULT_GMAIL_PASS;
  }

  function salvarConfigGmail(user, pass) {
    if (user !== undefined) localStorage.setItem(EMAIL_STORAGE_KEYS.GMAIL_USER, user.trim());
    if (pass !== undefined) localStorage.setItem(EMAIL_STORAGE_KEYS.GMAIL_APP_PASS, pass.trim());
    return true;
  }

  function isGmailConfigurado() {
    const user = getGmailUser();
    const pass = getGmailAppPassword();
    return Boolean(user && user.includes('@') && pass && pass.length >= 8);
  }

  function salvarConfigResend(apiKey, from) {
    if (apiKey) localStorage.setItem(EMAIL_STORAGE_KEYS.API_KEY, apiKey.trim());
    if (from) localStorage.setItem(EMAIL_STORAGE_KEYS.FROM, from.trim());
    return true;
  }

  function isEmailAutoInscricao() {
    return localStorage.getItem(EMAIL_STORAGE_KEYS.AUTO_INSCRICAO) !== 'false';
  }

  function isEmailAutoPresenca() {
    return localStorage.getItem(EMAIL_STORAGE_KEYS.AUTO_PRESENCA) !== 'false';
  }

  function salvarTogglesEmail(autoInscricao, autoPresenca) {
    localStorage.setItem(EMAIL_STORAGE_KEYS.AUTO_INSCRICAO, autoInscricao ? 'true' : 'false');
    localStorage.setItem(EMAIL_STORAGE_KEYS.AUTO_PRESENCA, autoPresenca ? 'true' : 'false');
  }

  function isResendConfigurado() {
    return isGmailConfigurado() || Boolean(getResendApiKey() && getResendApiKey().startsWith('re_'));
  }

  function getUrlBase() {
    return window.location.origin + window.location.pathname.replace('index.html', '');
  }

  /**
   * Disparo central via Netlify Function
   */
  async function enviarEmail({ to, subject, html, text }) {
    if (!to) throw new Error('Destinatário não informado.');
    if (!subject) throw new Error('Assunto não informado.');

    const endpoint = '/.netlify/functions/send-email';
    const apiKey = getResendApiKey();
    const from = getResendFrom();

    const payload = {
      to,
      subject,
      html,
      text,
      from,
      apiKey: apiKey || undefined,
      gmailUser: getGmailUser() || undefined,
      gmailAppPassword: getGmailAppPassword() || undefined
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao enviar e-mail via Resend.');
      }

      return data;
    } catch (err) {
      console.warn('Erro ao disparar e-mail:', err);
      throw err;
    }
  }

  /**
   * Identifica os dados específicos da edição do evento (10ª ou 11ª)
   */
  function obterDadosEdicao(alunoOuEdicao) {
    let edicao = 10;

    if (typeof alunoOuEdicao === 'number') {
      edicao = alunoOuEdicao;
    } else if (typeof alunoOuEdicao === 'string') {
      const str = alunoOuEdicao.toUpperCase();
      if (str.startsWith('CC12-') || str === '12') edicao = 12;
      else if (str.startsWith('CC11-') || str === '11') edicao = 11;
      else edicao = 10;
    } else if (alunoOuEdicao && typeof alunoOuEdicao === 'object') {
      const proto = (alunoOuEdicao.protocolo || '').toUpperCase();
      if (proto.startsWith('CC12-')) {
        edicao = 12;
      } else if (proto.startsWith('CC11-')) {
        edicao = 11;
      } else if (proto.startsWith('CC10-')) {
        edicao = 10;
      } else if (alunoOuEdicao.edicao) {
        edicao = parseInt(alunoOuEdicao.edicao, 10);
      } else if (typeof window !== 'undefined' && window.EDICAO_ATUAL) {
        edicao = window.EDICAO_ATUAL;
      }
    }

    if (edicao === 12) {
      return {
        edicao: 12,
        is12: true,
        numeroOrdinal: '12°',
        numeroOrdinalFem: '12ª',
        tituloEdicao: '12° CAFÉ COM CIÊNCIA',
        subtituloEdicao: 'Diagnóstico e Planejamento na Reabilitação Oral',
        badgePadrao: '12ª Edição Especial · UniArnaldo',
        dataHora: '18 de Novembro de 2026 às 16:00 horas',
        dataCurta: '18/11 às 16h',
        local: 'UniArnaldo · Campus Anchieta (Sala 306)',
        palestrante: 'Dra. Thaissa Calab',
        urlPagina: '12cafe.html'
      };
    }

    if (edicao === 11) {
      return {
        edicao: 11,
        is11: true,
        numeroOrdinal: '11°',
        numeroOrdinalFem: '11ª',
        tituloEdicao: '11° CAFÉ COM CIÊNCIA',
        subtituloEdicao: '10 anos do projeto NAM em Belo Horizonte',
        badgePadrao: '11ª Edição Especial · UniArnaldo',
        dataHora: '13 de Novembro de 2026 às 15:00 horas',
        dataCurta: '13/11 às 15h',
        local: 'UniArnaldo · Campus Anchieta (Sala 306)',
        palestrante: 'Prof. Dr. Henrique Pretti',
        urlPagina: '11cafe.html'
      };
    }

    return {
      edicao: 10,
      is10: true,
      numeroOrdinal: '10°',
      numeroOrdinalFem: '10ª',
      tituloEdicao: '10° CAFÉ COM CIÊNCIA',
      subtituloEdicao: 'Atendimento Odontológico de Pacientes Hospitalizados',
      badgePadrao: '10ª Edição Comemorativa · UniArnaldo',
      dataHora: '30 de Outubro de 2026 às 15:00 horas',
      dataCurta: '30/10 às 15h',
      local: 'UniArnaldo · Campus Anchieta (Sala 306)',
      palestrante: 'Profa. Carolina Diniz',
      urlPagina: 'index.html'
    };
  }

  /**
   * Template Base HTML com Estilo Visual Sofisticado adaptável à Edição (10 ou 11)
   */
  function gerarLayoutHtmlBase({ preheader, titulo, badge, conteudoHtml, botaoTexto, botaoLink, aluno, edicao }) {
    const dados = obterDadosEdicao(aluno || edicao);

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${titulo}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f7f4ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d2621; line-height: 1.6;">
        <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
          ${preheader || titulo}
        </div>
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f4ef; padding: 24px 12px;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(45, 38, 33, 0.08); border: 1px solid #ebd9c8;">
                
                <!-- Topo com Identidade Visual Dinâmica da Edição -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1f140e 0%, #3d2417 100%); padding: 36px 32px 30px 32px; text-align: center;">
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 30px; padding: 6px 16px; margin-bottom: 16px;">
                      <span style="color: #f3d4b6; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                        ${badge || dados.badgePadrao}
                      </span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.5px;">
                      ${dados.tituloEdicao}
                    </h1>
                    <p style="color: #ebd9c8; font-size: 14px; margin: 0; font-style: italic;">
                      ${dados.subtituloEdicao}
                    </p>
                  </td>
                </tr>

                <!-- Conteúdo Central -->
                <tr>
                  <td style="padding: 36px 32px 28px 32px;">
                    <h2 style="color: #2b1810; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">
                      ${titulo}
                    </h2>
                    
                    <div style="font-size: 15px; color: #4a3f35; line-height: 1.6;">
                      ${conteudoHtml}
                    </div>

                    ${botaoTexto && botaoLink ? `
                      <div style="text-align: center; margin: 32px 0 16px 0;">
                        <a href="${botaoLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #a65824 0%, #803915 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(166, 88, 36, 0.35);">
                          ${botaoTexto} →
                        </a>
                      </div>
                    ` : ''}
                  </td>
                </tr>

                <!-- Dados do Evento em Caixa de Destaque -->
                <tr>
                  <td style="padding: 0 32px 28px 32px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fbf8f5; border-radius: 14px; border: 1px solid #ebd9c8; padding: 18px 20px;">
                      <tr>
                        <td>
                          <div style="font-size: 13px; font-weight: 700; color: #733c1a; margin-bottom: 8px; text-transform: uppercase;">
                            📌 Informações Oficiais do Evento:
                          </div>
                          <div style="font-size: 13px; color: #4a3f35; line-height: 1.5;">
                            <strong>📅 Data:</strong> ${dados.dataHora}<br>
                            <strong>📍 Local:</strong> ${dados.local}<br>
                            <strong>👩‍⚕️ Palestrante:</strong> ${dados.palestrante}<br>
                            <strong>☕ Incluso:</strong> Coffee Break & Certificado Oficial de 4 Horas
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Rodapé -->
                <tr>
                  <td style="background-color: #f4eee6; padding: 24px 32px; border-top: 1px solid #e7d8c7; text-align: center; font-size: 12px; color: #7d6f62;">
                    <p style="margin: 0 0 6px 0; font-weight: 600; color: #4a3f35;">
                      Liga Acadêmica de Odontologia · UniArnaldo
                    </p>
                    <p style="margin: 0 0 10px 0;">
                      Dúvidas ou suporte? Entre em contato: 
                      <a href="mailto:cafecomcienciaresend@gmail.com" style="color: #a65824; text-decoration: none; font-weight: 600;">cafecomcienciaresend@gmail.com</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #a49688;">
                      Instagram Oficial: <a href="https://www.instagram.com/cafecomciencia.arnaldobh/" target="_blank" style="color: #a65824; text-decoration: none;">@cafecomciencia.arnaldobh</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * 1. E-mail de Confirmação de Inscrição Recebida
   */
  async function enviarEmailInscricao(aluno) {
    if (!aluno || !aluno.email) return;

    const urlBase = getUrlBase();
    const dados = obterDadosEdicao(aluno);
    const linkPagina = `${urlBase}${dados.urlPagina}?consultar=${aluno.protocolo}`;

    const conteudoHtml = `
      <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
      <p>Sua inscrição para o <strong>${dados.tituloEdicao}: ${dados.subtituloEdicao}</strong> com a <strong>${dados.palestrante}</strong> foi registrada com sucesso no sistema oficial da liga acadêmica!</p>
      
      <div style="background-color: #fff9f3; border-left: 4px solid #a65824; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
        <div style="font-size: 12px; color: #733c1a; text-transform: uppercase; font-weight: 700;">Seu Protocolo Oficial:</div>
        <div style="font-size: 22px; font-weight: 800; font-family: monospace; color: #2b1810; margin: 4px 0;">${aluno.protocolo}</div>
        <div style="font-size: 12px; color: #6b5c4f;">Status: Comprovante Pix anexado para conferência da comissão.</div>
      </div>

      <p>Sua <strong>Credencial Digital com QR Code</strong> exclusivo já está disponível. Você deverá apresentá-la na portaria no dia <strong>${dados.dataHora}</strong> para validação de presença e liberação do seu certificado.</p>
      <p>Você pode acessar sua credencial a qualquer momento pelo botão abaixo:</p>
    `;

    return enviarEmail({
      to: aluno.email,
      subject: `☕ Inscrição Recebida! ${dados.numeroOrdinal} Café com Ciência [${aluno.protocolo}]`,
      html: gerarLayoutHtmlBase({
        preheader: `Sua inscrição no ${dados.numeroOrdinal} Café com Ciência foi recebida! Protocolo: ${aluno.protocolo}`,
        titulo: 'Inscrição Registrada com Sucesso!',
        badge: `Inscrição Confirmada · ${dados.numeroOrdinalFem} Edição`,
        conteudoHtml,
        botaoTexto: 'Visualizar Minha Credencial e QR Code',
        botaoLink: linkPagina,
        aluno
      })
    });
  }

  /**
   * 2. E-mail de Confirmação de Presença (Check-in Portaria)
   */
  async function enviarEmailPresencaConfirmada(aluno) {
    if (!aluno || !aluno.email) return;

    const urlBase = getUrlBase();
    const dados = obterDadosEdicao(aluno);
    const linkCertificado = `${urlBase}certificados.html?protocolo=${aluno.protocolo}`;

    const conteudoHtml = `
      <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
      <p>Sua presença no <strong>${dados.tituloEdicao}: ${dados.subtituloEdicao}</strong> acaba de ser <strong>confirmada com sucesso na portaria oficial</strong>!</p>
      
      <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
        <div style="font-size: 12px; color: #15803d; text-transform: uppercase; font-weight: 700;">Check-in Confirmado</div>
        <div style="font-size: 15px; font-weight: 700; color: #166534; margin: 4px 0;">Presença Validada · ${dados.local}</div>
        <div style="font-size: 12px; color: #365314;">Horas Complementares: 4 horas acadêmicas garantidas.</div>
      </div>

      <p>Esperamos que aproveite a palestra com a <strong>${dados.palestrante}</strong> e o nosso coffee break com networking!</p>
      <p>Assim que a comissão organizadora concluir a assinatura das declarações, seu <strong>Certificado Oficial de 4 horas</strong> estará disponível para download no link abaixo:</p>
    `;

    return enviarEmail({
      to: aluno.email,
      subject: `✅ Presença Confirmada! ${dados.numeroOrdinal} Café com Ciência · UniArnaldo`,
      html: gerarLayoutHtmlBase({
        preheader: `Sua presença no ${dados.numeroOrdinal} Café foi validada! Certificado de 4 horas garantido.`,
        titulo: 'Presença Confirmada no Evento!',
        badge: `Check-in Realizado · ${dados.numeroOrdinalFem} Edição`,
        conteudoHtml,
        botaoTexto: 'Acompanhar Emissão do Certificado',
        botaoLink: linkCertificado,
        aluno
      })
    });
  }

  /**
   * 3. E-mail de Lembrete do Evento
   */
  async function enviarEmailLembrete(aluno, tipo = 'vespera') {
    if (!aluno || !aluno.email) return;

    const urlBase = getUrlBase();
    const dados = obterDadosEdicao(aluno);
    const linkCredencial = `${urlBase}${dados.urlPagina}?consultar=${aluno.protocolo}`;

    let tituloLembrete = 'Lembrete do Evento';
    let textoIntro = '';
    let subject = '';

    if (tipo === '7_dias') {
      subject = `🗓️ Falta 1 Semana! ${dados.numeroOrdinal} Café com Ciência na UniArnaldo`;
      tituloLembrete = 'Falta Apenas 1 Semana!';
      textoIntro = `Passando para lembrar que no próximo dia <strong>${dados.dataHora}</strong> teremos o nosso encontro especial sobre <em>${dados.subtituloEdicao}</em> com a <strong>${dados.palestrante}</strong>.`;
    } else if (tipo === 'vespera') {
      subject = `⏳ É Amanhã! ${dados.numeroOrdinal} Café com Ciência (${dados.dataCurta})`;
      tituloLembrete = 'O Grande Dia é Amanhã!';
      textoIntro = `O <strong>${dados.tituloEdicao}</strong> acontece amanhã às <strong>${dados.dataHora} (${dados.local})</strong>!`;
    } else {
      subject = `📍 É HOJE! Seu Comprovante & QR Code de Entrada - ${dados.numeroOrdinal} Café com Ciência [${aluno.protocolo}]`;
      tituloLembrete = 'É Hoje! Portaria Aberta';
      textoIntro = `O grande dia chegou! É <strong>HOJE (${dados.dataHora})</strong>, na <strong>${dados.local}</strong>! Chegue com alguns minutos de antecedência para fazer seu check-in e aproveitar o coffee break.`;
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(aluno.protocolo || '')}&color=2B1810&bgcolor=FFFFFF&margin=2`;
    const instNome = (aluno.instituicao && aluno.instituicao.trim()) ? aluno.instituicao.trim() : 'Faculdade Arnaldo';

    const conteudoHtml = (tipo === 'hoje_portaria') ? `
      <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
      <p>${textoIntro}</p>

      <!-- CARD / TICKET OFICIAL DA CREDENCIAL -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fcf9f5; border-radius: 18px; border: 2px solid #ebd9c8; overflow: hidden; margin: 20px 0 20px 0;">
        <tr>
          <td style="background-color: #2b1810; padding: 10px 18px; text-align: center;">
            <span style="color: #f3d4b6; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
              ☕ COMPROVANTE OFICIAL & QR CODE DE PORTARIA
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 22px 18px 16px 18px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8c786a; font-weight: 700; margin-bottom: 4px;">
              Participante Confirmado(a)
            </div>
            <div style="font-size: 19px; font-weight: 800; color: #2b1810; line-height: 1.3;">
              ${aluno.nome_completo}
            </div>
            <div style="font-size: 12px; color: #6b5c4f; margin-top: 3px;">
              ${instNome}
            </div>

            <!-- Protocolo em Destaque -->
            <div style="display: inline-block; background-color: #ffffff; border: 1.5px dashed #a65824; border-radius: 10px; padding: 6px 16px; margin: 12px 0 16px 0;">
              <span style="font-size: 11px; color: #733c1a; font-weight: 700; text-transform: uppercase; display: block;">Protocolo Oficial:</span>
              <span style="font-size: 20px; font-weight: 900; font-family: monospace; color: #2b1810; letter-spacing: 1px;">${aluno.protocolo}</span>
            </div>

            <!-- Imagem do QR Code -->
            <div style="background-color: #ffffff; border-radius: 14px; padding: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(45, 38, 33, 0.08); border: 1px solid #ebd9c8; margin-bottom: 10px;">
              <img src="${qrUrl}" width="200" height="200" alt="QR Code - ${aluno.protocolo}" style="display: block; margin: 0 auto; border-radius: 8px;" />
            </div>

            <div style="background-color: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 10px; padding: 8px 12px; margin: 6px auto 0 auto; max-width: 420px;">
              <p style="margin: 0; font-size: 12px; color: #1b5e20; font-weight: 600; line-height: 1.4;">
                📲 <strong>Apresente este QR Code na portaria:</strong><br>
                Ele será lido na entrada para validar sua presença e liberar seu Certificado de 4 Horas.
              </p>
            </div>
          </td>
        </tr>
      </table>

      <p style="font-size: 14px; color: #4a3f35; margin: 16px 0 0 0;">
        Você também pode acessar sua credencial digital online a qualquer momento pelo botão abaixo:
      </p>
    ` : `
      <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
      <p>${textoIntro}</p>

      <div style="background-color: #fff9f3; border-left: 4px solid #a65824; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
        <div style="font-size: 12px; color: #733c1a; text-transform: uppercase; font-weight: 700;">Seu Protocolo:</div>
        <div style="font-size: 20px; font-weight: 800; font-family: monospace; color: #2b1810; margin: 4px 0;">${aluno.protocolo}</div>
        <div style="font-size: 12px; color: #6b5c4f;">Tenha sua Credencial aberta no celular para ler o QR Code na entrada.</div>
      </div>

      <p>Clique no botão abaixo para abrir sua credencial oficial agora:</p>
    `;

    return enviarEmail({
      to: aluno.email,
      subject,
      html: gerarLayoutHtmlBase({
        preheader: `Lembrete importante do ${dados.numeroOrdinal} Café com Ciência.`,
        titulo: tituloLembrete,
        badge: `Lembrete Oficial · ${dados.numeroOrdinalFem} Edição`,
        conteudoHtml,
        botaoTexto: 'Abrir Minha Credencial com QR Code',
        botaoLink: linkCredencial,
        aluno
      })
    });
  }

  /**
   * 4. E-mail com Certificado Oficial Liberado
   */
  async function enviarEmailCertificado(aluno) {
    if (!aluno || !aluno.email) return;

    const urlBase = getUrlBase();
    const dados = obterDadosEdicao(aluno);
    const linkCertificado = `${urlBase}certificados.html?protocolo=${aluno.protocolo}`;
    const codigoCert = aluno.certificado_codigo || `CERT-${aluno.protocolo}`;

    const conteudoHtml = `
      <p>Parabéns, <strong>${aluno.nome_completo}</strong>!</p>
      <p>Seu <strong>Certificado Oficial de Participação de 4 Horas Complementares</strong> do <strong>${dados.tituloEdicao} (${dados.subtituloEdicao})</strong> foi assinado, autenticado e já está liberado para emissão e download!</p>
      
      <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
        <div style="font-size: 12px; color: #15803d; text-transform: uppercase; font-weight: 700;">Código de Autenticidade Oficial:</div>
        <div style="font-size: 20px; font-weight: 800; font-family: monospace; color: #166534; margin: 4px 0;">${codigoCert}</div>
        <div style="font-size: 12px; color: #365314;">Válido para aproveitamento de horas complementares na graduação.</div>
      </div>

      <p>Você pode visualizar seu certificado completo em alta resolução, salvar em PDF ou imprimir clicando no botão abaixo:</p>
    `;

    return enviarEmail({
      to: aluno.email,
      subject: `🎓 Seu Certificado Oficial está Disponível! ${dados.numeroOrdinal} Café com Ciência`,
      html: gerarLayoutHtmlBase({
        preheader: `Seu certificado de 4 horas complementares do ${dados.numeroOrdinal} Café foi liberado! Código: ${codigoCert}`,
        titulo: 'Seu Certificado Oficial está Pronto!',
        badge: `Certificado Disponível · ${dados.numeroOrdinalFem} Edição`,
        conteudoHtml,
        botaoTexto: 'Visualizar e Baixar Meu Certificado',
        botaoLink: linkCertificado,
        aluno
      })
    });
  }

  /**
   * Mock para testes e prévias de e-mails
   */
  /**
   * 5. E-mail de Comunicado: Alteração de Data do Evento
   */
  async function enviarEmailMudancaData(aluno, novaDataFormatada = null) {
    if (!aluno || !aluno.email) return;

    const urlBase = getUrlBase();
    const dados = obterDadosEdicao(aluno);
    const linkCredencial = `${urlBase}${dados.urlPagina}?consultar=${aluno.protocolo}`;
    const dataAlvo = novaDataFormatada || dados.dataHora;

    const conteudoHtml = `
      <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
      <p>A comissão organizadora do <strong>${dados.tituloEdicao}</strong> gostaria de comunicar uma importante atualização na programação da nossa palestra:</p>
      
      <div style="background-color: #fff9f3; border-left: 4px solid #d97706; padding: 16px 20px; margin: 22px 0; border-radius: 0 12px 12px 0;">
        <div style="font-size: 11px; color: #92400e; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">📢 Nova Data Confirmada:</div>
        <div style="font-size: 20px; font-weight: 800; color: #451a03; margin: 6px 0;">${dataAlvo}</div>
        <div style="font-size: 13px; color: #78350f;"><strong>Tema:</strong> ${dados.subtituloEdicao}<br><strong>Palestrante:</strong> ${dados.palestrante}<br><strong>Local:</strong> ${dados.local}</div>
      </div>

      <p>Sua vaga e inscrição continuam <strong>100% ativas e garantidas</strong>. O seu protocolo oficial e QR Code continuam exatamente os mesmos, não sendo necessária nenhuma ação ou pagamento adicional:</p>

      <div style="background-color: #f5f5f4; border: 1px dashed #d6d3d1; padding: 14px 18px; margin: 18px 0; border-radius: 10px; text-align: center;">
        <div style="font-size: 11px; color: #78716c; text-transform: uppercase; font-weight: 700;">Seu Protocolo Oficial</div>
        <div style="font-size: 22px; font-weight: 900; font-family: monospace; color: #292524; letter-spacing: 1px; margin: 4px 0;">${aluno.protocolo}</div>
        <div style="font-size: 11px; color: #a8a29e;">Apresente sua credencial digital na portaria para check-in rápido</div>
      </div>

      <p>Aproveitaremos este encontro para proporcionar uma experiência clínica ainda mais completa, com coffee break especial, networking e emissão de <strong>Certificado Oficial de 4 Horas</strong> complementares.</p>
      <p>Agradecemos imensamente a sua compreensão e estamos à disposição para qualquer dúvida. Nos vemos no dia <strong>${dados.dataCurta}</strong>!</p>
    `;

    return enviarEmail({
      to: aluno.email,
      subject: `📢 Comunicado: Nova Data do ${dados.numeroOrdinal} Café com Ciência (${dados.dataCurta})`,
      html: gerarLayoutHtmlBase({
        preheader: `Atenção: A data do ${dados.numeroOrdinal} Café com Ciência foi alterada para ${dataAlvo}. Sua inscrição continua garantida!`,
        titulo: 'Alteração na Data do Evento',
        badge: `Comunicado Oficial · ${dados.numeroOrdinalFem} Edição`,
        conteudoHtml,
        botaoTexto: 'Visualizar Minha Credencial Atualizada',
        botaoLink: linkCredencial,
        aluno
      })
    });
  }

  function criarAlunoMock(emailDestino = 'participante@teste.com', edicao = 10) {
    const num = parseInt(edicao, 10);
    const prefixo = num === 12 ? 'CC12' : (num === 11 ? 'CC11' : 'CC10');
    return {
      id: `mock-teste-${num}`,
      nome_completo: 'Dra. Gabriela Teste da Silva',
      email: emailDestino.trim(),
      protocolo: `${prefixo}-TESTE26`,
      qr_code: `${prefixo}-TESTE26`,
      pix_status: 'aprovado',
      presenca_confirmada: true,
      presenca_horario: num === 12 ? '2026-11-18T16:05:00.000Z' : (num === 11 ? '2026-11-13T15:05:00.000Z' : '2026-10-30T15:05:00.000Z'),
      edicao: num
    };
  }

  /**
   * Gera o HTML exato de um modelo para exibição na tela (Prévia)
   */
  function obterHtmlModeloTeste(modelo = 'inscricao', emailDestino = 'participante@teste.com', edicao = 10) {
    const urlBase = getUrlBase();
    const aluno = criarAlunoMock(emailDestino, edicao);
    const dados = obterDadosEdicao(aluno);

    if (modelo === 'inscricao') {
      const linkCredencial = `${urlBase}${dados.urlPagina}?consultar=${aluno.protocolo}`;
      const conteudoHtml = `
        <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
        <p>Sua inscrição para o <strong>${dados.tituloEdicao}: ${dados.subtituloEdicao}</strong> com a <strong>${dados.palestrante}</strong> foi registrada com sucesso no sistema oficial da liga acadêmica!</p>
        
        <div style="background-color: #fff9f3; border-left: 4px solid #a65824; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
          <div style="font-size: 12px; color: #733c1a; text-transform: uppercase; font-weight: 700;">Seu Protocolo Oficial:</div>
          <div style="font-size: 22px; font-weight: 800; font-family: monospace; color: #2b1810; margin: 4px 0;">${aluno.protocolo}</div>
          <div style="font-size: 12px; color: #6b5c4f;">Status: Comprovante Pix anexado para conferência da comissão.</div>
        </div>

        <p>Sua <strong>Credencial Digital com QR Code</strong> exclusivo já está disponível. Você deverá apresentá-la na portaria no dia <strong>${dados.dataHora}</strong> para validação de presença e liberação do seu certificado.</p>
        <p>Você pode acessar sua credencial a qualquer momento pelo botão abaixo:</p>
      `;
      return {
        subject: `☕ Inscrição Recebida! ${dados.numeroOrdinal} Café com Ciência [${aluno.protocolo}]`,
        html: gerarLayoutHtmlBase({
          preheader: `Sua inscrição no ${dados.numeroOrdinal} Café com Ciência foi recebida! Protocolo: ${aluno.protocolo}`,
          titulo: 'Inscrição Registrada com Sucesso!',
          badge: `Inscrição Confirmada · ${dados.numeroOrdinalFem} Edição`,
          conteudoHtml,
          botaoTexto: 'Visualizar Minha Credencial e QR Code',
          botaoLink: linkCredencial,
          aluno
        })
      };
    }

    if (modelo === 'presenca') {
      const linkCertificado = `${urlBase}certificados.html?protocolo=${aluno.protocolo}`;
      const conteudoHtml = `
        <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
        <p>Sua presença no <strong>${dados.tituloEdicao}: ${dados.subtituloEdicao}</strong> acaba de ser <strong>confirmada com sucesso na portaria oficial</strong>!</p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
          <div style="font-size: 12px; color: #15803d; text-transform: uppercase; font-weight: 700;">Check-in Confirmado</div>
          <div style="font-size: 15px; font-weight: 700; color: #166534; margin: 4px 0;">Presença Validada · ${dados.local}</div>
          <div style="font-size: 12px; color: #365314;">Horas Complementares: 4 horas acadêmicas garantidas.</div>
        </div>

        <p>Esperamos que aproveite a palestra com a <strong>${dados.palestrante}</strong> e o nosso coffee break com networking!</p>
        <p>Assim que a comissão organizadora concluir a assinatura das declarações, seu <strong>Certificado Oficial de 4 horas</strong> estará disponível para download no link abaixo:</p>
      `;
      return {
        subject: `✅ Presença Confirmada! ${dados.numeroOrdinal} Café com Ciência · UniArnaldo`,
        html: gerarLayoutHtmlBase({
          preheader: `Sua presença no ${dados.numeroOrdinal} Café foi validada! Certificado de 4 horas garantido.`,
          titulo: 'Presença Confirmada no Evento!',
          badge: `Check-in Realizado · ${dados.numeroOrdinalFem} Edição`,
          conteudoHtml,
          botaoTexto: 'Acompanhar Emissão do Certificado',
          botaoLink: linkCertificado,
          aluno
        })
      };
    }

    if (modelo === '7_dias' || modelo === 'vespera' || modelo === 'hoje_portaria') {
      const linkCredencial = `${urlBase}${dados.urlPagina}?consultar=${aluno.protocolo}`;
      let tituloLembrete = 'Lembrete do Evento';
      let textoIntro = '';
      let subject = '';

      if (modelo === '7_dias') {
        subject = `🗓️ Falta 1 Semana! ${dados.numeroOrdinal} Café com Ciência na UniArnaldo`;
        tituloLembrete = 'Falta Apenas 1 Semana!';
        textoIntro = `Passando para lembrar que no próximo dia <strong>${dados.dataHora}</strong> teremos o nosso encontro especial sobre <em>${dados.subtituloEdicao}</em> com a <strong>${dados.palestrante}</strong>.`;
      } else if (modelo === 'vespera') {
        subject = `⏳ É Amanhã! ${dados.numeroOrdinal} Café com Ciência (${dados.dataCurta})`;
        tituloLembrete = 'O Grande Dia é Amanhã!';
        textoIntro = `O <strong>${dados.tituloEdicao}</strong> acontece amanhã às <strong>${dados.dataHora} (${dados.local})</strong>!`;
      } else {
        subject = `📍 É HOJE! ${dados.numeroOrdinal} Café com Ciência na UniArnaldo`;
        tituloLembrete = 'É Hoje! Portaria Aberta';
        textoIntro = `Nosso evento acontece <strong>HOJE (${dados.dataHora})</strong>! Chegue com alguns minutos de antecedência para fazer seu check-in e aproveitar o coffee break.`;
      }

      const conteudoHtml = `
        <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
        <p>${textoIntro}</p>

        <div style="background-color: #fff9f3; border-left: 4px solid #a65824; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
          <div style="font-size: 12px; color: #733c1a; text-transform: uppercase; font-weight: 700;">Seu Protocolo:</div>
          <div style="font-size: 20px; font-weight: 800; font-family: monospace; color: #2b1810; margin: 4px 0;">${aluno.protocolo}</div>
          <div style="font-size: 12px; color: #6b5c4f;">Tenha sua Credencial aberta no celular para ler o QR Code na entrada.</div>
        </div>

        <p>Apresente o QR Code na entrada para credenciamento rápido e garantir seu certificado oficial de 4 horas.</p>
      `;

      return {
        subject,
        html: gerarLayoutHtmlBase({
          preheader: `Lembrete importante do ${dados.numeroOrdinal} Café com Ciência.`,
          titulo: tituloLembrete,
          badge: `Lembrete Oficial · ${dados.numeroOrdinalFem} Edição`,
          conteudoHtml,
          botaoTexto: 'Abrir Minha Credencial com QR Code',
          botaoLink: linkCredencial,
          aluno
        })
      };
    }
    if (modelo === 'mudanca_data') {
      const linkCredencial = `${urlBase}${dados.urlPagina}?consultar=${aluno.protocolo}`;
      const conteudoHtml = `
        <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
        <p>A comissão organizadora do <strong>${dados.tituloEdicao}</strong> gostaria de comunicar uma importante atualização na programação da nossa palestra:</p>
        
        <div style="background-color: #fff9f3; border-left: 4px solid #d97706; padding: 16px 20px; margin: 22px 0; border-radius: 0 12px 12px 0;">
          <div style="font-size: 11px; color: #92400e; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">📢 Nova Data Confirmada:</div>
          <div style="font-size: 20px; font-weight: 800; color: #451a03; margin: 6px 0;">${dados.dataHora}</div>
          <div style="font-size: 13px; color: #78350f;"><strong>Tema:</strong> ${dados.subtituloEdicao}<br><strong>Palestrante:</strong> ${dados.palestrante}<br><strong>Local:</strong> ${dados.local}</div>
        </div>

        <p>Sua vaga e inscrição continuam <strong>100% ativas e garantidas</strong>. O seu protocolo oficial e QR Code continuam exatamente os mesmos, não sendo necessária nenhuma ação ou pagamento adicional:</p>

        <div style="background-color: #f5f5f4; border: 1px dashed #d6d3d1; padding: 14px 18px; margin: 18px 0; border-radius: 10px; text-align: center;">
          <div style="font-size: 11px; color: #78716c; text-transform: uppercase; font-weight: 700;">Seu Protocolo Oficial</div>
          <div style="font-size: 22px; font-weight: 900; font-family: monospace; color: #292524; letter-spacing: 1px; margin: 4px 0;">${aluno.protocolo}</div>
          <div style="font-size: 11px; color: #a8a29e;">Apresente sua credencial digital na portaria para check-in rápido</div>
        </div>

        <p>Aproveitaremos este encontro para proporcionar uma experiência clínica ainda mais completa, com coffee break especial, networking e emissão de <strong>Certificado Oficial de 4 Horas</strong> complementares.</p>
        <p>Agradecemos imensamente a sua compreensão e estamos à disposição para qualquer dúvida. Nos vemos no dia <strong>${dados.dataCurta}</strong>!</p>
      `;

      return {
        subject: `📢 Comunicado: Nova Data do ${dados.numeroOrdinal} Café com Ciência (${dados.dataCurta})`,
        html: gerarLayoutHtmlBase({
          preheader: `Atenção: A data do ${dados.numeroOrdinal} Café com Ciência foi alterada para ${dados.dataHora}. Sua inscrição continua garantida!`,
          titulo: 'Alteração na Data do Evento',
          badge: `Comunicado Oficial · ${dados.numeroOrdinalFem} Edição`,
          conteudoHtml,
          botaoTexto: 'Visualizar Minha Credencial Atualizada',
          botaoLink: linkCredencial,
          aluno
        })
      };
    }


    if (modelo === 'certificado') {
      const linkCertificado = `${urlBase}certificados.html?protocolo=${aluno.protocolo}`;
      const conteudoHtml = `
        <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
        <p>Agradecemos muito sua participação no <strong>${dados.tituloEdicao}: ${dados.subtituloEdicao}</strong>!</p>
        <p>Temos o prazer de informar que o seu <strong>Certificado Oficial de Participação (4 Horas)</strong> com a <strong>${dados.palestrante}</strong> já está assinado e liberado para emissão.</p>

        <div style="background-color: #fff9f3; border-left: 4px solid #a65824; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
          <div style="font-size: 12px; color: #733c1a; text-transform: uppercase; font-weight: 700;">Certificado Homologado:</div>
          <div style="font-size: 16px; font-weight: 800; color: #2b1810; margin: 4px 0;">Carga Horária: 4 Horas Complementares</div>
          <div style="font-size: 12px; color: #6b5c4f;">Código de Autenticidade: CERT-${aluno.protocolo}</div>
        </div>

        <p>Clique no botão abaixo para visualizar, baixar e imprimir seu certificado em formato PDF de alta resolução:</p>
      `;

      return {
        subject: `🎓 Seu Certificado Oficial está Disponível! ${dados.numeroOrdinal} Café com Ciência`,
        html: gerarLayoutHtmlBase({
          preheader: `Seu certificado de 4 horas complementares do ${dados.numeroOrdinal} Café foi liberado! Código: CERT-${aluno.protocolo}`,
          titulo: 'Seu Certificado Oficial está Pronto!',
          badge: `Certificado Disponível · ${dados.numeroOrdinalFem} Edição`,
          conteudoHtml,
          botaoTexto: 'Visualizar e Baixar Meu Certificado',
          botaoLink: linkCertificado,
          aluno
        })
      };
    }

    // Padrão: Teste genérico
    const conteudoHtml = `
      <p>Olá! Este é um <strong>e-mail de teste de conexão com o Resend</strong> enviado diretamente da plataforma do <strong>${dados.tituloEdicao}</strong>.</p>
      <p>Se você está recebendo esta mensagem, significa que sua integração com a API do Resend está funcionando perfeitamente!</p>
      <p>A partir de agora, o sistema pode enviar e-mails automáticos de confirmação de inscrição, validação de presença, lembretes de véspera e envio de certificados tanto para a 10ª quanto para a 11ª edição.</p>
    `;

    return {
      subject: `☕ Teste de Conexão com Resend · ${dados.numeroOrdinal} Café com Ciência`,
      html: gerarLayoutHtmlBase({
        preheader: `Teste de conexão com a API Resend realizado com sucesso para o ${dados.numeroOrdinal} Café!`,
        titulo: 'Integração Resend Operacional!',
        badge: `Teste de E-mail · ${dados.numeroOrdinalFem} Edição`,
        conteudoHtml,
        botaoTexto: 'Acessar Site do Evento',
        botaoLink: `${urlBase}${dados.urlPagina}`,
        aluno
      })
    };
  }

  /**
   * Teste de Envio de E-mail com suporte a escolha de modelo e edição
   */
  async function testarEnvioEmail(destinatario, modelo = 'teste', edicao = null) {
    if (!destinatario) throw new Error('Informe o e-mail de destino para o teste.');

    const alunoMock = criarAlunoMock(destinatario, edicao);

    if (modelo === 'inscricao') {
      return enviarEmailInscricao(alunoMock);
    }
    if (modelo === 'presenca') {
      return enviarEmailPresencaConfirmada(alunoMock);
    }
    if (modelo === '7_dias' || modelo === 'vespera' || modelo === 'hoje_portaria') {
      return enviarEmailLembrete(alunoMock, modelo);
    }
    if (modelo === 'certificado') {
      return enviarEmailCertificado(alunoMock);
    }
    if (modelo === 'mudanca_data') {
      return enviarEmailMudancaData(alunoMock);
    }


    const { subject, html } = obterHtmlModeloTeste('teste', destinatario, edicao);
    return enviarEmail({
      to: destinatario.trim(),
      subject,
      html
    });
  }

  /**
   * Consulta a lista de e-mails enviados pelo Resend
   */
  async function listarEmailsEnviados() {
    const endpoint = '/.netlify/functions/send-email';
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao consultar e-mails do Resend (status ${res.status})`);
    }
    return res.json();
  }

  // Exportação Global
  window.EmailService = {
    getResendApiKey,
    getResendFrom,
    salvarConfigResend,
    isEmailAutoInscricao,
    isEmailAutoPresenca,
    salvarTogglesEmail,
    isResendConfigurado,
    enviarEmail,
    enviarEmailInscricao,
    enviarEmailPresencaConfirmada,
    enviarEmailLembrete,
    enviarEmailCertificado,
    enviarEmailMudancaData,
    testarEnvioEmail,
    obterHtmlModeloTeste,
    listarEmailsEnviados,
    getGmailUser,
    getGmailAppPassword,
    salvarConfigGmail,
    isGmailConfigurado,
    obterDadosEdicao
  };

})();
