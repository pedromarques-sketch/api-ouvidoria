
USE defaultdb;

CREATE TABLE IF NOT EXISTS manifestacoes (
  protocolo CHAR(36) PRIMARY KEY,
  categoria ENUM('elogio', 'sugestao', 'reclamacao', 'solicitacao') NOT NULL,
  mensagem VARCHAR(1000) NOT NULL,
  situacao ENUM('recebida', 'em_analise', 'respondida')
    NOT NULL DEFAULT 'recebida',
  criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARACTER SET utf8mb4;

SHOW TABLES;