import { Router } from 'express';
import authRoutes from './auth.routes';
import clientsRoutes from './clients.routes';
import offersRoutes from './offers.routes';
import contractsRoutes from './contracts.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/clients', clientsRoutes);
router.use('/offers', offersRoutes);
router.use('/contracts', contractsRoutes);
router.get('/health', (req, res) => {
    res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
});

export default router;