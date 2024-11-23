import stringSimilarity from 'string-similarity';
import knowledgeBase from '../data/knowledgeBase.json' assert { type: 'json' };

// Controlador para a rota de teste
export const getTest = (req, res) => {
  return res.json({ message: "Teste ok!" });
};

// Controlador para o chatbot
export const chat = (req, res) => {
  const userQuery = req.body.query;

  if (!userQuery) {
    return res.status(400).json({ response: "Por favor, envie uma pergunta válida." });
  }

  // Usar o arquivo JSON como base de conhecimento
  const questions = knowledgeBase.map((item) => item.question);
  const matches = stringSimilarity.findBestMatch(userQuery, questions);

  const bestMatch = matches.bestMatch;

  if (bestMatch.rating > 0.5) {
    const bestMatchIndex = matches.bestMatchIndex;
    return res.json({ response: knowledgeBase[bestMatchIndex].answer });
  } else {
    return res.json({ response: "Desculpe, não consegui encontrar uma resposta relevante." });
  }
};
