// api/gemini.js
// Esta es una función Serverless de Vercel que actúa como un proxy para la API de Gemini.
// Permite mantener la API Key segura en el servidor y no expuesta en el frontend.

// Importa la biblioteca de Google Generative AI para Node.js
import { GoogleGenerativeAI } from '@google/generative-ai';

// La función principal que Vercel ejecutará cuando se acceda a /api/gemini
export default async function handler(req, res) {
    // Asegúrate de que solo se acepten solicitudes POST para enviar datos al modelo
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Solo POST.' });
    }

    // Accede a la clave de API desde las variables de entorno de Vercel
    // El nombre de la variable debe coincidir con el que configuraste en Vercel.
    const apiKey = process.env.GEMINI_API_KEY;

    // Si la clave de API no está configurada, devuelve un error
    if (!apiKey) {
        console.error("GEMINI_API_KEY no configurada en las variables de entorno de Vercel.");
        return res.status(500).json({ error: 'Error de configuración del servidor: Clave de API no encontrada.' });
    }

    try {
        // Inicializa el cliente de la API de Gemini con la clave segura
        const genAI = new GoogleGenerativeAI(apiKey);
        // Usa el modelo gemini-2.0-flash, que es el que tu frontend está intentando usar
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Extrae el historial de conversación del cuerpo de la solicitud (enviado desde el frontend)
        const { chatHistory } = req.body;

        // Valida que el historial de chat sea un array y tenga el formato correcto
        if (!Array.isArray(chatHistory)) {
            return res.status(400).json({ error: 'Formato de chatHistory inválido.' });
        }

        // Inicia la conversación con el historial proporcionado
        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 2000, // Limita la longitud de la respuesta para evitar respuestas excesivamente largas
            },
        });

        // El último elemento en chatHistory es el mensaje del usuario actual
        const lastUserMessage = chatHistory[chatHistory.length - 1]?.parts[0]?.text;

        if (!lastUserMessage) {
            return res.status(400).json({ error: 'Mensaje de usuario no encontrado en el historial.' });
        }

        // Envía el mensaje del usuario al modelo y espera la respuesta
        const result = await chat.sendMessage(lastUserMessage);
        const response = await result.response;
        const text = response.text(); // Obtiene el texto de la respuesta del modelo

        // Devuelve la respuesta del modelo al frontend
        res.status(200).json({ text });

    } catch (error) {
        console.error("Error al llamar a la API de Gemini desde la función serverless:", error);
        // Devuelve un error genérico al frontend para no exponer detalles internos
        res.status(500).json({ error: 'Error interno del servidor al procesar la solicitud.' });
    }
}
