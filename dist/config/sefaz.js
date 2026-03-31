"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3000', 10),
    mockMode: process.env.MOCK_MODE === 'true',
    ambiente: parseInt(process.env.AMBIENTE || '2', 10),
    uf: process.env.UF || 'RS',
    certPath: process.env.CERT_PATH || './certs/SAGA_41453040.pfx',
    certPassword: process.env.CERT_PASSWORD || '41453040',
    certBase64: process.env.CERT_BASE64 || '',
};
//# sourceMappingURL=sefaz.js.map