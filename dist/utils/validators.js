"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validarCNPJ = validarCNPJ;
exports.validarCPF = validarCPF;
exports.formatarCNPJ = formatarCNPJ;
exports.formatarCPF = formatarCPF;
function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]/g, '');
    if (cnpj.length !== 14)
        return false;
    if (/^(\d)\1+$/.test(cnpj))
        return false;
    const calcDigit = (slice, weights) => {
        let sum = 0;
        for (let i = 0; i < weights.length; i++) {
            sum += parseInt(slice[i]) * weights[i];
        }
        const rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    };
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const d1 = calcDigit(cnpj, w1);
    const d2 = calcDigit(cnpj, w2);
    return parseInt(cnpj[12]) === d1 && parseInt(cnpj[13]) === d2;
}
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11)
        return false;
    if (/^(\d)\1+$/.test(cpf))
        return false;
    let sum = 0;
    for (let i = 0; i < 9; i++)
        sum += parseInt(cpf[i]) * (10 - i);
    let d1 = 11 - (sum % 11);
    if (d1 >= 10)
        d1 = 0;
    sum = 0;
    for (let i = 0; i < 10; i++)
        sum += parseInt(cpf[i]) * (11 - i);
    let d2 = 11 - (sum % 11);
    if (d2 >= 10)
        d2 = 0;
    return parseInt(cpf[9]) === d1 && parseInt(cpf[10]) === d2;
}
function formatarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]/g, '');
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}
function formatarCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}
//# sourceMappingURL=validators.js.map