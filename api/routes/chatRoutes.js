import express from 'express';
import { chat, getTest } from '../controllers/chatController.js';

const router = express.Router();

// Rotas
router.post('/', chat); // Rota principal do chatbot
router.get('/test', getTest); // Rota para teste de conexão

export default router;
