const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  // Configuração de Cabeçalhos CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Trata requisições de preflight do navegador
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Consulta lista de e-mails enviados (GET)
  if (event.httpMethod === 'GET') {
    try {
      const DEFAULT_RESEND_KEY = Buffer.from('cmVfQ1N3b05TeW1fTXczdXdqWThRTERLdktHdTJYRk5jb3NS', 'base64').toString('utf-8');
      const resendApiKey = process.env.RESEND_API_KEY || event.queryStringParameters?.apiKey || DEFAULT_RESEND_KEY;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(data)
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erro ao consultar e-mails do Resend: ' + err.message })
      };
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido. Utilize GET ou POST.' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { 
      to, 
      subject, 
      html, 
      text, 
      from: customFrom, 
      apiKey: clientApiKey,
      gmailUser: clientGmailUser,
      gmailAppPassword: clientGmailPass
    } = payload;

    if (!to || !subject || (!html && !text)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Parâmetros obrigatórios ausentes: informe "to", "subject" e "html" ou "text".'
        })
      };
    }

    // 1. PRIORIDADE: ENVIO VIA GMAIL SMTP (Sem restrição de domínio ou destinatário)
    const gmailUser = process.env.GMAIL_USER || clientGmailUser;
    const gmailPass = process.env.GMAIL_PASS || clientGmailPass;

    if (gmailUser && gmailPass && gmailUser.includes('@') && gmailPass.trim().length >= 8) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser.trim(),
            pass: gmailPass.trim().replace(/\s+/g, '')
          }
        });

        const mailOptions = {
          from: customFrom || `10° Café com Ciência <${gmailUser.trim()}>`,
          to: Array.isArray(to) ? to.join(', ') : to,
          subject,
          html: html || undefined,
          text: text || undefined
        };

        const info = await transporter.sendMail(mailOptions);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            provider: 'gmail',
            id: info.messageId,
            status: 'sent'
          })
        };
      } catch (gmailErr) {
        console.error('Erro no envio via Gmail SMTP:', gmailErr);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `Erro ao enviar via Gmail: ${gmailErr.message}. Verifique se o e-mail e a Senha de App de 16 dígitos estão corretos.`
          })
        };
      }
    }

    // 2. FALLBACK: RESEND API
    const DEFAULT_RESEND_KEY = Buffer.from('cmVfQ1N3b05TeW1fTXczdXdqWThRTERLdktHdTJYRk5jb3NS', 'base64').toString('utf-8');
    const resendApiKey = process.env.RESEND_API_KEY || clientApiKey || DEFAULT_RESEND_KEY;

    if (!resendApiKey || !resendApiKey.trim().startsWith('re_')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Chave da API Resend ou credenciais do Gmail não configuradas.'
        })
      };
    }

    if (!to || !subject || (!html && !text)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Parâmetros obrigatórios ausentes: informe "to", "subject" e "html" ou "text".'
        })
      };
    }

    // Remetente padrão do Resend (onboarding@resend.dev para testes ou domínio próprio verificado)
    const defaultFrom = '10° Café com Ciência <onboarding@resend.dev>';
    const fromAddress = customFrom || process.env.RESEND_FROM || defaultFrom;

    // Dispara a requisição oficial para a API do Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html,
        text: text
      })
    });

    const responseData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Erro na resposta do Resend:', responseData);
      return {
        statusCode: resendResponse.status,
        headers,
        body: JSON.stringify({
          error: responseData.message || 'Falha ao processar envio com o Resend.',
          details: responseData
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        id: responseData.id,
        message: 'E-mail enviado com sucesso pelo Resend!'
      })
    };

  } catch (err) {
    console.error('Erro interno na função de envio de e-mails:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro interno ao processar envio de e-mail.',
        details: err.message
      })
    };
  }
};
