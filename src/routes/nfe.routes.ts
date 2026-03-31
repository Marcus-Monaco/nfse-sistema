import { Router, Request, Response } from 'express';
import { emitirNFSe, consultarStatus } from '../services/nfe.service';
import { validarCNPJ, validarCPF } from '../utils/validators';
import { IFormData } from '../models/nfe.types';

const router = Router();

router.post('/emitir', async (req: Request, res: Response) => {
  try {
    const data: IFormData = req.body;

    if (!data.prestador?.cnpj || !data.tomador?.documento || !data.servico?.descricao) {
      res.status(400).json({ success: false, motivo: 'Dados obrigatórios não preenchidos' });
      return;
    }

    const cnpjLimpo = data.prestador.cnpj.replace(/[^\d]/g, '');
    if (!validarCNPJ(cnpjLimpo)) {
      res.status(400).json({ success: false, motivo: 'CNPJ do prestador inválido' });
      return;
    }

    if (data.tomador.tipo === 'cpf') {
      if (!validarCPF(data.tomador.documento.replace(/[^\d]/g, ''))) {
        res.status(400).json({ success: false, motivo: 'CPF do tomador inválido' });
        return;
      }
    } else {
      if (!validarCNPJ(data.tomador.documento.replace(/[^\d]/g, ''))) {
        res.status(400).json({ success: false, motivo: 'CNPJ do tomador inválido' });
        return;
      }
    }

    if (!data.servico.valorServico || data.servico.valorServico <= 0) {
      res.status(400).json({ success: false, motivo: 'Valor do serviço deve ser maior que zero' });
      return;
    }

    const result = await emitirNFSe(data);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, motivo: error.message || 'Erro interno' });
  }
});

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await consultarStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ online: false, motivo: error.message });
  }
});

export default router;
