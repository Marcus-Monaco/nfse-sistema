// === Parser de mensagem WhatsApp ===

function parsearMensagem(texto) {
  const resultado = {
    nome: '',
    cpf: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cep: '',
    cidade: '',
    uf: '',
    valor: 0,
    descricao: '',
    medico: '',
    crm: '',
  };

  const linhas = texto.trim().split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });

  // === CPF ===
  var cpfMatch = texto.match(/[Cc][Pp][Ff]:?\s*([\d]{3}[.\s]?[\d]{3}[.\s]?[\d]{3}[-.\s]?[\d]{2})/);
  if (cpfMatch) {
    var d = cpfMatch[1].replace(/[^\d]/g, '');
    if (d.length === 11) resultado.cpf = d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  // === NOME ===
  var nomeMatch = texto.match(/NOME:?\s*(.+)/i);
  if (nomeMatch) {
    resultado.nome = nomeMatch[1].replace(/^,\s*/, '').trim();
  } else {
    // Primeira linha que parece nome (não é campo conhecido)
    var camposConhecidos = /^(cpf|cnpj|av\.|av |avenida|rua |r\.|cep|valor|descri|dr\.|bairro|encaminhada|aqui |oie|te envio|de um|login|senha|www\.|http|nome:)/i;
    for (var i = 0; i < linhas.length; i++) {
      if (camposConhecidos.test(linhas[i])) continue;
      if (linhas[i].length > 3 && /[a-zA-ZÀ-ú]/.test(linhas[i])) {
        resultado.nome = linhas[i].replace(/^\s*[-–•]\s*/, '');
        break;
      }
    }
  }

  // === ENDEREÇO ===
  // Formato 1: "Av. Venâncio Aires, 449 apt 1012"
  var endMatch = texto.match(/(?:^|\n)\s*((?:Av\.?|Avenida|Rua|R\.|Al\.|Alameda|Trav\.|Travessa|Estr\.|Estrada|Rod\.|Rodovia)[^,\n]*),?\s*(\d+)\s*(.*)?/im);
  if (endMatch) {
    resultado.logradouro = endMatch[1].trim();
    resultado.numero = endMatch[2].trim();
    if (endMatch[3]) resultado.numero = resultado.numero + ' ' + endMatch[3].trim().split('\n')[0];
  } else {
    // Formato 2: Linha com nome de rua + número (ex: "JOÃO XXIII, 79")
    // Procurar linha com vírgula + número que não é CEP, CPF, valor
    for (var j = 0; j < linhas.length; j++) {
      var l = linhas[j];
      if (/^(cpf|cnpj|cep|valor|nome|bairro|descri)/i.test(l)) continue;
      if (resultado.cpf && l.includes(resultado.cpf)) continue;
      var endMatch2 = l.match(/^([A-ZÀ-Úa-zà-ú0-9\s.]+),\s*(\d+)\s*(.*)?$/);
      if (endMatch2 && !l.match(/[\d]{3}\.[\d]{3}/)) { // não é CPF/CNPJ
        resultado.logradouro = endMatch2[1].trim();
        resultado.numero = endMatch2[2].trim();
        if (endMatch2[3]) resultado.numero = resultado.numero + ' ' + endMatch2[3].trim();
        break;
      }
    }
  }

  // === BAIRRO ===
  var bairroMatch = texto.match(/BAIRRO:?\s*([^-–\n]+?)(?:\s*[-–]\s*(.+?))?(?:\s*[/]\s*([A-Z]{2}))?\s*$/im);
  if (bairroMatch) {
    resultado.bairro = bairroMatch[1].trim();
    // Se tem cidade/UF depois do traço: "VILA ELZA - VIAMÃO/RS"
    if (bairroMatch[2]) {
      var cidadeUfMatch = bairroMatch[2].match(/(.+?)\s*[/]\s*([A-Z]{2})/i);
      if (cidadeUfMatch) {
        resultado.cidade = cidadeUfMatch[1].trim();
        resultado.uf = cidadeUfMatch[2].toUpperCase();
      } else {
        resultado.cidade = bairroMatch[2].trim();
      }
    }
    if (bairroMatch[3]) resultado.uf = bairroMatch[3].toUpperCase();
  }

  // === CEP ===
  // Formato 1: "CEP 90040-193 - Porto Alegre/RS"
  var cepMatch = texto.match(/CEP:?\s*([\d]{5}[-.]?[\d]{3})\s*[-–]?\s*([^/\n]*?)\s*[/]\s*([A-Z]{2})/i);
  if (cepMatch) {
    resultado.cep = cepMatch[1].replace(/[^\d]/g, '');
    if (!resultado.cidade) resultado.cidade = cepMatch[2].trim();
    if (!resultado.uf) resultado.uf = cepMatch[3].toUpperCase();
  } else {
    // Formato 2: "CEP:94420-280" ou "CEP: 94420-280" (sem cidade na mesma linha)
    var cepSimples = texto.match(/CEP\s*:?\s*([\d]{5}[-.]?[\d]{3})/i);
    if (cepSimples) {
      resultado.cep = cepSimples[1].replace(/[^\d]/g, '');
    }
  }
  // Formatar CEP
  if (resultado.cep && resultado.cep.length === 8) {
    resultado.cep = resultado.cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  }

  // === CIDADE/UF fallback ===
  // Procurar padrão "CIDADE/UF" em qualquer lugar do texto
  if (!resultado.cidade || !resultado.uf) {
    var cidadeMatch = texto.match(/[-–]\s*([A-ZÀ-Úa-zà-ú\s]+?)\s*[/]\s*([A-Z]{2})/);
    if (cidadeMatch) {
      if (!resultado.cidade) resultado.cidade = cidadeMatch[1].trim();
      if (!resultado.uf) resultado.uf = cidadeMatch[2].toUpperCase();
    }
  }

  // === VALOR ===
  var valorMatch = texto.match(/VALOR\s*:?\s*R?\$?\s*([\d]{1,3}(?:[.\s]?\d{3})*[,.]?\d{0,2})/i);
  if (valorMatch) {
    var v = valorMatch[1].trim();
    v = v.replace(/\./g, '').replace(',', '.');
    resultado.valor = parseFloat(v) || 0;
  }

  // === DESCRIÇÃO ===
  var descMatch = texto.match(/[Dd]escri[çc][ãa]o:?\s*([\s\S]*?)(?:\n\s*\n|\n\s*Dr\.|\n\s*$|$)/i);
  if (descMatch) {
    resultado.descricao = descMatch[1].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  }

  // === CAMPOS ESTRUTURADOS (modelo padrão) ===
  // Formato: "Campo: valor" — sobrescreve os valores anteriores se encontrar
  var campoMap = {
    'nome': '_nome',
    'rua': 'logradouro',
    'logradouro': 'logradouro',
    'endereco': 'logradouro',
    'numero': 'numero',
    'nro': 'numero',
    'num': 'numero',
    'bairro': '_bairro',
    'cidade': '_cidade',
    'municipio': '_cidade',
    'uf': '_uf',
    'estado': '_uf',
    'cep': '_cep',
    'valor': '_valor',
    'descricao': '_descricao',
    'servico': '_descricao',
  };

  for (var k = 0; k < linhas.length; k++) {
    var match = linhas[k].match(/^([A-Za-zÀ-úÀ-ÿ°]+)\s*:\s*(.+)$/);
    if (!match) continue;
    var campo = match[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    var val = match[2].trim();
    if (campoMap[campo] === '_nome' && val) resultado.nome = val;
    if (campoMap[campo] === 'logradouro' && val) resultado.logradouro = val;
    if (campoMap[campo] === 'numero' && val) resultado.numero = val;
    if (campoMap[campo] === '_cep' && val) {
      resultado.cep = val.replace(/[^\d]/g, '');
      if (resultado.cep.length === 8) resultado.cep = resultado.cep.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    if (campoMap[campo] === '_valor' && val) {
      var vv = val.replace(/R\$\s*/i, '').trim().replace(/\./g, '').replace(',', '.');
      resultado.valor = parseFloat(vv) || resultado.valor;
    }
    if (campoMap[campo] === '_bairro' && val) {
      // Pode ter "Vila Elza - Viamão/RS"
      var bParts = val.match(/^(.+?)\s*[-–]\s*(.+?)\s*[/]\s*([A-Z]{2})$/i);
      if (bParts) {
        resultado.bairro = bParts[1].trim();
        resultado.cidade = bParts[2].trim();
        resultado.uf = bParts[3].toUpperCase();
      } else {
        resultado.bairro = val;
      }
    }
    if (campoMap[campo] === '_cidade' && val) resultado.cidade = val;
    if (campoMap[campo] === '_uf' && val) resultado.uf = val.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    if (campoMap[campo] === '_descricao' && val) resultado.descricao = val;
  }

  // === MÉDICO/CRM ===
  var medicoMatch = texto.match(/Dr[a.]?\s*([^-–\n]+?)(?:\s*[-–]\s*CRM:?\s*([\d.]+))?(?:\s|$)/i);
  if (medicoMatch) {
    resultado.medico = medicoMatch[1].trim();
    resultado.crm = (medicoMatch[2] || '').trim();
  }

  return resultado;
}

// === UI do Parser ===

function processarMensagem() {
  const texto = document.getElementById('mensagemWhatsapp').value;
  if (!texto.trim()) {
    showToast('Cole a mensagem primeiro', 'error');
    return;
  }

  const dados = parsearMensagem(texto);
  const preview = document.getElementById('previewDados');
  const btnEmitirRapido = document.getElementById('btnEmitirRapido');

  // Mostrar preview
  preview.classList.remove('hidden');
  btnEmitirRapido.classList.remove('hidden');

  document.getElementById('prevNome').textContent = dados.nome || '(não encontrado)';
  document.getElementById('prevCpf').textContent = dados.cpf || '(não encontrado)';
  document.getElementById('prevEndereco').textContent = dados.logradouro ? `${dados.logradouro}, ${dados.numero}` : '(não encontrado)';
  document.getElementById('prevCep').textContent = dados.cep || '(não encontrado)';
  document.getElementById('prevCidade').textContent = dados.cidade && dados.uf ? `${dados.cidade}/${dados.uf}` : '(não encontrado)';
  document.getElementById('prevValor').textContent = dados.valor ? `R$ ${dados.valor.toFixed(2).replace('.', ',')}` : '(não encontrado)';
  document.getElementById('prevDescricao').textContent = dados.descricao || '(não encontrado)';

  // Marcar campos não encontrados em vermelho
  document.querySelectorAll('#previewDados [id^="prev"]').forEach(el => {
    el.classList.toggle('text-red-500', el.textContent.includes('não encontrado'));
    el.classList.toggle('text-gray-800', !el.textContent.includes('não encontrado'));
  });

  // Guardar dados parseados
  window._dadosParseados = dados;

  showToast('Mensagem processada!', 'success');
}

async function emitirRapido() {
  const dados = window._dadosParseados;
  if (!dados) {
    showToast('Processe a mensagem primeiro', 'error');
    return;
  }

  // Pegar prestador selecionado
  const selectPrest = document.getElementById('selectPrestadorRapido');
  const prestId = selectPrest ? selectPrest.value : '';

  if (!prestId) {
    showToast('Selecione um prestador', 'error');
    return;
  }

  // Buscar dados do prestador
  if (!prestadoresCache.length) prestadoresCache = await carregarPrestadores();
  const prest = prestadoresCache.find(p => p.id === parseInt(prestId));
  if (!prest) {
    showToast('Prestador não encontrado', 'error');
    return;
  }

  // Código município (mapeamento básico)
  const codMun = getCodigoMunicipio(dados.cidade, dados.uf) || prest.codigo_municipio || '4314902';

  // Montar dados para emissão
  const formData = {
    prestador: {
      cnpj: formatDocDisplay(prest.cnpj),
      razaoSocial: prest.razao_social,
      nomeFantasia: prest.nome_fantasia || '',
      inscricaoMunicipal: prest.inscricao_municipal || '',
      endereco: {
        logradouro: prest.logradouro || '',
        numero: prest.numero || '',
        bairro: prest.bairro || '',
        codigoMunicipio: prest.codigo_municipio || '',
        municipio: prest.municipio || '',
        uf: prest.uf || 'RS',
        cep: prest.cep || '',
      },
    },
    tomador: {
      tipo: 'cpf',
      documento: dados.cpf,
      nome: dados.nome,
      endereco: {
        logradouro: dados.logradouro,
        numero: dados.numero,
        bairro: dados.bairro || '',
        codigoMunicipio: codMun,
        municipio: dados.cidade,
        uf: dados.uf,
        cep: dados.cep.replace(/[^\d]/g, ''),
      },
    },
    servico: {
      codigoServico: '14.01',
      descricao: dados.descricao,
      valorServico: dados.valor,
    },
    imposto: {
      iss: {
        baseCalculo: dados.valor,
        aliquota: 2.00,
        valor: parseFloat((dados.valor * 0.02).toFixed(2)),
        municipioIncidencia: codMun,
      },
    },
  };

  showLoading('Emitindo NFS-e...');

  try {
    const res = await fetch('/api/nfse/emitir', {
      method: 'POST',
      headers: _ah(),
      body: JSON.stringify(formData),
    });

    const result = await res.json();

    // Salvar tomador
    if (result.success) {
      try {
        await salvarTomador({
          tipo: 'cpf',
          documento: dados.cpf,
          nome: dados.nome,
          logradouro: dados.logradouro,
          numero: dados.numero,
          bairro: dados.bairro || '',
          codigo_municipio: codMun,
          municipio: dados.cidade,
          uf: dados.uf,
          cep: dados.cep.replace(/[^\d]/g, ''),
        });
      } catch(e) {}
    }

    hideLoading();

    // Mostrar resultado inline
    const resDiv = document.getElementById('resultadoRapido');
    resDiv.classList.remove('hidden');

    // Guardar resultado para ver XML
    window._ultimoResultadoRapido = result;

    if (result.success) {
      resDiv.innerHTML = `
        <div class="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
              <p class="font-bold text-green-700">NFS-e #${result.numeroNfse} Autorizada</p>
              <p class="text-xs text-green-600">Protocolo: ${result.protocolo}</p>
            </div>
          </div>
          <p class="text-xs text-gray-500 mb-3">Chave: <span class="font-mono">${result.chaveAcesso}</span></p>
          <div class="flex flex-wrap gap-2 mt-3">
            <button onclick="copiarComprovanteRapido()" class="px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              Copiar Comprovante
            </button>
            <button onclick="downloadPdfRapido()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Download PDF
            </button>
            <button onclick="downloadXmlRapido()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              Download XML
            </button>
            <button onclick="toggleXmlRapido()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              Ver XML
            </button>
            <button onclick="novaEmissaoRapida()" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Nova Emissão
            </button>
          </div>
          <div id="xmlViewerRapido" class="hidden mt-4">
            <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96"></pre>
          </div>
        </div>`;
    } else {
      resDiv.innerHTML = `
        <div class="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p class="font-bold text-red-700">Erro: ${result.motivo}</p>
        </div>`;
    }

  } catch (error) {
    hideLoading();
    showToast('Erro: ' + error.message, 'error');
  }
}

function getCodigoMunicipio(cidade, uf) {
  if (!cidade) return '';
  const mapa = {
    'porto alegre': '4314902',
    'viamao': '4323002',
    'gravatai': '4309209',
    'cachoeirinha': '4303004',
    'alvorada': '4300604',
    'guaiba': '4309308',
    'eldorado do sul': '4307104',
    'canoas': '4304606',
    'esteio': '4307708',
    'sapucaia do sul': '4320008',
    'sao leopoldo': '4318705',
    'novo hamburgo': '4313409',
    'campo bom': '4304200',
    'caxias do sul': '4305108',
    'pelotas': '4314407',
    'santa maria': '4316907',
    'sao paulo': '3550308',
    'rio de janeiro': '3304557',
    'curitiba': '4106902',
    'belo horizonte': '3106200',
    'brasilia': '5300108',
    'florianopolis': '4205407',
  };
  const key = (cidade || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return mapa[key] || '';
}

// Atualizar dropdown de prestadores na aba rápida
async function renderPrestadoresRapido() {
  const list = await carregarPrestadores();
  const select = document.getElementById('selectPrestadorRapido');
  if (!select) return;
  select.innerHTML = '<option value="">-- Selecione o prestador --</option>' +
    list.map(p => `<option value="${p.id}">${p.nome_fantasia || p.razao_social}</option>`).join('');

  // Se só tem 1, selecionar automaticamente
  if (list.length === 1) {
    select.value = list[0].id;
  }
}

// === Funções de resultado ===

function toggleXmlRapido() {
  const viewer = document.getElementById('xmlViewerRapido');
  if (!viewer) return;
  if (viewer.classList.contains('hidden')) {
    const r = window._ultimoResultadoRapido;
    if (r && r.xml) viewer.querySelector('pre').textContent = r.xml;
    viewer.classList.remove('hidden');
  } else {
    viewer.classList.add('hidden');
  }
}

function copiarXmlRapido() {
  const r = window._ultimoResultadoRapido;
  if (r && r.xml) {
    navigator.clipboard.writeText(r.xml).then(() => showToast('XML copiado!', 'success'));
  }
}

function downloadXmlRapido() {
  const r = window._ultimoResultadoRapido;
  if (!r || !r.xml) return;
  const blob = new Blob([r.xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NFSe_${r.numeroNfse || 'nota'}_${r.chaveAcesso || ''}.xml`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('XML baixado!', 'success');
}

function downloadPdfRapido() {
  try {
    const r = window._ultimoResultadoRapido;
    const d = window._dadosParseados;
    if (!r || !d) { showToast('Emita uma nota primeiro', 'error'); return; }

    const selectPrest = document.getElementById('selectPrestadorRapido');
    const prestId = selectPrest ? selectPrest.value : '';
    const prest = (prestadoresCache || []).find(function(p) { return p.id === parseInt(prestId); }) || {};

    var jsPDFLib = window.jspdf;
    if (!jsPDFLib) { showToast('Biblioteca PDF não carregou. Recarregue a página.', 'error'); return; }
    var doc = new jsPDFLib.jsPDF();
    var pw = 170;
    var y = 15;

    var issAliq = 2;
    var issValor = d.valor * issAliq / 100;
    var valorLiq = d.valor - issValor;
    var servCodigo = '14.01';
    var sel = document.getElementById('servCodigoRapido');
    if (sel) servCodigo = sel.value;

    // Header
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.rect(14, y, 120, 28);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(String(prest.nome_fantasia || prest.razao_social || 'Prestador'), 18, y + 7);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    if (prest.razao_social && prest.nome_fantasia) doc.text(String(prest.razao_social), 18, y + 13);
    doc.text((prest.logradouro||'')+', '+(prest.numero||'')+' - '+(prest.bairro||'')+' - '+(prest.municipio||'')+'/'+(prest.uf||''), 18, y + 18);
    doc.text('CNPJ: '+formatDocDisplay(prest.cnpj||'')+' | IM: '+(prest.inscricao_municipal||''), 18, y + 23);

    doc.rect(134, y, 62, 28);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DANFSE', 165, y + 9, { align: 'center' });
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('Documento Auxiliar da', 165, y + 14, { align: 'center' });
    doc.text('Nota Fiscal de Servico Eletronica', 165, y + 18, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('NFS-e No '+String(r.numeroNfse||''), 165, y + 25, { align: 'center' });
    y += 32;

    // Homologação
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.rect(14, y, pw + 12, 8, 'FD');
    doc.setTextColor(146, 64, 14);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL', 105, y + 5.5, { align: 'center' });
    doc.setTextColor(0);
    y += 12;

    // Chave
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(37, 99, 235);
    doc.rect(14, y, pw + 12, 7, 'FD');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('CHAVE DE ACESSO E PROTOCOLO', 18, y + 5);
    doc.setTextColor(0);
    y += 9;
    doc.setDrawColor(200);
    doc.rect(14, y, pw + 12, 14);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('CHAVE DE ACESSO', 18, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(String(r.chaveAcesso||''), 18, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.text('PROTOCOLO:', 130, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(String(r.protocolo||''), 130, y + 8);
    try { doc.text(new Date(r.dataAutorizacao).toLocaleString('pt-BR'), 130, y + 12); } catch(e) {}
    y += 18;

    // Tomador
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(37, 99, 235);
    doc.rect(14, y, pw + 12, 7, 'FD');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOMADOR DE SERVICOS', 18, y + 5);
    doc.setTextColor(0);
    y += 9;
    doc.setDrawColor(200);
    doc.rect(14, y, 120, 14);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('NOME / RAZAO SOCIAL', 18, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(String(d.nome||''), 18, y + 10);
    doc.rect(134, y, 62, 14);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('CPF/CNPJ', 138, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(String(d.cpf||''), 138, y + 10);
    y += 16;
    doc.rect(14, y, pw + 12, 12);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('ENDERECO', 18, y + 4);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text((d.logradouro||'')+', '+(d.numero||'')+' - '+(d.cidade||'')+'/'+(d.uf||'')+' - CEP '+(d.cep||''), 18, y + 9);
    y += 15;

    // Serviço
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(37, 99, 235);
    doc.rect(14, y, pw + 12, 7, 'FD');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DISCRIMINACAO DOS SERVICOS', 18, y + 5);
    doc.setTextColor(0);
    y += 9;
    doc.setDrawColor(200);
    doc.rect(14, y, pw + 12, 10);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('CODIGO DO SERVICO (LC 116)', 18, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(servCodigo, 18, y + 8);
    y += 12;
    var descText = String(d.descricao||'');
    var descLines = doc.splitTextToSize(descText, pw + 4);
    var descH = Math.max(20, descLines.length * 4 + 8);
    doc.rect(14, y, pw + 12, descH);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRICAO DOS SERVICOS', 18, y + 4);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(descLines, 18, y + 10);
    y += descH + 3;

    // Valores
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(37, 99, 235);
    doc.rect(14, y, pw + 12, 7, 'FD');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('VALORES E ISS', 18, y + 5);
    doc.setTextColor(0);
    y += 9;
    var colW = (pw + 12) / 4;
    var vals = [
      ['VALOR SERVICOS', 'R$ '+d.valor.toFixed(2)],
      ['BASE CALCULO ISS', 'R$ '+d.valor.toFixed(2)],
      ['ISS ('+issAliq.toFixed(2)+'%)', 'R$ '+issValor.toFixed(2)],
      ['VALOR LIQUIDO', 'R$ '+valorLiq.toFixed(2)],
    ];
    for (var i = 0; i < vals.length; i++) {
      var x = 14 + i * colW;
      doc.setDrawColor(200);
      doc.rect(x, y, colW, 16);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(vals[i][0], x + 3, y + 5);
      doc.setFontSize(i === 3 ? 11 : 9);
      doc.setFont('helvetica', i === 3 ? 'bold' : 'normal');
      doc.text(vals[i][1], x + 3, y + 12);
    }
    y += 22;

    doc.setFontSize(6);
    doc.setTextColor(150);
    doc.text('Documento gerado em ambiente de HOMOLOGACAO - sem valor fiscal', 105, y, { align: 'center' });
    doc.text('Emissor Nacional NFS-e (nfse.gov.br) | Desenvolvido por: JM Software', 105, y + 5, { align: 'center' });

    doc.save('DANFSE_'+String(r.numeroNfse||'nota')+'.pdf');
    showToast('PDF baixado!', 'success');
  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    showToast('Erro ao gerar PDF: ' + err.message, 'error');
  }
}

function copiarComprovanteRapido() {
  const r = window._ultimoResultadoRapido;
  const d = window._dadosParseados;
  if (!r) return;
  const texto = `NFS-e #${r.numeroNfse} emitida com sucesso.\nTomador: ${d ? d.nome : ''}\nValor: R$ ${d ? d.valor.toFixed(2).replace('.', ',') : ''}\nProtocolo: ${r.protocolo}\nChave: ${r.chaveAcesso}`;
  navigator.clipboard.writeText(texto).then(() => showToast('Comprovante copiado! Cole no WhatsApp.', 'success'));
}

function novaEmissaoRapida() {
  document.getElementById('mensagemWhatsapp').value = '';
  document.getElementById('previewDados').classList.add('hidden');
  document.getElementById('resultadoRapido').classList.add('hidden');
  document.getElementById('btnEmitirRapido').classList.add('hidden');
  window._dadosParseados = null;
  window._ultimoResultadoRapido = null;
}

// Init é chamado pelo app.js após validação de auth
