# Sistema NFS-e - Documentacao Completa

## 1. Visao Geral

Sistema web para emissao de **NFS-e (Nota Fiscal de Servico Eletronica)** integrado com o **Emissor Nacional** (nfse.gov.br). Desenvolvido para a empresa **SERVICO DE ANESTESIOLOGIA GAUCHO LTDA (SAGA)**, CNPJ 41.453.040/0001-76, Porto Alegre/RS.

### O que o sistema faz

1. Operador recebe mensagem do WhatsApp com dados do paciente/servico
2. Cola a mensagem no sistema
3. Sistema extrai automaticamente: nome, CPF, endereco, valor, descricao
4. Operador confere e clica "Emitir NFS-e"
5. Sistema assina o XML com certificado digital, envia para a API do governo, e retorna a nota autorizada
6. Operador pode baixar PDF, XML ou copiar comprovante para o WhatsApp

### Modos de operacao

| Modo | Descricao | Uso |
|------|-----------|-----|
| **Mock** | Simula a emissao sem chamar a API real | Demonstracao, testes de interface |
| **Real (Homologacao)** | Envia para API de teste do governo | Testes com certificado real, sem valor fiscal |
| **Real (Producao)** | Envia para API oficial | Notas com valor fiscal real |

---

## 2. Tech Stack

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| **Linguagem** | TypeScript / JavaScript | TS 5.9.3 |
| **Runtime** | Node.js | v18+ |
| **Backend (local)** | Express | 5.2.1 |
| **Backend (cloud)** | Cloudflare Workers | Wrangler 4.75.0 |
| **Banco de dados** | Cloudflare D1 (SQLite) | - |
| **Frontend** | HTML + Tailwind CSS (CDN) + JS vanilla | - |
| **PDF (server)** | PDFKit | 0.18.0 |
| **PDF (client)** | jsPDF | 2.5.2 |
| **Assinatura XML** | xml-crypto | 6.1.2 |
| **Certificado** | node-forge | 1.3.3 |
| **Variaveis de ambiente** | dotenv | 17.3.1 |

---

## 3. Estrutura do Projeto

```
integracao_sefaz/
├── src/                              # Codigo TypeScript
│   ├── server.ts                     # Servidor Express (dev local)
│   ├── worker.ts                     # Cloudflare Worker (producao cloud)
│   ├── config/
│   │   └── sefaz.ts                  # Configuracao (.env)
│   ├── models/
│   │   └── nfe.types.ts              # Interfaces TypeScript
│   ├── services/
│   │   ├── nfe.service.ts            # Orquestracao (mock ou real)
│   │   ├── nfse-real.service.ts      # Integracao real com API SEFAZ
│   │   ├── mock.service.ts           # Geracao de XML mock
│   │   └── danfe.service.ts          # Geracao de DANFSE PDF (server-side)
│   ├── routes/
│   │   ├── nfe.routes.ts             # Rotas POST /emitir, GET /status
│   │   └── danfe.routes.ts           # Rota GET /:chave (PDF)
│   └── utils/
│       ├── validators.ts             # Validacao CPF/CNPJ (mod-11)
│       └── xml-builder.ts            # Formatacao XML
│
├── public/                           # Frontend (servido como estatico)
│   ├── index.html                    # Dashboard principal (SPA com abas)
│   ├── login.html                    # Tela de login
│   ├── css/styles.css                # Estilos customizados
│   └── js/
│       ├── app.js                    # Logica principal, auth, emissao
│       ├── cadastros.js              # CRUD prestadores/tomadores
│       ├── form-sections.js          # Mascaras, calculos ISS, demo data
│       ├── parser.js                 # Parser de mensagem WhatsApp + PDF client
│       └── jspdf.min.js              # Biblioteca jsPDF (bundled)
│
├── migrations/                       # Schema do banco D1
│   ├── 0001_init.sql                 # Tabelas: prestadores, tomadores, servicos_template, notas
│   └── 0002_users.sql                # Tabela users + superuser
│
├── certs/                            # Certificados digitais (.gitignore)
│   └── SAGA_41453040.pfx             # Certificado A1 da SAGA
│
├── xml-output/                       # XMLs gerados (cache)
│
├── package.json                      # Dependencias npm
├── tsconfig.json                     # Config TypeScript
├── wrangler.toml                     # Config Cloudflare Workers + D1
├── .env                              # Variaveis de ambiente (local)
└── .gitignore                        # Ignora node_modules, certs/*.pfx, .env, xml-output
```

