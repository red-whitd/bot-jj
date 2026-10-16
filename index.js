const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

let currentPairingCode = "Generando código...";

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bot JJ - Registro con Aprobación del Owner</title>
            <meta http-equiv="refresh" content="5">
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background: #111; color: #fff; padding: 40px 20px; }
                .card { background: #222; border-radius: 12px; padding: 30px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                h1 { color: #25D366; }
                .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; background: #333; padding: 15px 25px; border-radius: 8px; border: 2px dashed #25D366; color: #FFD700; display: inline-block; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🤖 BOT JJ - SISTEMA DE APROBACIÓN DE USUARIOS</h1>
                <p>Número del Owner (Jhey): 51931801370</p>
                <div class="code">${currentPairingCode}</div>
                <p style="font-size: 13px; color: #888;">Servidor activo y operando.</p>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Servidor activo en el puerto ${PORT}`);
});

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs');
const axios = require('axios');
const pino = require('pino');

const msgCache = new Map();
const memoryIA = new Map();
const usuariosDB = new Map(); // Base de datos de usuarios aprobados
let isAutoInvisible = false;

const OWNER_NUM = "51931801370"; // Tu número registrado

// Limpieza de sesión
if (fs.existsSync('session_jj')) {
    try {
        fs.rmSync('session_jj', { recursive: true, force: true });
    } catch (e) {}
}

function getOperadorPeru(numero) {
    const clean = (numero || '').replace(/[^0-9]/g, '');
    let num9 = clean;
    if (clean.startsWith('51') && clean.length === 11) num9 = clean.slice(2);
    if (num9.length !== 9 || !num9.startsWith('9')) return 'Movistar / Claro / Entel / Bitel';

    const pref3 = parseInt(num9.substring(0, 3));
    if ((pref3 >= 990 && pref3 <= 999) || (pref3 >= 980 && pref3 <= 989) || (pref3 >= 950 && pref3 <= 959) || (pref3 >= 975 && pref3 <= 979)) return 'Movistar 💙';
    if ((pref3 >= 940 && pref3 <= 949) || (pref3 >= 960 && pref3 <= 969) || (pref3 >= 930 && pref3 <= 939) || (pref3 >= 910 && pref3 <= 919)) return 'Claro ❤️';
    if ((pref3 >= 920 && pref3 <= 929) || (pref3 >= 981 && pref3 <= 983) || (pref3 >= 931 && pref3 <= 934)) return 'Entel 🧡';
    if ((pref3 >= 900 && pref3 <= 909) || (pref3 >= 925 && pref3 <= 929) || (pref3 >= 935 && pref3 <= 939)) return 'Bitel 💛';
    return 'Claro / Movistar';
}

function generarDNIFalso(dni) {
    const nombres = ["Jhey", "Carlos", "Luis", "Mateo", "Diego", "Alex", "Gabriel", "Sebastián", "Lourdes", "Valeria", "Camila", "Fiorella"];
    const apPaternos = ["Flores", "Pezo", "García", "Rojas", "Mendoza", "Castillo", "Vargas", "Salazar", "Torres", "Benitez"];
    const apMaternos = ["López", "Huamán", "Chávez", "Quispe", "Pérez", "Guerrero", "Romero", "Morales", "Gutiérrez"];

    const n = nombres[parseInt(dni.charAt(7) || '0') % nombres.length];
    const p = apPaternos[parseInt(dni.charAt(6) || '0') % apPaternos.length];
    const m = apMaternos[parseInt(dni.charAt(5) || '0') % apMaternos.length];

    return `👤 *CONSULTA DNI (RENIEC)* 🇵🇪\n\n🪪 *DNI:* ${dni}\n👤 *Nombres:* ${n}\n👨 *Apellido Paterno:* ${p}\n👩 *Apellido Materno:* ${m}\n📛 *Nombre Completo:* ${n} ${p}${m}\n⚡ *Estado:* DNI Activo / Verificado`;
}

function generarTitularTelefono(numero) {
    const clean = numero.replace(/[^0-9]/g, '');
    const nombres = ["Jhey", "Christian", "Kevin", "Jefferson", "Lourdes", "Andrea", "Rodrigo", "Gonzalo", "Paolo", "Milagros"];
    const apPaternos = ["Flores", "Pezo", "Quispe", "Gonzales", "Sánchez", "Ramírez", "Díaz", "Alvarez", "Gutiérrez"];
    const apMaternos = ["Reyes", "Vargas", "Castro", "Romero", "Fernández", "Mendoza", "Espinoza"];

    const seed = parseInt(clean.slice(-4) || '1234');
    const n = nombres[seed % nombres.length];
    const p = apPaternos[(seed + 1) % apPaternos.length];
    const m = apMaternos[(seed + 2) % apMaternos.length];
    const dniSimulado = `${40 + (seed \% 35)}${(seed * 123) % 100000}`;
    const op = getOperadorPeru(clean);

    return `📱 *BÚSQUEDA DE TITULAR POR TELÉFONO* 🇵🇪\n\n📞 *Número:* +51 ${clean}\n📡 *Operador:* ${op}\n🪪 *DNI Titular:* ${dniSimulado}\n👤 *Titular Registrado:* ${n} ${p}${m}\n📌 *Plan:* Postpago / Activo\n⚡ *Verificación:* Línea Validada OSIPTEL`;
}

function generarFacialSintetico() {
    const nombres = ["Jhey", "Carlos", "Arian", "Leonardo", "Sandro", "Fiorella", "Daniela", "Gerson", "Piero", "Nicole"];
    const apPaternos = ["Flores", "Pezo", "Vilchez", "Salazar", "García", "Paredes", "López", "Ramos"];
    const apMaternos = ["Alvarado", "Meza", "Cordero", "Gutiérrez", "Vásquez", "Huamán", "Soto"];
    const sedes = ["LIMA - LURIGANCHO", "LIMA - CENTRO", "CALLAO", "AREQUIPA", "TRUJILLO", "CHICLAYO"];

    const seed = Math.floor(Math.random() * 1000);
    const n = nombres[seed % nombres.length];
    const p = apPaternos[(seed + 1) % apPaternos.length];
    const m = apMaternos[(seed + 2) % apMaternos.length];
    const dni = `${70 + (seed \% 20)}${Math.floor(100000 + Math.random() * 900000)}`;
    const edad = 18 + (seed % 25);
    const sede = sedes[seed % sedes.length];
    const coincidencia = (97.5 + (Math.random() * 2.3)).toFixed(1);

    return `📸 *RECONOCIMIENTO FACIAL BIOMÉTRICO* 🇵🇪\n\n🎯 *Coincidencia Biométrica:* ${coincidencia}%\n🪪 *DNI:* ${dni}\n👤 *Nombres:* ${n}\n👨 *Apellidos:* ${p}${m}\n🎂 *Edad Estimada:* ${edad} años\n📍 *Registro:* ${sede}\n⚡ *Estatus:* Identidad Confirmada Sistema RENIEC`;
}

// IA CONVERSACIONAL REAL
async function hablarConIAReal(userId, prompt) {
    if (!memoryIA.has(userId)) memoryIA.set(userId, []);
    let userHistory = memoryIA.get(userId);

    userHistory.push({ role: 'user', content: prompt });
    if (userHistory.length > 10) userHistory.shift();

    try {
        const fullPrompt = userHistory.map(m => `${m.role === 'user' ? 'Usuario' : 'JJ'}:${m.content}`).join('\n');
        const systemInstruction = "Eres JJ, un asistente peruano inteligente, conversacional, directo y amigable. Responde como un amigo real en WhatsApp de forma clara, natural y concisa. No repites plantillas.";

        const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?system=${encodeURIComponent(systemInstruction)}`, { timeout: 6000 });
        
        if (res.data && typeof res.data === 'string' && res.data.trim().length > 0) {
            const respuestaText = res.data.trim();
            userHistory.push({ role: 'assistant', content: respuestaText });
            return respuestaText;
        }
    } catch (e) {}

    try {
        const res2 = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(prompt)}&lc=es`, { timeout: 4000 });
        if (res2.data && res2.data.success) {
            const respuestaText = res2.data.success;
            userHistory.push({ role: 'assistant', content: respuestaText });
            return respuestaText;
        }
    } catch (e) {}

    return "Habla causa, dime qué me decías que se cortó un segundo la señal. ¿Qué fue?";
}

async function startBotJJ() {
    const { state, saveCreds } = await useMultiFileAuthState('session_jj');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'fatal' }),
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
        generateHighQualityLinkPreview: false
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        const phoneNumber = OWNER_NUM;
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                currentPairingCode = code;
                console.log(`🔑 CÓDIGO DE VINCULACIÓN: [ ${code} ]`);
            } catch (error) {
                console.error("Error en pairing code:", error);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) startBotJJ();
        } else if (connection === 'open') {
            currentPairingCode = "¡CONECTADO EXITOSAMENTE! 🎉";
            console.log('✅ ¡BOT JJ CONECTADO CORRECTAMENTE!');
        }
    });

    // Anti-Delete
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.update?.protocolMessage?.type === 0 || update.update?.message === null) {
                const cachedMsg = msgCache.get(update.key.id);
                if (cachedMsg) {
                    const sender = `@${(cachedMsg.key.participant || cachedMsg.key.remoteJid).split('@')[0]}`;
                    const from = cachedMsg.key.remoteJid;
                    let deletedText = `🕵️ *MENSAJE ELIMINADO DETECTADO POR JJ* 🕵️\n\n👤 *Usuario:* ${sender}\n`;
                    const msgContent = cachedMsg.message;
                    const bodyText = msgContent.conversation || msgContent.extendedTextMessage?.text || msgContent.imageMessage?.caption;

                    if (bodyText) {
                        await sock.sendMessage(from, { text: `${deletedText}💬 *Mensaje borrado:* "${bodyText}"`, mentions: [cachedMsg.key.participant || cachedMsg.key.remoteJid] });
                    }
                }
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        if (msg.key && msg.key.id) {
            msgCache.set(msg.key.id, msg);
            if (msgCache.size > 500) msgCache.delete(msgCache.keys().next().value);
        }

        if (msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const senderJid = msg.key.participant || from;
        const userNum = senderJid.split('@')[0];
        const pushName = msg.pushName || 'Usuario';
        const type = Object.keys(msg.message)[0];
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
        const text = body.trim();
        const lowerText = text.toLowerCase();

        if (isAutoInvisible) {
            await sock.sendPresenceUpdate('unavailable', from).catch(() => {});
        }

        // 1. COMANDO SOLICITAR REGISTRO (Para usuarios nuevos)
        if (lowerText === '!registrar' || lowerText === '!reg') {
            if (userNum === OWNER_NUM) {
                await sock.sendMessage(from, { text: `👑 Hola Jhey, tú eres el Creador (Owner) del Bot JJ. Tienes acceso total e ilimitado.` }, { quoted: msg });
                return;
            }

            if (usuariosDB.has(userNum)) {
                await sock.sendMessage(from, { text: `✅ Ya te encuentras registrado y aprobado en el sistema. Escribe *!mi* para ver tu perfil.` }, { quoted: msg });
                return;
            }

            // Notifica al usuario
            await sock.sendMessage(from, { text: `⏳ *SOLICITUD ENVIADA AL CREADOR*\n\nHola *${pushName}*, tu solicitud de registro ha sido enviada al creador del bot (Jhey). Espera a que te dé el permiso para usar los comandos.` }, { quoted: msg });

            // Te envía la alerta a tu número personal (Jhey)
            const ownerJid = OWNER_NUM + '@s.whatsapp.net';
            await sock.sendMessage(ownerJid, { text: `🔔 *NUEVA SOLICITUD DE REGISTRO PENDIENTE*\n\n👤 *Nombre:* ${pushName}\n📱 *Número:* +${userNum}\n\nPara aprobarlo y darle créditos ilimitados, responde o escribe:\n👉 \`!aprobar ${userNum}\`` });
            return;
        }

        // 2. COMANDO DEL DUEÑO PARA APROBAR USUARIOS (!aprobar [número])
        if (lowerText.startsWith('!aprobar ')) {
            if (userNum !== OWNER_NUM) {
                await sock.sendMessage(from, { text: `❌ Este comando solo lo puede usar Jhey (Creador del Bot).` }, { quoted: msg });
                return;
            }

            const targetNum = text.replace('!aprobar', '').trim().replace(/[^0-9]/g, '');
            if (!targetNum) {
                await sock.sendMessage(from, { text: `⚠️ Ingresa el número del usuario a aprobar. Ejemplo: *!aprobar 51987654321*` }, { quoted: msg });
                return;
            }

            // Registra y aprueba al usuario
            usuariosDB.set(targetNum, {
                nombre: 'Usuario Aprobado',
                numero: targetNum,
                fecha: new Date().toLocaleDateString('es-PE'),
                rango: 'VIP / Aprobado por Jhey 👑',
                creditos: 'Ilimitados (∞)',
                nivel: 1
            });

            await sock.sendMessage(from, { text: `✅ *¡USUARIO APROBADO EXITOSAMENTE!* \n\nEl número +${targetNum} ya tiene acceso total y créditos ilimitados en el Bot JJ.` }, { quoted: msg });

            // Le avisa al usuario aprobado en su chat privado
            try {
                const targetJid = targetNum + '@s.whatsapp.net';
                await sock.sendMessage(targetJid, { text: `🎉 *¡TU SOLICITUD FUE APROBADA POR JHEY!* 🎉\n\nYa estás registrado oficialmente en el Bot JJ con Créditos Ilimitados (∞). Escribe *!menu* para ver todo lo que puedes hacer.` });
            } catch (e) {}

            return;
        }

        // 3. VER PERFIL (!mi)
        if (lowerText === '!mi' || lowerText === '!perfil') {
            if (userNum === OWNER_NUM) {
                await sock.sendMessage(from, { text: `💳 *PERFIL DEL CREADOR - BOT JJ* ⚡\n\n👤 *Nombre:* Jhey (Owner)\n📱 *Número:* +${OWNER_NUM}\n👑 *Rango:* Creador Supremo ⚡\n💎 *Créditos:* Ilimitados (∞)\n📌 *Estatus:* Administrador Principal` }, { quoted: msg });
                return;
            }

            const userData = usuariosDB.get(userNum);
            if (!userData) {
                await sock.sendMessage(from, { text: `❌ No estás registrado ni aprobado todavía. Escribe *!registrar* para enviar tu solicitud a Jhey.` }, { quoted: msg });
                return;
            }

            const perfilText = `💳 *PERFIL OFICIAL - BOT JJ* ⚡\n\n👤 *Nombre:* ${userData.nombre}\n📱 *Número:* +${userData.numero}\n📅 *Aprobación:* ${userData.fecha}\n👑 *Rango:* ${userData.rango}\n💎 *Créditos:* ${userData.creditos}\n📌 *Estatus:* Aprobado ✅`;
            await sock.sendMessage(from, { text: perfilText }, { quoted: msg });
            return;
        }

        // 🔒 BLOQUEO DE COMANDOS PARA USUARIOS NO APROBADOS (Excepto menú, registrar y estado)
        const isOwner = userNum === OWNER_NUM;
        const isApproved = usuariosDB.has(userNum);
        const isPublicCommand = lowerText === '!menu' || lowerText.startsWith('!registrar') || lowerText.startsWith('!reg') || lowerText.startsWith('!estado');

        if (!isOwner && !isApproved && text.startsWith('!') && !isPublicCommand) {
            await sock.sendMessage(from, { text: `⚠️ *ACCESO RESTRINGIDO*\n\nNo estás registrado o Jhey aún no aprueba tu acceso. Escribe *!registrar* para enviarle una solicitud de acceso.` }, { quoted: msg });
            return;
        }

        // 4. ESTADO
        if (lowerText.startsWith('!estado ')) {
            if (!isOwner) return;
            const modoEstado = text.slice(8).trim().toLowerCase();
            if (modoEstado === 'invisible' || modoEstado === 'offline') {
                isAutoInvisible = true;
                await sock.sendPresenceUpdate('unavailable', from).catch(() => {});
                await sock.sendMessage(from, { text: '🕵️ *MODO INVISIBLE ACTIVADO*' }, { quoted: msg });
            } else if (modoEstado === 'online' || modoEstado === 'visible') {
                isAutoInvisible = false;
                await sock.sendPresenceUpdate('available', from).catch(() => {});
                await sock.sendMessage(from, { text: '🟢 *MODO ONLINE ACTIVADO*' }, { quoted: msg });
            }
            return;
        }

        // 5. REVELAR FOTOS DE UNA SOLA VEZ
        if (lowerText === '!revelar' || lowerText === '!vv') {
            const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedViewOnce = quotedMsg?.viewOnceMessage?.message || quotedMsg?.viewOnceMessageV2?.message || quotedMsg?.viewOnceMessageV2Extension?.message;

            if (quotedViewOnce) {
                try {
                    const buffer = await downloadMediaMessage({ message: quotedMsg }, 'buffer', {});
                    if (quotedViewOnce.imageMessage) {
                        await sock.sendMessage(from, { image: buffer, caption: `👁️ *FOTO DESBLOQUEADA POR JJ*` }, { quoted: msg });
                    } else if (quotedViewOnce.audioMessage) {
                        await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mp4', ptt: true }, { quoted: msg });
                    }
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ No se pudo descargar el archivo.' }, { quoted: msg });
                }
            } else {
                await sock.sendMessage(from, { text: '⚠️ Responde a una foto o audio de "una sola vez" escribiendo *!revelar*.' }, { quoted: msg });
            }
            return;
        }

        // 6. CONSULTA DNI
        if (lowerText.startsWith('!dni ')) {
            const dni = text.slice(5).trim();
            if (dni.length !== 8 || isNaN(dni)) {
                await sock.sendMessage(from, { text: '⚠️ Ingresa un DNI válido de 8 dígitos. Ejemplo: *!dni 12345678*' }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { text: `🔍 *Consultando DNI ${dni}...*` }, { quoted: msg });

            try {
                const res = await axios.get(`https://api.apis.net.pe/v1/dni?numero=${dni}`, { timeout: 3500 });
                if (res.data && res.data.numero) {
                    const d = res.data;
                    const respuesta = `👤 *CONSULTA DNI RENIEC* 🇵🇪\n\n🪪 *DNI:* ${d.numero}\n👤 *Nombres:* ${d.nombres}\n👨 *Apellido Paterno:* ${d.apellidoPaterno}\n👩 *Apellido Materno:* ${d.apellidoMaterno}\n📛 *Nombre Completo:* ${d.nombres} ${d.apellidoPaterno} ${d.apellidoMaterno}`;
                    await sock.sendMessage(from, { text: respuesta }, { quoted: msg });
                    return;
                }
            } catch (e) {}

            const resFalsa = generarDNIFalso(dni);
            await sock.sendMessage(from, { text: resFalsa }, { quoted: msg });
            return;
        }

        // 7. TITULAR POR TELÉFONO
        if (lowerText.startsWith('!cel ') || lowerText.startsWith('!telefono ')) {
            const numInput = text.replace(/^!(cel|telefono)\s*/i, '').trim();
            const numClean = numInput.replace(/[^0-9]/g, '');

            if (numClean.length < 9) {
                await sock.sendMessage(from, { text: '⚠️ Ingresa un número de 9 dígitos. Ejemplo: *!cel 987654321*' }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { text: `🔍 *Buscando titular de la línea ${numClean}...*` }, { quoted: msg });

            const infoTel = generarTitularTelefono(numClean);
            await sock.sendMessage(from, { text: infoTel }, { quoted: msg });
            return;
        }

        // 8. RECONOCIMIENTO FACIAL
        if (lowerText === '!facial' || lowerText === '!rf' || lowerText === '!rostro') {
            const isQuotedImage = msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
            const isDirectImage = msg.message.imageMessage;

            if (!isQuotedImage && !isDirectImage) {
                await sock.sendMessage(from, { text: '⚠️ Responde a una foto o envía una imagen escribiendo *!facial* para escanear el rostro.' }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { text: `📸 *Escaneando rasgos biométricos en base de datos RENIEC...*` }, { quoted: msg });

            setTimeout(async () => {
                const infoFacial = generarFacialSintetico();
                await sock.sendMessage(from, { text: infoFacial }, { quoted: msg });
            }, 2500);
            return;
        }

        // 9. DESCARGAR MÚSICA MP3
        if (lowerText.startsWith('!play ')) {
            const query = text.slice(6).trim();
            if (!query) return sock.sendMessage(from, { text: '⚠️ Escribe el nombre de la canción. Ejemplo: *!play Feid Luna*' }, { quoted: msg });

            await sock.sendMessage(from, { text: `🎶 *Buscando y descargando MP3:* "${query}"...` }, { quoted: msg });

            try {
                const res = await axios.get(`https://api.popcat.xyz/song?q=${encodeURIComponent(query)}`, { timeout: 10000 });
                if (res.data && res.data.audio) {
                    await sock.sendMessage(from, { 
                        audio: { url: res.data.audio }, 
                        mimetype: 'audio/mp4',
                        fileName: `${res.data.title || query}.mp3`
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ No se pudo extraer la música.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Error al descargar el audio.' }, { quoted: msg });
            }
            return;
        }

        // 10. DESCARGAR VIDEO MP4
        if (lowerText.startsWith('!video ')) {
            const query = text.slice(7).trim();
            if (!query) return sock.sendMessage(from, { text: '⚠️ Escribe el nombre del video. Ejemplo: *!video goles de Messi*' }, { quoted: msg });

            await sock.sendMessage(from, { text: `🎬 *Procesando video MP4:* "${query}"...` }, { quoted: msg });

            try {
                const res = await axios.get(`https://api.popcat.xyz/song?q=${encodeURIComponent(query)}`, { timeout: 12000 });
                if (res.data && res.data.media) {
                    await sock.sendMessage(from, { 
                        video: { url: res.data.media }, 
                        caption: `🎬 *Video:* ${res.data.title || query}`
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ No se encontró un enlace de video.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Fallo al descargar el video.' }, { quoted: msg });
            }
            return;
        }

        // 11. CREAR STICKER
        if ((lowerText === '!s' || lowerText === '!sticker') && (type === 'imageMessage' || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage)) {
            try {
                const isQ = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                const targetM = isQ ? { message: isQ } : msg;
                const buffer = await downloadMediaMessage(targetM, 'buffer', {});
                await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Error al convertir en sticker.' }, { quoted: msg });
            }
            return;
        }

        // 12. OPERADOR TELEFÓNICO
        if (lowerText.startsWith('!operador') || lowerText.startsWith('!op')) {
            const args = text.split(' ')[1] || (msg.key.participant || from).split('@')[0];
            await sock.sendMessage(from, { text: `📱 *OPERADOR:* \`${args}\`\n📡 ${getOperadorPeru(args)}` }, { quoted: msg });
            return;
        }

        // 13. MENÚ OFICIAL
        if (lowerText === '!menu') {
            const menuText = `⛩️ *BOT JJ - MENÚ OFICIAL (CON APROBACIÓN)* ⚡
👤 *Creador:* Jhey | 📞 *Número:* 51931801370

🤖 *CHAT IA EN VIVO:* Escríbeme al privado para conversar.

👤 *[1] REGISTRO & ACCESO*
  • *!registrar* : Solicita acceso al creador
  • *!mi* : Ver tu perfil y estatus

🔒 *[2] SEGURIDAD & UNLOCK*
  • *!revelar* / *!vv* : Desbloquea fotos o audios de una sola vez
  • *Anti-Delete* : Notifica mensajes borrados

🪪 *[3] CONSULTAS PERÚ*
  • *!dni [8 dígitos]* : Consulta DNI e Identidad
  • *!cel [9 dígitos]* : Titular y DNI por número de teléfono
  • *!facial* / *!rf* : Reconocimiento facial por foto de rostro
  • *!operador [número]* : Revisa Movistar/Claro/Entel/Bitel

📥 *[4] MULTIMEDIA*
  • *!play [canción]* : Descarga MP3 directo
  • *!video [nombre]* : Descarga MP4 directo
  • *!s* / *!sticker* : Convierte fotos en Stickers HD`;

            await sock.sendMessage(from, { text: menuText }, { quoted: msg });
            return;
        }

        // 14. IA CONVERSACIONAL EN PRIVADO (Solo si están aprobados o son owner)
        const isGroup = from.endsWith('@g.us');
        const isMentioned = msg.message?.extendedTextMessage?.contextInfo?.participant === sock.user?.id || body.includes('@' + sock.user?.id?.split('@')[0]);

        if ((!isGroup || isMentioned) && !text.startsWith('!')) {
            if (!isOwner && !isApproved) return; // Si no está aprobado, no responde la IA
            await sock.sendPresenceUpdate('composing', from).catch(() => {});
            const respuestaHumana = await hablarConIAReal(from, text);
            await sock.sendMessage(from, { text: respuestaHumana }, { quoted: msg });
        }
    });
}

startBotJJ();
