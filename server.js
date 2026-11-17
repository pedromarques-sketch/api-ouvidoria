
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { randomUUID } = require('node:crypto');
const banco = require('./db');

const app = express();
const categorias = new Set(['elogio', 'sugestao', 'reclamacao', 'solicitacao']);
const formatoProtocolo = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (process.env.FRONTEND_ORIGIN) {
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));
}

app.use(express.json({ limit: '16kb' }));

app.get('/health', async (req, res) => {
  try {
    await banco.execute('SELECT protocolo FROM manifestacoes LIMIT 1');
    return res.json({ status: 'ok', banco: 'disponivel' });
  } catch (erro) {
    console.error('Falha na verificação do banco:', erro.code);
    return res.status(503).json({ status: 'indisponivel' });
  }
});

app.post('/api/manifestacoes', async (req, res) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ erro: 'Envie o corpo como application/json.' });
  }

  const { categoria, mensagem } = req.body ?? {};

  if (!categorias.has(categoria)) {
    return res.status(400).json({ erro: 'Selecione uma categoria válida.' });
  }

  const texto = typeof mensagem === 'string' ? mensagem.trim() : '';

  if (texto.length < 10 || texto.length > 1000) {
    return res.status(400).json({ erro: 'A mensagem deve ter de 10 a 1000 caracteres.' });
  }

  const protocolo = randomUUID();

  await banco.execute(
    'INSERT INTO manifestacoes (protocolo, categoria, mensagem) VALUES (?, ?, ?)',
    [protocolo, categoria, texto]
  );

  return res
    .location(`/api/manifestacoes/${protocolo}`)
    .status(201)
    .json({ protocolo, categoria, situacao: 'recebida' });
});

app.get('/api/manifestacoes/:protocolo', async (req, res) => {
  const { protocolo } = req.params;

  if (!formatoProtocolo.test(protocolo)) {
    return res.status(400).json({ erro: 'Protocolo em formato inválido.' });
  }

  const [linhas] = await banco.execute(
    'SELECT protocolo, categoria, situacao, criada_em FROM manifestacoes WHERE protocolo = ?',
    [protocolo.toLowerCase()]
  );

  if (linhas.length === 0) {
    return res.status(404).json({ erro: 'Protocolo não encontrado.' });
  }

  return res.json(linhas[0]);
});

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use((erro, req, res, next) => {
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }

  if (erro.status === 413) {
    return res.status(413).json({ erro: 'Corpo da requisição acima do limite.' });
  }

  console.error('Erro da API:', erro.code ?? erro.name);
  return res.status(500).json({ erro: 'Erro interno da API.' });
});

const porta = Number(process.env.PORT || 3000);

app.listen(porta, '0.0.0.0', () => {
  console.log(`API ouvindo na porta ${porta}`);
});