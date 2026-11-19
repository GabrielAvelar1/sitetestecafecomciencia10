const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

function sanitizarNomeArquivo(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

async function main() {
  const matchResultado = JSON.parse(fs.readFileSync('relatorios/match_resultado.json', 'utf8'));
  const { encontrados, naoEncontrados } = matchResultado;

  const pdfBytes = fs.readFileSync('declarações 12 cafe.pdf');
  const srcDoc = await PDFDocument.load(pdfBytes);
  const totalPages = srcDoc.getPageCount();
  console.log(`PDF carregado com ${totalPages} páginas.`);

  const outputDir = path.join(__dirname, '..', 'declaracoes_individuais');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const relatorioFinal = [];

  // Processa Encontrados (37)
  for (const item of encontrados) {
    const pageIndex = item.pag - 1;
    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(srcDoc, [pageIndex]);
    singleDoc.addPage(copiedPage);

    const safeName = sanitizarNomeArquivo(item.nomePdf);
    const fileName = `declaracao_${item.protocolo}_${safeName}.pdf`;
    const filePath = path.join(outputDir, fileName);

    const singleBytes = await singleDoc.save();
    fs.writeFileSync(filePath, singleBytes);

    relatorioFinal.push({
      pagina: item.pag,
      nomeDeclaracao: item.nomePdf,
      nomeBanco: item.alunoDb,
      protocolo: item.protocolo,
      email: item.email,
      arquivoPdf: fileName,
      caminhoRelativo: `declaracoes_individuais/${fileName}`,
      tamanhoBytes: singleBytes.length,
      alunoId: item.id,
      statusBanco: 'encontrado'
    });
  }

  // Processa Não Encontrados (6)
  for (const item of naoEncontrados) {
    const pageIndex = item.pag - 1;
    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(srcDoc, [pageIndex]);
    singleDoc.addPage(copiedPage);

    const safeName = sanitizarNomeArquivo(item.nome);
    const fileName = `declaracao_12_SEM-PROTOCOLO-PAG${item.pag}_${safeName}.pdf`;
    const filePath = path.join(outputDir, fileName);

    const singleBytes = await singleDoc.save();
    fs.writeFileSync(filePath, singleBytes);

    relatorioFinal.push({
      pagina: item.pag,
      nomeDeclaracao: item.nome,
      nomeBanco: null,
      protocolo: null,
      email: null,
      arquivoPdf: fileName,
      caminhoRelativo: `declaracoes_individuais/${fileName}`,
      tamanhoBytes: singleBytes.length,
      alunoId: null,
      statusBanco: 'nao_cadastrado'
    });
  }

  relatorioFinal.sort((a, b) => a.pagina - b.pagina);

  fs.writeFileSync(
    path.join(outputDir, 'relatorio_declaracoes_12_cafe.json'),
    JSON.stringify(relatorioFinal, null, 2)
  );

  console.log(`Extração concluída: ${relatorioFinal.length} declarações salvas em declaracoes_individuais/`);
  console.log(`- Encontrados para envio: ${encontrados.length}`);
  console.log(`- Não encontrados no site (para envio manual): ${naoEncontrados.length}`);
}

main().catch(console.error);
