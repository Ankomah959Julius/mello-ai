import { Router } from 'express';
import webhookController from '../controllers/webhookController.js';

const router = Router();

router.get('/', webhookController.verifyWebhook);
router.post('/', webhookController.handleWebhook);

export default router;