---

## 4. Arquitetura

### Fluxo de emissao (modo real)

```
┌─────────────┐    ┌──────────────┐    ┌───────────────────┐    ┌──────────────┐
│  Navegador  │───>│  Servidor    │───>│  Assinatura XML   │───>│  API SEFAZ   │
│  (Frontend) │    │  Express     │    │  (xml-crypto +    │    │  (mTLS com   │
│             │<───│  Node.js     │<───│   certificado A1) │<───│   .pfx)      │
└─────────────┘    └──────────────┘    └───────────────────┘    └──────────────┘
     HTML              API REST            GZip + Base64         sefin.nfse.gov.br
   Tailwind CSS      Auth (token)         RSA-SHA256
    jsPDF             Validacao
```

### Dual deploy

```
┌─────────────────────────────────────────────┐
│  LOCAL (npm run dev)                        │
│  - Express server na porta 3000            │
│  - Dados em memoria (prestadores, etc.)    │
│  - Certificado .pfx para emissao real      │
│  - MOCK_MODE=false → API real SEFAZ        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  CLOUDFLARE (wrangler deploy)              │
│  - Worker + Assets (HTML/JS/CSS)           │
│  - Banco D1 (SQLite na edge)              │
│  - Sem certificado (nao suporta mTLS)     │
│  - Sempre modo mock                        │
│  - URL: nfse-sistema.labonna.workers.dev  │
└─────────────────────────────────────────────┘
```

---

## 5. Backend

### 5.1 Servidor Express (src/server.ts)

Usado no desenvolvimento local. Funcionalidades:

- **Autenticacao**: Login com email/senha, token em memoria (24h TTL)
- **Superuser**: admin@jmsoftware.com / JMSoft@2026
- **Dados em memoria**: Prestador da SAGA ja pre-carregado
- **Middleware de auth**: Protege todas as rotas /api exceto login e config
- **Rotas CRUD**: prestadores, tomadores, notas (in-memory)

### 5.2 Cloudflare Worker (src/worker.ts)

Usado em producao na nuvem. Diferenças do Express:

- Usa Cloudflare D1 (SQL) em vez de memoria
- Auth com crypto.subtle (Web Crypto API)
- Sessoes em Map (reset a cada deploy)
- Nao suporta emissao real (sem mTLS)

### 5.3 Servicos

#### nfe.service.ts — Orquestracao
- `emitirNFSe(data)` — Decide entre mock e real baseado em MOCK_MODE
- `consultarStatus()` — Testa conectividade com API
- `buscarXmlPorChave(chave)` — Recupera XML salvo

#### mock.service.ts — Simulacao
- `emitirNFSeMock(data)` — Gera XML fake no formato NFS-e
- `gerarChaveAcesso(data)` — Chave de 44 digitos com digito verificador (mod-11)
- `statusServicoMock()` — Retorna status fixo "em operacao"

#### nfse-real.service.ts — Integracao real (426 linhas)
1. `extrairCertificado()` — Abre .pfx com node-forge, extrai chave privada + certificado PEM
2. `gerarIdDPS()` — Monta ID de 45 chars: "DPS" + cMun(7) + tipo(1) + CNPJ(14) + serie(5) + num(15)
3. `gerarDpsXml()` — Gera XML completo do DPS com todos os campos obrigatorios
4. `converterCodigoServico()` — Mapeia LC 116 para cTribNac (6 digitos)
5. `assinarXml()` — Assina com RSA-SHA256, canonicalizacao exc-c14n, KeyInfo X509
6. `comprimirXml()` — GZip + Base64
7. `enviarParaApi()` — HTTPS POST com mTLS usando .pfx
8. `emitirNFSeReal()` — Orquestra todo o fluxo: cert → XML → assinar → comprimir → enviar → decodificar resposta

