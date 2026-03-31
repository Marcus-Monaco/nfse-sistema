import { IFormData, INFSeResult } from '../models/nfe.types';
export declare function emitirNFSe(data: IFormData): Promise<INFSeResult>;
export declare function consultarStatus(): Promise<{
    online: boolean;
    status: string;
    motivo: string;
    tpAmb: string;
    ambiente: string;
    sistema: string;
}>;
export declare function buscarXmlPorChave(chave: string): string | null;
//# sourceMappingURL=nfe.service.d.ts.map