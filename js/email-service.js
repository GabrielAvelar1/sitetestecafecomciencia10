/**
 * Serviço de Envio de E-mails Transacionais - Resend
 * 10° Café com Ciência: Os Direitos dos Pacientes na Odontologia
 */

(function() {
  const EMAIL_STORAGE_KEYS = {
    API_KEY: 'cafe_resend_api_key',
    FROM: 'cafe_resend_from',
    AUTO_INSCRICAO: 'cafe_email_auto_inscricao',
    AUTO_PRESENCA: 'cafe_email_auto_presenca'
  };

  const DEFAULT_API_KEY = typeof atob === 'function' ? atob('cmVfQ1N3b05TeW1fTXczdXdqWThRTERLdktHdTJYRk5jb3NS') : '';
  const DEFAULT_FROM = '10° Café com Ciência <onboarding@resend.dev>';

  function getResendApiKey() {
    return localStorage.getItem(EMAIL_STORAGE_KEYS.API_KEY) || DEFAULT_API_KEY;
  }

  function getResendFrom() {
    return localStorage.getItem(EMAIL_STORAGE_KEYS.FROM) || DEFAULT_FROM;
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
    const key = getResendApiKey();
    return Boolean(key && key.startsWith('re_'));
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
      apiKey: apiKey || undefined
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
   * Template Base HTML com Estilo Visual Sofisticado
   */
  function gerarLayoutHtmlBase({ preheader, titulo, badge, conteudoHtml, botaoTexto, botaoLink }) {
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
                
                <!-- Topo com Identidade Visual do Café com Ciência -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1f140e 0%, #3d2417 100%); padding: 36px 32px 30px 32px; text-align: center;">
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 30px; padding: 6px 16px; margin-bottom: 16px;">
                      <span style="color: #f3d4b6; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                        ${badge || '10ª Edição Comemorativa · UniArnaldo'}
                      </span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.5px;">
                      10° CAFÉ COM CIÊNCIA
                    </h1>
                    <p style="color: #ebd9c8; font-size: 14px; margin: 0; font-style: italic;">
                      Os Direitos dos Pacientes na Odontologia
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
                            <strong>📅 Data:</strong> 30 de Outubro de 2026 às 15:00 horas<br>
                            <strong>📍 Local:</strong> UniArnaldo · Campus Anchieta (Sala 306)<br>
                            <strong>👩‍⚕️ Palestrante:</strong> Profa. Carolina Diniz<br>
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
                      <a href="mailto:cadumancia@gmail.com" style="color: #a65824; text-decoration: none; font-weight: 600;">cadumancia@gmail.com</a>
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
    const linkCredencial = `${urlBase}index.html?consultar=${aluno.protocolo}`;

    const conteudoHtml = `
      <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
      <p>Sua inscrição para o <strong>10° Café com Ciência</strong> foi registrada com sucesso no sistema oficial da liga acadêmica!</p>
      
      <div style="background-color: #fff9f3; border-left: 4px solid #a65824; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
        <div style="font-size: 12px; color: #733c1a; text-transform: uppercase; font-weight: 700;">Seu Protocolo Oficial:</div>
        <div style="font-size: 22px; font-weight: 800; font-family: monospace; color: #2b1810; margin: 4px 0;">${aluno.protocolo}</div>
        <div style="font-size: 12px; color: #6b5c4f;">Status: Comprovante Pix anexado para conferência da comissão.</div>
      </div>

      <p>Sua <strong>Credencial Digital com QR Code</strong> exclusivo já está disponível. Você deverá apresentá-la na portaria no dia 30 de Outubro para validação de presença e liberação do seu certificado.</p>
      <p>Você pode acessar sua credencial a qualquer momento pelo botão abaixo:</p>
    `;

    return enviarEmail({
      to: aluno.email,
      subject: `☕ Inscrição Recebida! 10° Café com Ciência [${aluno.protocolo}]`,
      html: gerarLayoutHtmlBase({
        preheader: `Sua inscrição foi recebida com sucesso! Protocolo: ${aluno.protocolo}`,
        titulo: 'Inscrição Registrada com Sucesso!',
        badge: 'Inscrição Confirmada · 10ª Edição',
        conteudoHtml,
        botaoTexto: 'Visualizar Minha Credencial e QR Code',
        botaoLink: linkCredencial
      })
    });
  }

  /**
   * 2. E-mail de Confirmação de Presença (Check-in Portaria)
   */
  async function enviarEmailPresencaConfirmada(aluno) {
    if (!aluno || !aluno.email) return;

    const urlBase = getUrlBase();
    const linkCertificado = `${urlBase}certificados.html?protocolo=${aluno.protocolo}`;

    const conteudoHtml = `
      <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
      <p>Sua presença no <strong>10° Café com Ciência: Os Direitos dos Pacientes na Odontologia</strong> acaba de ser <strong>confirmada com sucesso na portaria oficial</strong>!</p>
      
      <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
        <div style="font-size: 12px; color: #15803d; text-transform: uppercase; font-weight: 700;">Check-in Confirmado</div>
        <div style="font-size: 15px; font-weight: 700; color: #166534; margin: 4px 0;">Presença Validada na UniArnaldo</div>
        <div style="font-size: 12px; color: #365314;">Horas Complementares: 4 horas acadêmicas garantidas.</div>
      </div>

      <p>Esperamos que aproveite a palestra com a <strong>Profa. Carolina Diniz</strong> e o nosso coffee break com networking!</p>
      <p>Assim que a comissão organizadora concluir a assinatura das declarações, seu <strong>Certificado Oficial de 4 horas</strong> estará disponível para download no link abaixo:</p>
    `;

    return enviarEmail({
      to: aluno.email,
      subject: `✅ Presença Confirmada! 10° Café com Ciência · UniArnaldo`,
      html: gerarLayoutHtmlBase({
        preheader: `Sua presença foi validada! Certificado de 4 horas garantido.`,
        titulo: 'Presença Confirmada no Evento!',
        badge: 'Check-in Realizado · Portaria Oficial',
        conteudoHtml,
        botaoTexto: 'Acompanhar Emissão do Certificado',
        botaoLink: linkCertificado
      })
    });
  }

  /**
   * 3. E-mail de Lembrete do Evento
   */
  async function enviarEmailLembrete(aluno, tipo = 'vespera') {
    if (!aluno || !aluno.email) return;

    const urlBase = getUrlBase();
    const linkCredencial = `${urlBase}index.html?consultar=${aluno.protocolo}`;

    let tituloLembrete = 'Lembrete do Evento';
    let textoIntro = '';
    let subject = '';

    if (tipo === '7_dias') {
      subject = '🗓️ Falta 1 Semana! 10° Café com Ciência na UniArnaldo';
      tituloLembrete = 'Falta Apenas 1 Semana!';
      textoIntro = 'Passando para lembrar que no próximo dia <strong>30 de Outubro às 15:00</strong> teremos o nosso encontro especial sobre os <em>Direitos dos Pacientes na Odontologia</em>.';
    } else if (tipo === 'vespera') {
      subject = '⏳ É Amanhã! 10° Café com Ciência às 15h (UniArnaldo)';
      tituloLembrete = 'O Grande Dia é Amanhã!';
      textoIntro = 'O <strong>10° Café com Ciência</strong> acontece amanhã (30/10) às <strong>15h00 na Sala 306 (Campus Anchieta)</strong>!';
    } else {
      subject = '📍 É HOJE às 15h! 10° Café com Ciência na UniArnaldo';
      tituloLembrete = 'É Hoje! Portaria Aberta às 15h';
      textoIntro = 'Nosso evento acontece <strong>HOJE às 15h00</strong>! Chegue com alguns minutos de antecedência para fazer seu check-in e aproveitar o coffee break.';
    }

    const conteudoHtml = `
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
        preheader: `Lembrete importante do 10° Café com Ciência.`,
        titulo: tituloLembrete,
        badge: 'Lembrete Oficial · UniArnaldo',
        conteudoHtml,
        botaoTexto: 'Abrir Minha Credencial com QR Code',
        botaoLink: linkCredencial
      })
    });
  }

  /**
   * 4. E-mail com Certificado Oficial Liberado
   */
  async function enviarEmailCertificado(aluno) {
    if (!aluno || !aluno.email) return;

    const urlBase = getUrlBase();
    const linkCertificado = `${urlBase}certificados.html?protocolo=${aluno.protocolo}`;
    const codigoCert = aluno.certificado_codigo || `CERT-${aluno.protocolo}`;

    const conteudoHtml = `
      <p>Parabéns, <strong>${aluno.nome_completo}</strong>!</p>
      <p>Seu <strong>Certificado Oficial de Participação de 4 Horas Complementares</strong> do <strong>10° Café com Ciência</strong> foi assinado, autenticado e já está liberado para emissão e download!</p>
      
      <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
        <div style="font-size: 12px; color: #15803d; text-transform: uppercase; font-weight: 700;">Código de Autenticidade Oficial:</div>
        <div style="font-size: 20px; font-weight: 800; font-family: monospace; color: #166534; margin: 4px 0;">${codigoCert}</div>
        <div style="font-size: 12px; color: #365314;">Válido para aproveitamento de horas complementares na graduação.</div>
      </div>

      <p>Você pode visualizar seu certificado completo em alta resolução, salvar em PDF ou imprimir clicando no botão abaixo:</p>
    `;

    return enviarEmail({
      to: aluno.email,
      subject: `🎓 Seu Certificado Oficial está Disponível! 10° Café com Ciência`,
      html: gerarLayoutHtmlBase({
        preheader: `Seu certificado de 4 horas complementares foi liberado! Código: ${codigoCert}`,
        titulo: 'Seu Certificado Oficial está Pronto!',
        badge: 'Certificado Disponível · 4 Horas',
        conteudoHtml,
        botaoTexto: 'Visualizar e Baixar Meu Certificado',
        botaoLink: linkCertificado
      })
    });
  }

  /**
   * Mock para testes e prévias de e-mails
   */
  function criarAlunoMock(emailDestino = 'participante@teste.com') {
    return {
      id: 'mock-teste-01',
      nome_completo: 'Dra. Gabriela Teste da Silva',
      email: emailDestino.trim(),
      protocolo: 'CC10-TESTE26',
      qr_code: 'CC10-TESTE26',
      pix_status: 'aprovado',
      presenca_confirmada: true,
      presenca_horario: '2026-10-30T15:05:00.000Z'
    };
  }

  /**
   * Gera o HTML exato de um modelo para exibição na tela (Prévia)
   */
  function obterHtmlModeloTeste(modelo = 'inscricao', emailDestino = 'participante@teste.com') {
    const urlBase = getUrlBase();
    const aluno = criarAlunoMock(emailDestino);

    if (modelo === 'inscricao') {
      const linkCredencial = `${urlBase}index.html?consultar=${aluno.protocolo}`;
      const conteudoHtml = `
        <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
        <p>Sua inscrição para o <strong>10° Café com Ciência</strong> foi registrada com sucesso no sistema oficial da liga acadêmica!</p>
        
        <div style="background-color: #fff9f3; border-left: 4px solid #a65824; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
          <div style="font-size: 12px; color: #733c1a; text-transform: uppercase; font-weight: 700;">Seu Protocolo Oficial:</div>
          <div style="font-size: 22px; font-weight: 800; font-family: monospace; color: #2b1810; margin: 4px 0;">${aluno.protocolo}</div>
          <div style="font-size: 12px; color: #6b5c4f;">Status: Comprovante Pix anexado para conferência da comissão.</div>
        </div>

        <p>Sua <strong>Credencial Digital com QR Code</strong> exclusivo já está disponível. Você deverá apresentá-la na portaria no dia 30 de Outubro para validação de presença e liberação do seu certificado.</p>
        <p>Você pode acessar sua credencial a qualquer momento pelo botão abaixo:</p>
      `;
      return {
        subject: `☕ Inscrição Recebida! 10° Café com Ciência [${aluno.protocolo}]`,
        html: gerarLayoutHtmlBase({
          preheader: `Sua inscrição foi recebida com sucesso! Protocolo: ${aluno.protocolo}`,
          titulo: 'Inscrição Registrada com Sucesso!',
          badge: 'Inscrição Confirmada · 10ª Edição',
          conteudoHtml,
          botaoTexto: 'Visualizar Minha Credencial e QR Code',
          botaoLink: linkCredencial
        })
      };
    }

    if (modelo === 'presenca') {
      const linkCertificado = `${urlBase}certificados.html?protocolo=${aluno.protocolo}`;
      const conteudoHtml = `
        <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
        <p>Sua presença no <strong>10° Café com Ciência: Os Direitos dos Pacientes na Odontologia</strong> acaba de ser <strong>confirmada com sucesso na portaria oficial</strong>!</p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
          <div style="font-size: 12px; color: #15803d; text-transform: uppercase; font-weight: 700;">Check-in Confirmado</div>
          <div style="font-size: 15px; font-weight: 700; color: #166534; margin: 4px 0;">Presença Validada na UniArnaldo (Sala 306)</div>
          <div style="font-size: 12px; color: #365314;">Horas Complementares: 4 horas acadêmicas garantidas.</div>
        </div>

        <p>Esperamos que aproveite a palestra com a <strong>Profa. Carolina Diniz</strong> e o nosso coffee break com networking!</p>
        <p>Assim que a comissão organizadora concluir a assinatura das declarações, seu <strong>Certificado Oficial de 4 horas</strong> estará disponível para download no link abaixo:</p>
      `;
      return {
        subject: `✅ Presença Confirmada! 10° Café com Ciência · UniArnaldo`,
        html: gerarLayoutHtmlBase({
          preheader: `Sua presença foi validada! Certificado de 4 horas garantido.`,
          titulo: 'Presença Confirmada no Evento!',
          badge: 'Check-in Realizado · Portaria Oficial',
          conteudoHtml,
          botaoTexto: 'Acompanhar Emissão do Certificado',
          botaoLink: linkCertificado
        })
      };
    }

    if (modelo === '7_dias' || modelo === 'vespera' || modelo === 'hoje_portaria') {
      const linkCredencial = `${urlBase}index.html?consultar=${aluno.protocolo}`;
      let tituloLembrete = 'Lembrete do Evento';
      let textoIntro = '';
      let subject = '';

      if (modelo === '7_dias') {
        subject = '🗓️ Falta 1 Semana! 10° Café com Ciência na UniArnaldo';
        tituloLembrete = 'Falta Apenas 1 Semana!';
        textoIntro = 'Passando para lembrar que no próximo dia <strong>30 de Outubro às 15:00</strong> teremos o nosso encontro especial sobre os <em>Direitos dos Pacientes na Odontologia</em>.';
      } else if (modelo === 'vespera') {
        subject = '⏳ É Amanhã! 10° Café com Ciência às 15h (UniArnaldo)';
        tituloLembrete = 'O Grande Dia é Amanhã!';
        textoIntro = 'O <strong>10° Café com Ciência</strong> acontece amanhã (30/10) às <strong>15h00 na Sala 306 (Campus Anchieta)</strong>!';
      } else {
        subject = '📍 É HOJE às 15h! 10° Café com Ciência na UniArnaldo';
        tituloLembrete = 'É Hoje! Portaria Aberta às 15h';
        textoIntro = 'Nosso evento acontece <strong>HOJE às 15h00 na Sala 306</strong>! Chegue com alguns minutos de antecedência para fazer seu check-in e aproveitar o coffee break.';
      }

      const conteudoHtml = `
        <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
        <p>${textoIntro}</p>

        <div style="background-color: #fff9f3; border-left: 4px solid #a65824; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
          <div style="font-size: 12px; color: #733c1a; text-transform: uppercase; font-weight: 700;">Seu Protocolo:</div>
          <div style="font-size: 20px; font-weight: 800; font-family: monospace; color: #2b1810; margin: 4px 0;">${aluno.protocolo}</div>
          <div style="font-size: 12px; color: #6b5c4f;">Tenha sua Credencial aberta no celular para ler o QR Code na entrada (Sala 306).</div>
        </div>

        <p>Apresente o QR Code na entrada para credenciamento rápido e garantir seu certificado oficial de 4 horas.</p>
      `;

      return {
        subject,
        html: gerarLayoutHtmlBase({
          preheader: `${tituloLembrete} - 10° Café com Ciência na UniArnaldo`,
          titulo: tituloLembrete,
          badge: 'Lembrete Oficial · Comissão Organizadora',
          conteudoHtml,
          botaoTexto: 'Abrir Minha Credencial com QR Code',
          botaoLink: linkCredencial
        })
      };
    }

    if (modelo === 'certificado') {
      const linkCertificado = `${urlBase}certificados.html?protocolo=${aluno.protocolo}`;
      const conteudoHtml = `
        <p>Olá, <strong>${aluno.nome_completo}</strong>!</p>
        <p>Agradecemos muito sua participação no <strong>10° Café com Ciência: Os Direitos dos Pacientes na Odontologia</strong>!</p>
        <p>Temos o prazer de informar que o seu <strong>Certificado Oficial de Participação (4 Horas)</strong> já está assinado e liberado para emissão.</p>

        <div style="background-color: #fff9f3; border-left: 4px solid #a65824; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
          <div style="font-size: 12px; color: #733c1a; text-transform: uppercase; font-weight: 700;">Certificado Homologado:</div>
          <div style="font-size: 16px; font-weight: 800; color: #2b1810; margin: 4px 0;">Carga Horária: 4 Horas Complementares</div>
          <div style="font-size: 12px; color: #6b5c4f;">Código de Autenticidade: CERT-${aluno.protocolo}</div>
        </div>

        <p>Clique no botão abaixo para visualizar, baixar e imprimir seu certificado em formato PDF de alta resolução:</p>
      `;

      return {
        subject: `🎓 Seu Certificado Oficial está Disponível! 10° Café com Ciência`,
        html: gerarLayoutHtmlBase({
          preheader: `Seu certificado de 4 horas complementares foi liberado! Código: CERT-${aluno.protocolo}`,
          titulo: 'Seu Certificado Oficial está Pronto!',
          badge: 'Certificado Disponível · 4 Horas',
          conteudoHtml,
          botaoTexto: 'Visualizar e Baixar Meu Certificado',
          botaoLink: linkCertificado
        })
      };
    }

    // Padrão: Teste genérico
    const conteudoHtml = `
      <p>Olá! Este é um <strong>e-mail de teste de conexão com o Resend</strong> enviado diretamente da plataforma do <strong>10° Café com Ciência</strong>.</p>
      <p>Se você está recebendo esta mensagem, significa que sua integração com a API do Resend está funcionando perfeitamente!</p>
      <p>A partir de agora, o sistema pode enviar e-mails automáticos de confirmação de inscrição, validação de presença, lembretes de véspera e envio de certificados.</p>
    `;

    return {
      subject: '☕ Teste de Conexão com Resend · 10° Café com Ciência',
      html: gerarLayoutHtmlBase({
        preheader: 'Teste de conexão com a API Resend realizado com sucesso!',
        titulo: 'Integração Resend Operacional!',
        badge: 'Teste de E-mail · Sucesso',
        conteudoHtml,
        botaoTexto: 'Acessar Site do Evento',
        botaoLink: `${urlBase}index.html`
      })
    };
  }

  /**
   * Teste de Envio de E-mail com suporte a escolha de modelo
   */
  async function testarEnvioEmail(destinatario, modelo = 'teste') {
    if (!destinatario) throw new Error('Informe o e-mail de destino para o teste.');

    const alunoMock = criarAlunoMock(destinatario);

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

    const { subject, html } = obterHtmlModeloTeste('teste', destinatario);
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
    testarEnvioEmail,
    obterHtmlModeloTeste,
    listarEmailsEnviados
  };

})();
