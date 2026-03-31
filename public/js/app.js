// === Auth ===
function getToken() { return localStorage.getItem('nfse_token'); }

async function checkAuth() {
  if (!getToken()) {
    window.location.href = '/login.html';
    return false;
  }
  // Validar token no servidor
  try {
    const res = await fetch('/api/prestadores', { headers: authHeaders() });
    if (res.status === 401) {
      localStorage.removeItem('nfse_token');
      localStorage.removeItem('nfse_user');
      window.location.href = '/login.html';
      return false;
    }
  } catch (e) { /* servidor offline, deixar continuar */ }
  return true;
}

function doLogout() {
  localStorage.removeItem('nfse_token');
  localStorage.removeItem('nfse_user');
  window.location.href = '/login.html';
}

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
}

// === Estado ===
let ultimoResultado = null;

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
  if (!(await checkAuth())) return;

  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    if (cfg.mockMode) {
      document.getElementById('mockBadge').classList.remove('hidden');
    }
  } catch (e) { /* ignore */ }

  // Carregar dados iniciais após auth validada
  renderPrestadores();
  renderPrestadoresRapido();
  verificarStatus();
});

// === Coletar dados do form ===
function coletarFormData() {
  return {
    prestador: {
      cnpj: document.getElementById('prestCnpj').value,
      razaoSocial: document.getElementById('prestRazaoSocial').value,
      nomeFantasia: document.getElementById('prestNomeFantasia').value,
      inscricaoMunicipal: document.getElementById('prestIM').value,
      endereco: {
        logradouro: document.getElementById('prestLogradouro').value,
        numero: document.getElementById('prestNumero').value,
        bairro: document.getElementById('prestBairro').value,
        codigoMunicipio: document.getElementById('prestCodMun').value,
        municipio: document.getElementById('prestMunicipio').value,
        uf: document.getElementById('prestUF').value,
        cep: document.getElementById('prestCEP').value,
      },
    },
    tomador: {
      tipo: document.getElementById('tomTipo').value,
      documento: document.getElementById('tomDocumento').value,
      nome: document.getElementById('tomNome').value,
      endereco: {
        logradouro: document.getElementById('tomLogradouro').value,
        numero: document.getElementById('tomNumero').value,
        bairro: document.getElementById('tomBairro').value,
        codigoMunicipio: document.getElementById('tomCodMun').value,
        municipio: document.getElementById('tomMunicipio').value,
        uf: document.getElementById('tomUF').value,
        cep: document.getElementById('tomCEP').value,
      },
    },
    servico: {
      codigoServico: document.getElementById('servCodigo').value,
      descricao: document.getElementById('servDescricao').value,
      valorServico: parseFloat(document.getElementById('servValor').value) || 0,
    },
    imposto: {
      iss: {
        baseCalculo: parseFloat(document.getElementById('issBC').value) || 0,
        aliquota: parseFloat(document.getElementById('issAliq').value) || 0,
        valor: parseFloat(document.getElementById('issValor').value) || 0,
        municipioIncidencia: document.getElementById('issMunicipio').value,
      },
    },
  };
}

// === Emitir NFS-e ===
async function emitirNFSe() {
  const data = coletarFormData();

  if (!data.prestador.cnpj) {
    showToast('Preencha o CNPJ do prestador', 'error');
    return;
  }
  if (!data.tomador.documento) {
    showToast('Preencha o documento do tomador', 'error');
    return;
  }
  if (!data.servico.descricao) {
    showToast('Preencha a descrição do serviço', 'error');
    return;
  }
  if (!data.servico.valorServico || data.servico.valorServico <= 0) {
    showToast('Informe o valor do serviço', 'error');
    return;
  }

  showLoading('Emitindo NFS-e...');

  try {
    const res = await fetch('/api/nfse/emitir', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });

    const result = await res.json();
    ultimoResultado = result;

    // Salvar tomador automaticamente no cadastro
    if (result.success) {
      try { await salvarTomadorDoForm(); } catch(e) {}
    }

    hideLoading();
    exibirResultado(result);
  } catch (error) {
    hideLoading();
    showToast('Erro ao comunicar com o servidor: ' + error.message, 'error');
  }
}

// === Exibir resultado ===
function exibirResultado(result) {
  const container = document.getElementById('resultado');
  const card = document.getElementById('resultadoCard');
  const icon = document.getElementById('statusIcon');

  container.classList.remove('hidden');
  container.classList.add('animate-fadeIn');

  if (result.success) {
    card.className = 'card result-success';
    icon.className = 'w-14 h-14 rounded-full flex items-center justify-center bg-green-100 text-green-600';
    icon.innerHTML = '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
    document.getElementById('statusText').textContent = 'NFS-e Autorizada';
    document.getElementById('statusText').className = 'text-lg font-bold text-green-700';
    document.getElementById('btnDanfse').classList.remove('hidden');
  } else {
    card.className = 'card result-error';
    icon.className = 'w-14 h-14 rounded-full flex items-center justify-center bg-red-100 text-red-600';
    icon.innerHTML = '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
    document.getElementById('statusText').textContent = 'NFS-e Rejeitada';
    document.getElementById('statusText').className = 'text-lg font-bold text-red-700';
    document.getElementById('btnDanfse').classList.add('hidden');
  }

  document.getElementById('statusMotivo').textContent = `Status ${result.status || '-'}: ${result.motivo || ''}`;
  document.getElementById('resNumero').textContent = result.numeroNfse || '-';
  document.getElementById('resChave').textContent = result.chaveAcesso || '-';
  document.getElementById('resProtocolo').textContent = result.protocolo || '-';
  document.getElementById('resData').textContent = result.dataAutorizacao ? new Date(result.dataAutorizacao).toLocaleString('pt-BR') : '';

  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// === XML ===
function toggleXml() {
  const viewer = document.getElementById('xmlViewer');
  const btnCopy = document.getElementById('btnCopiarXml');

  if (viewer.classList.contains('hidden')) {
    if (ultimoResultado && ultimoResultado.xml) {
      document.getElementById('xmlContent').textContent = ultimoResultado.xml;
    }
    viewer.classList.remove('hidden');
    btnCopy.classList.remove('hidden');
  } else {
    viewer.classList.add('hidden');
    btnCopy.classList.add('hidden');
  }
}

function copiarXml() {
  if (ultimoResultado && ultimoResultado.xml) {
    navigator.clipboard.writeText(ultimoResultado.xml).then(() => {
      showToast('XML copiado!', 'success');
    });
  }
}

// === DANFSE ===
function downloadDanfse() {
  if (ultimoResultado && ultimoResultado.chaveAcesso) {
    window.open(`/api/danfse/${ultimoResultado.chaveAcesso}`, '_blank');
  }
}

// === Status ===
async function verificarStatus() {
  const badge = document.getElementById('statusBadge');
  try {
    const res = await fetch('/api/nfse/status', { headers: authHeaders() });
    const data = await res.json();

    if (data.online) {
      badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-green-500"></span>Online';
    } else {
      badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500"></span>Offline';
    }

    showToast(`${data.sistema}: ${data.motivo} (${data.ambiente})`, data.online ? 'success' : 'error');
  } catch (e) {
    badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500';
    badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-gray-400"></span>Indisponivel';
  }
}

// === Toast ===
function showToast(msg, type) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-medium transition-all transform toast-${type || 'info'} toast-show`;
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 3000);
}

// === Loading ===
function showLoading(text) {
  document.getElementById('loadingText').textContent = text || 'Processando...';
  document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}
