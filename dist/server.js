"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const sefaz_1 = require("./config/sefaz");
const nfe_routes_1 = __importDefault(require("./routes/nfe.routes"));
const danfe_routes_1 = __importDefault(require("./routes/danfe.routes"));
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
// === Auth (simples, em memória) ===
const SUPERUSER = {
    email: 'admin@jmsoftware.com',
    password: 'JMSoft@2026',
    name: 'Administrador JM',
    role: 'superuser',
};
const sessions = new Map();
function hashPw(pw) {
    return crypto_1.default.createHash('sha256').update(pw + 'nfse_salt_jm2026').digest('hex');
}
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (email === SUPERUSER.email && hashPw(password) === hashPw(SUPERUSER.password)) {
        const token = crypto_1.default.randomBytes(32).toString('hex');
        sessions.set(token, { email, name: SUPERUSER.name, expires: Date.now() + 86400000 });
        res.json({ success: true, token, user: { name: SUPERUSER.name, email, role: SUPERUSER.role } });
    }
    else {
        res.status(401).json({ success: false, motivo: 'E-mail ou senha incorretos' });
    }
});
// Middleware de auth para rotas /api (exceto login e config)
app.use('/api', (req, res, next) => {
    if (req.path === '/auth/login' || req.path === '/config')
        return next();
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const session = sessions.get(token);
    if (!session || Date.now() > session.expires) {
        res.status(401).json({ success: false, motivo: 'Nao autorizado' });
        return;
    }
    next();
});
// === Dados em memória (substitui D1 no servidor local) ===
const prestadoresLocal = [
    { id: 1, cnpj: '41453040000176', razao_social: 'SERVICO DE ANESTESIOLOGIA GAUCHO LTDA', nome_fantasia: 'Dr. Alexandre Ulrich - Anestesiologia', inscricao_municipal: '', logradouro: 'Av. Venancio Aires', numero: '200', bairro: 'Cidade Baixa', codigo_municipio: '4314902', municipio: 'Porto Alegre', uf: 'RS', cep: '90040193' },
];
const tomadoresLocal = [];
const notasLocal = [];
app.get('/api/prestadores', (_req, res) => res.json(prestadoresLocal));
app.post('/api/prestadores', (req, res) => {
    const d = req.body;
    const id = prestadoresLocal.length + 1;
    prestadoresLocal.push({ id, ...d });
    res.json({ success: true, id });
});
app.delete('/api/prestadores/:id', (req, res) => {
    const idx = prestadoresLocal.findIndex(p => p.id === parseInt(req.params.id));
    if (idx >= 0)
        prestadoresLocal.splice(idx, 1);
    res.json({ success: true });
});
app.get('/api/tomadores', (_req, res) => res.json(tomadoresLocal));
app.get('/api/tomadores/:doc', (req, res) => {
    const t = tomadoresLocal.find(t => t.documento === req.params.doc || t.documento === req.params.doc.replace(/[^\d]/g, ''));
    t ? res.json(t) : res.status(404).json({ error: 'Nao encontrado' });
});
app.post('/api/tomadores', (req, res) => {
    const d = req.body;
    const docLimpo = (d.documento || '').replace(/[^\d]/g, '');
    const existing = tomadoresLocal.find(t => t.documento === docLimpo);
    if (existing) {
        Object.assign(existing, d, { documento: docLimpo });
        res.json({ success: true, id: existing.id, updated: true });
    }
    else {
        const id = tomadoresLocal.length + 1;
        tomadoresLocal.push({ id, ...d, documento: docLimpo });
        res.json({ success: true, id });
    }
});
app.get('/api/notas', (_req, res) => res.json(notasLocal));
app.get('/api/servicos', (_req, res) => res.json([]));
// API Routes
app.use('/api/nfse', nfe_routes_1.default);
app.use('/api/danfse', danfe_routes_1.default);
// Config endpoint
app.get('/api/config', (_req, res) => {
    res.json({
        mockMode: sefaz_1.config.mockMode,
        ambiente: sefaz_1.config.ambiente === 1 ? 'Produção' : 'Homologação',
        uf: sefaz_1.config.uf,
        sistema: 'Emissor Nacional NFS-e',
    });
});
app.listen(sefaz_1.config.port, () => {
    console.log(`\n  Servidor NFS-e rodando em http://localhost:${sefaz_1.config.port}`);
    console.log(`  Modo: ${sefaz_1.config.mockMode ? 'SIMULACAO (Mock)' : 'Real'}`);
    console.log(`  Ambiente: ${sefaz_1.config.ambiente === 1 ? 'Producao' : 'Homologacao'}`);
    console.log(`  UF: ${sefaz_1.config.uf}\n`);
});
//# sourceMappingURL=server.js.map