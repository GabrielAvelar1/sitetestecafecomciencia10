const fs = require('fs');

const nomesPdf = [
  { pag: 1, nome: 'Emanuelle Vitória' },
  { pag: 2, nome: 'Deborah Alves' },
  { pag: 3, nome: 'Felipe Henrique Guedes de Souza' },
  { pag: 4, nome: 'Gabriel Avelar de Oliveira' },
  { pag: 5, nome: 'Carlos Eduardo Figueira Mancia' },
  { pag: 6, nome: 'Maria Júlia Silva dias Paes' },
  { pag: 7, nome: 'Rafaela Alves da Mata' },
  { pag: 8, nome: 'Kelly Gabrielle Couto Aquino de Oliveira' },
  { pag: 9, nome: 'Tatiellen bruna dos Santos' },
  { pag: 10, nome: 'Pedro Henrique da Silva Cota' },
  { pag: 11, nome: 'Maíra Pinheiro Neves' },
  { pag: 12, nome: 'Raquel pimenta' },
  { pag: 13, nome: 'Chrystine Pereira Soares' },
  { pag: 14, nome: 'Isabella de Cássia Barboza Castro' },
  { pag: 15, nome: 'Otávio Santiago da Silva' },
  { pag: 16, nome: 'Michelle Stole Vieira Cassavari' },
  { pag: 17, nome: 'Isadora Queiroz Horta' },
  { pag: 18, nome: 'Pedro Paulo Costa e Silva de Morais' },
  { pag: 19, nome: 'Yasmim Pereira dos Santos Morais' },
  { pag: 20, nome: 'Igor Landolfi' },
  { pag: 21, nome: 'Juliana Dutra de Farias' },
  { pag: 22, nome: 'Wendy Shirll da Silva' },
  { pag: 23, nome: 'Déborah Ketlyn Alves Lage' },
  { pag: 24, nome: 'Ana Luiza Martins Hilario' },
  { pag: 25, nome: 'ELIANE CARMEM COSTA CABRAL' },
  { pag: 26, nome: 'Sarah Victoria dos Santos Costa' },
  { pag: 27, nome: 'Shara Soares Bragança' },
  { pag: 28, nome: 'Iasmim Nunes Alves' },
  { pag: 29, nome: 'Luiz Eduardo Evangelista Rafael' },
  { pag: 30, nome: 'Felipe Tacchi' },
  { pag: 31, nome: 'Chelsea Lyssa de Souza Lino' },
  { pag: 32, nome: 'Maria Luísa Ribeiro dos Santos' },
  { pag: 33, nome: 'Gabriele dos Reis Beato' },
  { pag: 34, nome: 'Cely Regina Martins Rocha de Lacerda' },
  { pag: 35, nome: 'Júlia Soares Souto' },
  { pag: 36, nome: 'Geovana Oliveira Ferreira' },
  { pag: 37, nome: 'Amanda Laysa Almeida Santos' },
  { pag: 38, nome: 'Laura Ávila Soares' },
  { pag: 39, nome: 'Daniel Henrique da Silva Guimarães' },
  { pag: 40, nome: 'Ana Carolina Mesquita Araújo' },
  { pag: 41, nome: 'Vitória de Oliveira Moreira' },
  { pag: 42, nome: 'Fabio Fonseca Queiroz' },
  { pag: 43, nome: 'Silvia Villalba Rocha da Costa' }
];

const SUPABASE_URL = 'https://zcbylqggrxocdevddtlx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjYnlscWdncnhvY2RldmRkdGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxOTM2MzIsImV4cCI6MjEwNTc2OTYzMn0.FS5e7VlodcABs72X4xfTvwVW8eFn-E8JdZ9ZQNNxba0';

function normalizar(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
}

async function match() {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/inscricoes?select=*', {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY }
  });
  const data = await resp.json();
  const inscritos = data.filter(d => d.protocolo !== 'SISTEMA-CONFIG');

  const encontrados = [];
  const naoEncontrados = [];

  for (const item of nomesPdf) {
    const normPdf = normalizar(item.nome);
    let matchAluno = inscritos.find(i => normalizar(i.nome_completo) === normPdf);
    
    if (!matchAluno) {
      matchAluno = inscritos.find(i => {
        const normDb = normalizar(i.nome_completo);
        return normDb.includes(normPdf) || normPdf.includes(normDb);
      });
    }

    if (!matchAluno) {
      const partes = normPdf.split(' ');
      const prim = partes[0];
      const ult = partes[partes.length - 1];
      matchAluno = inscritos.find(i => {
        const normDb = normalizar(i.nome_completo);
        return normDb.startsWith(prim) && normDb.endsWith(ult);
      });
    }

    if (matchAluno) {
      encontrados.push({
        pag: item.pag,
        nomePdf: item.nome,
        alunoDb: matchAluno.nome_completo,
        email: matchAluno.email,
        protocolo: matchAluno.protocolo,
        id: matchAluno.id
      });
    } else {
      naoEncontrados.push(item);
    }
  }

  console.log('=== ENCONTRADOS NO BANCO (' + encontrados.length + ') ===');
  encontrados.forEach(e => console.log('Pag ' + e.pag + ': ' + e.nomePdf + ' -> ' + e.alunoDb + ' <' + e.email + '> [' + e.protocolo + ']'));

  console.log('\n=== NÃO ENCONTRADOS NO BANCO DO 12° CAFÉ (' + naoEncontrados.length + ') ===');
  naoEncontrados.forEach(ne => console.log('Pag ' + ne.pag + ': ' + ne.nome));

  fs.writeFileSync('relatorios/match_resultado.json', JSON.stringify({ encontrados, naoEncontrados }, null, 2));
}

match().catch(console.error);
