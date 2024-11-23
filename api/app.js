import cors from 'cors';
import express from 'express';
import chatRoutes from './routes/chatRoutes.js';

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/chat', chatRoutes);

// Inicialização do servidor (escutando em todas as interfaces)
app.listen(port, () => {
  console.log(`Servidor rodando em http:localhost:${port}`);
});
