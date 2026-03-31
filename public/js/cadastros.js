// === Cadastros API ===

// --- Prestadores ---
function _ah() { return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('nfse_token') || '') }; }

async function carregarPrestadores() {
  try {
    const res = await fetch('/api/prestadores', { headers: _ah() });
    if (res.status === 401) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function salvarPrestador(dados) {
  const res = await fetch('/api/prestadores', {
    method: 'POST',
    headers: _ah(),
    body: JSON.stringify(dados),
  });
  return res.json();
}

async function deletarPrestador(id) {
  await fetch(`/api/prestadores/${id}`, { method: 'DELETE', headers: _ah() });
}

// --- Tomadores ---
async function carregarTomadores() {
  try {
    const res = await fetch('/api/tomadores', { headers: _ah() });
    if (res.status === 401) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function buscarTomadorPorDoc(doc) {
  try {
    const res = await fetch(`/api/tomadores/${encodeURIComponent(doc)}`, { headers: _ah() });
    if (res.ok) return res.json();
    return null;
  } catch { return null; }
}

async function salvarTomador(dados) {
  const res = await fetch('/api/tomadores', {
    method: 'POST', headers: _ah(), body: JSON.stringify(dados),
  });
  return res.json();
}

async function deletarTomador(id) {
  await fetch(`/api/tomadores/${id}`, { method: 'DELETE', headers: _ah() });
}

// --- Serviços Template ---
async function carregarServicos() {
  try {
    const res = await fetch('/api/servicos', { headers: _ah() });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function salvarServico(dados) {
  const res = await fetch('/api/servicos', {
    method: 'POST', headers: _ah(), body: JSON.stringify(dados),
  });
  return res.json();
}

// --- Notas ---
async function carregarNotas() {
  try {
    const res = await fetch('/api/notas', { headers: _ah() });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

// === UI de Cadastros ===

async function renderPrestadores() {
  const list = await carregarPrestadores();
  const container = document.getElementById('listaPrestadores');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = '<p class="text-sm text-gray-400 italic">Nenhum prestador cadastrado</p>';
    return;
  }

  container.innerHTML = list.map(p => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p class="font-semibold text-sm">${p.nome_fantasia || p.razao_social}</p>
        <p class="text-xs text-gray-500">CNPJ: ${formatDocDisplay(p.cnpj)} | IM: ${p.inscricao_municipal || '-'}</p>
        <p class="text-xs text-gray-400">${p.municipio || ''}/${p.uf || ''}</p>
      </div>
      <div class="flex gap-2">
        <button onclick="usarPrestador(${p.id})" class="px-3 py-1 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700">Usar</button>
        <button onclick="removerPrestador(${p.id})" class="px-2 py-1 text-red-500 text-xs hover:bg-red-50 rounded-lg">Excluir</button>
      </div>
    </div>
  `).join('');

  // Atualizar dropdowns (Emissão Manual + Colar Mensagem)
  const opts = list.map(p => `<option value="${p.id}">${p.nome_fantasia || p.razao_social} (${formatDocDisplay(p.cnpj)})</option>`).join('');
  const select = document.getElementById('selectPrestador');
  if (select) {
    select.innerHTML = '<option value="">-- Selecione um prestador --</option>' + opts;
  }
  const selectRapido = document.getElementById('selectPrestadorRapido');
  if (selectRapido) {
    selectRapido.innerHTML = '<option value="">-- Selecione o prestador --</option>' + opts;
    if (list.length === 1) selectRapido.value = list[0].id;
  }
}

async function renderTomadores() {
  const list = await carregarTomadores();
  const container = document.getElementById('listaTomadores');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = '<p class="text-sm text-gray-400 italic">Nenhum tomador cadastrado</p>';
    return;
  }

  container.innerHTML = list.map(t => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p class="font-semibold text-sm">${t.nome}</p>
        <p class="text-xs text-gray-500">${t.tipo.toUpperCase()}: ${formatDocDisplay(t.documento)}</p>
        <p class="text-xs text-gray-400">${t.municipio || ''}/${t.uf || ''}</p>
      </div>
      <div class="flex gap-2">
        <button onclick="removerTomador(${t.id})" class="px-2 py-1 text-red-500 text-xs hover:bg-red-50 rounded-lg">Excluir</button>
      </div>
    </div>
  `).join('');
}

async function renderNotas() {
  const list = await carregarNotas();
  const container = document.getElementById('listaNotas');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = '<p class="text-sm text-gray-400 italic">Nenhuma nota emitida</p>';
    return;
  }

  container.innerHTML = list.map(n => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p class="font-semibold text-sm">NFS-e #${n.numero_nfse} — R$ ${parseFloat(n.valor_servico).toFixed(2)}</p>
        <p class="text-xs text-gray-500">${n.prestador_nome || '-'} → ${n.tomador_nome || '-'}</p>
        <p class="text-xs text-gray-400">${n.servico_descricao ? n.servico_descricao.substring(0, 60) + '...' : ''}</p>
        <p class="text-xs text-gray-400">${new Date(n.created_at).toLocaleString('pt-BR')}</p>
      </div>
      <div>
        <span class="px-2 py-1 text-xs font-medium rounded-full ${n.status === '100' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${n.status === '100' ? 'Autorizada' : 'Rejeitada'}</span>
      </div>
    </div>
  `).join('');
}

// === Actions ===

let prestadoresCache = [];

async function usarPrestador(id) {
  if (!prestadoresCache.length) prestadoresCache = await carregarPrestadores();
  const p = prestadoresCache.find(x => x.id === id);
  if (!p) return;

  document.getElementById('prestCnpj').value = formatDocDisplay(p.cnpj);
  document.getElementById('prestRazaoSocial').value = p.razao_social;
  document.getElementById('prestNomeFantasia').value = p.nome_fantasia || '';
  document.getElementById('prestIM').value = p.inscricao_municipal || '';
  document.getElementById('prestLogradouro').value = p.logradouro || '';
  document.getElementById('prestNumero').value = p.numero || '';
  document.getElementById('prestBairro').value = p.bairro || '';
  document.getElementById('prestCodMun').value = p.codigo_municipio || '';
  document.getElementById('prestMunicipio').value = p.municipio || '';
  document.getElementById('prestUF').value = p.uf || 'RS';
  document.getElementById('prestCEP').value = p.cep || '';

  // Mudar para aba emissão
  switchTab('emissao');
  showToast('Prestador carregado!', 'success');
}

async function removerPrestador(id) {
  await deletarPrestador(id);
  prestadoresCache = [];
  renderPrestadores();
  showToast('Prestador removido', 'info');
}

async function removerTomador(id) {
  await deletarTomador(id);
  renderTomadores();
  showToast('Tomador removido', 'info');
}

async function salvarPrestadorForm() {
  const dados = {
    cnpj: document.getElementById('novoPrestCnpj').value.replace(/[^\d]/g, ''),
    razao_social: document.getElementById('novoPrestRazao').value,
    nome_fantasia: document.getElementById('novoPrestFantasia').value,
    inscricao_municipal: document.getElementById('novoPrestIM').value,
    logradouro: document.getElementById('novoPrestLogr').value,
    numero: document.getElementById('novoPrestNum').value,
    bairro: document.getElementById('novoPrestBairro').value,
    codigo_municipio: document.getElementById('novoPrestCodMun').value,
    municipio: document.getElementById('novoPrestMun').value,
    uf: document.getElementById('novoPrestUF').value,
    cep: document.getElementById('novoPrestCEP').value.replace(/[^\d]/g, ''),
  };

  if (!dados.cnpj || !dados.razao_social) {
    showToast('Preencha CNPJ e Razão Social', 'error');
    return;
  }

  const resp = await salvarPrestador(dados);
  if (!resp || !resp.success) {
    showToast(resp?.motivo || 'Erro ao salvar prestador', 'error');
    return;
  }
  prestadoresCache = [];
  renderPrestadores();
  document.getElementById('formNovoPrestador').classList.add('hidden');
  showToast('Prestador salvo!', 'success');
}

async function salvarTomadorDoForm() {
  const dados = {
    tipo: document.getElementById('tomTipo').value,
    documento: document.getElementById('tomDocumento').value,
    nome: document.getElementById('tomNome').value,
    logradouro: document.getElementById('tomLogradouro').value,
    numero: document.getElementById('tomNumero').value,
    bairro: document.getElementById('tomBairro').value,
    codigo_municipio: document.getElementById('tomCodMun').value,
    municipio: document.getElementById('tomMunicipio').value,
    uf: document.getElementById('tomUF').value,
    cep: document.getElementById('tomCEP').value,
  };

  if (!dados.documento || !dados.nome) return;
  await salvarTomador(dados);
}

// Auto-buscar tomador ao digitar CPF/CNPJ
let buscaTimeout = null;
function onTomDocChange() {
  const doc = document.getElementById('tomDocumento').value.replace(/[^\d]/g, '');
  if (doc.length < 11) return;

  clearTimeout(buscaTimeout);
  buscaTimeout = setTimeout(async () => {
    const tomador = await buscarTomadorPorDoc(doc);
    if (tomador) {
      document.getElementById('tomNome').value = tomador.nome || '';
      document.getElementById('tomLogradouro').value = tomador.logradouro || '';
      document.getElementById('tomNumero').value = tomador.numero || '';
      document.getElementById('tomBairro').value = tomador.bairro || '';
      document.getElementById('tomCodMun').value = tomador.codigo_municipio || '';
      document.getElementById('tomMunicipio').value = tomador.municipio || '';
      document.getElementById('tomUF').value = tomador.uf || 'RS';
      document.getElementById('tomCEP').value = tomador.cep || '';
      showToast('Tomador encontrado no cadastro!', 'success');
    }
  }, 500);
}

// === Tabs ===

function switchTab(tab) {
  document.querySelectorAll('[data-tab]').forEach(el => {
    el.classList.toggle('hidden', el.dataset.tab !== tab);
  });
  document.querySelectorAll('[data-tab-btn]').forEach(el => {
    const isActive = el.dataset.tabBtn === tab;
    el.classList.toggle('bg-primary-600', isActive);
    el.classList.toggle('text-white', isActive);
    el.classList.toggle('bg-gray-100', !isActive);
    el.classList.toggle('text-gray-700', !isActive);
  });

  if (tab === 'rapida') renderPrestadoresRapido();
  if (tab === 'prestadores') renderPrestadores();
  if (tab === 'tomadores') renderTomadores();
  if (tab === 'notas') renderNotas();
}

function formatDocDisplay(doc) {
  if (!doc) return '';
  doc = doc.replace(/[^\d]/g, '');
  if (doc.length === 14) return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (doc.length === 11) return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return doc;
}

// Init é chamado pelo app.js após validação de auth
