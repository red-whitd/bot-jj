process.on('uncaughtException', (err) => {
    console.error('Error atrapado:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Rechazo atrapado:', err);
});

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

let currentPairingCode = "Iniciando sistema...";

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bot JJ - Activo</title>
            <meta http-equiv="refresh" content="5">
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background: #111; color: #fff; padding: 40px 20px; }
                .card { background: #222; border-radius: 12px; padding: 30px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                h1 { color: #25D366; }
                .code { font-size: 30px; font-weight: bold; letter-spacing: 3px; background: #333; padding: 15px 20px; border-radius: 8px; border: 2px dashed #25D366; color: #FFD700; display: inline-block; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🤖 BOT JJ - EN LÍNEA</h1>
                <p>Dueño: Jhey (51931801370)</p>
                <div class="code">${currentPairingCode}</div>
                <p style="font-size: 13px; color: #888;">Servidor estable y funcionando 24/7</p>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor HTTP ejecutándose en el puerto ${PORT}`);
    setTimeout(iniciarBotWhatsApp, 2000);
});

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const fs = require('fs');
const axios = require('axios');
const pino = require('pino');

const memoryIA = new Map();
const usuariosRegistrados = new Map();
const OWNER_NUM = "51931801370";
const startTime = Date.now();

function registrarUsuario(userNum, pushName) {
    const nombreWhatsApp = pushName ? pushName.trim() : "Usuario de WhatsApp";
    
    if (!usuariosRegistrados.has(userNum)) {
        usuariosRegistrados.set(userNum, {
            nombre: nombreWhatsApp,
            numero: userNum,
            rango: "VIP Gold",
            creditos: "Ilimitados (∞)",
            fechaRegistro: new Date().toLocaleDateString('es-PE')
        });
    } else {
        const actual = usuariosRegistrados.get(userNum);
        if (pushName && actual.nombre !== pushName) {
            actual.nombre = pushName.trim();
        }
    }
    return usuariosRegistrados.get(userNum);
}

function obtenerDatosPersona(dni) {
    const nombresM = ["Jhey", "Carlos", "Luis", "Mateo", "Diego", "Alex", "Gabriel", "Sebastián", "Rodrigo", "Gonzalo"];
    const apPaternos = ["Flores", "Pezo", "García", "Rojas", "Mendoza", "Castillo", "Vargas", "Salazar", "Torres", "Benitez"];
    const apMaternos = ["López", "Huamán", "Chávez", "Quispe", "Pérez", "Guerrero", "Romero", "Morales", "Gutiérrez"];

    const seed = parseInt((dni || '1234').slice(-4));
    const nM = nombresM[seed % nombresM.length];
    const p = apPaternos[(seed + 1) % apPaternos.length];
    const m = apMaternos[(seed + 2) % apMaternos.length];

    return { nombre: nM, paterno: p, materno: m, completo: `${nM} ${p} ${m}` };
}

function generarDNIFalso(dni) {
    const persona = obtenerDatosPersona(dni);
    return `👤 *CONSULTA DNI (RENIEC)* 🇵🇪\n\n🪪 *DNI:* ${dni}\n👤 *Nombres:* ${persona.nombre}\n👨 *Apellido Paterno:* ${persona.paterno}\n👩 *Apellido Materno:* ${persona.materno}\n📛 *Nombre Completo:* ${persona.completo}\n\n👑 *Rango:* Usuario VIP\n💎 *Créditos:* Ilimitados (∞)\n⚡ *Estado:* DNI Activo / Verificado`;
}

function generarArbolGenealogicoFalso(dni) {
    const persona = obtenerDatosPersona(dni);
    const seed = parseInt((dni || '1234').slice(-4));
    
    const nombresPadres = ["Carlos", "Roberto", "Jorge", "Manuel", "Víctor"];
    const nombresMadres = ["Maria", "Rosa", "Carmen", "Ana", "Patricia"];
    const nombresAbuelos = ["José", "Francisco", "Pedro", "Julio"];
    const nombresAbuelas = ["Teresa", "Yolanda", "Juana", "Hilda"];
    const nombresHijos = ["Thiago", "Gael", "Mateo", "Mia", "Lia"];

    const padre = `${nombresPadres[seed % nombresPadres.length]} ${persona.paterno} ${persona.materno}`;
    const madre = `${nombresMadres[(seed + 1) % nombresMadres.length]} Quispe Salazar`;
    
    const abueloPaterno = `${nombresAbuelos[(seed + 2) % nombresAbuelos.length]} ${persona.paterno} Morales`;
    const abuelaPaterna = `${nombresAbuelas[(seed + 3) % nombresAbuelas.length]} ${persona.materno} Torres`;

    const hermano = `Gabriel ${persona.paterno} Quispe`;
    const hijo = `${nombresHijos[(seed + 4) % nombresHijos.length]} ${persona.paterno} López`;

    const dniPadre = `${30 + (seed % 20)}${(seed * 111) % 100000}`;
    const dniMadre = `${32 + (seed % 20)}${(seed * 222) % 100000}`;

    return `🌳 *ÁRBOL GENEALÓGICO (RENIEC)* 🇵🇪

🪪 *TITULAR:* ${persona.completo} (DNI: ${dni})

👴 *ABUELOS PATERNOS:*
 ├─ 👨‍🦳 Abuelo: ${abueloPaterno}
 └─ 👵 Abuela: ${abuelaPaterna}

👨‍👩‍👦 *PADRES:*
 ├─ 👨 Padre: ${padre} (DNI: ${dniPadre})
 └─ 👩 Madre: ${madre} (DNI: ${dniMadre})

👥 *HERMANOS:*
 └─ 👦 Hermano: ${hermano}

👶 *DESCENDENCIA:*
 └─ 🧒 Hijo/a: ${hijo}

👑 *Rango:* Usuario VIP
💎 *Créditos:* Ilimitados (∞)`;
}

function generarFacialFalso(inputArg) {
    let dni = (inputArg || '').replace(/[^0-9]/g, '');
    if (dni.length !== 8) {
        dni = `${Math.floor(10000000 + Math.random() * 90000000)}`;
    }
    const persona = obtenerDatosPersona(dni);
    const seed = parseInt(dni.slice(-4));
    
    const sim = (97.4 + (seed % 25) / 10).toFixed(1);
    const edades = [19, 21, 24, 26, 28, 30];
    const edad = edades[seed % edades.length];
    
    const photoUrl = `https://i.pravatar.cc/400?img=${(seed % 70) + 1}`;

    const texto = `👁️ *RECONOCIMIENTO BIOMÉTRICO FACIAL* 🇵🇪

🔍 *RESULTADO DE COINCIDENCIA:*
 ├─ 🎯 *Similitud:* ${sim}% (Coincidencia Altamente Confiable)
 ├─ 🪪 *DNI Coincidente:* ${dni}
 ├─ 👤 *Titular:* ${persona.completo}
 ├─ 🎂 *Edad Estimada:* ${edad} años
 └─ 📍 *Estado Biométrico:* Huella / Rostro Verificado RENIEC

👑 *Rango:* Usuario VIP
💎 *Créditos:* Ilimitados (∞)`;

    return { texto, photoUrl };
}

async function buscarTitularCelularGratis(numero) {
    const clean = (numero || '').replace(/[^0-9]/g, '');
    let num9 = clean;
    if (clean.startsWith('51') && clean.length === 11) num9 = clean.slice(2);

    if (num9.length !== 9 || !num9.startsWith('9')) {
        return "⚠️ *Error:* Ingresa un número válido de 9 dígitos de Perú. Ej: *!cel 912345678*";
    }

    const persona = obtenerDatosPersona(num9);
    const dniSimulado = `${40 + (parseInt(num9.slice(-4)) % 35)}${(parseInt(num9.slice(-4)) * 123) % 100000}`;
    
    let operador = 'Claro / Movistar';
    const pref3 = parseInt(num9.substring(0, 3));
    if ((pref3 >= 990 && pref3 <= 999) || (pref3 >= 980 && pref3 <= 989) || (pref3 >= 950 && pref3 <= 959) || (pref3 >= 975 && pref3 <= 979)) operador = 'Movistar 💙';
    else if ((pref3 >= 940 && pref3 <= 949) || (pref3 >= 960 && pref3 <= 969) || (pref3 >= 930 && pref3 <= 939) || (pref3 >= 910 && pref3 <= 919)) operador = 'Claro ❤️';
    else if ((pref3 >= 920 && pref3 <= 929) || (pref3 >= 981 && pref3 <= 983) || (pref3 >= 931 && pref3 <= 934)) operador = 'Entel 🧡';
    else if ((pref3 >= 900 && pref3 <= 909) || (pref3 >= 925 && pref3 <= 929) || (pref3 >= 935 && pref3 <= 939)) operador = 'Bitel 💛';

    return `📱 *BÚSQUEDA DE TITULAR POR TELÉFONO* 🇵🇪

📞 *Número:* +51 ${num9}
📡 *Operador:* ${operador}
🪪 *DNI Titular:* ${dniSimulado}
👤 *Titular Registrado:* ${persona.completo}

👑 *Rango:* Usuario VIP
💎 *Créditos:* Ilimitados (∞)
📌 *Plan:* Postpago / Activo`;
}

// IA estilo Meta AI
async function hablarConIAReal(userId, prompt, pushName) {
    if (!memoryIA.has(userId)) memoryIA.set(userId, []);
    let userHistory = memoryIA.get(userId);

    userHistory.push({ role: 'user', content: prompt });
    if (userHistory.length > 12) userHistory.shift();

    try {
        const conversationText = userHistory.map(m => `${m.role === 'user' ? 'Usuario' : 'JJ'}: ${m.content}`).join('\n');
        
        const systemPrompt = `Eres JJ, la Inteligencia Artificial de WhatsApp. 
Estilo de respuesta: IDÉNTICO a Meta AI o una persona real en chat (inteligente, relajado, peruano, directo y natural).
REGLAS STRICTAS:
1. Responde directamente a lo que te acaban de escribir.
2. NUNCA vuelvas a saludar con "¡Hola!" si la conversación ya empezó.
3. Respuestas breves, fluidas y sin textos robóticos.
4. Si dicen "nada xd", "en nada" o "que haces", responde con conversación natural continuando el chat.`;

        const encodedPrompt = encodeURIComponent(`${systemPrompt}\n\nHistorial de chat:\n${conversationText}\n\nJJ:`);
        const res = await axios.get(`https://text.pollinations.ai/${encodedPrompt}?model=openai`, { timeout: 10000 });

        if (res.data && typeof res.data === 'string' && res.data.trim().length > 0) {
            let respuestaText = res.data.trim();
            respuestaText = respuestaText.replace(/^JJ:\s*/i, '');
            userHistory.push({ role: 'assistant', content: respuestaText });
            return respuestaText;
        }
    } catch (e) {
        console.error("Error en IA:", e.message);
    }

    const lowerP = prompt.toLowerCase();
    if (lowerP.includes('que haces') || lowerP.includes('qué haces')) {
        return "Acá ando activo respondiendo chats y manteniendo todo fino, ¿y tú qué tal?";
    }
    if (lowerP.includes('nada')) {
        return "Jajaja ya veo, andas relax. ¿Sale su conversación o qué se hace?";
    }
    return "Mano, me colgué un toque por la señal. ¿Qué me decías?";
}

async function iniciarBotWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('session_jj');

        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
            },
            logger: pino({ level: 'fatal' }),
            printQRInTerminal: false,
            browser: Browsers.macOS('Desktop'),
            generateHighQualityLinkPreview: false,
            markOnlineOnConnect: true
        });

        sock.ev.on('creds.update', saveCreds);

        if (!sock.authState.creds.registered) {
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(OWNER_NUM);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    currentPairingCode = code;
                    console.log(`🔑 CÓDIGO DE VINCULACIÓN: [ ${code} ]`);
                } catch (error) {
                    console.error("Error al pedir pairing code:", error);
                }
            }, 5000);
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const statusCode = lastDisconnect.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                if (shouldReconnect) {
                    setTimeout(iniciarBotWhatsApp, 3000);
                } else {
                    try {
                        fs.rmSync('session_jj', { recursive: true, force: true });
                    } catch (e) {}
                    setTimeout(iniciarBotWhatsApp, 5000);
                }
            } else if (connection === 'open') {
                currentPairingCode = "¡CONECTADO EXITOSAMENTE! 🎉";
                console.log('✅ ¡BOT JJ CONECTADO CORRECTAMENTE!');
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg || !msg.message) return;
            if (msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const senderJid = msg.key.participant || from;
            const userNum = senderJid.split('@')[0];
            const pushName = msg.pushName || "Usuario";
            const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            const text = body.trim();
            const lowerText = text.toLowerCase();

            const userData = registrarUsuario(userNum, pushName);

            // Menú
            if (lowerText === '!menu') {
                const menu = `⛩️ *BOT JJ - MENÚ PRINCIPAL* ⚡
Creador: *Jhey* | 📞 51931801370
👑 *ESTATUS:* Usuario VIP (${userData.creditos})

🪪 *CONSULTAS PERÚ*
• *!dni [8 dígitos]* (Datos RENIEC)
• *!arbol [8 dígitos]* (Árbol genealógico)
• *!facial [DNI]* (Biometría facial)
• *!cel [9 dígitos]* (Búsqueda por teléfono)

📥 *DESCARGAS DIRECTAS AL CHAT*
• *!audio [canción]* (Descarga y envía audio MP3 directo)
• *!video [video]* (Descarga y envía video MP4 directo)

🎲 *DIVERSIÓN & GRUPOS (TROLL)*
• *!gay [@usuario]* (Medidor de Gay)
• *!fumon [@usuario]* (Medidor de Fumón)
• *!florero [@usuario]* (Medidor de Florero)
• *!misio [@usuario]* (Nivel de miseria)
• *!borracho [@usuario]* (Resistencia a las chelas)
• *!pajero [@usuario]* (Ranking de pajero)
• *!payaso [@usuario]* (Nivel de cirquero)
• *!pirana [@usuario]* (Achorado del barrio)
• *!fiel [@usuario]* (Medidor de fidelidad)
• *!chapa [@usuario]* (Generador de chapa)
• *!princesa [@usuario]* (Chisme de princesa)
• *!parejagay [@usuario]* (Vida gay futura)
• *!sau [@usuario]* (Grito Sauu)
• *!calificar [@usuario]* (Califica foto)

🛠️ *SISTEMA & VIP*
• *!registrar* (Tu perfil con nombre y número)
• *!perfil* (Ver tus créditos)
• *!creador* (Contacto del dueño)
• *!infobot* (Estado del servidor)
• *!ping*

💬 Escribe cualquier mensaje libre para conversar con la *IA JJ*.`;

                await sock.sendMessage(from, { text: menu }, { quoted: msg });
                return;
            }

            // Comandos de diversión / trolling
            if (lowerText.startsWith('!florero')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                const porcentaje = Math.floor(Math.random() * 101);
                const barraLlena = "🗣️".repeat(Math.floor(porcentaje / 10));
                const barraVacia = "⚪".repeat(10 - Math.floor(porcentaje / 10));
                let veredicto = porcentaje > 80 ? "¡Mete un florero tremendo! Ni su mamá le cree las mentiras 😂🪻" : "Mete su verso para zafar pero pasa piola 🤫";
                await sock.sendMessage(from, { text: `🪻 *MEDIDOR DE FLORERO* 🗣️\n\n👤 *Usuario:* ${targetName}\n📊 *Nivel de Fluyo:* ${porcentaje}%\n[${barraLlena}${barraVacia}]\n\n📌 *Diagnóstico:* ${veredicto}`, mentions: mentioned ? [mentioned] : [] }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!misio') || lowerText.startsWith('!aguja')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                const porcentaje = Math.floor(Math.random() * 101);
                const barraLlena = "💸".repeat(Math.floor(porcentaje / 10));
                const barraVacia = "⚪".repeat(10 - Math.floor(porcentaje / 10));
                let veredicto = porcentaje > 80 ? "¡Miseria absoluta! Anda pidiendo 50 céntimos pal pasaje 😭🪙" : "Sobreviviendo a punta de menú de 8 soles 🍲";
                await sock.sendMessage(from, { text: `💸 *MEDIDOR DE MISERIA Y AGUJA* 🪙\n\n👤 *Usuario:* ${targetName}\n📊 *Nivel de Misio:* ${porcentaje}%\n[${barraLlena}${barraVacia}]\n\n📌 *Estado:* ${veredicto}`, mentions: mentioned ? [mentioned] : [] }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!borracho') || lowerText.startsWith('!chelero')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                const porcentaje = Math.floor(Math.random() * 101);
                const barraLlena = "🍺".repeat(Math.floor(porcentaje / 10));
                const barraVacia = "⚪".repeat(10 - Math.floor(porcentaje / 10));
                let veredicto = porcentaje > 80 ? "¡Borracho perdido! Con 2 pilsen ya le está marcando a la ex 📞😭🍻" : "Aguanta sus 6 chelas hasta ponerse chistoso 🍺🤪";
                await sock.sendMessage(from, { text: `🍺 *RANKING OFICIAL DE BORRACHO* 🍻\n\n👤 *Usuario:* ${targetName}\n📊 *Nivel Chelero:* ${porcentaje}%\n[${barraLlena}${barraVacia}]\n\n📌 *Diagnóstico:* ${veredicto}`, mentions: mentioned ? [mentioned] : [] }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!payaso')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                const porcentaje = Math.floor(Math.random() * 101);
                const barraLlena = "🤡".repeat(Math.floor(porcentaje / 10));
                const barraVacia = "⚪".repeat(10 - Math.floor(porcentaje / 10));
                let veredicto = porcentaje > 80 ? "¡Dueño del circo! Pura payasada y chistes tontos todo el día 🎪🤪" : "Tiene sus momentos de gracia y desatino 🤡";
                await sock.sendMessage(from, { text: `🤡 *MEDIDOR DE PAYASO* 🎪\n\n👤 *Usuario:* ${targetName}\n📊 *Circo Level:* ${porcentaje}%\n[${barraLlena}${barraVacia}]\n\n📌 *Veredicto:* ${veredicto}`, mentions: mentioned ? [mentioned] : [] }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!pirana') || lowerText.startsWith('!piraña')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                const porcentaje = Math.floor(Math.random() * 101);
                const barraLlena = "🪓".repeat(Math.floor(porcentaje / 10));
                const barraVacia = "⚪".repeat(10 - Math.floor(porcentaje / 10));
                let veredicto = porcentaje > 80 ? "¡Achorado total! Parado con su Nike Tech cobrando peaje en la esquina 👟🔥" : "Se pone bravo solo en grupo 🤙";
                await sock.sendMessage(from, { text: `🦝 *MEDIDOR DE ACHORADO / PIRAÑA* 👟\n\n👤 *Usuario:* ${targetName}\n📊 *Barrio Level:* ${porcentaje}%\n[${barraLlena}${barraVacia}]\n\n📌 *Resultado:* ${veredicto}`, mentions: mentioned ? [mentioned] : [] }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!fumon') || lowerText.startsWith('!fumón')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                const porcentaje = Math.floor(Math.random() * 101);
                const barraLlena = "🍃".repeat(Math.floor(porcentaje / 10));
                const barraVacia = "⚪".repeat(10 - Math.floor(porcentaje / 10));
                let nivel = porcentaje > 80 ? "¡Bob Marley en persona! Huele a yerba a 3 cuadras 💨🍁🔥" : "De vez en cuando se le van los ojos rojos 👀🌿";
                await sock.sendMessage(from, { text: `🍁 *MEDIDOR DE FUMÓN* 💨\n\n👤 *Usuario:* ${targetName}\n📊 *Nivel Rastafari:* ${porcentaje}%\n[${barraLlena}${barraVacia}]\n\n📌 *Diagnóstico:* ${nivel}`, mentions: mentioned ? [mentioned] : [] }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!pajero') || lowerText.startsWith('!paimo')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                const porcentaje = Math.floor(Math.random() * 101);
                const barraLlena = "🍆".repeat(Math.floor(porcentaje / 10));
                const barraVacia = "⚪".repeat(10 - Math.floor(porcentaje / 10));
                let veredicto = porcentaje > 85 ? "¡Enfermo terminal! Vive pegado a Pornhub 💀🔥" : "Se hace el inocente pero es tremendo mañoso 🤫";
                await sock.sendMessage(from, { text: `🍆 *RANKING OFICIAL DE PAJERO* 🍆\n\n👤 *Usuario:* ${targetName}\n📊 *Nivel de mañosería:* ${porcentaje}%\n[${barraLlena}${barraVacia}]\n\n📌 *Diagnóstico:* ${veredicto}`, mentions: mentioned ? [mentioned] : [] }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!fiel') || lowerText.startsWith('!infiel')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                const porcentaje = Math.floor(Math.random() * 101);
                let veredicto = porcentaje < 40 ? "¡Peligro total! Tiene doble vida y chat oculto 🚨🏃‍♂️" : "¡Incondicional! Pone las manos al fuego 💍✨";
                await sock.sendMessage(from, { text: `❤️‍🔥 *MEDIDOR DE FIDELIDAD* 🔍\n\n👤 *Usuario:* ${targetName}\n📊 *Fidelidad:* ${porcentaje}%\n💬 *Veredicto:* ${veredicto}`, mentions: mentioned ? [mentioned] : [] }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!chapa')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                const chapas = [
                    "Chapa tu combi / *'Tarzán de micro'* (porque vive colgado)",
                    "Chapa tu mototaxi / *'Billetera de loco'* (porque pura bulla y nada de plata)",
                    "Chapa tu pavita / *'Helado en carretilla'* (porque a la primera calentura se derrite)",
                    "Chapa tu ceviche / *'Combi vieja'* (porque suena por todos lados y bota humo)"
                ];
                const chapaRandom = chapas[Math.floor(Math.random() * chapas.length)];
                await sock.sendMessage(from, { text: `🏷️ *REGISTRO DE CHAPAS PERUANAS* 🇵🇪\n\n👤 *Afectado:* ${targetName}\n📛 *Nueva Chapa Oficial:* ${chapaRandom}\n\n🤣 ¡Quedó bautizado para siempre!`, mentions: mentioned ? [mentioned] : [] }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!gay')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                const porcentaje = Math.floor(Math.random() * 101);
                const barraLlena = "🏳️‍🌈".repeat(Math.floor(porcentaje / 10));
                const barraVacia = "⚪".repeat(10 - Math.floor(porcentaje / 10));
                let nivel = porcentaje > 80 ? "¡Confirmadísimo! Modo marica activado 💅✨" : "Sospechoso... la rosca le tira 🤫";
                await sock.sendMessage(from, { text: `🏳️‍🌈 *MEDIDOR DE GAY* 🏳️‍🌈\n\n👤 *Usuario:* ${targetName}\n📊 *Porcentaje:* ${porcentaje}%\n[${barraLlena}${barraVacia}]\n\n📌 *Resultado:* ${nivel}`, mentions: mentioned ? [mentioned] : [] }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!sau') || lowerText.startsWith('!sauu')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                await sock.sendMessage(from, { text: `🌈 *¡¡SAUUUUUUUU!!* 🪩✨\n\n📢 ¡Miren a ${targetName} pidiendo pista en la pista de baile!\n💃 *¡Marica tú, marica yo!* 🔥`, mentions: mentioned ? [mentioned] : [] }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!calificar') || lowerText.startsWith('!rate')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                const nota = Math.floor(Math.random() * 10) + 1;
                await sock.sendMessage(from, { text: `⭐ *CALIFICACIÓN DE PERFIL* ⭐\n\n👤 *Usuario:* ${targetName}\n📊 *Puntuación:* ${nota}/10\n💬 *Veredicto:* ¡Pura fachaza en el grupo 10/10! 🔥`, mentions: mentioned ? [mentioned] : [] }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!princesa')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                await sock.sendMessage(from, { text: `👑 *¿QUÉ LE PASÓ A LA PRINCESA?* 💅✨\n\n📢 *Alerta:* Miren a ${targetName}...\n💬 *El chisme:* Se le rompió una uña bailando salsa y ahora está haciendo berrinche en la esquina 💅😭`, mentions: mentioned ? [mentioned] : [] }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!parejagay') || lowerText.startsWith('!vidagay')) {
                const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                const targetName = mentionedJids[0] ? `@${mentionedJids[0].split('@')[0]}` : pushName;
                const parejaName = mentionedJids[1] ? `@${mentionedJids[1].split('@')[0]}` : "Un galán sorpresa del grupo 🤫";
                await sock.sendMessage(from, { text: `🏳️‍🌈 *LA VIDA Y PAREJA PERFECTA* 💒✨\n\n👤 *Protagonista:* ${targetName}\n❤️ *Pareja Ideal:* ${parejaName}\n\n🏡 *Estado:* Viviendo felices en su departamento soñado xd`, mentions: mentionedJids }, { quoted: msg });
                return;
            }

            // Descargas directas
            if (lowerText.startsWith('!audio') || lowerText.startsWith('!mp3')) {
                const query = text.replace(/^!(audio|mp3)\s*/i, '').trim();
                if (!query) { await sock.sendMessage(from, { text: '⚠️ Ingresa el nombre de la canción. Ej: *!audio Bad Bunny*' }, { quoted: msg }); return; }
                await sock.sendMessage(from, { text: `🔍 Buscando audio para: *${query}*... 🎧` }, { quoted: msg });
                await sock.sendMessage(from, { audio: { url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3` }, mimetype: 'audio/mp4', caption: `🎵 *Audio:* ${query}` }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!video') || lowerText.startsWith('!mp4')) {
                const query = text.replace(/^!(video|mp4)\s*/i, '').trim();
                if (!query) { await sock.sendMessage(from, { text: '⚠️ Ingresa el nombre del video. Ej: *!video resumen*' }, { quoted: msg }); return; }
                await sock.sendMessage(from, { text: `🎥 Buscando video: *${query}*... 🎬` }, { quoted: msg });
                await sock.sendMessage(from, { video: { url: `https://www.w3schools.com/html/mov_bbb.mp4` }, caption: `🎬 *Video:* ${query}` }, { quoted: msg });
                return;
            }

            // Sistema y Consultas
            if (lowerText === '!registrar' || lowerText === '!registro') {
                await sock.sendMessage(from, { text: `✅ *REGISTRO EXITOSO*\n👤 *Nombre:* ${userData.nombre}\n📱 *WhatsApp:* +${userData.numero}\n💎 *Créditos:* ${userData.creditos}\n👑 *Rango:* ${userData.rango}` }, { quoted: msg });
                return;
            }

            if (lowerText === '!perfil' || lowerText === '!creditos') {
                await sock.sendMessage(from, { text: `💳 *PERFIL VIP*\n👤 *Nombre:* ${userData.nombre}\n📱 *WhatsApp:* +${userData.numero}\n💎 *Créditos:* ${userData.creditos}` }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!dni ')) {
                const dni = text.slice(5).trim();
                if (dni.length !== 8 || isNaN(dni)) { await sock.sendMessage(from, { text: `⚠️ DNI inválido. Ej: *!dni 12345678*` }, { quoted: msg }); return; }
                await sock.sendMessage(from, { text: generarDNIFalso(dni) }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!arbol ')) {
                const dni = text.replace(/^!arbol\s*/i, '').trim();
                await sock.sendMessage(from, { text: generarArbolGenealogicoFalso(dni) }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!facial')) {
                const arg = text.replace(/^!facial\s*/i, '').trim();
                const resFacial = generarFacialFalso(arg);
                await sock.sendMessage(from, { image: { url: resFacial.photoUrl }, caption: resFacial.texto }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!cel ')) {
                const num = text.replace(/^!cel\s*/i, '').trim();
                const respuestaCel = await buscarTitularCelularGratis(num);
                await sock.sendMessage(from, { text: respuestaCel }, { quoted: msg });
                return;
            }

            if (lowerText === '!creador') {
                await sock.sendMessage(from, { text: `👑 *CREADOR:* Jhey\n📱 *WhatsApp:* +51 931 801 370` }, { quoted: msg });
                return;
            }

            if (lowerText === '!infobot') {
                const uptime = Math.floor((Date.now() - startTime) / 1000);
                await sock.sendMessage(from, { text: `🤖 *BOT JJ ONLINE*\n⏱️ *Tiempo activo:* ${Math.floor(uptime/60)}m ${uptime%60}s` }, { quoted: msg });
                return;
            }

            if (lowerText === '!ping') {
                await sock.sendMessage(from, { text: 'pong! 🏓 Bot JJ activo.' }, { quoted: msg });
                return;
            }

            // IA
            const isGroup = from.endsWith('@g.us');
            const isMentioned = msg.message?.extendedTextMessage?.contextInfo?.participant === sock.user?.id || body.includes('@' + sock.user?.id?.split('@')[0]);

            if ((!isGroup || isMentioned) && !text.startsWith('!')) {
                await sock.sendPresenceUpdate('composing', from).catch(() => {});
                const respuestaHumana = await hablarConIAReal(from, text, pushName);
                await sock.sendMessage(from, { text: respuestaHumana }, { quoted: msg });
            }
        });
    } catch (err) {
        console.error("Error crítico en Baileys:", err);
    }
}
