"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const nfe_service_1 = require("../services/nfe.service");
const danfe_service_1 = require("../services/danfe.service");
const router = (0, express_1.Router)();
router.get('/:chave', async (req, res) => {
    try {
        const chave = req.params.chave;
        const xml = (0, nfe_service_1.buscarXmlPorChave)(chave);
        if (!xml) {
            res.status(404).json({ error: 'XML não encontrado para esta chave de acesso' });
            return;
        }
        const data = (0, danfe_service_1.parseDanfseDataFromXml)(xml);
        const pdf = await (0, danfe_service_1.gerarDanfsePdf)(data);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=DANFSE_${chave}.pdf`);
        res.send(pdf);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Erro ao gerar DANFSE' });
    }
});
exports.default = router;
//# sourceMappingURL=danfe.routes.js.map