// Global state for the chat
let conversationHistory = [];
let currentPhase = 'Fase 0';
let userProfile = {}; // Stores collected user preferences/interests
let suggestedAreas = []; // To store areas suggested in Fase 4.2
let selectedArea = ''; // To store the area selected by the user
let expectingConfirmation = false; // New state to manage confirmation buttons

// Constants for emojis
const EMOJI_WELCOME = '👋';
const EMOJI_GUIDE_QUESTION = '🧭';
const EMOJI_IDEA_SUGGESTION = '💡';
const EMOJI_ACADEMIC_INFO = '🎓';
const EMOJI_SUMMARY_CONFIRMATION = '✅';
const EMOJI_REFLECTION = '🤔';
const EMOJI_PROFESSIONAL_CLARIFICATION = '⚖️';
const EMOJI_RESET = '🔄';

// UI Elements
const splashScreen = document.getElementById('splash-screen');
const chatContent = document.getElementById('chat-content');
const chatMessagesDiv = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const loadingIndicator = document.getElementById('loading-indicator');
const confirmationButtonsDiv = document.getElementById('confirmation-buttons');
const yesButton = document.getElementById('yes-button');
const noButton = document.getElementById('no-button');
const textInputContainer = document.getElementById('text-input-container');


// Function to display messages in the chat interface
const displayMessage = (message, sender) => {
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');
    if (sender === 'user') {
        messageBubble.classList.add('user-message');
    } else {
        messageBubble.classList.add('bot-message');
    }

    // Simple Markdown parsing for bold text (**)
    // This replaces **text** with <strong>text</strong>
    let parsedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Parse unordered list items (- Item)
    // This regex also handles nested unordered lists (e.g., "  - Sub-item")
    parsedMessage = parsedMessage.replace(/^( *)[*-] (.*)$/gm, (match, spaces, content) => {
        const indentLevel = spaces.length / 2; // Assuming 2 spaces per indent level
        return `<li style="margin-left: ${indentLevel * 1.5}rem;">${content}</li>`;
    });

    // Wrap top-level <li> elements in <ul> if they exist and are not already wrapped
    if (parsedMessage.includes('<li>') && !parsedMessage.includes('<ul>') && !parsedMessage.includes('<ol>')) {
        parsedMessage = `<ul>${parsedMessage}</ul>`;
    }

    // Parse ordered list items (1. Item)
    // This regex captures lines starting with a number followed by a dot and a space
    let orderedListHtml = '';
    const orderedListItems = parsedMessage.match(/^\d+\. (.*)$/gm);
    if (orderedListItems) {
        orderedListHtml = '<ol>';
        orderedListItems.forEach(item => {
            orderedListHtml += `<li>${item.replace(/^\d+\. /, '')}</li>`;
        });
        orderedListHtml += '</ol>';
        // Replace the original markdown list with the HTML list
        parsedMessage = parsedMessage.replace(/^\d+\. (.*)$/gm, '').trim(); // Remove original markdown list lines
        parsedMessage += orderedListHtml; // Append the new HTML ordered list
    }

    // Parse Markdown links [text](url)
    parsedMessage = parsedMessage.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-blue-600 hover:underline">$1</a>');


    messageBubble.innerHTML = parsedMessage; // Use innerHTML to render parsed Markdown
    chatMessagesDiv.appendChild(messageBubble);
    scrollToBottom();
};

// Function to scroll chat to the bottom
const scrollToBottom = () => {
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
};

// Function to show/hide confirmation buttons
const showConfirmationButtons = (show) => {
    if (show) {
        confirmationButtonsDiv.style.display = 'flex';
        textInputContainer.style.display = 'none'; // Hide regular input
        expectingConfirmation = true;
    } else {
        confirmationButtonsDiv.style.display = 'none';
        textInputContainer.style.display = 'flex'; // Show regular input
        expectingConfirmation = false;
    }
};

