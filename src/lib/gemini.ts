import { GoogleGenerativeAI } from "@google/generative-ai";

// Puxa a chave do arquivo .env usando a regra do Vite
const CHAVE_API = import.meta.env.VITE_CHAVE_API_GEMINI;

// Configura o motor com o modelo gratuito que discutimos
const genAI = new GoogleGenerativeAI(CHAVE_API);
export const modeloIA = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash" // Versão estável e gratuita
});

/**
 * Função para enviar o brainstorm atual e receber novos balões
 */
export async function pedirSugestaoIA(ideiaPrincipal: string, contextoAtual: any[]) {
  const prompt = `
    Abaixe o papel de um facilitador de brainstorm.
    Ideia central: ${ideiaPrincipal}
    Contexto atual dos balões: ${JSON.stringify(contextoAtual)}
    
    Responda apenas com um array JSON de novos balões contendo:
    text: string, category: 'problema' | 'solucao' | 'causa-raiz' | 'proximo-passo'
  `;

  try {
    const resultado = await modeloIA.generateContent(prompt);
    const resposta = await resultado.response;
    return JSON.parse(resposta.text());
  } catch (erro) {
    console.error("Erro ao chamar a IA:", erro);
    return [];
  }
}