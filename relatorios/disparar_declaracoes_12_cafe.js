const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');
const nodemailer = require(path.join(baseDir, 'node_modules', 'nodemailer'));
const indDir = path.join(baseDir, 'declaracoes_individuais');
const relatorioPath = path.join(indDir, 'relatorio_declaracoes_12_cafe.json');

const relatorio = JSON.parse(fs.readFileSync(relatorioPath, 'utf8'));
const cadastrados = relatorio.filter(r => r.statusBanco === 'encontrado');

const SUPABASE_URL = 'https://zcbylqggrxocdevddtlx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjYnlscWdncnhvY2RldmRkdGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxOTM2MzIsImV4cCI6MjEwNTc2OTYzMn0.FS5e7VlodcABs72X4xfTvwVW8eFn-E8JdZ9ZQNNxba0';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'cafecomcienciaresend@gmail.com',
    pass: 'glafonfhffcdeqvi'
  }
});

function sanitizarNomeArquivo(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function gerarHtmlEmailDeclaracao(item) {
  const primeiroNome = item.nomeDeclaracao.split(' ')[0];

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sua Declaração Oficial está Pronta! 🎓 12° Café com Ciência</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f4ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d2621; line-height: 1.6;">
  
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    Parabéns! Sua Declaração Oficial de 2 horas do 12° Café com Ciência está anexada em PDF neste e-mail.
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f4ef; padding: 24px 12px;">
    <tr>
      <td align="center">
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(45, 38, 33, 0.08); border: 1px solid #ebd9c8;">
          
          <!-- Topo Nobre com Gradiente Café -->
          <tr>
            <td style="background: linear-gradient(135deg, #1f140e 0%, #3d2417 100%); padding: 36px 30px 30px 30px; text-align: center;">
              
              <div style="display: inline-block; background-color: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 30px; padding: 6px 18px; margin-bottom: 14px;">
                <span style="color: #fbbf24; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">
                  🎓 DECLARAÇÃO OFICIAL DISPONÍVEL
                </span>
              </div>

              <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.5px;">
                12° CAFÉ COM CIÊNCIA
              </h1>
              <p style="color: #ebd9c8; font-size: 14px; margin: 0; font-style: italic;">
                Diagnóstico e Planejamento na Reabilitação Oral · Dra. Thaissa Calab
              </p>
            </td>
          </tr>

          <!-- Corpo da Mensagem -->
          <tr>
            <td style="padding: 32px 30px 24px 30px;">
              <h2 style="color: #2b1810; font-size: 20px; font-weight: 800; margin: 0 0 14px 0;">
                Olá, ${primeiroNome}!
              </h2>
              
              <p style="margin: 0 0 14px 0; font-size: 14px; color: #4a3e35; line-height: 1.6;">
                A comissão organizadora da <strong>Liga Acadêmica Café com Ciência</strong> parabeniza e agradece imensamente a sua presença e contribuição na palestra realizada no dia <strong>18 de novembro de 2026</strong>, no Centro Universitário Arnaldo Janssen.
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px; color: #4a3e35; line-height: 1.6;">
                Sua presença foi confirmada e sua <strong>Declaração Oficial de Atividades Complementares (2 Horas)</strong> foi devidamente autenticada pela coordenação do curso de Odontologia.
              </p>

              <!-- Box de Destaque do Anexo -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border: 2px dashed #86efac; border-radius: 16px; margin: 20px 0 24px 0;">
                <tr>
                  <td style="padding: 18px; text-align: center;">
                    <span style="font-size: 28px; display: block; margin-bottom: 6px;">📎</span>
                    <strong style="color: #166534; font-size: 15px; display: block; margin-bottom: 4px;">
                      Declaração Oficial em PDF Anexada!
                    </strong>
                    <span style="color: #15803d; font-size: 13px; display: block;">
                      O documento oficial de 1 página está anexado diretamente a este e-mail. Basta abrir e salvar no seu computador ou celular.
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Cartão de Dados Oficiais da Declaração -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fbf9f6; border: 1px solid #ebd9c8; border-radius: 16px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 800; color: #8c786a; text-transform: uppercase; letter-spacing: 1px;">
                      📋 Dados do Registro Acadêmico:
                    </p>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #786658; width: 35%;">Participante:</td>
                        <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #2b1810;">${item.nomeDeclaracao}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #786658;">Protocolo Oficial:</td>
                        <td style="padding: 6px 0; font-size: 13px; font-family: monospace; font-weight: 700; color: #a65824;">${item.protocolo}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #786658;">Carga Horária:</td>
                        <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #2b1810;">2 Horas Complementares</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #786658;">Presença Portaria:</td>
                        <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #166534;">✓ Confirmada no Evento</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #786658;">Palestrante:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #2b1810;">Dra. Thaissa Calab</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #786658;">Coordenador:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #2b1810;">Jhonathan Lopes Silva</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #786658;">Instituição:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #2b1810;">Centro Universitário Arnaldo Janssen</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Botão para Portal Oficial -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="https://cafecomciencia.netlify.app/portal.html?consultar=${item.protocolo}" target="_blank" style="display: inline-block; background-color: #2b1810; color: #ebd9c8; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(43, 24, 16, 0.25);">
                      🌐 Acessar Portal & Minha Declaração Online →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #786658; line-height: 1.5; text-align: center;">
                Sua declaração oficial e credencial ficam permanentemente arquivadas em nosso site oficial.
              </p>

            </td>
          </tr>

          <!-- Rodapé Oficial -->
          <tr>
            <td style="background-color: #f7f4ef; padding: 24px 30px; text-align: center; border-top: 1px solid #ebd9c8;">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #5a4b41;">
                Liga Acadêmica Café com Ciência · Curso de Odontologia UniArnaldo
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #8c786a;">
                Centro Universitário Arnaldo Janssen · Belo Horizonte - MG
              </p>
              <p style="margin: 0; font-size: 11px; color: #8c786a;">
                Instagram Oficial: <a href="https://www.instagram.com/cafecomciencia.arnaldobh/" target="_blank" style="color: #a65824; text-decoration: none; font-weight: 600;">@cafecomciencia.arnaldobh</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function atualizarSupabaseAluno(item, emailDestino) {
  try {
    const body = {
      presenca_confirmada: true,
      presenca_horario: '2026-11-18T19:00:00.000Z',
      presenca_validador: 'Portaria Oficial',
      certificado_emitido: true,
      certificado_codigo: `CERT-${item.protocolo}`,
      certificado_data_emissao: '2026-11-18T19:00:00.000Z'
    };

    if (item.protocolo === 'CC12-165232') {
      body.email = 'igorlandolfi@gmail.com';
    }

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/inscricoes?protocolo=eq.${item.protocolo}`, {
      method: 'PATCH',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    console.warn(`Aviso ao atualizar aluno no Supabase (${item.protocolo}):`, e.message);
  }
}

async function dispararTodos() {
  console.log(`\n===============================================================`);
  console.log(` INICIANDO DISPARO EM LOTE DAS DECLARAÇÕES DO 12° CAFÉ (${cadastrados.length} ENVIOS) `);
  console.log(`===============================================================\n`);

  let sucessos = 0;
  let falhas = 0;
  const resultados = [];

  for (let i = 0; i < cadastrados.length; i++) {
    const item = cadastrados[i];
    const pdfPath = path.join(indDir, item.arquivoPdf);

    if (!fs.existsSync(pdfPath)) {
      console.error(`❌ [${i + 1}/${cadastrados.length}] Arquivo PDF não encontrado: ${item.arquivoPdf}`);
      falhas++;
      resultados.push({ ...item, status: 'erro', motivo: 'Arquivo não encontrado' });
      continue;
    }

    // Corrige e-mail com typo
    let emailDestino = item.email;
    if (emailDestino === 'igorlandolfi@gmail.con') {
      emailDestino = 'igorlandolfi@gmail.com';
    }

    const nomeAnexo = `Declaracao_12_Cafe_com_Ciencia_${sanitizarNomeArquivo(item.nomeDeclaracao)}.pdf`;
    const mailOptions = {
      from: '"Liga Acadêmica Café com Ciência" <cafecomcienciaresend@gmail.com>',
      to: emailDestino,
      subject: `Sua Declaração Oficial está Pronta! 🎓 12° Café com Ciência - ${item.nomeDeclaracao}`,
      html: gerarHtmlEmailDeclaracao(item),
      attachments: [
        {
          filename: nomeAnexo,
          path: pdfPath,
          contentType: 'application/pdf'
        }
      ]
    };

    try {
      console.log(`[${i + 1}/${cadastrados.length}] Enviando para ${item.nomeDeclaracao} <${emailDestino}>...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`   ✅ SUCESSO! MessageId: ${info.messageId}`);
      sucessos++;
      resultados.push({
        ...item,
        emailDestino,
        status: 'enviado',
        messageId: info.messageId,
        dataEnvio: new Date().toISOString()
      });

      // Atualiza presença e certificado no banco
      await atualizarSupabaseAluno(item, emailDestino);

    } catch (err) {
      console.error(`   ❌ ERRO no envio para ${emailDestino}:`, err.message);
      falhas++;
      resultados.push({
        ...item,
        emailDestino,
        status: 'erro',
        erro: err.message,
        dataEnvio: new Date().toISOString()
      });
    }

    // Intervalo de 1.2 segundos entre os disparos
    if (i < cadastrados.length - 1) {
      await sleep(1200);
    }
  }

  console.log(`\n===============================================================`);
  console.log(` RELATÓRIO FINAL: ${sucessos} ENVIADOS COM SUCESSO | ${falhas} FALHAS`);
  console.log(`===============================================================\n`);

  const logPayload = {
    data: new Date().toISOString(),
    total: cadastrados.length,
    sucessos,
    falhas,
    resultados
  };

  fs.writeFileSync(
    path.join(indDir, 'log_disparo_declaracoes_12_cafe.json'),
    JSON.stringify(logPayload, null, 2),
    'utf8'
  );

  console.log('Log detalhado salvo em declaracoes_individuais/log_disparo_declaracoes_12_cafe.json');
}

dispararTodos().catch(console.error);
