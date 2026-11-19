const fs = require('fs');
const path = require('path');

const relatorio = JSON.parse(fs.readFileSync('declaracoes_individuais/relatorio_declaracoes_12_cafe.json', 'utf8'));
const cadastrados = relatorio.filter(r => r.statusBanco === 'encontrado');

const clientPath = path.join(__dirname, '..', 'js', 'supabase-client.js');
let clientContent = fs.readFileSync(clientPath, 'utf8');

const target11 = '  "CC11-121635": "declaracoes_individuais/declaracao_CC11-121635_Laura_Avila_Soares.pdf"\n};';

const novasEntradas = cadastrados.map(c => `  "${c.protocolo}": "declaracoes_individuais/${c.arquivoPdf}",`).join('\n');

const replacement12 = `  "CC11-121635": "declaracoes_individuais/declaracao_CC11-121635_Laura_Avila_Soares.pdf",\n\n  // --- 12° CAFÉ COM CIÊNCIA ---\n${novasEntradas}\n};`;

if (!clientContent.includes(target11)) {
  console.error('Target 11 não encontrado no supabase-client.js');
  process.exit(1);
}

clientContent = clientContent.replace(target11, replacement12);

// Atualiza a verificação de prefixo em obterLinkDeclaracaoPdf
clientContent = clientContent.replace(
  `  if (!protoUpper.startsWith('CC10-') && !protoUpper.startsWith('CC11-')) {`,
  `  if (!protoUpper.startsWith('CC10-') && !protoUpper.startsWith('CC11-') && !protoUpper.startsWith('CC12-')) {`
);

fs.writeFileSync(clientPath, clientContent, 'utf8');
console.log(`supabase-client.js atualizado com sucesso com ${cadastrados.length} declarações do 12° Café!`);
