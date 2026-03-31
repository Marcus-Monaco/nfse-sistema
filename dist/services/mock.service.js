"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitirNFSeMock = emitirNFSeMock;
exports.statusServicoMock = statusServicoMock;
function gerarChaveAcesso(data) {
    const cnpj = data.prestador.cnpj.replace(/[^\d]/g, '');
    const now = new Date();
    const aamm = now.getFullYear().toString().slice(2) + String(now.getMonth() + 1).padStart(2, '0');
    const codMun = data.prestador.endereco.codigoMunicipio;
    const numNfse = String(Math.floor(Math.random() * 999999999)).padStart(13, '0');
    const serie = 'NFS';
    const cNF = String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
    // Chave simplificada para mock (formato NFS-e nacional)
    let chave = `${codMun}${aamm}${cnpj}${numNfse}${cNF}`;
    // Truncar/pad para 44 dígitos
    chave = chave.replace(/\D/g, '').padEnd(43, '0').slice(0, 43);
    // Dígito verificador (módulo 11)
    let peso = 2;
    let soma = 0;
    for (let i = chave.length - 1; i >= 0; i--) {
        soma += parseInt(chave[i]) * peso;
        peso = peso >= 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    const dv = resto < 2 ? 0 : 11 - resto;
    return chave + dv;
}
function gerarXmlMock(data, chaveAcesso) {
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
          ${tom.email ? `<email>${tom.email}</email>` : ''}
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
    return xml;
}
function emitirNFSeMock(data) {
    const chaveAcesso = gerarChaveAcesso(data);
    const xml = gerarXmlMock(data, chaveAcesso);
    const now = new Date();
    return {
        success: true,
        xml,
        protocolo: String(Math.floor(Math.random() * 999999999999999)).padStart(15, '0'),
        chaveAcesso,
        numeroNfse: String(Math.floor(Math.random() * 999999)).padStart(6, '0'),
        status: '100',
        motivo: 'NFS-e autorizada',
        dataAutorizacao: now.toISOString(),
    };
}
function statusServicoMock() {
    return {
        online: true,
        status: '107',
        motivo: 'Servico em Operacao',
        tpAmb: '2',
        ambiente: 'Homologação',
        sistema: 'Emissor Nacional NFS-e',
    };
}
//# sourceMappingURL=mock.service.js.map