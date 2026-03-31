export interface IPrestador {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string;
    inscricaoMunicipal: string;
    endereco: IEndereco;
}
export interface ITomador {
    tipo: 'cnpj' | 'cpf';
    documento: string;
    nome: string;
    email?: string;
    endereco: IEndereco;
}
export interface IEndereco {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    codigoMunicipio: string;
    municipio: string;
    uf: string;
    cep: string;
}
export interface IServico {
    codigoServico: string;
    descricao: string;
    valorServico: number;
}
export interface IImpostoNFSe {
    iss: {
        baseCalculo: number;
        aliquota: number;
        valor: number;
        municipioIncidencia: string;
    };
}
export interface IFormData {
    prestador: IPrestador;
    tomador: ITomador;
    servico: IServico;
    imposto: IImpostoNFSe;
}
export interface INFSeResult {
    success: boolean;
    xml: string;
    protocolo?: string;
    chaveAcesso?: string;
    numeroNfse?: string;
    status?: string;
    motivo?: string;
    dataAutorizacao?: string;
}
//# sourceMappingURL=nfe.types.d.ts.map