// Function to reset the conversation
const resetConversation = async () => {
    conversationHistory = [];
    currentPhase = 'Fase 0';
    userProfile = {};
    suggestedAreas = [];
    selectedArea = '';
    chatMessagesDiv.innerHTML = '';
    displayMessage(`${EMOJI_RESET} Reiniciando la conversación...`, 'bot');
    showConfirmationButtons(false); // Hide buttons on reset
    setTimeout(() => getBotResponse(''), 1000); // Start new conversation
};

// Function to send message
const sendMessage = async (buttonMessage = null) => {
    let message = buttonMessage || userInput.value.trim();
    if (message === '') return;

    displayMessage(message, 'user');
    conversationHistory.push({ text: message, sender: 'user' });
    userInput.value = '';
    sendButton.disabled = true; // Disable button while processing
    loadingIndicator.classList.add('active'); // Show loading indicator
    showConfirmationButtons(false); // Hide buttons after any message is sent

    // Check for reset command
    if (message.toLowerCase() === 'empezar de nuevo' || message.toLowerCase() === 'reset') {
        await resetConversation();
        sendButton.disabled = false;
        loadingIndicator.classList.remove('active');
        return;
    }

    await getBotResponse(message);
    sendButton.disabled = false;
    loadingIndicator.classList.remove('active');
};

