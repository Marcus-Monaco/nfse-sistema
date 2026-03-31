"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitirNFSe = emitirNFSe;
exports.consultarStatus = consultarStatus;
exports.buscarXmlPorChave = buscarXmlPorChave;
const sefaz_1 = require("../config/sefaz");
const mock_service_1 = require("./mock.service");
const nfse_real_service_1 = require("./nfse-real.service");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function emitirNFSe(data) {
    if (sefaz_1.config.mockMode) {
        const result = (0, mock_service_1.emitirNFSeMock)(data);
        if (result.chaveAcesso) {
            const xmlDir = path_1.default.resolve('xml-output');
            if (!fs_1.default.existsSync(xmlDir))
                fs_1.default.mkdirSync(xmlDir, { recursive: true });
            const xmlPath = path_1.default.join(xmlDir, `${result.chaveAcesso}.xml`);
            fs_1.default.writeFileSync(xmlPath, result.xml, 'utf-8');
        }
        return result;
    }
    // Modo real
    const pfxPath = path_1.default.resolve(sefaz_1.config.certPath);
    const temArquivo = fs_1.default.existsSync(pfxPath);
    const temBase64 = !!sefaz_1.config.certBase64;
    if (!temArquivo && !temBase64) {
        return {
            success: false,
            xml: '',
            motivo: `Certificado não encontrado em: ${pfxPath}`,
        };
    }
    const ambiente = sefaz_1.config.ambiente === 1 ? 'producao' : 'homologacao';
    return (0, nfse_real_service_1.emitirNFSeReal)(data, pfxPath, sefaz_1.config.certPassword, ambiente, sefaz_1.config.certBase64 || undefined);
}
async function consultarStatus() {
    if (sefaz_1.config.mockMode) {
        return (0, mock_service_1.statusServicoMock)();
    }
    // Testar conexão real
    const pfxPath = path_1.default.resolve(sefaz_1.config.certPath);
    const temArquivo = fs_1.default.existsSync(pfxPath);
    const temBase64 = !!sefaz_1.config.certBase64;
    if (!temArquivo && !temBase64) {
        return {
            online: false,
            status: '0',
            motivo: 'Certificado não encontrado',
            tpAmb: '2',
            ambiente: 'Homologação',
            sistema: 'Emissor Nacional NFS-e',
        };
    }
    const ambiente = sefaz_1.config.ambiente === 1 ? 'producao' : 'homologacao';
    const result = await (0, nfse_real_service_1.testarConexaoApi)(pfxPath, sefaz_1.config.certPassword, ambiente, sefaz_1.config.certBase64 || undefined);
    return {
        ...result,
        tpAmb: String(sefaz_1.config.ambiente),
        ambiente: sefaz_1.config.ambiente === 1 ? 'Produção' : 'Homologação',
        sistema: 'Emissor Nacional NFS-e',
    };
}
function buscarXmlPorChave(chave) {
    const xmlPath = path_1.default.resolve('xml-output', `${chave}.xml`);
    if (fs_1.default.existsSync(xmlPath)) {
        return fs_1.default.readFileSync(xmlPath, 'utf-8');
    }
    return null;
}
//# sourceMappingURL=nfe.service.js.map