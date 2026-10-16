process.on('uncaughtException', (err) => {
    console.error('Error prevenido:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Rechazo prevenido:', reason);
});

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
            <title>Bot JJ - Estado</title>
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
                <h1>🤖 BOT JJ - SERVIDOR ACTIVO</h1>
                <p>Owner: Jhey (51931801370)</p>
                <div class="code">${currentPairingCode}</div>
                <p style="font-size: 13px; color: #888;">Estado: En línea sin errores</p>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado exitosamente en puerto ${PORT}`);
});

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs');
const axios = require('axios');
const pino = require('pino');

const msgCache = new Map();
const memoryIA = new Map();
const usuariosDB = new Map();
let isAutoInvisible = false;

const OWNER_NUM = "51931801370";

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

async function hablarConIAReal(userId, prompt) {
    if (!memoryIA.has(userId)) memoryIA.set(userId, []);
    let userHistory = memoryIA.get(userId);

    userHistory.push({ role: 'user', content: prompt });
    if (userHistory.length > 10) userHistory.shift();

    try {
        const fullPrompt = userHistory.map(m => `${m.role === 'user' ? 'Usuario' : 'JJ'}:${m.content}`).join('\n');
        const systemInstruction = "Eres JJ, un asistente peruano inteligente, conversacional, directo y amigable.";

        const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?system=${encodeURIComponent(systemInstruction)}`, { timeout: 6000 });
        if (res.data && typeof res.data === 'string' && res.data.trim().length > 0) {
            const respuestaText = res.data.trim();
            userHistory.push({ role: 'assistant', content: respuestaText });
            return respuestaText;
        }
    } catch (e) {}

    return "Habla causa, dime qué me decías que se cortó un segundo la señal.";
}

