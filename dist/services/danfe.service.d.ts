interface DanfseData {
    chaveAcesso: string;
    numeroNfse: string;
    protocolo: string;
    dataAutorizacao: string;
    prestador: {
        razaoSocial: string;
        nomeFantasia: string;
        cnpj: string;
        inscricaoMunicipal: string;
        endereco: string;
    };
    tomador: {
        nome: string;
        documento: string;
        endereco: string;
    };
    servico: {
        codigo: string;
        descricao: string;
        valor: number;
    };
    iss: {
        baseCalculo: number;
        aliquota: number;
        valor: number;
        municipioIncidencia: string;
    };
    valorLiquido: number;
}
export declare function parseDanfseDataFromXml(xml: string): DanfseData;
export declare function gerarDanfsePdf(data: DanfseData): Promise<Buffer>;
export {};
//# sourceMappingURL=danfe.service.d.ts.map