"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitirNFSeReal = emitirNFSeReal;
exports.testarConexaoApi = testarConexaoApi;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const zlib_1 = __importDefault(require("zlib"));
const util_1 = require("util");
const xml_crypto_1 = require("xml-crypto");
const node_forge_1 = __importDefault(require("node-forge"));
const gzip = (0, util_1.promisify)(zlib_1.default.gzip);
const gunzip = (0, util_1.promisify)(zlib_1.default.gunzip);
// === Extrair chave privada e certificado do PFX ===
function extrairCertificado(pfxPath, passphrase, pfxBase64) {
    const pfxBuffer = pfxBase64 ? Buffer.from(pfxBase64, 'base64') : fs_1.default.readFileSync(pfxPath);
    const pfxAsn1 = node_forge_1.default.asn1.fromDer(node_forge_1.default.util.createBuffer(pfxBuffer));
    const pfx = node_forge_1.default.pkcs12.pkcs12FromAsn1(pfxAsn1, passphrase);
    // Extrair chave privada
    const keyBags = pfx.getBags({ bagType: node_forge_1.default.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[node_forge_1.default.pki.oids.pkcs8ShroudedKeyBag];
    if (!keyBag || !keyBag[0] || !keyBag[0].key) {
        throw new Error('Chave privada não encontrada no certificado');
    }
    const privateKeyPem = node_forge_1.default.pki.privateKeyToPem(keyBag[0].key);
    // Extrair certificado
    const certBags = pfx.getBags({ bagType: node_forge_1.default.pki.oids.certBag });
    const certBag = certBags[node_forge_1.default.pki.oids.certBag];
    if (!certBag || !certBag[0] || !certBag[0].cert) {
        throw new Error('Certificado não encontrado no arquivo PFX');
    }
    const cert = certBag[0].cert;
    const certificatePem = node_forge_1.default.pki.certificateToPem(cert);
    // Extrair cert em Base64 (sem headers PEM)
    const certificateB64 = certificatePem
        .replace('-----BEGIN CERTIFICATE-----', '')
        .replace('-----END CERTIFICATE-----', '')
        .replace(/\r?\n/g, '');
    // Log info do certificado
    console.log('  Certificado carregado:');
    console.log('    Subject:', cert.subject.getField('CN')?.value);
    console.log('    Issuer:', cert.issuer.getField('CN')?.value);
    console.log('    Valido ate:', cert.validity.notAfter.toISOString());
    console.log('    Serial:', cert.serialNumber);
    return { privateKeyPem, certificatePem, certificateB64, pfxBuffer, passphrase };
}
// === Gerar XML do DPS ===
function gerarIdDPS(data, numDPS, serie) {
    // Formato: DPS + 42 dígitos
    // [cMun 7d][tpInsc 1d][nrInsc 14d][serie 5d][numDPS 15d]
    const cMun = data.prestador.endereco.codigoMunicipio.padStart(7, '0');
    const tpInsc = '2'; // 2 = CNPJ
    const nrInsc = data.prestador.cnpj.replace(/[^\d]/g, '').padStart(14, '0');
    const serieNum = serie.replace(/\D/g, '').padStart(5, '0') || '00001';
    const num = numDPS.replace(/\D/g, '').padStart(15, '0');
    return `DPS${cMun}${tpInsc}${nrInsc}${serieNum}${num}`;
}
function gerarDpsXml(data, numDPS) {
    const prest = data.prestador;
    const tom = data.tomador;
    const serv = data.servico;
    const iss = data.imposto.iss;
    const now = new Date();
    // Usar horário de Brasília (UTC-3) com alguns segundos no passado para evitar rejeição
    const brasiliaOffset = -3 * 60;
    const local = new Date(now.getTime() + (brasiliaOffset + now.getTimezoneOffset()) * 60000 - 30000);
    const dhEmi = local.getFullYear() + '-' +
        String(local.getMonth() + 1).padStart(2, '0') + '-' +
        String(local.getDate()).padStart(2, '0') + 'T' +
        String(local.getHours()).padStart(2, '0') + ':' +
        String(local.getMinutes()).padStart(2, '0') + ':' +
        String(local.getSeconds()).padStart(2, '0') + '-03:00';
    const valorLiquido = serv.valorServico - iss.valor;
    const serie = '00001';
    const idDPS = gerarIdDPS(data, numDPS, serie);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infDPS Id="${idDPS}">
    <tpAmb>2</tpAmb>
    <dhEmi>${dhEmi}</dhEmi>
    <verAplic>JMSoftware1.0</verAplic>
    <serie>${serie}</serie>
    <nDPS>${numDPS}</nDPS>
    <dCompet>${now.toISOString().slice(0, 10)}</dCompet>
    <tpEmit>1</tpEmit>
    <cLocEmi>${prest.endereco.codigoMunicipio}</cLocEmi>
    <prest>
      <CNPJ>${prest.cnpj.replace(/[^\d]/g, '')}</CNPJ>
      <regTrib>
        <opSimpNac>1</opSimpNac>
        <regEspTrib>0</regEspTrib>
      </regTrib>
    </prest>
    <toma>
      <${tom.tipo === 'cnpj' ? 'CNPJ' : 'CPF'}>${tom.documento.replace(/[^\d]/g, '')}</${tom.tipo === 'cnpj' ? 'CNPJ' : 'CPF'}>
      <xNome>${escapeXml(tom.nome)}</xNome>
      <end>
        <endNac>
          <cMun>${tom.endereco.codigoMunicipio}</cMun>
          <CEP>${tom.endereco.cep.replace(/[^\d]/g, '')}</CEP>
        </endNac>
        <xLgr>${escapeXml(tom.endereco.logradouro || 'Nao informado')}</xLgr>
        <nro>${escapeXml(tom.endereco.numero || 'S/N')}</nro>
        <xBairro>${escapeXml(tom.endereco.bairro || 'Nao informado')}</xBairro>
      </end>
    </toma>
    <serv>
      <locPrest>
        <cLocPrestacao>${iss.municipioIncidencia || prest.endereco.codigoMunicipio || '4314902'}</cLocPrestacao>
      </locPrest>
      <cServ>
        <cTribNac>${converterCodigoServico(serv.codigoServico)}</cTribNac>
        <xDescServ>${escapeXml(serv.descricao)}</xDescServ>
      </cServ>
    </serv>
    <valores>
      <vServPrest>
        <vServ>${serv.valorServico.toFixed(2)}</vServ>
      </vServPrest>
      <trib>
        <tribMun>
          <tribISSQN>1</tribISSQN>
          <tpRetISSQN>1</tpRetISSQN>
        </tribMun>
        <totTrib>
          <vTotTrib>
            <vTotTribFed>0.00</vTotTribFed>
            <vTotTribEst>0.00</vTotTribEst>
            <vTotTribMun>0.00</vTotTribMun>
          </vTotTrib>
        </totTrib>
      </trib>
    </valores>
  </infDPS>
</DPS>`;
    return xml;
}
function converterCodigoServico(codigo) {
    // Mapeia LC 116 → cTribNac (6 dígitos)
    const mapa = {
        // Medicina (04.01.xx)
        '4.01': '040101', '4.02': '040102', '4.03': '040103',
        // Informática (01.04.xx)
        '14.01': '010401', '14.02': '010402', '14.03': '010403',
        '14.04': '010404', '14.05': '010405', '14.06': '010406',
        '14.07': '010407', '14.09': '010409',
        // Outros
        '7.02': '010702', '17.01': '011701', '17.02': '011702',
        '17.14': '011714', '25.01': '012501', '5.01': '010501',
        '5.02': '010502',
    };
    return mapa[codigo] || codigo.replace('.', '').padStart(6, '0');
}
function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
// === Assinar XML ===
function assinarXml(xml, certData) {
    // Extrair o Id do infDPS para usar na URI da referência
    const idMatch = xml.match(/infDPS[^>]*Id="([^"]+)"/);
    const idDPS = idMatch ? idMatch[1] : '';
    const sig = new xml_crypto_1.SignedXml({
        privateKey: certData.privateKeyPem,
        publicCert: certData.certificatePem,
        canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
        signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    });
    sig.addReference({
        xpath: "//*[local-name(.)='infDPS']",
        digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
        transforms: [
            'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
            'http://www.w3.org/2001/10/xml-exc-c14n#',
        ],
        uri: `#${idDPS}`,
    });
    sig.computeSignature(xml, {
        location: { reference: "//*[local-name(.)='infDPS']", action: 'after' },
    });
    return sig.getSignedXml();
}
// === Comprimir e codificar ===
async function comprimirXml(xml) {
    const compressed = await gzip(Buffer.from(xml, 'utf-8'));
    return compressed.toString('base64');
}
async function descomprimirResposta(b64) {
    const compressed = Buffer.from(b64, 'base64');
    const decompressed = await gunzip(compressed);
    return decompressed.toString('utf-8');
}
// === Enviar para API ===
async function enviarParaApi(dpsXmlB64, certData, ambiente) {
    const baseUrl = ambiente === 'homologacao'
        ? 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional'
        : 'https://sefin.nfse.gov.br/SefinNacional';
    const agent = new https_1.default.Agent({
        pfx: certData.pfxBuffer,
        passphrase: certData.passphrase,
        rejectUnauthorized: false,
    });
    const body = JSON.stringify({ dpsXmlGZipB64: dpsXmlB64 });
    return new Promise((resolve, reject) => {
        const url = new URL(`${baseUrl}/nfse`);
        const req = https_1.default.request({
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            agent,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`  API Response: ${res.statusCode}`);
                try {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                }
                catch {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        });
        req.on('error', (err) => {
            console.error('  Erro na chamada API:', err.message);
            reject(err);
        });
        req.write(body);
        req.end();
    });
}
// === Função principal: emitir NFS-e real ===
let certDataCache = null;
async function emitirNFSeReal(data, pfxPath, passphrase, ambiente = 'homologacao', pfxBase64) {
    try {
        console.log('\n--- Emissao NFS-e Real ---');
        // 1. Carregar certificado (cache)
        if (!certDataCache) {
            console.log('  Carregando certificado...');
            certDataCache = extrairCertificado(pfxPath, passphrase, pfxBase64);
        }
        // 2. Gerar número DPS sequencial
        const numDPS = String(Date.now()).slice(-9);
        console.log('  Gerando DPS:', numDPS);
        // 3. Gerar XML do DPS
        const dpsXml = gerarDpsXml(data, numDPS);
        console.log('  XML gerado (%d bytes)', dpsXml.length);
        // 4. Assinar XML
        console.log('  Assinando XML...');
        const signedXml = assinarXml(dpsXml, certDataCache);
        console.log('  XML assinado (%d bytes)', signedXml.length);
        // 5. Comprimir (GZip + Base64)
        console.log('  Comprimindo...');
        const dpsXmlB64 = await comprimirXml(signedXml);
        console.log('  Comprimido (%d chars base64)', dpsXmlB64.length);
        // 6. Enviar para API
        console.log('  Enviando para API (%s)...', ambiente);
        const response = await enviarParaApi(dpsXmlB64, certDataCache, ambiente);
        console.log('  Status:', response.statusCode);
        console.log('  Resposta:', JSON.stringify(response.body).substring(0, 200));
        // 7. Processar resposta
        if (response.statusCode === 200 || response.statusCode === 201) {
            let nfseXml = signedXml; // fallback
            if (response.body.nfseXmlGZipB64) {
                nfseXml = await descomprimirResposta(response.body.nfseXmlGZipB64);
            }
            // Salvar XML
            const chave = response.body.chaveAcesso || `local_${numDPS}`;
            const xmlDir = path_1.default.resolve('xml-output');
            if (!fs_1.default.existsSync(xmlDir))
                fs_1.default.mkdirSync(xmlDir, { recursive: true });
            const xmlPath = path_1.default.join(xmlDir, `${chave}.xml`);
            fs_1.default.writeFileSync(xmlPath, nfseXml, 'utf-8');
            return {
                success: true,
                xml: nfseXml,
                chaveAcesso: response.body.chaveAcesso || chave,
                protocolo: response.body.nProt || response.body.idDPS || numDPS,
                numeroNfse: response.body.nNFSe || numDPS,
                status: '100',
                motivo: 'NFS-e autorizada',
                dataAutorizacao: response.body.dataHoraProcessamento || new Date().toISOString(),
            };
        }
        else {
            // Erro da API
            const erros = response.body.erros || response.body.errors || [];
            const mensagem = Array.isArray(erros)
                ? erros.map((e) => `${e.codigo || ''}: ${e.mensagem || e.descricao || JSON.stringify(e)}`).join(' | ')
                : JSON.stringify(response.body);
            console.error('  ERRO:', mensagem);
            return {
                success: false,
                xml: signedXml,
                status: String(response.statusCode),
                motivo: `Erro ${response.statusCode}: ${mensagem}`,
            };
        }
    }
    catch (error) {
        console.error('  ERRO GERAL:', error.message);
        return {
            success: false,
            xml: '',
            motivo: `Erro: ${error.message}`,
        };
    }
}
// === Testar conectividade com a API ===
async function testarConexaoApi(pfxPath, passphrase, ambiente = 'homologacao', pfxBase64) {
    try {
        const certData = extrairCertificado(pfxPath, passphrase, pfxBase64);
        const baseUrl = ambiente === 'homologacao'
            ? 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional'
            : 'https://sefin.nfse.gov.br/SefinNacional';
        const agent = new https_1.default.Agent({
            pfx: certData.pfxBuffer,
            passphrase: certData.passphrase,
            rejectUnauthorized: false,
        });
        return new Promise((resolve) => {
            const url = new URL(baseUrl);
            const req = https_1.default.request({
                hostname: url.hostname,
                port: 443,
                path: '/',
                method: 'GET',
                agent,
                timeout: 10000,
            }, (res) => {
                resolve({
                    online: true,
                    status: String(res.statusCode),
                    motivo: `API acessivel (HTTP ${res.statusCode})`,
                });
            });
            req.on('error', (err) => {
                resolve({
                    online: false,
                    status: '0',
                    motivo: `Erro de conexao: ${err.message}`,
                });
            });
            req.on('timeout', () => {
                req.destroy();
                resolve({ online: false, status: '0', motivo: 'Timeout na conexao' });
            });
            req.end();
        });
    }
    catch (error) {
        return { online: false, status: '0', motivo: `Erro: ${error.message}` };
    }
}
//# sourceMappingURL=nfse-real.service.js.map