import { IFormData, INFSeResult } from '../models/nfe.types';
import { config } from '../config/sefaz';
import { emitirNFSeMock, statusServicoMock } from './mock.service';
import { emitirNFSeReal, testarConexaoApi } from './nfse-real.service';
import fs from 'fs';
import path from 'path';

export async function emitirNFSe(data: IFormData): Promise<INFSeResult> {
  if (config.mockMode) {
    const result = emitirNFSeMock(data);
    if (result.chaveAcesso) {
      const xmlDir = path.resolve('xml-output');
      if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir, { recursive: true });
      const xmlPath = path.join(xmlDir, `${result.chaveAcesso}.xml`);
      fs.writeFileSync(xmlPath, result.xml, 'utf-8');
    }
    return result;
  }

  // Modo real
  const pfxPath = path.resolve(config.certPath);
  const temArquivo = fs.existsSync(pfxPath);
  const temBase64 = !!config.certBase64;

  if (!temArquivo && !temBase64) {
    return {
      success: false,
      xml: '',
      motivo: `Certificado não encontrado em: ${pfxPath}`,
    };
  }

  const ambiente = config.ambiente === 1 ? 'producao' : 'homologacao';
  return emitirNFSeReal(data, pfxPath, config.certPassword, ambiente as any, config.certBase64 || undefined);
}

export async function consultarStatus() {
  if (config.mockMode) {
    return statusServicoMock();
  }

  // Testar conexão real
  const pfxPath = path.resolve(config.certPath);
  const temArquivo = fs.existsSync(pfxPath);
  const temBase64 = !!config.certBase64;

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

  const ambiente = config.ambiente === 1 ? 'producao' : 'homologacao';
  const result = await testarConexaoApi(pfxPath, config.certPassword, ambiente as any, config.certBase64 || undefined);

  return {
    ...result,
    tpAmb: String(config.ambiente),
    ambiente: config.ambiente === 1 ? 'Produção' : 'Homologação',
    sistema: 'Emissor Nacional NFS-e',
  };
}

export function buscarXmlPorChave(chave: string): string | null {
  const xmlPath = path.resolve('xml-output', `${chave}.xml`);
  if (fs.existsSync(xmlPath)) {
    return fs.readFileSync(xmlPath, 'utf-8');
  }
  return null;
}
