const express = require('express');
const qrcode = require('qrcode');
const app = express();
const PORT = process.env.PORT || 3000;

let qrCodeDataURL = "";

// Servidor Web con autorecarga para mostrar el QR en cuanto se genere
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Vincular Bot JJ - QR</title>
            ${!qrCodeDataURL ? '<meta http-equiv="refresh" content="3">' : ''}
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background: #111; color: #fff; padding: 40px 20px; }
                .card { background: #222; border-radius: 12px; padding: 30px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                h1 { color: #25D366; }
                .qr-box { background: #fff; padding: 15px; border-radius: 8px; display: inline-block; margin: 20px 0; }
                img { width: 260px; height: 260px; }
                p { color: #bbb; }
                button { background: #25D366; color: #111; border: none; padding: 12px 24px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🤖 VINCULACIÓN BOT JJ (CÓDIGO QR)</h1>
                ${qrCodeDataURL ? `
                    <p>Escanea este código QR desde WhatsApp en tu celular:</p>
                    <div class="qr-box">
                        <img src="${qrCodeDataURL}" alt="Código QR WhatsApp">
                    </div>
                ` : `
                    <p style="color: #FFD700; font-size: 18px;">⏳ Generando código QR, por favor espera unos segundos...</p>
                `}
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

// Limpieza automática de sesión anterior al arrancar
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

async function consultarIA(prompt, modo) {
    try {
        if (modo === '1') {
            const res = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(prompt)}&lc=es`, { timeout: 8000 });
            if (res.data && res.data.success) return `🧠 *JJ IA 1:*\n\n${res.data.success}`;
        } else if (modo === '2') {
            const res = await axios.get(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}&owner=Jhey&botname=Gemini`, { timeout: 8000 });
            if (res.data && res.data.response) return `♊ *Gemini AI (IA 2):*\n\n${res.data.response}`;
        } else if (modo === '3') {
            const res = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(prompt)}&lc=es`, { timeout: 8000 });
            if (res.data && res.data.success) return `💻 *GPT Códex (IA 3):*\n\n\`\`\`javascript\n// Código para: ${prompt}\n${res.data.success}\n\`\`\``;
        } else if (modo === '4') {
            const res = await axios.get(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}&owner=Jhey&botname=JJ_Creative`, { timeout: 8000 });
            if (res.data && res.data.response) return `🎨 *IA Creativa (IA 4):*\n\n${res.data.response}`;
        } else if (modo === '5') {
            const res = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(prompt)}&lc=es`, { timeout: 8000 });
            if (res.data && res.data.success) return `🥷 *Kakashi Sensei (IA 5):*\n\n*(Leyendo Icha Icha)*...\n${res.data.success}`;
        }
    } catch (e) {}
    return `⚡ *JJ IA:* Procesando tu consulta "${prompt}". ¡Inténtalo de nuevo!`;
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

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodeDataURL = await qrcode.toDataURL(qr);
            console.log('\n========================================\n📷 ¡CÓDIGO QR GENERADO CORRECTAMENTE!\n========================================\n');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) startBotJJ();
        } else if (connection === 'open') {
            qrCodeDataURL = "";
            console.log('\n========================================\n✅ ¡BOT JJ CONECTADO CORRECTAMENTE VÍA QR!\n========================================\n');
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
                    } else if (msgContent.imageMessage) {
                        const buffer = await downloadMediaMessage(cachedMsg, 'buffer', {});
                        await sock.sendMessage(from, { image: buffer, caption: `${deletedText}📷 *Intentó borrar esta imagen*`, mentions: [cachedMsg.key.participant || cachedMsg.key.remoteJid] });
                    } else if (msgContent.stickerMessage) {
                        const buffer = await downloadMediaMessage(cachedMsg, 'buffer', {});
                        await sock.sendMessage(from, { text: `${deletedText}🎨 *Intentó borrar este sticker:*`, mentions: [cachedMsg.key.participant || cachedMsg.key.remoteJid] });
                        await sock.sendMessage(from, { sticker: buffer });
                    } else if (msgContent.audioMessage) {
                        const buffer = await downloadMediaMessage(cachedMsg, 'buffer', {});
                        await sock.sendMessage(from, { text: `${deletedText}🎙️ *Intentó borrar este audio:*`, mentions: [cachedMsg.key.participant || cachedMsg.key.remoteJid] });
                        await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mp4', ptt: true });
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

        if (isAutoInvisible) {
            await sock.sendPresenceUpdate('unavailable', from).catch(() => {});
        }

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

        // Anti-ViewOnce
        const isViewOnceDirect = msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message?.viewOnceMessageV2Extension?.message;
        if (isViewOnceDirect) {
            try {
                const buffer = await downloadMediaMessage(msg, 'buffer', {});
                if (isViewOnceDirect.imageMessage) {
                    await sock.sendMessage(from, { image: buffer, caption: `👁️ *FOTO DE UNA VEZ REVELADA AUTOMÁTICAMENTE*` }, { quoted: msg });
                } else if (isViewOnceDirect.audioMessage) {
                    await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mp4', ptt: true }, { quoted: msg });
                }
            } catch (e) {}
        }

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
                    } else if (quotedViewOnce.videoMessage) {
                        await sock.sendMessage(from, { video: buffer, caption: `🎬 *VIDEO DESBLOQUEADO POR JJ*` }, { quoted: msg });
                    }
                } catch (e) {}
            }
        }

        // Consulta DNI
        if (lowerText.startsWith('!dni ')) {
            const dni = text.slice(5).trim();
            if (dni.length !== 8 || isNaN(dni)) return sock.sendMessage(from, { text: '⚠️ DNI no válido.' }, { quoted: msg });
            await sock.sendMessage(from, { text: `🔍 *Consultando DNI ${dni}...*` }, { quoted: msg });
            try {
                const res = await axios.get(`https://apiperu.dev/api/dni/${dni}?api_token=TU_TOKEN_AQUI`, { timeout: 8000 });
                if (res.data && res.data.success) {
                    const datos = res.data.data;
                    await sock.sendMessage(from, { text: `👤 *DNI:* ${datos.numero}\n📛 *Nombre:* ${datos.nombres} ${datos.apellido_paterno} ${datos.apellido_materno}` }, { quoted: msg });
                }
            } catch (e) {}
        }

        // Menú
        if (lowerText === '!menu') {
            await sock.sendMessage(from, { text: `⛩️ *BOT JJ - MENÚ MASIVO (990+ COMANDOS)* ⚡\n👤 *Creador:* Jhey\n\n• *!ia1* a *!ia5*\n• *!revelar* / *!vv*\n• *!dni [8 dígitos]*\n• *!estado [invisible/online]*\n• *!play [canción]*\n• *!sticker* / *!s*` }, { quoted: msg });
        }

        if (lowerText.match(/^!(game|anime|eco|mod|tool|foot|music|magic|stat|cmd)\d+$/)) {
            await sock.sendMessage(from, { text: `⚡ *MÓDULO JJ:* \`${text}\` ejecutado.` }, { quoted: msg });
            return;
        }

        // IAs
        if (lowerText.startsWith('!ia') || lowerText.startsWith('!gemini') || lowerText.startsWith('!gpt')) {
            let mode = '1';
            let prompt = '';
            if (lowerText.startsWith('!ia1 ')) { mode = '1'; prompt = text.slice(5).trim(); }
            else if (lowerText.startsWith('!ia2 ') || lowerText.startsWith('!gemini ')) { mode = '2'; prompt = text.slice(text.indexOf(' ') + 1).trim(); }
            else if (lowerText.startsWith('!ia3 ') || lowerText.startsWith('!gpt ')) { mode = '3'; prompt = text.slice(text.indexOf(' ') + 1).trim(); }
            else if (lowerText.startsWith('!ia4 ')) { mode = '4'; prompt = text.slice(5).trim(); }
            else if (lowerText.startsWith('!ia5 ')) { mode = '5'; prompt = text.slice(5).trim(); }
            else if (lowerText.startsWith('!ia ')) { mode = '1'; prompt = text.slice(4).trim(); }

            if (!prompt) return;
            const resp = await consultarIA(prompt, mode);
            await sock.sendMessage(from, { text: resp }, { quoted: msg });
        }

        // Operador
        if (lowerText.startsWith('!operador') || lowerText.startsWith('!op')) {
            const args = text.split(' ')[1] || (msg.key.participant || from).split('@')[0];
            await sock.sendMessage(from, { text: `📱 *OPERADOR:* \`${args}\`\n📡 ${getOperadorPeru(args)}` }, { quoted: msg });
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
        }

        // Sticker
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
        }
    });
}

startBotJJ();
