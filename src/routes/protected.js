import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', authenticate, (req, res) => {
  res.json({ id: req.user.id, roles: req.user.roles });
});

router.get('/admin', authenticate, authorize(['admin']), (req, res) => {
  res.json({ secret: 'only admins see this' });
});

export default router;