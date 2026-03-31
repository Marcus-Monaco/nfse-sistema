import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  port: number;
  mockMode: boolean;
  ambiente: number; // 1=Producao, 2=Homologacao
  uf: string;
  certPath: string;
  certPassword: string;
  certBase64: string; // Certificado .pfx em base64 (para deploy em nuvem)
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  mockMode: process.env.MOCK_MODE === 'true',
  ambiente: parseInt(process.env.AMBIENTE || '2', 10),
  uf: process.env.UF || 'RS',
  certPath: process.env.CERT_PATH || './certs/SAGA_41453040.pfx',
  certPassword: process.env.CERT_PASSWORD || '41453040',
  certBase64: process.env.CERT_BASE64 || '',
};
