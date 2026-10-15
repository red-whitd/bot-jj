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
            <title>Vincular Bot JJ - Auto IA</title>
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
                <h1>🤖 VINCULACIÓN BOT JJ - AUTO RESPUESTA IA</h1>
                <p>Número configurado: 51931801370</p>
                <div class="code">${currentPairingCode}</div>
                <p style="font-size: 13px; color: #888;">La página se actualiza sola para mostrar el código...</p>
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
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const pino = require('pino');

const msgCache = new Map();
let isAutoInvisible = false;

// Limpieza automática de sesión corrupta al iniciar
if (fs.existsSync('session_jj')) {
    try {
        fs.rmSync('session_jj', { recursive: true, force: true });
        console.log('🧹 Sesión anterior limpiada con éxito.');
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
        const res = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(prompt)}&lc=es`, { timeout: 8000 });
        if (res.data && res.data.success) {
            return res.data.success;
        }
    } catch (e) {}
    try {
        const res2 = await axios.get(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}&owner=Jhey&botname=JJ`, { timeout: 8000 });
        if (res2.data && res2.data.response) {
            return res2.data.response;
        }
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
        const phoneNumber = "51931801370"; // NUEVO NÚMERO CONFIGURADO
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                currentPairingCode = code;
                console.log(`\n========================================\n🔑 CÓDIGO DE VINCULACIÓN: [ ${code} ]\n========================================\n`);
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
            console.log('\n========================================\n✅ ¡BOT JJ CONECTADO CORRECTAMENTE!\n========================================\n');
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

        // Control de Estado (!estado)
        if (lowerText.startsWith('!estado ')) {
            const modoEstado = text.slice(8).trim().toLowerCase();
            if (modoEstado === 'invisible' || modoEstado === 'offline') {
                isAutoInvisible = true;
                await sock.sendPresenceUpdate('unavailable', from).catch(() => {});
                await sock.sendMessage(from, { text: '🕵️ *MODO INVISIBLE ACTIVADO:* Oculto.' }, { quoted: msg });
            } else if (modoEstado === 'online' || modoEstado === 'visible') {
                isAutoInvisible = false;
                await sock.sendPresenceUpdate('available', from).catch(() => {});
                await sock.sendMessage(from, { text: '🟢 *MODO ONLINE ACTIVADO:* En Línea.' }, { quoted: msg });
            }
            return;
        }

        // Anti-ViewOnce Automático
        const isViewOnceDirect = msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message?.viewOnceMessageV2Extension?.message;
        if (isViewOnceDirect) {
            try {
                const buffer = await downloadMediaMessage(msg, 'buffer', {});
                if (isViewOnceDirect.imageMessage) {
                    await sock.sendMessage(from, { image: buffer, caption: `👁️ *FOTO DE UNA VEZ REVELADA AUTOMÁTICAMENTE*` }, { quoted: msg });
                }
            } catch (e) {}
        }

        // Comando Revelar (!revelar / !vv)
        if (lowerText === '!revelar' || lowerText === '!vv' || lowerText === '!veronce') {
            const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedViewOnce = quotedMsg?.viewOnceMessage?.message || quotedMsg?.viewOnceMessageV2?.message || quotedMsg?.viewOnceMessageV2Extension?.message;

            if (quotedViewOnce) {
                try {
                    const buffer = await downloadMediaMessage({ message: quotedMsg }, 'buffer', {});
                    if (quotedViewOnce.imageMessage) {
                        await sock.sendMessage(from, { image: buffer, caption: `👁️ *FOTO DESBLOQUEADA POR JJ*` }, { quoted: msg });
                    }
                } catch (e) {}
            }
            return;
        }

        // Consulta DNI Estable
        if (lowerText.startsWith('!dni ')) {
            const dni = text.slice(5).trim();
            if (dni.length !== 8 || isNaN(dni)) {
                await sock.sendMessage(from, { text: '⚠️ Ingresa un DNI válido de 8 dígitos. Ejemplo: *!dni 12345678*' }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { text: `🔍 *Consultando DNI ${dni}...*` }, { quoted: msg });

            try {
                const res = await axios.get(`https://api.apis.net.pe/v1/dni?numero=${dni}`, { timeout: 8000 });
                if (res.data && res.data.numero) {
                    const d = res.data;
                    const respuesta = `👤 *RESULTADO CONSULTA DNI* 🇵🇪\n\n🪪 *DNI:* ${d.numero}\n👤 *Nombres:* ${d.nombres}\n👨 *Apellido Paterno:* ${d.apellidoPaterno}\n👩 *Apellido Materno:* ${d.apellidoMaterno}\n📛 *Completo:* ${d.nombres} ${d.apellidoPaterno} ${d.apellidoMaterno}`;
                    await sock.sendMessage(from, { text: respuesta }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: `⚠️ No se encontró información para el DNI *${dni}*.` }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: `❌ Servicio temporalmente ocupado.` }, { quoted: msg });
            }
            return;
        }

        // Menú Masivo
        if (lowerText === '!menu') {
            const menuText = `⛩️ *BOT JJ - MENÚ MASIVO* ⚡\n👤 *Creador:* Jhey | 📞 *Número:* 51931801370\n\n🤖 *AUTO-IA ACTIVA:* Responde automáticamente a cualquier chat privado cuando estés ausente.\n\n• *!estado [invisible/online]*\n• *!dni [8 dígitos]*\n• *!revelar* / *!vv* (Anti-ViewOnce)\n• *!play [canción]*\n• *!s* (Stickers)`;
            await sock.sendMessage(from, { text: menuText }, { quoted: msg });
            return;
        }

        // Play MP3
        if (lowerText.startsWith('!play ')) {
            const query = text.slice(6).trim();
            if (!query) return;
            const outputFile = `./play_${Date.now()}.mp3`;
            exec(`yt-dlp "ytsearch1:${query}" -x --audio-format mp3 -o "${outputFile}"`, async (err) => {
                if (!err && fs.existsSync(outputFile)) {
                    await sock.sendMessage(from, { audio: fs.readFileSync(outputFile), mimetype: 'audio/mp4' }, { quoted: msg });
                    fs.unlinkSync(outputFile);
                }
            });
            return;
        }

        // Stickers HD
        if ((lowerText === '!s' || lowerText === '!sticker') && (type === 'imageMessage' || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage)) {
            try {
                const isQ = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                const targetM = isQ ? { message: isQ } : msg;
                const buffer = await downloadMediaMessage(targetM, 'buffer', {});
                fs.writeFileSync('./temp.jpg', buffer);
                exec(`ffmpeg -i ./temp.jpg -vcodec libwebp -filter:v "scale='min(320,iw)':min(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=0x00000000" ./temp.webp`, async (err) => {
                    if (!err && fs.existsSync('./temp.webp')) {
                        await sock.sendMessage(from, { sticker: fs.readFileSync('./temp.webp') }, { quoted: msg });
                        fs.unlinkSync('./temp.jpg');
                        fs.unlinkSync('./temp.webp');
                    }
                });
            } catch (e) {}
            return;
        }

        // 🧠 RESPUESTA AUTOMÁTICA DE IA EN CHATS PRIVADOS (Cuando no usas comandos)
        const isGroup = from.endsWith('@g.us');
        const isMentioned = msg.message?.extendedTextMessage?.contextInfo?.participant === sock.user?.id || body.includes('@' + sock.user?.id?.split('@')[0]);

        if (!isGroup || isMentioned) {
            const respuestaIA = await consultarIA(text);
            await sock.sendMessage(from, { text: `🤖 *[Respuesta Automática JJ]*\n\n${respuestaIA}` }, { quoted: msg });
        }
    });
}

startBotJJ();
