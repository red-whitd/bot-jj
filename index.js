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

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
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
        console.error("Error en API de IA:", e.message);
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

🎵 *DESCARGAS Y MULTIMEDIA*
• *!audio [nombre/artista]* (Obtener audio MP3)
• *!video [nombre/artista]* (Obtener video MP4)

🎲 *DIVERSIÓN & GRUPOS*
• *!gay [@usuario]* (Medidor de Gay)
• *!princesa [@usuario]* (¿Qué le pasó a la princesa?)
• *!parejagay [@usuario]* (Vida y pareja gay futura)
• *!sau [@usuario]* (Efecto Sauuu en grupo)
• *!calificar [@usuario]* (Califica el perfil)

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

            // ¿Qué le pasó a la princesa?
            if (lowerText.startsWith('!princesa')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);

                const historiasPrincesa = [
                    "Se le rompió una uña bailando salsa y ahora está haciendo berrinche en la esquina 💅😭",
                    "Le dijeron que no había delivery de Bubble Tea y se echó a llorar en el mueble 🧋👑",
                    "Se despeinó con el viento de la combi y dice que arruinaron su outfit rosa 💇‍♂️💖",
                    "Vio un insecto chiquito y pegó un grito que se escuchó hasta la otra cuadra 😱👠",
                    "Se le manchó la polera blanca con chicha morada y está en depresión total 🥤👗"
                ];
                const historiaRandom = historiasPrincesa[Math.floor(Math.random() * historiasPrincesa.length)];

                await sock.sendMessage(from, { 
                    text: `👑 *¿QUÉ LE PASÓ A LA PRINCESA?* 💅✨\n\n📢 *Alerta:* Miren a ${targetName}...\n💬 *El chisme:* ${historiaRandom}`,
                    mentions: mentioned ? [mentioned] : []
                }, { quoted: msg });
                return;
            }

            // Vida Gay Futura y Pareja Perfecta
            if (lowerText.startsWith('!parejagay') || lowerText.startsWith('!vidagay')) {
                const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                const targetName = mentionedJids[0] ? `@${mentionedJids[0].split('@')[0]}` : pushName;
                const parejaName = mentionedJids[1] ? `@${mentionedJids[1].split('@')[0]}` : "Un galán sorpresa del grupo 🤫";

                const cantidadHijos = Math.floor(Math.random() * 5) + 1;
                const mascotas = ["2 gatos persas 🐱", "un caniche toy 🐩", "un chihuahua mimado 🐕", "un hurón elegante 🦦"];
                const mascotaRandom = mascotas[Math.floor(Math.random() * mascotas.length)];
                
                const empleos = [
                    "Poner una boutique de ropa aesthetic en Miraflores 🛍️",
                    "Abrir un salón de belleza VIP 💇‍♂️✨",
                    "Hacer vlogs de viajes en pareja por Europa ✈️💖",
                    "Dictar clases de pasarela y protocolo 👠🏼"
                ];
                const empleoRandom = empleos[Math.floor(Math.random() * empleos.length)];

                await sock.sendMessage(from, { 
                    text: `🏳️‍🌈 *LA VIDA Y PAREJA PERFECTA* 💒✨\n\n👤 *Protagonista:* ${targetName}\n❤️ *Pareja Ideal:* ${parejaName}\n👶 *Hijos a adoptar:* ${cantidadHijos} criaturitas\n🐾 *Mascota familiar:* ${mascotaRandom}\n💼 *Plan de vida:* ${empleoRandom}\n\n🏡 *Estado:* Viviendo felices en su departamento soñado xd`,
                    mentions: mentionedJids
                }, { quoted: msg });
                return;
            }

            // Descargar Audio de YouTube
            if (lowerText.startsWith('!audio') || lowerText.startsWith('!mp3')) {
                const query = text.replace(/^!(audio|mp3)\s*/i, '').trim();
                if (!query) {
                    await sock.sendMessage(from, { text: '⚠️ Ingresa el nombre de la canción o artista. Ej: *!audio Bad Bunny - Monaco*' }, { quoted: msg });
                    return;
                }
                const linkMp3 = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
                await sock.sendMessage(from, { 
                    text: `🎵 *DESCARGADOR DE AUDIO (MP3)* 🎧\n\n🎼 *Música/Artista:* ${query}\n🔗 *Enlace de descarga:* ${linkMp3}\n\n💡 Presiona el enlace para escuchar y descargar el audio directamente.` 
                }, { quoted: msg });
                return;
            }

            // Descargar Video de YouTube
            if (lowerText.startsWith('!video') || lowerText.startsWith('!mp4')) {
                const query = text.replace(/^!(video|mp4)\s*/i, '').trim();
                if (!query) {
                    await sock.sendMessage(from, { text: '⚠️ Ingresa el nombre del video o artista. Ej: *!video Peru vs Chile resumen*' }, { quoted: msg });
                    return;
                }
                const linkMp4 = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
                await sock.sendMessage(from, { 
                    text: `🎬 *DESCARGADOR DE VIDEO (MP4)* 📹\n\n📹 *Video/Artista:* ${query}\n🔗 *Enlace de descarga:* ${linkMp4}\n\n💡 Presiona el enlace para ver y guardar el video en tu celular.` 
                }, { quoted: msg });
                return;
            }

            // Medidor de Gay
            if (lowerText.startsWith('!gay')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                
                const porcentaje = Math.floor(Math.random() * 101);
                const barraLlena = "🏳️‍🌈".repeat(Math.floor(porcentaje / 10));
                const barraVacia = "⚪".repeat(10 - Math.floor(porcentaje / 10));

                let nivel = "Macho Alfa de cuna 💪";
                if (porcentaje > 80) nivel = "¡Confirmadísimo! Modo marica activado 💅✨";
                else if (porcentaje > 50) nivel = "Sospechoso... la rosca le tira 🤫";
                else if (porcentaje > 20) nivel = "Un toque delicado pero todo en orden 👌";

                await sock.sendMessage(from, { 
                    text: `🏳️‍🌈 *MEDIDOR DE GAY* 🏳️‍🌈\n\n👤 *Usuario:* ${targetName}\n📊 *Porcentaje:* ${porcentaje}%\n[${barraLlena}${barraVacia}]\n\n📌 *Resultado:* ${nivel}`,
                    mentions: mentioned ? [mentioned] : []
                }, { quoted: msg });
                return;
            }

            // Opción SAUU
            if (lowerText.startsWith('!sau') || lowerText.startsWith('!sauu')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);

                await sock.sendMessage(from, { 
                    text: `🌈 *¡¡SAUUUUUUUU!!* 🪩✨\n\n📢 ¡Miren a ${targetName} pidiendo pista en la pista de baile!\n💃 *¡Marica tú, marica yo!* 🔥`,
                    mentions: mentioned ? [mentioned] : []
                }, { quoted: msg });
                return;
            }

            // Calificar perfil
            if (lowerText.startsWith('!calificar') || lowerText.startsWith('!rate')) {
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const targetName = mentioned ? `@${mentioned.split('@')[0]}` : (text.split(' ')[1] || pushName);
                
                const nota = Math.floor(Math.random() * 10) + 1;
                const comentarios = [
                    "¡Perfil legendario! Pura fachaza 10/10 🔥",
                    "Aceptable, pero le falta un toque de estilo 7/10 😎",
                    "Foto modesta pero con actitud 8/10 🤙",
                    "Humilde pero seguro de sí mismo 6/10 👍",
                    "Definitivamente listo para las fotos de revista 9.5/10 🌟"
                ];
                const comentarioRandom = comentarios[nota % comentarios.length];

                await sock.sendMessage(from, { 
                    text: `⭐ *CALIFICACIÓN DE PERFIL* ⭐\n\n👤 *Usuario:* ${targetName}\n📊 *Puntuación:* ${nota}/10\n💬 *Veredicto:* ${comentarioRandom}`,
                    mentions: mentioned ? [mentioned] : []
                }, { quoted: msg });
                return;
            }

            // Registrar
            if (lowerText === '!registrar' || lowerText === '!registro') {
                await sock.sendMessage(from, { text: `✅ *REGISTRO EXITOSO*
👤 *Nombre (WhatsApp):* ${userData.nombre}
📱 *Número de WhatsApp:* +${userData.numero}
💎 *Créditos:* ${userData.creditos}
👑 *Rango:* ${userData.rango}` }, { quoted: msg });
                return;
            }

            // Perfil
            if (lowerText === '!perfil' || lowerText === '!creditos') {
                await sock.sendMessage(from, { text: `💳 *PERFIL VIP*
👤 *Nombre:* ${userData.nombre}
📱 *WhatsApp:* +${userData.numero}
💎 *Créditos:* ${userData.creditos}
📅 *Registro:* ${userData.fechaRegistro}` }, { quoted: msg });
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
                await sock.sendMessage(from, { text: `👑 *CREADOR:* Jhey\n📱 *WhatsApp:* +51 931 801 370\n🌐 *Servidor:* Render Cloud 24/7` }, { quoted: msg });
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

            // Chat Inteligente tipo Meta AI
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
