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
            <title>Vincular Bot JJ - V2 Estable</title>
            <meta http-equiv="refresh" content="5">
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background: #111; color: #fff; padding: 40px 20px; }
                .card { background: #222; border-radius: 12px; padding: 30px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                h1 { color: #25D366; }
                .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; background: #333; padding: 15px 25px; border-radius: 8px; border: 2px dashed #25D366; color: #FFD700; display: inline-block; margin: 20px 0; }
                p { color: #bbb; }
                button { background: #25D366; color: #111; border: none; padding: 12px 24px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🤖 BOT JJ - SERVIDOR ESTABLE V2</h1>
                <p>Número configurado: 51931801370</p>
                <div class="code">${currentPairingCode}</div>
                <p style="font-size: 13px; color: #888;">Servidor optimizado y activo sin errores.</p>
                <br>
                <button onclick="location.reload()">🔄 Actualizar Página</button>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Servidor web activo en el puerto ${PORT}`);
});

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs');
const axios = require('axios');
const pino = require('pino');

const msgCache = new Map();
let isAutoInvisible = false;

// Limpieza de sesión preventiva
if (fs.existsSync('session_jj')) {
    try {
        fs.rmSync('session_jj', { recursive: true, force: true });
    } catch (e) {}
}

function getOperadorPeru(numero) {
    const clean = (numero || '').replace(/[^0-9]/g, '');
    let num9 = clean;
    if (clean.startsWith('51') && clean.length === 11) num9 = clean.slice(2);
    if (num9.length !== 9 || !num9.startsWith('9')) return 'Número no válido para Perú';

    const pref3 = parseInt(num9.substring(0, 3));
    if ((pref3 >= 990 && pref3 <= 999) || (pref3 >= 980 && pref3 <= 989) || (pref3 >= 950 && pref3 <= 959) || (pref3 >= 975 && pref3 <= 979)) return 'Movistar 💙';
    if ((pref3 >= 940 && pref3 <= 949) || (pref3 >= 960 && pref3 <= 969) || (pref3 >= 930 && pref3 <= 939) || (pref3 >= 910 && pref3 <= 919)) return 'Claro ❤️';
    if ((pref3 >= 920 && pref3 <= 929) || (pref3 >= 981 && pref3 <= 983) || (pref3 >= 931 && pref3 <= 934)) return 'Entel 🧡';
    if ((pref3 >= 900 && pref3 <= 909) || (pref3 >= 925 && pref3 <= 929) || (pref3 >= 935 && pref3 <= 939)) return 'Bitel 💛';
    return 'Movistar / Claro / Entel / Bitel';
}

async function consultarIA(prompt) {
    try {
        const res = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(prompt)}&lc=es`, { timeout: 4000 });
        if (res.data && res.data.success) return res.data.success;
    } catch (e) {}
    
    try {
        const res2 = await axios.get(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}&owner=Jhey&botname=JJ`, { timeout: 4000 });
        if (res2.data && res2.data.response) return res2.data.response;
    } catch (e) {}

    return "Hola, en este momento Jhey no está disponible, pero soy su asistente virtual JJ. ¿En qué te puedo ayudar?";
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
        const phoneNumber = "51931801370";
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
        const type = Object.keys(msg.message)[0];
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
        const text = body.trim();
        const lowerText = text.toLowerCase();

        // 1. CONTROL DE ESTADO
        if (lowerText.startsWith('!estado ')) {
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

        // 2. ANTI-VIEWONCE
        if (lowerText === '!revelar' || lowerText === '!vv' || lowerText === '!veronce') {
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
                    await sock.sendMessage(from, { text: '❌ No se pudo descargar el archivo de una sola vez.' }, { quoted: msg });
                }
            } else {
                await sock.sendMessage(from, { text: '⚠️ Responde a una foto o audio de una sola vez con *!revelar*.' }, { quoted: msg });
            }
            return;
        }

        // 3. CONSULTA DNI
        if (lowerText.startsWith('!dni ')) {
            const dni = text.slice(5).trim();
            if (dni.length !== 8 || isNaN(dni)) {
                await sock.sendMessage(from, { text: '⚠️ Ingresa un DNI válido de 8 dígitos. Ejemplo: *!dni 12345678*' }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { text: `🔍 *Consultando DNI ${dni}...*` }, { quoted: msg });

            try {
                const res = await axios.get(`https://api.apis.net.pe/v1/dni?numero=${dni}`, { timeout: 6000 });
                if (res.data && res.data.numero) {
                    const d = res.data;
                    const respuesta = `👤 *RESULTADO CONSULTA DNI* 🇵🇪\n\n🪪 *DNI:* ${d.numero}\n👤 *Nombres:* ${d.nombres}\n👨 *Apellido Paterno:* ${d.apellidoPaterno}\n👩 *Apellido Materno:* ${d.apellidoMaterno}\n📛 *Completo:* ${d.nombres} ${d.apellidoPaterno} ${d.apellidoMaterno}`;
                    await sock.sendMessage(from, { text: respuesta }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: `⚠️ No se encontró información para el DNI *${dni}*.` }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: `❌ Servicio de RENIEC ocupado. Inténtalo en un momento.` }, { quoted: msg });
            }
            return;
        }

        // 4. DESCARGA MÚSICA MP3 (Rápido con API externa, sin cargado infinito)
        if (lowerText.startsWith('!play ')) {
            const query = text.slice(6).trim();
            if (!query) return sock.sendMessage(from, { text: '⚠️ Escribe el nombre de la canción. Ejemplo: *!play Feid Luna*' }, { quoted: msg });

            await sock.sendMessage(from, { text: `🎶 *Buscando:* "${query}"...` }, { quoted: msg });

            try {
                const searchRes = await axios.get(`https://api.popcat.xyz/song?q=${encodeURIComponent(query)}`, { timeout: 8000 });
                if (searchRes.data && searchRes.data.audio) {
                    await sock.sendMessage(from, { 
                        audio: { url: searchRes.data.audio }, 
                        mimetype: 'audio/mp4',
                        fileName: `${searchRes.data.title || 'cancion'}.mp3`
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: '❌ No se encontró el audio de esa canción.' }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Ocurrió un error al procesar la música.' }, { quoted: msg });
            }
            return;
        }

        // 5. STICKERS HD DIRECTOS (Sin necesitar ffmpeg)
        if ((lowerText === '!s' || lowerText === '!sticker') && (type === 'imageMessage' || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage)) {
            try {
                const isQ = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                const targetM = isQ ? { message: isQ } : msg;
                const buffer = await downloadMediaMessage(targetM, 'buffer', {});
                await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Error al generar el sticker.' }, { quoted: msg });
            }
            return;
        }

        // 6. OPERADOR TELEFÓNICO
        if (lowerText.startsWith('!operador') || lowerText.startsWith('!op')) {
            const args = text.split(' ')[1] || (msg.key.participant || from).split('@')[0];
            await sock.sendMessage(from, { text: `📱 *OPERADOR:* \`${args}\`\n📡 ${getOperadorPeru(args)}` }, { quoted: msg });
            return;
        }

        // 7. MENÚ PRINCIPAL
        if (lowerText === '!menu') {
            const menuText = `⛩️ *BOT JJ - MENÚ OFICIAL ESTABLE* ⚡
👤 *Creador:* Jhey | 📞 *Número:* 51931801370

🤖 *AUTO-IA:* Responde automáticamente en privado cuando estés ausente.

🔒 *[1] CONTROL*
  • *!estado invisible* | *!estado online*

👁️ *[2] SEGURIDAD & UTILIDADES*
  • *!revelar* / *!vv* : Revela fotos/audios de una sola vez
  • *!dni [8 dígitos]* : Consulta RENIEC Perú
  • *!operador [número]* : Revisa Movistar/Claro/Entel/Bitel

🎵 *[3] MULTIMEDIA*
  • *!play [canción]* : Descarga música MP3 rápido
  • *!s* / *!sticker* : Haz Stickers HD al instante`;

            await sock.sendMessage(from, { text: menuText }, { quoted: msg });
            return;
        }

        // 8. AUTO-RESPUESTA CON IA EN CHATS PRIVADOS (Cuando estés ausente)
        const isGroup = from.endsWith('@g.us');
        const isMentioned = msg.message?.extendedTextMessage?.contextInfo?.participant === sock.user?.id || body.includes('@' + sock.user?.id?.split('@')[0]);

        if ((!isGroup || isMentioned) && !text.startsWith('!')) {
            const respuestaIA = await consultarIA(text);
            await sock.sendMessage(from, { text: `🤖 *[JJ IA]*\n\n${respuestaIA}` }, { quoted: msg });
        }
    });
}

startBotJJ();