// Function to get bot response from Gemini API (now via Vercel Serverless Function)
const getBotResponse = async (userMessage) => {
    let prompt = `
    Eres **Explora tu vocación con IA - Expo carreras 2026**, un asistente vocacional, diseñado para guiar a estudiantes de 5º y 6º año de la secundaria en la provincia de La Pampa, Argentina. Tu misión es facilitar un proceso de autodescubrimiento y reflexión que conecte la identidad personal del estudiante con la exploración de la oferta académica superior de manera accesible, clara y profesional. Eres una herramienta de apoyo para el primer paso de la orientación, no un reemplazo de un orientador humano.

    Tu personalidad es la de un guía paciente, alentador, curioso y objetivo. La interacción debe sentirse como una conversación estructurada pero natural, que genera confianza y seguridad.

    **Identidad Visual en el Texto:**
    Uso de Markdown: Emplea Markdown para jerarquizar y clarificar la información.
    Negrita: Usa negrita para resaltar conceptos clave, nombres de carreras o áreas de conocimiento.
    **Todas las preguntas que hagas, incluyendo las iniciales, deben estar en negrita.**
    Listas con Viñetas: Utiliza listas (con * o -) para presentar opciones, resúmenes y recomendaciones.
    Paleta de Emojis: Utiliza los siguientes emojis de forma sutil y consistente:
    👋 Bienvenida y Despedida
    🧭 Guía y Preguntas
    💡 Ideas y Sugerencias
    🎓 Información Académica
    ✅ Resúmenes y Confirmaciones
    🤔 Reflexión
    ⚖️ Aclaración Profesional
    🔄 Reinicio

    **Claridad y Accesibilidad:**
    Lenguaje Sencillo: Evita la jerga académica. Si usas un término como "tecnicatura" o "carrera de grado", explica brevemente la diferencia.
    Voseo Argentino: Utiliza siempre el "vos" de manera natural.
    Paciencia: Si una respuesta del usuario es ambigua ("no sé", "quizás"), responde con empatía y reformula la pregunta desde otro ángulo.
    **Si en algún momento me preguntás mi nombre, por favor, aclará que solo querés el nombre, sin el apellido.**

    **Base de Conocimiento y Prioridades:**
    Tu conocimiento sobre oferta académica debe seguir este orden estricto:
    1.  **Prioridad 1 (La Pampa):** Oferta de la UNLPam, Institutos Superiores (ISFD, etc.), públicos y privados, en La Pampa. Cubre tecnicaturas, carreras de grado y profesorados en todas sus modalidades.
        **Cuando te refieras al Instituto Tecnológico de Educación Superior de La Pampa, utiliza siempre el acrónimo ITES.**
    2.  **Prioridad 2 (Nacional Online):** Carreras a distancia de universidades nacionales reconocidas (ej. UBA XXI, UNQ Virtual, UNL Virtual).
    3.  **Prioridad 3 (Otras Provincias):** Carreras presenciales en otras provincias, solo si el estudiante expresa explícitamente su disposición a mudarse.

    **Flujo de Conversación y Lógica de Interacción:**
    Tu directriz principal es un diálogo paso a paso. Nunca hagas más de una pregunta a la vez.
    **El bot puede permitir saltar preguntas o profundizar según el interés del usuario.**
    **Es deseable que el bot no etiquete prematuramente al estudiante (evitar "sos más humanista" o "sos técnico"), sino que devuelva insumos reflexivos.**

    **Contexto de la conversación actual:**
    Fase actual: ${currentPhase}
    Perfil del estudiante (hasta ahora): ${JSON.stringify(userProfile, null, 2)}
    Áreas sugeridas (si aplica): ${JSON.stringify(suggestedAreas)}
    Área seleccionada (si aplica): ${selectedArea}
    Mensaje del usuario: "${userMessage}"

    **Instrucciones para la próxima respuesta (basadas en la fase actual y el mensaje del usuario):**
    **Importante: Evita repetir la información que el estudiante acaba de mencionar, a menos que sea para un resumen explícito de confirmación (Fase 3.1). Sé lo más sintético posible en tus respuestas.**

    `;

    // Append specific instructions based on the current phase
    switch (currentPhase) {
        case 'Fase 0':
            prompt += `
            **Paso 0.1:** ${EMOJI_WELCOME} Hola, soy **Explora tu vocación, tu asistente virtual en la Expo Carreras 2026**.
            Importante: Este asistente fue diseñado con Inteligencia Artificial (IA) para acompañarte en la exploración de tus intereses y posibles caminos formativos. No reemplaza el asesoramiento personalizado de profesionales en orientación vocacional. Puede contener errores o interpretaciones limitadas. Te recomendamos complementar esta experiencia con espacios de reflexión, diálogo y consulta humana.
            **Pregunta:** **¿Qué actividades te entusiasman o te hacen perder la noción del tiempo cuando las hacés?**
            `;
            break;
        case 'Fase 1.1': // This phase now handles the response to the initial question
            // User just responded to the initial welcome+question, now transition to the next logical step.
            // No new question is asked by the bot in this prompt, as the previous phase already asked the first question.
            // The updatePhase function will handle the transition to Fase 1.2
            prompt += `
            El usuario acaba de responder a la pregunta inicial: "${userMessage}".
            Analiza su respuesta.
            Si la respuesta es muy breve, general, o parece que el usuario necesita más ideas (ej. 'no sé', 'muchas cosas', 'lo normal'), entonces **brinda los ejemplos detallados**: "Por ejemplo, editar videos, reparar cosas, ayudar a otros, escribir historias, programar juegos, cuidar plantas, diseñar ropa, investigar temas de ciencia, practicar deportes, organizar eventos o aprender idiomas, entre muchas otras." Y luego, **reformula la pregunta inicial de forma alentadora** para que el usuario pueda expandirse.
            Si la respuesta es clara y específica, entonces **continúa el diálogo en forma natural** y pasa a la siguiente pregunta de la secuencia (Paso 1.2).
            `;
            userProfile.actividades_ocio = userMessage; // Store response from previous phase
            break;
        case 'Fase 1.2':
            prompt += `
            **Paso 1.2:** ${EMOJI_GUIDE_QUESTION} **¿Qué materias o temas del colegio disfrutás más y por qué? ¿Y alguna que te guste menos? Contame un poco por qué.**
            `;
            userProfile.materias_gusto = userMessage;
            break;
        case 'Fase 1.3':
            prompt += `
            **Paso 1.3:** ${EMOJI_GUIDE_QUESTION} **Si pudieras elegir un proyecto o causa en la que trabajar durante un año, ¿cuál sería y qué rol te gustaría tener?**
            `;
            userProfile.proyecto_causa = userMessage;
            break;
        case 'Fase 1.4':
            prompt += `
            **Paso 1.4:** ${EMOJI_GUIDE_QUESTION} **¿Preferís trabajar en contacto con personas, con ideas, con tecnologías, con la naturaleza o con objetos físicos?**
            `;
            userProfile.preferencia_contacto = userMessage;
            break;
        case 'Fase 2.1':
            prompt += `
            **Paso 2.1:** ${EMOJI_GUIDE_QUESTION} **¿Te imaginás trabajando en un mismo lugar todos los días o preferís cambiar de espacios, moverte, viajar?**
            `;
            userProfile.estilo_lugar_trabajo = userMessage;
            break;
        case 'Fase 2.2':
            prompt += `
            **Paso 2.2:** ${EMOJI_GUIDE_QUESTION} **¿Qué te gustaría que las personas valoren de tu trabajo en el futuro?**
            `;
            userProfile.valores_trabajo = userMessage;
            break;
        case 'Fase 2.3':
            prompt += `
            **Paso 2.3:** ${EMOJI_GUIDE_QUESTION} **¿Ya conocés algunas carreras, tecnicaturas u oficios que te llamen la atención? ¿Querés que te comparta información sobre ellas o sobre cómo seguir explorando?**
            `;
            userProfile.carreras_preexistentes = userMessage;
            break;
        case 'Fase 3.1': // This phase is now the "Resumen General"
            prompt += `
            **Paso 3.1:** ${EMOJI_SUMMARY_CONFIRMATION} Resumen General. Pide validación final del perfil completo.
            Genera un resumen conciso del perfil del estudiante, incluyendo sus actividades de ocio, materias favoritas/menos favoritas, proyecto/causa ideal, preferencia de contacto en el trabajo, estilo de lugar de trabajo y valores en el trabajo.
            **Pregunta:** **¿Es correcto este resumen de tu perfil?**
            **Añade al final de tu respuesta el marcador oculto: ---CONFIRMAR_SI_NO---**
            `;
            userProfile.confirmacion_perfil = userMessage; // Store confirmation
            break;
        case 'Fase 3.2': // This phase now handles the logistical filter, after profile confirmation
            prompt += `
            **Paso 3.2:** ${EMOJI_GUIDE_QUESTION} Para afinar las opciones, **¿preferís quedarte en La Pampa, te interesa estudiar a distancia (online), o estarías dispuesto/a a mudarte a otra provincia?**
            `;
            userProfile.preferencias_logisticas = userMessage; // Store logistical preference
            break;
        case 'Fase 4.1': // This phase suggests areas based on the profile and logistical preference
            prompt += `
            **Paso 4.1:** ${EMOJI_IDEA_SUGGESTION} Sugiere de 2 a 3 Áreas de Conocimiento y pregunta cuál explorar.
            Basado en el perfil completo del estudiante y su preferencia logística (${userProfile.preferencias_logisticas}), sugiere 2 o 3 áreas de conocimiento generales (ej. Ciencias de la Salud, Tecnología, Artes y Diseño, Ciencias Sociales, Educación, Ciencias Agrarias).
            **Asegúrate de que estas áreas estén formateadas como una lista con viñetas (ej. * Área 1).**
            **Pregunta al estudiante cuál de esas áreas le gustaría explorar primero.**
            **IMPORTANTE:** Guarda las áreas sugeridas en la variable 'suggestedAreas' para referencia futura.
            `;
            userProfile.preferencias_logisticas = userMessage; // Store logistical preference
            break;
        case 'Fase 4.2': // This phase is triggered when user selects an area
            prompt += `
            **Paso 4.2:** ${EMOJI_ACADEMIC_INFO} Proporciona un listado de carreras específicas del área elegida.
            El usuario ha elegido el área: "${userMessage}".
            Ahora, lista de 3 a 5 carreras específicas dentro de esa área, siguiendo el orden de prioridad de conocimiento (La Pampa > Nacional Online > Otras Provincias si aplica).
            Para cada carrera, menciona brevemente si es una **tecnicatura**, **carrera de grado** o **profesorado**, y si es **presencial** u **online**.
            **Asegúrate de que la respuesta esté estructurada con viñetas para cada institución, y viñetas anidadas para las carreras debajo de cada institución, incluyendo un enlace al sitio oficial si es posible. Ejemplo:**
            **Ejemplo de formato:**
            * Universidad Nacional de La Pampa (UNLPam):
                * Ingeniería en Sistemas: (descripción breve) [Enlace al sitio oficial]
                * Profesorado en Computación: (descripción breve) [Enlace al sitio oficial]
            * Instituto Tecnológico de Educación Superior de La Pampa (ITES):
                * Tecnicatura Superior en Desarrollo de Software: (descripción breve) [Enlace al sitio oficial]
                * Tecnicatura Superior en Redes Informáticas: (descripción breve) [Enlace al sitio oficial]
            **Si el usuario no eligió una de las áreas sugeridas, pídele que elija una de las opciones o que aclare su interés.**
            `;
            selectedArea = userMessage; // Store the selected area
            break;
        case 'Fase 4.3': // This phase is now the reflection on options
            prompt += `
            **Paso 4.3:** ${EMOJI_REFLECTION} Plantea una pregunta abierta para fomentar la reflexión sobre las opciones.
            Ejemplo: "De estas carreras que te mencioné, ¿hay alguna que te genere más curiosidad o que te llame la atención? ¿Por qué?"
            **Asegúrate de que esta pregunta esté en negrita.**
            `;
            userProfile.carreras_sugeridas_area = userMessage; // Store the list of careers suggested by the bot
            break;
        case 'Fase 4.4': // This phase is now offering to deepen
            prompt += `
            **Paso 4.4:** Ofrece profundizar en la carrera que más le interesó (materias, duración, etc.).
            El usuario ha expresado interés en: "${userMessage}".
            **Pregunta si quiere que profundices en esa carrera (ej. materias principales, duración aproximada, perfil del egresado, dónde se estudia).**
            `;
            userProfile.carrera_interes_fase4 = userMessage;
            break;
        case 'Fase 5.1': // This phase is now asking to explore more or close
            prompt += `
            **Paso 5.1:** Pregunta si quiere explorar otra de las áreas sugeridas o si tiene alguna otra duda.
            Recuerda las áreas sugeridas previamente: ${JSON.stringify(suggestedAreas)}.
            **Asegúrate de que esta pregunta esté en negrita.**
            `;
            userProfile.profundizacion_carrera = userMessage;
            break;
        case 'Fase 5.2': // This phase is now the final summary and next steps
            prompt += `
            **Paso 5.2:** Para cerrar, ofrece un resumen de las conclusiones y sugiere los próximos pasos prácticos (visitar sitios web, buscar testimonios, etc.).
            Importante: Este asistente fue diseñado con Inteligencia Artificial para acompañarte en la exploración de tus intereses y posibles caminos formativos. No reemplaza el asesoramiento personalizado de profesionales en orientación vocacional. Puede contener errores o interpretaciones limitadas. Te recomendamos complementar esta experiencia con espacios de reflexión, diálogo y consulta humana.
            Si el usuario quiere explorar otra área, vuelve a la Fase 4.2 (anteriormente 4.3) con la nueva área. Si tiene otra duda, responde la duda. Si quiere cerrar, procede con el resumen y los próximos pasos.
            `;
            userProfile.exploracion_adicional = userMessage;
            break;
        case 'Fase 5.3': // This phase is now the disclaimer
            prompt += `
            **Paso 5.3:** ${EMOJI_PROFESSIONAL_CLARIFICATION} Aclaración Final Importante.
            Incluye siempre la siguiente aclaración, presentada de forma destacada:
            "**Aclaración Importante:** Recordá que soy una herramienta de inteligencia artificial diseñada para darte ideas y servir como un primer paso en tu exploración. Este diálogo es un excelente punto de partida, pero no sustituye el valioso criterio, la escucha y el acompañamiento personalizado de un profesional de la orientación vocacional. Te animo a conversar sobre estas ideas con un psicólogo/a o psicopedagogo/a de tu confianza para tomar la decisión final más informada."
            Luego, procede al Paso 5.4.
            `;
            userProfile.cierre_confirmado = userMessage;
            break;
        case 'Fase 5.4': // This phase is now the reset option
            prompt += `
            **Paso 5.4:** ${EMOJI_RESET} Ofrece la opción de reseteo. Presenta la instrucción de forma clara, como un enlace de texto.
            Texto: "Si en algún momento querés volver a explorar todo desde cero con otras ideas, podés hacerlo. Para eso, simplemente escribí la frase **empezar de nuevo**."
            Luego, procede al Paso 5.5.
            `;
            break;
        case 'Fase 5.5': // This phase is now the farewell
            prompt += `
            **Paso 5.5:** Ahora sí, despídete con un mensaje alentador y el emoji ${EMOJI_WELCOME}.
            Ejemplo: "¡Fue un gusto conversar con vos! Te deseo mucho éxito en tu búsqueda y en el camino que elijas. ¡Hasta la próxima! 👋"
            `;
            break;
        case 'Fase 5.6':
            // End of conversation, or user might restart
            // No phase change, waiting for reset command
            break;
        default:
            console.warn("Unhandled phase transition:", current);
            break;
    }

    // Add previous conversation history to the prompt for context
    let chatHistory = [];
    conversationHistory.forEach(msg => {
        chatHistory.push({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] });
    });
    // Agrega el prompt final como el último mensaje del usuario para el modelo
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });

    try {
        // La URL ahora apunta a tu propia función serverless en Vercel
        const apiUrl = '/api/gemini'; // Ruta relativa a tu aplicación en Vercel

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Envía el historial de chat completo a la función serverless
            body: JSON.stringify({ chatHistory: chatHistory })
        });

        const result = await response.json();

        // Si la función serverless devuelve un error (ej. por clave API no encontrada)
        if (response.status !== 200) {
            console.error("Error de la función serverless:", result.error);
            displayMessage("Disculpá, hubo un problema en el servidor. Por favor, intentá de nuevo más tarde o verificá la configuración de la API Key en Vercel.", 'bot');
            return; // Salir para no procesar como respuesta exitosa
        }

        // Si la respuesta es exitosa, el texto viene en result.text
        if (result.text) {
            let botResponse = result.text;

            // Check for the hidden marker to show confirmation buttons
            if (botResponse.includes('---CONFIRMAR_SI_NO---')) {
                botResponse = botResponse.replace('---CONFIRMAR_SI_NO---', '').trim(); // Remove marker
                setTimeout(() => showConfirmationButtons(true), 300); // Show buttons with a slight delay
            } else {
                showConfirmationButtons(false); // Ensure buttons are hidden if not a confirmation
            }

            displayMessage(botResponse, 'bot');
            conversationHistory.push({ text: botResponse, sender: 'bot' });

            // Update phase based on currentPhase and expected user input
            updatePhase(currentPhase, userMessage, botResponse);

        } else {
            console.error("Estructura de respuesta inesperada de la función serverless:", result);
            displayMessage("Disculpá, no pude generar una respuesta. Hubo un problema con la respuesta del modelo.", 'bot');
        }
    } catch (error) {
        console.error("Error al llamar a la función serverless:", error);
        // Mensaje de error más específico para problemas de red o de la función serverless
        displayMessage("Disculpá, no pude generar una respuesta. Parece haber un problema de conexión o con el servidor. Por favor, intentá de nuevo.", 'bot');
    }
};

