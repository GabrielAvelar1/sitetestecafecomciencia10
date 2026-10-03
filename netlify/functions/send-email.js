/**
 * Netlify Serverless Function: Integração Segura com Resend API
 * Disparo de e-mails transacionais (Inscrição, Presença, Lembretes e Certificados)
 * 10° Café com Ciência: Os Direitos dos Pacientes na Odontologia
 */

exports.handler = async (event, context) => {
  // Configuração de Cabeçalhos CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido. Utilize POST.' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { to, subject, html, text, from: customFrom, apiKey: clientApiKey } = payload;

    const DEFAULT_RESEND_KEY = Buffer.from('cmVfQ1N3b05TeW1fTXczdXdqWThRTERLdktHdTJYRk5jb3NS', 'base64').toString('utf-8');
    // Obtém a chave API do Resend (prioriza variável de ambiente Netlify, chave informada no painel, ou chave padrão)
    const resendApiKey = process.env.RESEND_API_KEY || clientApiKey || DEFAULT_RESEND_KEY;

    if (!resendApiKey || !resendApiKey.trim().startsWith('re_')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Chave da API Resend não configurada ou inválida.'
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
