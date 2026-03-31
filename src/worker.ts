import { IFormData, INFSeResult } from './models/nfe.types';
import { validarCNPJ, validarCPF } from './utils/validators';

interface Env {
  DB: D1Database;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

// ========== Auth ==========

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'nfse_salt_jm2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Tokens em memória (reset a cada deploy — ok para demo)
const activeSessions = new Map<string, { userId: number; email: string; name: string; role: string; expires: number }>();

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const { email, password }: any = await request.json();
  if (!email || !password) return json({ success: false, motivo: 'E-mail e senha obrigatorios' }, 400);

  const hash = await hashPassword(password);
  const user: any = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();

  if (!user || user.password_hash !== hash) {
    return json({ success: false, motivo: 'E-mail ou senha incorretos' }, 401);
  }

  const token = generateToken();
  activeSessions.set(token, {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    expires: Date.now() + 24 * 60 * 60 * 1000, // 24h
  });

  return json({
    success: true,
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

function verifyAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

// ========== Helpers ==========

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function cors(): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// ========== Mock NFS-e ==========

function gerarChaveAcesso(data: IFormData): string {
  const cnpj = data.prestador.cnpj.replace(/[^\d]/g, '');
  const now = new Date();
  const aamm = now.getFullYear().toString().slice(2) + String(now.getMonth() + 1).padStart(2, '0');
  const codMun = data.prestador.endereco.codigoMunicipio;
  const numNfse = String(Math.floor(Math.random() * 999999999)).padStart(13, '0');
  const cNF = String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
  let chave = `${codMun}${aamm}${cnpj}${numNfse}${cNF}`.replace(/\D/g, '').padEnd(43, '0').slice(0, 43);
  let peso = 2, soma = 0;
  for (let i = chave.length - 1; i >= 0; i--) {
    soma += parseInt(chave[i]) * peso;
    peso = peso >= 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return chave + (resto < 2 ? 0 : 11 - resto);
}

function emitirNFSeMock(data: IFormData): INFSeResult {
  const chaveAcesso = gerarChaveAcesso(data);
  const now = new Date();
  const dhEmi = now.toISOString();
  const prest = data.prestador;
  const tom = data.tomador;
  const serv = data.servico;
  const iss = data.imposto.iss;
  const numNfse = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  const numDPS = String(Math.floor(Math.random() * 999999)).padStart(9, '0');
  const valorLiquido = serv.valorServico - iss.valor;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infNFSe Id="NFSe${chaveAcesso}">
    <nNFSe>${numNfse}</nNFSe>
    <cLocEmi>${prest.endereco.codigoMunicipio}</cLocEmi>
    <dhEmi>${dhEmi}</dhEmi>
    <tpAmb>2</tpAmb>
    <verAplic>1.0.0</verAplic>
    <DPS>
      <infDPS Id="DPS${numDPS}">
        <nDPS>${numDPS}</nDPS>
        <dhEmi>${dhEmi}</dhEmi>
        <tpAmb>2</tpAmb>
        <serie>NFS</serie>
        <prest>
          <CNPJ>${prest.cnpj.replace(/[^\d]/g, '')}</CNPJ>
          <xNome>${prest.razaoSocial}</xNome>
          <xFant>${prest.nomeFantasia}</xFant>
          <IM>${prest.inscricaoMunicipal}</IM>
          <enderPrest>
            <xLgr>${prest.endereco.logradouro}</xLgr>
            <nro>${prest.endereco.numero}</nro>
            <xBairro>${prest.endereco.bairro}</xBairro>
            <cMun>${prest.endereco.codigoMunicipio}</cMun>
            <xMun>${prest.endereco.municipio}</xMun>
            <UF>${prest.endereco.uf}</UF>
            <CEP>${prest.endereco.cep.replace(/[^\d]/g, '')}</CEP>
          </enderPrest>
        </prest>
        <toma>
          <${tom.tipo === 'cnpj' ? 'CNPJ' : 'CPF'}>${tom.documento.replace(/[^\d]/g, '')}</${tom.tipo === 'cnpj' ? 'CNPJ' : 'CPF'}>
          <xNome>${tom.nome}</xNome>
          <enderToma>
            <xLgr>${tom.endereco.logradouro}</xLgr>
            <nro>${tom.endereco.numero}</nro>
            <xBairro>${tom.endereco.bairro}</xBairro>
            <cMun>${tom.endereco.codigoMunicipio}</cMun>
            <xMun>${tom.endereco.municipio}</xMun>
            <UF>${tom.endereco.uf}</UF>
            <CEP>${tom.endereco.cep.replace(/[^\d]/g, '')}</CEP>
          </enderToma>
        </toma>
        <serv>
          <cServ>${serv.codigoServico}</cServ>
          <xDescServ>${serv.descricao}</xDescServ>
          <vServ>${serv.valorServico.toFixed(2)}</vServ>
        </serv>
        <valores>
          <vServPrest>${serv.valorServico.toFixed(2)}</vServPrest>
          <vDescIncond>0.00</vDescIncond>
          <vDescCond>0.00</vDescCond>
          <vDed>0.00</vDed>
          <vBC>${iss.baseCalculo.toFixed(2)}</vBC>
          <pAliqISS>${iss.aliquota.toFixed(2)}</pAliqISS>
          <vISS>${iss.valor.toFixed(2)}</vISS>
          <vLiq>${valorLiquido.toFixed(2)}</vLiq>
          <cMunInc>${iss.municipioIncidencia}</cMunInc>
        </valores>
      </infDPS>
    </DPS>
    <chNFSe>${chaveAcesso}</chNFSe>
    <nProt>${String(Math.floor(Math.random() * 999999999999999)).padStart(15, '0')}</nProt>
    <dhRecbto>${dhEmi}</dhRecbto>
    <cStat>100</cStat>
    <xMotivo>NFS-e autorizada</xMotivo>
  </infNFSe>
</NFSe>`;

  return {
    success: true, xml, chaveAcesso, numeroNfse: numNfse,
    protocolo: String(Math.floor(Math.random() * 999999999999999)).padStart(15, '0'),
    status: '100', motivo: 'NFS-e autorizada', dataAutorizacao: now.toISOString(),
  };
}

// ========== API Handlers ==========

async function handlePrestadores(request: Request, env: Env, method: string, id?: string): Promise<Response> {
  if (method === 'GET' && !id) {
    const { results } = await env.DB.prepare('SELECT * FROM prestadores ORDER BY nome_fantasia').all();
    return json(results);
  }

  if (method === 'GET' && id) {
    const row = await env.DB.prepare('SELECT * FROM prestadores WHERE id = ?').bind(id).first();
    return row ? json(row) : json({ error: 'Não encontrado' }, 404);
  }

  if (method === 'POST') {
    const d: any = await request.json();
    const result = await env.DB.prepare(
      `INSERT INTO prestadores (cnpj, razao_social, nome_fantasia, inscricao_municipal, logradouro, numero, bairro, codigo_municipio, municipio, uf, cep)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(d.cnpj, d.razao_social, d.nome_fantasia, d.inscricao_municipal, d.logradouro, d.numero, d.bairro, d.codigo_municipio, d.municipio, d.uf, d.cep).run();
    return json({ success: true, id: result.meta.last_row_id }, 201);
  }

  if (method === 'PUT' && id) {
    const d: any = await request.json();
    await env.DB.prepare(
      `UPDATE prestadores SET cnpj=?, razao_social=?, nome_fantasia=?, inscricao_municipal=?, logradouro=?, numero=?, bairro=?, codigo_municipio=?, municipio=?, uf=?, cep=? WHERE id=?`
    ).bind(d.cnpj, d.razao_social, d.nome_fantasia, d.inscricao_municipal, d.logradouro, d.numero, d.bairro, d.codigo_municipio, d.municipio, d.uf, d.cep, id).run();
    return json({ success: true });
  }

  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM prestadores WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Método não suportado' }, 405);
}

async function handleTomadores(request: Request, env: Env, method: string, id?: string): Promise<Response> {
  if (method === 'GET' && !id) {
    const { results } = await env.DB.prepare('SELECT * FROM tomadores ORDER BY nome').all();
    return json(results);
  }

  if (method === 'GET' && id) {
    // Buscar por ID ou por documento (CPF/CNPJ)
    const isDoc = id.length > 5;
    const query = isDoc
      ? 'SELECT * FROM tomadores WHERE documento = ? OR documento = ?'
      : 'SELECT * FROM tomadores WHERE id = ?';
    const row = isDoc
      ? await env.DB.prepare(query).bind(id, id.replace(/[^\d]/g, '')).first()
      : await env.DB.prepare(query).bind(id).first();
    return row ? json(row) : json({ error: 'Não encontrado' }, 404);
  }

  if (method === 'POST') {
    const d: any = await request.json();
    const docLimpo = d.documento.replace(/[^\d]/g, '');
    // Verifica se já existe
    const existing = await env.DB.prepare('SELECT id FROM tomadores WHERE documento = ?').bind(docLimpo).first();
    if (existing) {
      // Atualiza
      await env.DB.prepare(
        `UPDATE tomadores SET nome=?, email=?, logradouro=?, numero=?, bairro=?, codigo_municipio=?, municipio=?, uf=?, cep=? WHERE documento=?`
      ).bind(d.nome, d.email || null, d.logradouro, d.numero, d.bairro, d.codigo_municipio, d.municipio, d.uf, d.cep, docLimpo).run();
      return json({ success: true, id: (existing as any).id, updated: true });
    }
    const result = await env.DB.prepare(
      `INSERT INTO tomadores (tipo, documento, nome, email, logradouro, numero, bairro, codigo_municipio, municipio, uf, cep)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(d.tipo || 'cpf', docLimpo, d.nome, d.email || null, d.logradouro, d.numero, d.bairro, d.codigo_municipio, d.municipio, d.uf, d.cep).run();
    return json({ success: true, id: result.meta.last_row_id }, 201);
  }

  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM tomadores WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Método não suportado' }, 405);
}

async function handleServicos(request: Request, env: Env, method: string, id?: string): Promise<Response> {
  if (method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM servicos_template ORDER BY codigo_servico').all();
    return json(results);
  }

  if (method === 'POST') {
    const d: any = await request.json();
    const result = await env.DB.prepare(
      `INSERT INTO servicos_template (codigo_servico, descricao_padrao, aliquota_iss, municipio_incidencia) VALUES (?, ?, ?, ?)`
    ).bind(d.codigo_servico, d.descricao_padrao, d.aliquota_iss || 2.0, d.municipio_incidencia).run();
    return json({ success: true, id: result.meta.last_row_id }, 201);
  }

  if (method === 'DELETE' && id) {
    await env.DB.prepare('DELETE FROM servicos_template WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Método não suportado' }, 405);
}

async function handleEmitir(request: Request, env: Env): Promise<Response> {
  try {
    const data: IFormData = await request.json();

    if (!data.prestador?.cnpj || !data.tomador?.documento || !data.servico?.descricao) {
      return json({ success: false, motivo: 'Dados obrigatórios não preenchidos' }, 400);
    }
    if (!validarCNPJ(data.prestador.cnpj.replace(/[^\d]/g, ''))) {
      return json({ success: false, motivo: 'CNPJ do prestador inválido' }, 400);
    }
    if (data.tomador.tipo === 'cpf') {
      if (!validarCPF(data.tomador.documento.replace(/[^\d]/g, ''))) return json({ success: false, motivo: 'CPF do tomador inválido' }, 400);
    } else {
      if (!validarCNPJ(data.tomador.documento.replace(/[^\d]/g, ''))) return json({ success: false, motivo: 'CNPJ do tomador inválido' }, 400);
    }
    if (!data.servico.valorServico || data.servico.valorServico <= 0) {
      return json({ success: false, motivo: 'Valor do serviço deve ser maior que zero' }, 400);
    }

    const result = emitirNFSeMock(data);

    // Salvar nota no banco
    // Buscar IDs do prestador e tomador
    const prestador = await env.DB.prepare('SELECT id FROM prestadores WHERE cnpj = ?')
      .bind(data.prestador.cnpj.replace(/[^\d]/g, '')).first();
    const tomador = await env.DB.prepare('SELECT id FROM tomadores WHERE documento = ?')
      .bind(data.tomador.documento.replace(/[^\d]/g, '')).first();

    await env.DB.prepare(
      `INSERT INTO notas (chave_acesso, numero_nfse, protocolo, prestador_id, tomador_id, servico_codigo, servico_descricao, valor_servico, aliquota_iss, valor_iss, valor_liquido, xml, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      result.chaveAcesso, result.numeroNfse, result.protocolo,
      prestador ? (prestador as any).id : null,
      tomador ? (tomador as any).id : null,
      data.servico.codigoServico, data.servico.descricao,
      data.servico.valorServico, data.imposto.iss.aliquota,
      data.imposto.iss.valor, data.servico.valorServico - data.imposto.iss.valor,
      result.xml, result.status
    ).run();

    return json(result);
  } catch (error: any) {
    return json({ success: false, motivo: error.message || 'Erro interno' }, 500);
  }
}

async function handleNotas(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT n.*, p.nome_fantasia as prestador_nome, t.nome as tomador_nome
     FROM notas n
     LEFT JOIN prestadores p ON n.prestador_id = p.id
     LEFT JOIN tomadores t ON n.tomador_id = t.id
     ORDER BY n.created_at DESC LIMIT 50`
  ).all();
  return json(results);
}

// ========== Router ==========

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') return cors();

    // Auth route (public)
    if (path === '/api/auth/login' && method === 'POST') return handleLogin(request, env);

    // Public routes
    if (path === '/api/config') {
      return json({ mockMode: true, ambiente: 'Homologação', uf: 'RS', sistema: 'Emissor Nacional NFS-e' });
    }

    // Protected API routes — require auth
    if (path.startsWith('/api/')) {
      if (!verifyAuth(request)) {
        return json({ success: false, motivo: 'Nao autorizado' }, 401);
      }

      const prestMatch = path.match(/^\/api\/prestadores\/?(\d+)?$/);
      if (prestMatch) return handlePrestadores(request, env, method, prestMatch[1]);

      const tomMatch = path.match(/^\/api\/tomadores\/?(.+)?$/);
      if (tomMatch) return handleTomadores(request, env, method, tomMatch[1]);

      const servMatch = path.match(/^\/api\/servicos\/?(\d+)?$/);
      if (servMatch) return handleServicos(request, env, method, servMatch[1]);

      if (path === '/api/nfse/emitir' && method === 'POST') return handleEmitir(request, env);

      if (path === '/api/nfse/status') {
        return json({ online: true, status: '107', motivo: 'Servico em Operacao', tpAmb: '2', ambiente: 'Homologação', sistema: 'Emissor Nacional NFS-e' });
      }

      if (path === '/api/notas') return handleNotas(env);
    }

    // Static assets
    if (env.ASSETS) return env.ASSETS.fetch(request);

    return new Response('Not Found', { status: 404 });
  },
};
