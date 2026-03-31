import { IFormData, INFSeResult } from '../models/nfe.types';
export declare function emitirNFSeReal(data: IFormData, pfxPath: string, passphrase: string, ambiente?: 'homologacao' | 'producao', pfxBase64?: string): Promise<INFSeResult>;
export declare function testarConexaoApi(pfxPath: string, passphrase: string, ambiente?: 'homologacao' | 'producao', pfxBase64?: string): Promise<{
    online: boolean;
    status: string;
    motivo: string;
}>;
//# sourceMappingURL=nfse-real.service.d.ts.map