async function startBotJJ() {
    try {
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

            if (lowerText === '!registrar' || lowerText === '!reg') {
                if (userNum === OWNER_NUM) {
                    await sock.sendMessage(from, { text: `👑 Hola Jhey, tú eres el Creador del Bot JJ.` }, { quoted: msg });
                    return;
                }
                if (usuariosDB.has(userNum)) {
                    await sock.sendMessage(from, { text: `✅ Ya estás registrado y aprobado. Escribe *!mi* para ver tu perfil.` }, { quoted: msg });
                    return;
                }
                await sock.sendMessage(from, { text: `⏳ *SOLICITUD ENVIADA AL CREADOR*\n\nHola *${pushName}*, tu solicitud fue enviada a Jhey para su aprobación.` }, { quoted: msg });
                
                const ownerJid = OWNER_NUM + '@s.whatsapp.net';
                await sock.sendMessage(ownerJid, { text: `🔔 *SOLICITUD DE REGISTRO*\n\n👤 *Nombre:* ${pushName}\n📱 *Número:* +${userNum}\n\nPara aprobarlo escribe:\n👉 \`!aprobar ${userNum}\`` });
                return;
            }

            if (lowerText.startsWith('!aprobar ')) {
                if (userNum !== OWNER_NUM) return;
                const targetNum = text.replace('!aprobar', '').trim().replace(/[^0-9]/g, '');
                if (!targetNum) return;

                usuariosDB.set(targetNum, {
                    nombre: 'Aprobado',
                    numero: targetNum,
                    fecha: new Date().toLocaleDateString('es-PE'),
                    rango: 'VIP 👑',
                    creditos: 'Ilimitados (∞)'
                });

                await sock.sendMessage(from, { text: `✅ Usuario +${targetNum} aprobado con éxito.` }, { quoted: msg });
                try {
                    await sock.sendMessage(targetNum + '@s.whatsapp.net', { text: `🎉 ¡Tu solicitud fue aprobada por Jhey! Escribe *!menu* para empezar.` });
                } catch (e) {}
                return;
            }

            if (lowerText === '!mi' || lowerText === '!perfil') {
                if (userNum === OWNER_NUM) {
                    await sock.sendMessage(from, { text: `💳 *PERFIL CREADOR*\n👑 Rango: Owner\n💎 Créditos: Ilimitados (∞)` }, { quoted: msg });
                    return;
                }
                const userData = usuariosDB.get(userNum);
                if (!userData) {
                    await sock.sendMessage(from, { text: `❌ No estás registrado. Escribe *!registrar*` }, { quoted: msg });
                    return;
                }
                await sock.sendMessage(from, { text: `💳 *PERFIL*\n👤 ${userData.nombre}\n💎 Créditos: ${userData.creditos}\n✅ Estatus: Aprobado` }, { quoted: msg });
                return;
            }

            const isOwner = userNum === OWNER_NUM;
            const isApproved = usuariosDB.has(userNum);
            const isPublic = lowerText === '!menu' || lowerText.startsWith('!registrar') || lowerText.startsWith('!reg');

            if (!isOwner && !isApproved && text.startsWith('!') && !isPublic) {
                await sock.sendMessage(from, { text: `⚠️ Acceso restringido. Escribe *!registrar* para pedir permiso a Jhey.` }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!dni ')) {
                const dni = text.slice(5).trim();
                if (dni.length !== 8 || isNaN(dni)) {
                    await sock.sendMessage(from, { text: `⚠️ Ingresa un DNI de 8 dígitos. Ej: *!dni 12345678*` }, { quoted: msg });
                    return;
                }
                await sock.sendMessage(from, { text: generarDNIFalso(dni) }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!cel ') || lowerText.startsWith('!telefono ')) {
                const num = text.replace(/^!(cel|telefono)\s*/i, '').trim();
                await sock.sendMessage(from, { text: generarTitularTelefono(num) }, { quoted: msg });
                return;
            }

            if (lowerText === '!facial' || lowerText === '!rf') {
                await sock.sendMessage(from, { text: generarFacialSintetico() }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!play ')) {
                const q = text.slice(6).trim();
                try {
                    const res = await axios.get(`https://api.popcat.xyz/song?q=${encodeURIComponent(q)}`, { timeout: 8000 });
                    if (res.data && res.data.audio) {
                        await sock.sendMessage(from, { audio: { url: res.data.audio }, mimetype: 'audio/mp4' }, { quoted: msg });
                        return;
                    }
                } catch (e) {}
                await sock.sendMessage(from, { text: `❌ No se pudo descargar el audio.` }, { quoted: msg });
                return;
            }

            if (lowerText.startsWith('!video ')) {
                const q = text.slice(7).trim();
                try {
                    const res = await axios.get(`https://api.popcat.xyz/song?q=${encodeURIComponent(q)}`, { timeout: 10000 });
                    if (res.data && res.data.media) {
                        await sock.sendMessage(from, { video: { url: res.data.media }, caption: `🎬 Video: ${q}` }, { quoted: msg });
                        return;
                    }
                } catch (e) {}
                await sock.sendMessage(from, { text: `❌ No se pudo descargar el video.` }, { quoted: msg });
                return;
            }

            if ((lowerText === '!s' || lowerText === '!sticker') && (type === 'imageMessage' || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage)) {
                try {
                    const isQ = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    const targetM = isQ ? { message: isQ } : msg;
                    const buffer = await downloadMediaMessage(targetM, 'buffer', {});
                    await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
                } catch (e) {
                    await sock.sendMessage(from, { text: `❌ Error al generar el sticker.` }, { quoted: msg });
                }
                return;
            }

            if (lowerText === '!revelar' || lowerText === '!vv') {
                const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                const quotedViewOnce = quotedMsg?.viewOnceMessage?.message || quotedMsg?.viewOnceMessageV2?.message;
                if (quotedViewOnce) {
                    try {
                        const buffer = await downloadMediaMessage({ message: quotedMsg }, 'buffer', {});
                        if (quotedViewOnce.imageMessage) {
                            await sock.sendMessage(from, { image: buffer, caption: `👁️ Foto revelada` }, { quoted: msg });
                        }
                    } catch (e) {}
                }
                return;
            }

            if (lowerText === '!menu') {
                const menu = `⛩️ *BOT JJ - OFICIAL* ⚡
👤 *Creador:* Jhey | 📞 51931801370

👤 *REGISTRO & ACCESO*
• *!registrar* : Solicita acceso al creador
• *!mi* : Ver perfil y créditos

🪪 *CONSULTAS PERÚ*
• *!dni [8 dígitos]*
• *!cel [9 dígitos]*
• *!facial* / *!rf*
• *!operador [número]*

📥 *MULTIMEDIA*
• *!play [canción]*
• *!video [nombre]*
• *!s* / *!sticker*
• *!revelar* / *!vv*`;

                await sock.sendMessage(from, { text: menu }, { quoted: msg });
                return;
            }

            const isGroup = from.endsWith('@g.us');
            const isMentioned = msg.message?.extendedTextMessage?.contextInfo?.participant === sock.user?.id || body.includes('@' + sock.user?.id?.split('@')[0]);

            if ((!isGroup || isMentioned) && !text.startsWith('!')) {
                if (!isOwner && !isApproved) return;
                await sock.sendPresenceUpdate('composing', from).catch(() => {});
                const respuestaHumana = await hablarConIAReal(from, text);
                await sock.sendMessage(from, { text: respuestaHumana }, { quoted: msg });
            }
        });
    } catch (err) {
        console.error("Error al iniciar Baileys:", err);
    }
}

startBotJJ();
