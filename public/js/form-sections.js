// === Máscaras ===
function mascaraCNPJ(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 14);
  v = v.replace(/^(\d{2})(\d)/, '$1.$2');
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
  v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
  v = v.replace(/(\d{4})(\d)/, '$1-$2');
  el.value = v;
}

function mascaraCPF(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  el.value = v;
}

function mascaraCEP(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 8);
  v = v.replace(/(\d{5})(\d)/, '$1-$2');
  el.value = v;
}

function mascaraDoc(el) {
  const tipo = document.getElementById('tomTipo').value;
  if (tipo === 'cnpj') mascaraCNPJ(el);
  else mascaraCPF(el);
}

function toggleTomDoc() {
  const tipo = document.getElementById('tomTipo').value;
  const label = document.getElementById('tomDocLabel');
  const input = document.getElementById('tomDocumento');
  if (tipo === 'cnpj') {
    label.textContent = 'CNPJ *';
    input.placeholder = '00.000.000/0000-00';
    input.maxLength = 18;
  } else {
    label.textContent = 'CPF *';
    input.placeholder = '000.000.000-00';
    input.maxLength = 14;
  }
  input.value = '';
}

// === Cálculos ISS ===
function calcularISS() {
  const valorServ = parseFloat(document.getElementById('servValor').value) || 0;
  const aliqISS = parseFloat(document.getElementById('issAliq').value) || 0;
  const valorISS = valorServ * aliqISS / 100;
  const valorLiquido = valorServ - valorISS;

  document.getElementById('issBC').value = valorServ.toFixed(2);
  document.getElementById('issValor').value = valorISS.toFixed(2);

  document.getElementById('totalServicos').textContent = formatMoney(valorServ);
  document.getElementById('totalISS').textContent = formatMoney(valorISS);
  document.getElementById('totalLiquido').textContent = formatMoney(valorLiquido);
}

function formatMoney(value) {
  return 'R$ ' + value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// === Demo Data ===
function preencherDadosDemo() {
  // Prestador — Dr. Alexandre Ulrich (CRM: 21.903)
  document.getElementById('prestCnpj').value = '11.222.333/0001-81';
  document.getElementById('prestRazaoSocial').value = 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';
  document.getElementById('prestNomeFantasia').value = 'Dr. Alexandre Ulrich - Anestesiologia';
  document.getElementById('prestIM').value = '0032145';
  document.getElementById('prestLogradouro').value = 'Av. Venancio Aires';
  document.getElementById('prestNumero').value = '200';
  document.getElementById('prestBairro').value = 'Cidade Baixa';
  document.getElementById('prestCodMun').value = '4314902';
  document.getElementById('prestMunicipio').value = 'Porto Alegre';
  document.getElementById('prestUF').value = 'RS';
  document.getElementById('prestCEP').value = '90040-193';

  // Tomador — Sofia Gutierres Aquino Schultz
  document.getElementById('tomTipo').value = 'cpf';
  toggleTomDoc();
  document.getElementById('tomDocumento').value = '037.212.530-19';
  document.getElementById('tomNome').value = 'Sofia Gutierres Aquino Schultz';
  document.getElementById('tomLogradouro').value = 'Av. Venancio Aires';
  document.getElementById('tomNumero').value = '449 apt 1012';
  document.getElementById('tomBairro').value = 'Cidade Baixa';
  document.getElementById('tomCodMun').value = '4314902';
  document.getElementById('tomMunicipio').value = 'Porto Alegre';
  document.getElementById('tomUF').value = 'RS';
  document.getElementById('tomCEP').value = '90040-193';

  // Serviço
  document.getElementById('servCodigo').value = '14.01';
  document.getElementById('servValor').value = '3279.00';
  document.getElementById('servDescricao').value = 'Referente aos honorarios anestesiologicos prestados pelo Dr. Alexandre Ulrich - CRM: 21.903, para os procedimentos dentarios, no dia 14/03/2026.';

  // ISS — Porto Alegre alíquota 2%
  document.getElementById('issAliq').value = '2.00';
  document.getElementById('issMunicipio').value = '4314902';

  calcularISS();
  showToast('Dados demo preenchidos com sucesso!', 'success');
}