// Function to update the conversation phase
const updatePhase = (current, userMsg, botResponse) => {
    switch (current) {
        case 'Fase 0': // After Q1 (actividades ocio)
            currentPhase = 'Fase 1.1'; // Now, Fase 1.1 will process the response and potentially ask Q2 (materias)
            break;
        case 'Fase 1.1': // After Q1 (actividades ocio) and bot's conditional response
            // If bot provided examples, user's next response is still for Q1.
            // If bot moved on, user's response is for Q2.
            // The LLM's response in Fase 1.1 will dictate the next state.
            // We need to check if the bot's response in Fase 1.1 contained examples or moved to Q1.2
            if (botResponse.includes('Por ejemplo, editar videos')) { // Simple check for example text
                currentPhase = 'Fase 1.1'; // Stay in Fase 1.1 if examples were given, waiting for better response to Q1
            } else {
                currentPhase = 'Fase 1.2'; // Move to Fase 1.2 (Q2) if bot moved on
            }
            break;
        case 'Fase 1.2': // After Q2 (materias)
            currentPhase = 'Fase 1.3'; // Next is Q3 (proyecto/causa)
            break;
        case 'Fase 1.3': // After Q3 (proyecto/causa)
            currentPhase = 'Fase 1.4'; // Next is Q4 (preferencia contacto)
            break;
        case 'Fase 1.4': // After Q4 (preferencia contacto)
            currentPhase = 'Fase 2.1'; // Next is Q5 (estilo lugar trabajo)
            break;
        case 'Fase 2.1': // After Q5 (estilo lugar trabajo)
            currentPhase = 'Fase 2.2'; // Next is Q6 (valores trabajo)
            break;
        case 'Fase 2.2': // After Q6 (valores trabajo)
            currentPhase = 'Fase 2.3'; // Next is Q7 (carreras preexistentes)
            break;
        case 'Fase 2.3': // After Q7 (carreras preexistentes)
            currentPhase = 'Fase 3.1'; // Next is Logistical filter (Pampa, online, mudarse)
            break;
        case 'Fase 3.1': // After Logistical filter (Pampa, online, mudarse)
            // If user confirms summary, move to 4.1 (suggest areas), else stay in 3.1 for clarification
            if (userMsg.toLowerCase().includes('sí') || userMsg.toLowerCase().includes('correcto') || userMsg.toLowerCase().includes('si')) {
                currentPhase = 'Fase 4.1'; // Transition to suggest areas
            } else {
                currentPhase = 'Fase 3.1'; // Re-ask for clarification
            }
            break;
        case 'Fase 3.2': // This phase is now the overall profile summary and confirmation
            currentPhase = 'Fase 3.1'; // Loop back to summary if not confirmed, or proceed to 4.1 if confirmed
            break; // This case should not be hit if 3.1 handles the confirmation logic.
        case 'Fase 4.1': // After profile summary confirmation, suggests areas
            currentPhase = 'Fase 4.2'; // Next is list specific careers
            break;
        case 'Fase 4.2': // After selecting an area, lists specific careers
            currentPhase = 'Fase 4.3'; // Next is reflection on options
            break;
        case 'Fase 4.3': // After reflection, offers to deepen
            currentPhase = 'Fase 4.4'; // Next is offering to deepen
            break;
        case 'Fase 4.4': // After offering to deepen
            currentPhase = 'Fase 5.1'; // Next is asking to explore more or close
            break;
        case 'Fase 5.1': // After asking to explore more or close
            currentPhase = 'Fase 5.2'; // Next is final summary and next steps
            break;
        case 'Fase 5.2': // After final summary and next steps
            currentPhase = 'Fase 5.3'; // Next is disclaimer
            break;
        case 'Fase 5.3': // After disclaimer
            currentPhase = 'Fase 5.4'; // Next is reset option
            break;
        case 'Fase 5.4': // After reset option
            currentPhase = 'Fase 5.5'; // Next is farewell
            break;
        case 'Fase 5.5': // Farewell
            currentPhase = 'Fase 5.6'; // End state, waiting for reset command
            break;
        case 'Fase 5.6':
            // End of conversation, or user might restart
            // No phase change, waiting for reset command
            break;
        default:
            console.warn("Unhandled phase transition:", current);
            break;
    }
};

// Event Listeners
sendButton.addEventListener('click', () => sendMessage());
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
yesButton.addEventListener('click', () => sendMessage('Sí'));
noButton.addEventListener('click', () => sendMessage('No'));


// Initial setup on window load
window.onload = () => {
    // Hide splash screen and show chat content after a short delay
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        chatContent.classList.add('visible');
        setTimeout(() => getBotResponse(''), 500); // Trigger welcome message after splash fades
    }, 4000); // Display splash screen for 4 seconds
};
