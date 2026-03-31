import { Router, Request, Response } from 'express';
import { buscarXmlPorChave } from '../services/nfe.service';
import { parseDanfseDataFromXml, gerarDanfsePdf } from '../services/danfe.service';

const router = Router();

router.get('/:chave', async (req: Request, res: Response) => {
  try {
    const chave = req.params.chave as string;

    const xml = buscarXmlPorChave(chave);
    if (!xml) {
      res.status(404).json({ error: 'XML não encontrado para esta chave de acesso' });
      return;
    }

    const data = parseDanfseDataFromXml(xml);
    const pdf = await gerarDanfsePdf(data);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=DANFSE_${chave}.pdf`);
    res.send(pdf);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao gerar DANFSE' });
  }
});

export default router;