#### danfe.service.ts — PDF server-side
- `parseDanfseDataFromXml()` — Extrai dados do XML via regex
- `gerarDanfsePdf()` — Gera PDF A4 com PDFKit (header, tomador, servico, valores, footer)

### 5.4 Rotas da API

| Metodo | Path | Auth | Descricao |
|--------|------|------|-----------|
| POST | /api/auth/login | Nao | Login (email + senha → token) |
| GET | /api/config | Nao | Configuracao do sistema |
| GET | /api/prestadores | Sim | Listar prestadores |
| POST | /api/prestadores | Sim | Cadastrar prestador |
| DELETE | /api/prestadores/:id | Sim | Remover prestador |
| GET | /api/tomadores | Sim | Listar tomadores |
| GET | /api/tomadores/:doc | Sim | Buscar por CPF/CNPJ |
| POST | /api/tomadores | Sim | Cadastrar/atualizar tomador |
| POST | /api/nfse/emitir | Sim | Emitir NFS-e |
| GET | /api/nfse/status | Sim | Status da API SEFAZ |
| GET | /api/danfse/:chave | Sim | Download DANFSE PDF |
| GET | /api/notas | Sim | Historico de notas |
| GET | /api/servicos | Sim | Templates de servico |

### 5.5 Modelos TypeScript (nfe.types.ts)

```typescript
IPrestador   { cnpj, razaoSocial, nomeFantasia, inscricaoMunicipal, endereco }
ITomador     { tipo: 'cpf'|'cnpj', documento, nome, email?, endereco }
IEndereco    { logradouro, numero, complemento?, bairro, codigoMunicipio, municipio, uf, cep }
IServico     { codigoServico, descricao, valorServico }
IImpostoNFSe { iss: { baseCalculo, aliquota, valor, municipioIncidencia } }
IFormData    { prestador, tomador, servico, imposto }
INFSeResult  { success, xml, protocolo?, chaveAcesso?, numeroNfse?, status?, motivo? }
```

### 5.6 Validadores (validators.ts)

- `validarCNPJ(cnpj)` — 14 digitos, 2 digitos verificadores (mod-11)
- `validarCPF(cpf)` — 11 digitos, 2 digitos verificadores (mod-11)
- `formatarCNPJ/CPF` — Formatacao com pontos e tracos

---

## 6. Frontend

### 6.1 Tela de Login (login.html)

- Campo email + senha
- Mensagem de erro visual
- Salva token no localStorage
- Redireciona para / apos login
- Background gradiente azul

### 6.2 Dashboard Principal (index.html)

**Header**: Logo, titulo, badges (status online, modo simulacao, emissor nacional), botao sair

**5 abas**:

#### Aba "Colar Mensagem" (principal)
- Dropdown de prestador (pre-carregado)
- Dropdown de codigo de servico (LC 116)
- Textarea para colar mensagem do WhatsApp
- Botao "Processar Mensagem" → preview dos dados extraidos
- Botao "Emitir NFS-e"
- Resultado: copiar comprovante, download PDF, download XML, ver XML, nova emissao

#### Aba "Emissao Manual"
- Formulario completo com todos os campos
- Secoes: Prestador, Tomador, Servico, ISS, Totais
- Botao "Dados Demo" para auto-preenchimento
- Calculo automatico de ISS em tempo real

#### Aba "Prestadores"
- Lista de prestadores cadastrados com botoes Usar/Excluir
- Formulario para cadastrar novo prestador

#### Aba "Tomadores"
- Lista de tomadores (salvos automaticamente ao emitir)
- Botao excluir

#### Aba "Historico"
- Lista de notas emitidas com numero, valor, prestador, tomador, data, status

### 6.3 Parser de WhatsApp (parser.js)

Extrai dados de mensagens como:
```
Sofia Gutierres Aquino Schultz
Cpf: 037.212.530-19
Av. Venancio Aires, 449 apt 1012
CEP 90040-193 - Porto Alegre/RS
Valor: R$3.279,00.
Descricao: Referente aos honorarios...
```

