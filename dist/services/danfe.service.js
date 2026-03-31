"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDanfseDataFromXml = parseDanfseDataFromXml;
exports.gerarDanfsePdf = gerarDanfsePdf;
const pdfkit_1 = __importDefault(require("pdfkit"));
function parseDanfseDataFromXml(xml) {
    const get = (tag) => {
        const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
        return match ? match[1] : '';
    };
    const getAll = (tag) => {
        const matches = xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g'));
        return Array.from(matches).map(m => m[1]);
    };
    const prestCnpj = get('CNPJ');
    const tomDoc = xml.match(/<toma>[\s\S]*?<(?:CNPJ|CPF)>([^<]*)<\/(?:CNPJ|CPF)>/);
    const xLgrs = getAll('xLgr');
    const nros = getAll('nro');
    const xBairros = getAll('xBairro');
    const xMuns = getAll('xMun');
    const ufs = getAll('UF');
    const prestEndereco = xLgrs[0] ? `${xLgrs[0]}, ${nros[0]} - ${xBairros[0]} - ${xMuns[0]}/${ufs[0]}` : '';
    const tomEndereco = xLgrs[1] ? `${xLgrs[1]}, ${nros[1]} - ${xBairros[1]} - ${xMuns[1]}/${ufs[1]}` : '';
    const vServ = parseFloat(get('vServPrest')) || parseFloat(get('vServ')) || 0;
    const vISS = parseFloat(get('vISS')) || 0;
    return {
        chaveAcesso: get('chNFSe'),
        numeroNfse: get('nNFSe'),
        protocolo: get('nProt'),
        dataAutorizacao: get('dhRecbto'),
        prestador: {
            razaoSocial: get('xNome'),
            nomeFantasia: get('xFant'),
            cnpj: prestCnpj,
            inscricaoMunicipal: get('IM'),
            endereco: prestEndereco,
        },
        tomador: {
            nome: getAll('xNome')[1] || '',
            documento: tomDoc ? tomDoc[1] : '',
            endereco: tomEndereco,
        },
        servico: {
            codigo: get('cServ'),
            descricao: get('xDescServ'),
            valor: vServ,
        },
        iss: {
            baseCalculo: parseFloat(get('vBC')) || 0,
            aliquota: parseFloat(get('pAliqISS')) || 0,
            valor: vISS,
            municipioIncidencia: get('cMunInc'),
        },
        valorLiquido: parseFloat(get('vLiq')) || (vServ - vISS),
    };
}
function gerarDanfsePdf(data) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ size: 'A4', margin: 30 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        const pageWidth = 535;
        let y = 30;
        // === HEADER: Prestador + DANFSE + Chave ===
        doc.rect(30, y, 280, 85).stroke();
        const nomeExibicao = data.prestador.nomeFantasia || data.prestador.razaoSocial;
        doc.fontSize(12).font('Helvetica-Bold').text(nomeExibicao, 40, y + 8, { width: 260 });
        if (data.prestador.nomeFantasia && data.prestador.razaoSocial !== data.prestador.nomeFantasia) {
            doc.fontSize(5.5).font('Helvetica').text(data.prestador.razaoSocial, 40, y + 28, { width: 260 });
        }
        doc.fontSize(7).font('Helvetica').text(data.prestador.endereco, 40, y + 42);
        doc.fontSize(7).text(`CNPJ: ${formatDoc(data.prestador.cnpj)} | IM: ${data.prestador.inscricaoMunicipal}`, 40, y + 54);
        // DANFSE box
        doc.rect(310, y, 95, 85).stroke();
        doc.fontSize(14).font('Helvetica-Bold').text('DANFSE', 315, y + 10, { width: 85, align: 'center' });
        doc.fontSize(6).font('Helvetica').text('Documento Auxiliar', 315, y + 30, { width: 85, align: 'center' });
        doc.fontSize(6).text('da Nota Fiscal de', 315, y + 39, { width: 85, align: 'center' });
        doc.fontSize(6).text('Serviço Eletrônica', 315, y + 48, { width: 85, align: 'center' });
        doc.fontSize(8).font('Helvetica-Bold').text(`NFS-e Nº ${data.numeroNfse}`, 315, y + 64, { width: 85, align: 'center' });
        // Chave/Protocolo box
        doc.rect(405, y, 160, 85).stroke();
        doc.fontSize(6).font('Helvetica-Bold').text('CHAVE DE ACESSO', 410, y + 5);
        doc.fontSize(5.5).font('Helvetica').text(formatChave(data.chaveAcesso), 410, y + 16, { width: 150 });
        doc.fontSize(6).font('Helvetica-Bold').text('PROTOCOLO DE AUTORIZAÇÃO', 410, y + 38);
        doc.fontSize(6).font('Helvetica').text(data.protocolo, 410, y + 49);
        doc.fontSize(6).text(formatDate(data.dataAutorizacao), 410, y + 60);
        y += 90;
        // Homologação badge
        doc.rect(30, y, pageWidth, 18).fill('#FEF3C7').stroke('#F59E0B');
        doc.fillColor('#92400E').fontSize(8).font('Helvetica-Bold')
            .text('EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL', 40, y + 4, { width: pageWidth - 20, align: 'center' });
        doc.fillColor('black');
        y += 23;
        // === TOMADOR ===
        doc.rect(30, y, pageWidth, 15).fill('#EFF6FF').stroke('#2563EB');
        doc.fillColor('#1E40AF').fontSize(8).font('Helvetica-Bold').text('TOMADOR DE SERVIÇOS', 35, y + 3);
        doc.fillColor('black');
        y += 18;
        doc.rect(30, y, 350, 28).stroke();
        doc.fontSize(6).font('Helvetica-Bold').text('NOME / RAZÃO SOCIAL', 35, y + 3);
        doc.fontSize(9).font('Helvetica').text(data.tomador.nome, 35, y + 13);
        doc.rect(380, y, 185, 28).stroke();
        doc.fontSize(6).font('Helvetica-Bold').text('CPF/CNPJ', 385, y + 3);
        doc.fontSize(9).font('Helvetica').text(formatDoc(data.tomador.documento), 385, y + 13);
        y += 31;
        doc.rect(30, y, pageWidth, 25).stroke();
        doc.fontSize(6).font('Helvetica-Bold').text('ENDEREÇO', 35, y + 3);
        doc.fontSize(8).font('Helvetica').text(data.tomador.endereco, 35, y + 13);
        y += 28;
        // === DISCRIMINAÇÃO DOS SERVIÇOS ===
        doc.rect(30, y, pageWidth, 15).fill('#EFF6FF').stroke('#2563EB');
        doc.fillColor('#1E40AF').fontSize(8).font('Helvetica-Bold').text('DISCRIMINAÇÃO DOS SERVIÇOS', 35, y + 3);
        doc.fillColor('black');
        y += 18;
        // Código do serviço
        doc.rect(30, y, pageWidth, 25).stroke();
        doc.fontSize(6).font('Helvetica-Bold').text('CÓDIGO DO SERVIÇO (LC 116)', 35, y + 3);
        doc.fontSize(9).font('Helvetica').text(data.servico.codigo, 35, y + 13);
        y += 28;
        // Descrição do serviço (área maior)
        const descHeight = Math.max(60, Math.ceil(data.servico.descricao.length / 80) * 14 + 20);
        doc.rect(30, y, pageWidth, descHeight).stroke();
        doc.fontSize(6).font('Helvetica-Bold').text('DESCRIÇÃO DOS SERVIÇOS', 35, y + 3);
        doc.fontSize(9).font('Helvetica').text(data.servico.descricao, 35, y + 15, { width: pageWidth - 20 });
        y += descHeight + 3;
        // === VALORES E ISS ===
        doc.rect(30, y, pageWidth, 15).fill('#EFF6FF').stroke('#2563EB');
        doc.fillColor('#1E40AF').fontSize(8).font('Helvetica-Bold').text('VALORES E ISS', 35, y + 3);
        doc.fillColor('black');
        y += 18;
        const colW = pageWidth / 4;
        const valItems = [
            { label: 'VALOR DOS SERVIÇOS', value: data.servico.valor },
            { label: 'BASE DE CÁLCULO ISS', value: data.iss.baseCalculo },
            { label: `ISS (${data.iss.aliquota.toFixed(2)}%)`, value: data.iss.valor },
            { label: 'VALOR LÍQUIDO', value: data.valorLiquido },
        ];
        valItems.forEach((item, i) => {
            const x = 30 + i * colW;
            doc.rect(x, y, colW, 32).stroke();
            doc.fontSize(6).font('Helvetica-Bold').text(item.label, x + 4, y + 4, { width: colW - 8 });
            const isLast = i === valItems.length - 1;
            doc.fontSize(isLast ? 12 : 10).font(isLast ? 'Helvetica-Bold' : 'Helvetica')
                .text(`R$ ${item.value.toFixed(2)}`, x + 4, y + 16, { width: colW - 8 });
        });
        y += 38;
        // Município de incidência
        doc.rect(30, y, pageWidth, 25).stroke();
        doc.fontSize(6).font('Helvetica-Bold').text('MUNICÍPIO DE INCIDÊNCIA DO ISS', 35, y + 3);
        doc.fontSize(8).font('Helvetica').text(`Código IBGE: ${data.iss.municipioIncidencia}`, 35, y + 13);
        y += 32;
        // Footer
        doc.fontSize(6).fillColor('#6B7280')
            .text('Documento gerado em ambiente de HOMOLOGAÇÃO — sem valor fiscal', 30, y, { width: pageWidth, align: 'center' });
        doc.fontSize(6).text('Emissor Nacional NFS-e (nfse.gov.br)', 30, y + 10, { width: pageWidth, align: 'center' });
        doc.end();
    });
}
function formatDoc(doc) {
    doc = doc.replace(/[^\d]/g, '');
    if (doc.length === 14)
        return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (doc.length === 11)
        return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    return doc;
}
function formatChave(chave) {
    return chave.replace(/(\d{4})/g, '$1 ').trim();
}
function formatDate(iso) {
    try {
        return new Date(iso).toLocaleString('pt-BR');
    }
    catch {
        return iso;
    }
}
//# sourceMappingURL=danfe.service.js.map