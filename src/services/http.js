import axios from 'axios';

const api = axios.create({
  baseURL: 'https://endpointsmartsafe.online/api', // Use o domínio em vez do IP
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptar respostas para tratar erros globais
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('Erro no servidor:', error.response.data);
    } else if (error.request) {
      console.error('Erro na requisição:', error.request);
    } else {
      console.error('Erro desconhecido:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