**Regex utilizados**:
- Nome: primeira linha alfabetica que nao e campo
- CPF: `/[Cc][Pp][Ff]:?\s*([\d]{3}[.\s]?[\d]{3}[.\s]?[\d]{3}[-.\s]?[\d]{2})/`
- Endereco: `/(?:Av\.?|Rua|R\.|Al\.|Trav\.)[^,\n]*,?\s*(\d+)/`
- CEP + Cidade/UF: `/CEP\s*([\d]{5}[-.]?[\d]{3})\s*[-]?\s*([^/\n]+?)\s*[/]\s*([A-Z]{2})/`
- Valor: `/[Vv]alor:?\s*R?\$?\s*([\d.,]+)/`
- Descricao: `/[Dd]escri[cc][aa]o:?\s*([\s\S]*?)(?:\n\s*\n|\n\s*Dr\.)/`

### 6.4 PDF Client-Side (jsPDF)

Gera DANFSE no navegador com:
- Header: nome prestador + DANFSE + numero
- Badge homologacao
- Chave de acesso + protocolo
- Dados do tomador
- Descricao do servico
- Valores: servico, base ISS, ISS, liquido
- Footer: "Desenvolvido por: JM Software"

### 6.5 Mascaras e Calculos (form-sections.js)

- CNPJ: XX.XXX.XXX/XXXX-XX
- CPF: XXX.XXX.XXX-XX
- CEP: XXXXX-XXX
- ISS: valor × aliquota% = iss; liquido = valor - iss
- Formatacao monetaria: R$ X.XXX,XX

---

## 7. Banco de Dados (Cloudflare D1)

### Tabelas

```sql
prestadores (id, cnpj UNIQUE, razao_social, nome_fantasia, inscricao_municipal,
             logradouro, numero, bairro, codigo_municipio, municipio, uf, cep, created_at)

tomadores   (id, tipo, documento UNIQUE, nome, email,
             logradouro, numero, bairro, codigo_municipio, municipio, uf, cep, created_at)

servicos_template (id, codigo_servico, descricao_padrao, aliquota_iss, municipio_incidencia, created_at)

notas       (id, chave_acesso UNIQUE, numero_nfse, protocolo, prestador_id FK, tomador_id FK,
             servico_codigo, servico_descricao, valor_servico, aliquota_iss, valor_iss,
             valor_liquido, xml, status, created_at)

users       (id, email UNIQUE, password_hash, name, role, created_at)
```

---

## 8. Integracao Real com SEFAZ

### Certificado Digital

- **Tipo**: e-CNPJ A1 (arquivo .pfx)
- **Empresa**: SERVICO DE ANESTESIOLOGIA GAUCHO LTDA
- **CNPJ**: 41.453.040/0001-76
- **Emissor**: AC SAFEWEB RFB v5
- **Validade**: ate 17/04/2026
- **Senha**: 41453040

### Fluxo tecnico da emissao

```
1. Carregar certificado (.pfx → node-forge → PEM)
2. Gerar numero DPS (timestamp)
3. Montar XML do DPS:
   - tpAmb=2 (homologacao)
   - Prestador: CNPJ + regTrib (opSimpNac=1, regEspTrib=0)
   - Tomador: CPF/CNPJ + endereco
   - Servico: cTribNac + descricao
   - Valores: vServ
   - Tributos: tribMun (tribISSQN=1, tpRetISSQN=1) + totTrib (vTotTrib)
4. Assinar XML:
   - Algoritmo: RSA-SHA256
   - Canonicalizacao: Exclusive XML-C14N
   - Referencia: URI="#DPS{id}" com enveloped-signature
   - KeyInfo: X509Certificate em Base64
5. Comprimir: GZip → Base64
6. Enviar: POST https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse
   - Header: Content-Type: application/json
   - Body: { dpsXmlGZipB64: "..." }
   - mTLS: https.Agent com pfx + passphrase
7. Receber resposta:
   - HTTP 201 = sucesso
   - Decodificar: Base64 → GZip → XML da NFS-e
8. Salvar XML em xml-output/{chaveAcesso}.xml
```

### URLs da API

| Ambiente | URL |
|----------|-----|
| Homologacao | `https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse` |
| Producao | `https://sefin.nfse.gov.br/SefinNacional/nfse` |

### Mapeamento de codigos de servico

