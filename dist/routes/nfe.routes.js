"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const nfe_service_1 = require("../services/nfe.service");
const validators_1 = require("../utils/validators");
const router = (0, express_1.Router)();
router.post('/emitir', async (req, res) => {
    try {
        const data = req.body;
        if (!data.prestador?.cnpj || !data.tomador?.documento || !data.servico?.descricao) {
            res.status(400).json({ success: false, motivo: 'Dados obrigatórios não preenchidos' });
            return;
        }
        const cnpjLimpo = data.prestador.cnpj.replace(/[^\d]/g, '');
        if (!(0, validators_1.validarCNPJ)(cnpjLimpo)) {
            res.status(400).json({ success: false, motivo: 'CNPJ do prestador inválido' });
            return;
        }
        if (data.tomador.tipo === 'cpf') {
            if (!(0, validators_1.validarCPF)(data.tomador.documento.replace(/[^\d]/g, ''))) {
                res.status(400).json({ success: false, motivo: 'CPF do tomador inválido' });
                return;
            }
        }
        else {
            if (!(0, validators_1.validarCNPJ)(data.tomador.documento.replace(/[^\d]/g, ''))) {
                res.status(400).json({ success: false, motivo: 'CNPJ do tomador inválido' });
                return;
            }
        }
        if (!data.servico.valorServico || data.servico.valorServico <= 0) {
            res.status(400).json({ success: false, motivo: 'Valor do serviço deve ser maior que zero' });
            return;
        }
        const result = await (0, nfe_service_1.emitirNFSe)(data);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, motivo: error.message || 'Erro interno' });
    }
});
router.get('/status', async (_req, res) => {
    try {
        const status = await (0, nfe_service_1.consultarStatus)();
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ online: false, motivo: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=nfe.routes.js.map