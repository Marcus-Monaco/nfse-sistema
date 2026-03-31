-- Prestadores de serviço
CREATE TABLE IF NOT EXISTS prestadores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cnpj TEXT NOT NULL UNIQUE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  inscricao_municipal TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  codigo_municipio TEXT,
  municipio TEXT,
  uf TEXT,
  cep TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tomadores (pacientes/clientes)
CREATE TABLE IF NOT EXISTS tomadores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL DEFAULT 'cpf',
  documento TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  codigo_municipio TEXT,
  municipio TEXT,
  uf TEXT,
  cep TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Templates de serviço
CREATE TABLE IF NOT EXISTS servicos_template (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_servico TEXT NOT NULL,
  descricao_padrao TEXT NOT NULL,
  aliquota_iss REAL DEFAULT 2.00,
  municipio_incidencia TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Histórico de notas emitidas
CREATE TABLE IF NOT EXISTS notas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chave_acesso TEXT UNIQUE,
  numero_nfse TEXT,
  protocolo TEXT,
  prestador_id INTEGER,
  tomador_id INTEGER,
  servico_codigo TEXT,
  servico_descricao TEXT,
  valor_servico REAL,
  aliquota_iss REAL,
  valor_iss REAL,
  valor_liquido REAL,
  xml TEXT,
  status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prestador_id) REFERENCES prestadores(id),
  FOREIGN KEY (tomador_id) REFERENCES tomadores(id)
);
