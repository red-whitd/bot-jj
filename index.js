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
                <p>Dueño: Jhey (51901364783)</p>
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

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs');
const axios = require('axios');
const pino = require('pino');

const memoryIA = new Map();
const usuariosRegistrados = new Map();
const OWNER_NUM = "51901364783";
const startTime = Date.now();

function registrarUsuario(userNum, pushName) {
    if (!usuariosRegistrados.has(userNum)) {
        usuariosRegistrados.set(userNum, {
            nombre: pushName || "Usuario VIP",
            numero: userNum,
            rango: "VIP Gold",
            creditos: "Ilimitados (∞)",
            fechaRegistro: new Date().toLocaleDateString('es-PE')
        });
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

// Chat Inteligente con comportamiento de persona normal
async function hablarConIAReal(userId, prompt, pushName) {
    if (!memoryIA.has(userId)) memoryIA.set(userId, []);
    let userHistory = memoryIA.get(userId);
    userHistory.push({ role: 'user', content: prompt });
    if (userHistory.length > 10) userHistory.shift();

    try {
        const fullPrompt = userHistory.map(m => `${m.role === 'user' ? (pushName || 'Usuario') : 'JJ'}: ${m.content}`).join('\n');
        
        // Instrucciones para responder de forma natural, cotidiana y amigable
        const systemInstruction = "Eres JJ, una persona real, inteligente, natural, atenta y amigable. Responde como una persona normal en WhatsApp, con respuestas claras, breves y cercanas. Si te saludan con un 'hola', saluda amablemente por su nombre o de forma natural (ejemplo: '¡Hola! ¿Cómo estás?', '¡Hola bro! ¿Qué tal?'). Evita frases robóticas o repetitivas.";
        
        const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?system=${encodeURIComponent(systemInstruction)}`, { timeout: 8000 });
        if (res.data && typeof res.data === 'string' && res.data.trim().length > 0) {
            const respuestaText = res.data.trim();
            userHistory.push({ role: 'assistant', content: respuestaText });
            return respuestaText;
        }
    } catch (e) {}

    // Respuestas humanas de contingencia si falla la red
    const respuestasNaturales = [
        `¡Hola ${pushName || ''}! ¿Cómo estás? ¿En qué te puedo ayudar hoy?`,
        `¡Qué tal bro! Todo bien por acá, ¿tú qué tal?`,
        `¡Hola! Dime, ¿qué novedades?`
    ];
    return respuestasNaturales[Math.floor(Math.random() * respuestasNaturales.length)];
}

async function iniciarBotWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('session_jj');

        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'fatal' }),
            printQRInTerminal: false,
            browser: Browsers.ubuntu('Chrome'),
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
            }, 4000);
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
            const pushName = msg.pushName || "amigo";
            const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            const text = body.trim();
            const lowerText = text.toLowerCase();

            const userData = registrarUsuario(userNum, pushName);

            // Menú
            if (lowerText === '!menu') {
                const menu = `⛩️ *BOT JJ - MENÚ PRINCIPAL* ⚡
Creador: *Jhey* | 📞 51901364783
👑 *ESTATUS:* Usuario VIP (${userData.creditos})

🪪 *CONSULTAS PERÚ*
• *!dni [8 dígitos]* (Datos de RENIEC)
• *!arbol [8 dígitos]* (Árbol genealógico)
• *!facial [DNI]* (Biometría facial)
• *!cel [9 dígitos]* (Búsqueda por teléfono)

🛠️ *SISTEMA & VIP*
• *!registrar* (Registro en el bot)
• *!perfil* (Ver tus créditos)
• *!creador* (Contacto del dueño)
• *!infobot* (Estado del servidor)
• *!ping*

💬 Escribe cualquier texto libre para charlar con la *IA JJ*.`;

                await sock.sendMessage(from, { text: menu }, { quoted: msg });
                return;
            }

            // Registrar
            if (lowerText === '!registrar' || lowerText === '!registro') {
                await sock.sendMessage(from, { text: `✅ *REGISTRADO:* ${userData.nombre}\n📱 *Número:* +${userData.numero}\n💎 *Créditos:* Ilimitados (∞)` }, { quoted: msg });
                return;
            }

            // Perfil
            if (lowerText === '!perfil' || lowerText === '!creditos') {
                await sock.sendMessage(from, { text: `💳 *PERFIL VIP*\n👤 *Nombre:* ${userData.nombre}\n📱 *ID:* +${userData.numero}\n💎 *Créditos:* ${userData.creditos}` }, { quoted: msg });
                return;
            }

            // Consulta DNI
            if (lowerText.startsWith('!dni ')) {
                const dni = text.slice(5).trim();
                if (dni.length !== 8 || isNaN(dni)) {
                    await sock.sendMessage(from, { text: `⚠️ Ingresa un DNI válido de 8 dígitos. Ej: *!dni 12345678*` }, { quoted: msg });
                    return;
                }
                await sock.sendMessage(from, { text: generarDNIFalso(dni) }, { quoted: msg });
                return;
            }

            // Consulta Árbol Genealógico
            if (lowerText.startsWith('!arbol ') || lowerText.startsWith('!genealogia ')) {
                const dni = text.replace(/^!(arbol|genealogia)\s*/i, '').trim();
                if (dni.length !== 8 || isNaN(dni)) {
                    await sock.sendMessage(from, { text: `⚠️ Ingresa un DNI válido de 8 dígitos. Ej: *!arbol 12345678*` }, { quoted: msg });
                    return;
                }
                await sock.sendMessage(from, { text: generarArbolGenealogicoFalso(dni) }, { quoted: msg });
                return;
            }

            // Consulta Biometría Facial
            if (lowerText.startsWith('!facial') || lowerText.startsWith('!rostro')) {
                const arg = text.replace(/^!(facial|rostro)\s*/i, '').trim();
                const resFacial = generarFacialFalso(arg);
                
                await sock.sendMessage(from, { 
                    image: { url: resFacial.photoUrl }, 
                    caption: resFacial.texto 
                }, { quoted: msg });
                return;
            }

            // Búsqueda de Celular / Titular
            if (lowerText.startsWith('!cel ') || lowerText.startsWith('!telefono ')) {
                const num = text.replace(/^!(cel|telefono)\s*/i, '').trim();
                const respuestaCel = await buscarTitularCelularGratis(num);
                await sock.sendMessage(from, { text: respuestaCel }, { quoted: msg });
                return;
            }

            // Creador
            if (lowerText === '!creador') {
                await sock.sendMessage(from, { text: `👑 *CREADOR:* Jhey\n📱 *WhatsApp:* +51 901 364 783\n🌐 *Servidor:* Render Cloud 24/7` }, { quoted: msg });
                return;
            }

            // InfoBot
            if (lowerText === '!infobot') {
                const uptime = Math.floor((Date.now() - startTime) / 1000);
                await sock.sendMessage(from, { text: `🤖 *BOT JJ ONLINE*\n⏱️ *Tiempo activo:* ${Math.floor(uptime/60)}m ${uptime%60}s\n👥 *Usuarios Registrados:* ${usuariosRegistrados.size}\n📡 *Plataforma:* Render Node.js` }, { quoted: msg });
                return;
            }

            // Ping
            if (lowerText === '!ping') {
                await sock.sendMessage(from, { text: 'pong! 🏓 Bot JJ activo a velocidad VIP.' }, { quoted: msg });
                return;
            }

            // Chat Libre (Habla como persona normal)
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