| LC 116 | cTribNac | Descricao |
|--------|----------|-----------|
| 14.01 / 4.01 | 010401 | Medicina e biomedicina |
| 14.02 / 4.02 | 010402 | Analises clinicas |
| 14.03 / 4.03 | 010403 | Hospitais, clinicas |
| 7.02 | 010702 | Engenharia e arquitetura |
| 17.01 | 011701 | Assessoria e consultoria |
| 17.02 | 011702 | Contabilidade |
| 25.01 | 012501 | TI e informatica |

### Campos do prestador aprendidos com a API

- `opSimpNac=1` (SAGA e Simples Nacional)
- NAO informar endereco do prestador (tpEmit=1 = proprio prestador emite)
- NAO informar IM (municipio nao exige no CNC)
- NAO informar regApTribSN (rejeita para nao-optante no cadastro)
- totTrib com vTotTrib estruturado (vTotTribFed, vTotTribEst, vTotTribMun)

---

## 9. Deploy

### Local (desenvolvimento + emissao real)

```bash
npm install                # Instalar dependencias
npm run dev                # Rodar com nodemon + ts-node (porta 3000)
```

Acesse: http://localhost:3000

### Cloudflare Workers (demo na nuvem)

```bash
npx wrangler login         # Login no Cloudflare (uma vez)
npx wrangler d1 migrations apply nfse-db --remote  # Aplicar schema
npx wrangler deploy        # Deploy
```

URL: https://nfse-sistema.labonna.workers.dev

---

## 10. Seguranca

### Implementacao atual

| Item | Status |
|------|--------|
| Hash de senha | SHA-256 com salt fixo (demo) |
| Tokens | Random 32 bytes, 24h TTL |
| Certificado | .pfx no .gitignore |
| HTTPS (API SEFAZ) | mTLS com certificado A1 |
| Validacao de entrada | CPF/CNPJ com digito verificador |

### Recomendacoes para producao

- Trocar SHA-256 por **bcrypt** ou **argon2**
- Usar **JWT com RS256** em vez de tokens simples
- Habilitar `rejectUnauthorized: true` na chamada SEFAZ
- Usar gerenciador de secrets (AWS Secrets Manager, Vault)
- Adicionar CSRF tokens
- Rate limiting nas rotas de emissao
- HTTPS obrigatorio em tudo
- Logs de auditoria

---

## 11. Como Rodar

### Pre-requisitos

- Node.js 18+
- npm

### Instalacao

```bash
git clone <repo>
cd integracao_sefaz
npm install
```

### Configuracao (.env)

```env
PORT=3000
MOCK_MODE=false          # true=simulacao, false=API real
AMBIENTE=2               # 1=producao, 2=homologacao
UF=RS
CERT_PATH=./certs/SAGA_41453040.pfx
CERT_PASSWORD=41453040
```

### Executar

```bash
npm run dev              # Servidor local com hot-reload
```

### Login

- **Email**: admin@jmsoftware.com
- **Senha**: JMSoft@2026

### Testar emissao

1. Acessar http://localhost:3000
2. Fazer login
3. Na aba "Colar Mensagem", selecionar prestador
4. Colar mensagem do WhatsApp
5. Processar → Emitir NFS-e

---

## 12. Historico de Desenvolvimento

1. Pesquisa sobre SEFAZ e NF-e
2. Criacao do sistema como NF-e (ICMS/produtos)
3. Descoberta que o correto era NFS-e (ISS/servicos)
4. Conversao completa para NFS-e com Emissor Nacional
5. Deploy no Cloudflare Workers com banco D1
6. Criacao da aba "Colar Mensagem" com parser de WhatsApp
7. Implementacao da integracao real com API SEFAZ:
   - Certificado A1 (.pfx) da SAGA
   - Assinatura XML com xml-crypto
   - Ajuste iterativo do schema XML (11+ tentativas ate passar na validacao)
   - Descoberta dos campos obrigatorios/proibidos para a SAGA
   - Emissao bem-sucedida em homologacao (HTTP 201, nota autorizada)
8. Sistema de login com autenticacao por token
9. Geracao de PDF client-side com jsPDF

---

**Desenvolvido por: JM Software**
