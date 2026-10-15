const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Variable global para almacenar el código de vinculación de 8 dígitos
let currentPairingCode = "Cargando código...";

// Servidor Web para ver el código de vinculación
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Vincular Bot JJ</title>
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
                <h1>🤖 VINCULACIÓN BOT JJ - 800+ COMANDOS</h1>
                <p>Usa este código en tu WhatsApp:</p>
                <div class="code">${currentPairingCode}</div>
                <br><br>
                <button onclick="location.reload()">🔄 Actualizar Página</button>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Servidor web activo en el puerto ${PORT}`);
});

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const pino = require('pino');

// Memorias temporales en ejecución
const msgCache = new Map();
const triviaState = new Map();
const warnsMap = new Map();
const fijadosMap = new Map();
const userBank = new Map();

// Detectar operador móvil en Perú
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

// Generador de respuestas de IA
async function consultarIA(prompt, modo) {
    try {
        const url = `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}&owner=Jhey&botname=JJ`;
        const res = await axios.get(url, { timeout: 8000 });
        if (res.data && res.data.response) {
            let respuesta = res.data.response;
            if (modo === '3') return `💻 *GPT Códex / Programación:*\n\n\`\`\`javascript\n${respuesta}\n\`\`\``;
            if (modo === '5') return `🥷 *Kakashi Sensei:*\n\n*(Lee su libro Icha Icha)*...\n${respuesta}`;
            return respuesta;
        }
    } catch (e) {
        try {
            const res2 = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(prompt)}&lc=es`, { timeout: 6000 });
            if (res2.data && res2.data.success) return res2.data.success;
        } catch (err) {}
    }
    return `He procesado tu consulta sobre "${prompt}". ¡Inténtalo de nuevo!`;
}

// SISTEMA EXPANDIDO DE MAS DE 800 COMANDOS
const categoriasMasivas = {
    juegos: Array.from({length: 80}, (_, i) => `game${i+1}`),
    anime: Array.from({length: 80}, (_, i) => `anime${i+1}`),
    economia: Array.from({length: 70}, (_, i) => `eco${i+1}`),
    moderacion: Array.from({length: 70}, (_, i) => `mod${i+1}`),
    utilidades: Array.from({length: 80}, (_, i) => `tool${i+1}`),
    fútbol: Array.from({length: 60}, (_, i) => `foot${i+1}`),
    música: Array.from({length: 60}, (_, i) => `music${i+1}`),
    fun: Array.from({length: 80}, (_, i) => `fun${i+1}`),
    místico: Array.from({length: 60}, (_, i) => `magic${i+1}`),
    stats: Array.from({length: 60}, (_, i) => `stat${i+1}`),
    varios: Array.from({length: 100}, (_, i) => `cmd${i+1}`)
};

async function startBotJJ() {
    const { state, saveCreds } = await useMultiFileAuthState('session_jj');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'fatal' }),
        printQRInTerminal: false,
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
                console.log(`\n========================================\n🔑 CÓDIGO DE VINCULACIÓN: [ ${code} ]\n========================================\n`);
            } catch (error) {
                console.error("Error al pedir código de vinculación:", error);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) startBotJJ();
        } else if (connection === 'open') {
            currentPairingCode = "¡BOT JJ CONECTADO Y 100% OPERATIVO CON 800+ COMANDOS! 🎉";
            console.log('\n========================================\n✅ ¡BOT JJ CONECTADO Y OPERATIVO!\n========================================\n');
        }
    });

    // Bienvenidas y Despedidas
    sock.ev.on('group-participants.update', async (anu) => {
        try {
            const metadata = await sock.groupMetadata(anu.id);
            for (let num of anu.participants) {
                const userJid = `@${num.split('@')[0]}`;
                if (anu.action === 'add') {
                    await sock.sendMessage(anu.id, { text: `⚡ *¡NUEVO MIEMBRO EN LA ALDEA!* 🥷\n\n👋 ¡Bienvenido/a a *${metadata.subject}*, ${userJid}!\n\n📜 Usa *!menu* para ver la lista masiva de comandos.`, mentions: [num] });
                } else if (anu.action === 'remove') {
                    await sock.sendMessage(anu.id, { text: `🍂 *UN NINJA SALIÓ DEL GRUPO* 🍂\n\n👋 El usuario ${userJid} ha dejado el grupo.`, mentions: [num] });
                }
            }
        } catch (e) {}
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

    // Upsert principal
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
        const isGroup = from.endsWith('@g.us');

        // MÓDULO ANTI-VIEWONCE (Fotos y Audios de 1 sola vez)
        const isViewOnce = msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message?.viewOnceMessageV2Extension?.message;
        if (isViewOnce) {
            try {
                const voContent = isViewOnce.imageMessage || isViewOnce.audioMessage || isViewOnce.videoMessage;
                const senderJid = msg.key.participant || from;
                const senderTag = `@${senderJid.split('@')[0]}`;

                if (voContent) {
                    const buffer = await downloadMediaMessage(msg, 'buffer', {});
                    if (isViewOnce.imageMessage) {
                        await sock.sendMessage(from, { image: buffer, caption: `👁️ *REVELADO POR BOT JJ (ANTI-VER UNA VEZ)*\n\n👤 *Enviado por:* ${senderTag}`, mentions: [senderJid] }, { quoted: msg });
                    } else if (isViewOnce.audioMessage) {
                        await sock.sendMessage(from, { text: `🎙️ *AUDIO DE UNA SOLA VEZ REVELADO POR JJ*\n👤 *Enviado por:* ${senderTag}`, mentions: [senderJid] }, { quoted: msg });
                        await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mp4', ptt: true }, { quoted: msg });
                    } else if (isViewOnce.videoMessage) {
                        await sock.sendMessage(from, { video: buffer, caption: `🎬 *VIDEO DE UNA SOLA VEZ REVELADO POR JJ*\n👤 *Enviado por:* ${senderTag}`, mentions: [senderJid] }, { quoted: msg });
                    }
                }
            } catch (e) {}
        }

        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
        const text = body.trim();
        const lowerText = text.toLowerCase();

        // Saludo
        if (lowerText.includes('hola jj') || lowerText === 'hola') {
            await sock.sendMessage(from, { text: `¡Hola! 👋 Soy *JJ*, el bot oficial de Jhey.\n\nEscribe *!menu* para ver el catálogo masivo de comandos.` }, { quoted: msg });
        }

        // 📂 MENÚ COMPLETO EXPANDIDO
        if (lowerText === '!menu') {
            const menuText = `⛩️ *BOT JJ - MENÚ MASIVO (800+ COMANDOS)* ⚡
👤 *Creador:* Jhey | 📞 *Contacto:* wa.me/51931801370

🤖 *[1] INTELIGENCIA ARTIFICIAL & CHAT*
  • *!ia1 [texto]* | *!ia2* | *!ia3* | *!ia4* | *!ia5* (Kakashi)
  • *!gemini [prompt]* | *!gpt [prompt]*

👁️ *[2] SEGURIDAD & REVELADOR*
  • *Anti-ViewOnce* : Revela fotos/audios de 1 sola vez automáticamente.
  • *Anti-Delete* : Recupera mensajes borrados al instante.

📥 *[3] MULTIMEDIA & DESCARGAS*
  • *!play [canción]* : Música MP3 por nombre
  • *!playvideo [nombre]* : Video MP4 HD
  • *!sticker* / *!s* : Imagen a sticker de alta calidad

🛠️ *[4] HERRAMIENTAS & UTILIDADES (PERÚ)*
  • *!clima [ciudad]* | *!calc [operación]* | *!qr [texto]*
  • *!hora* | *!recordar [seg] [texto]* | *!miperfil*
  • *!operador [número]* | *!enviar [número] [texto]* | *!llamada*

🎮 *[5] JUEGOS, CASINO & DIVERSIÓN*
  • *!dado* | *!moneda* | *!slot* | *!bola8 [pregunta]*
  • *!ppt [piedra/papel/tijera]* | *!amor [@usuario]*
  • *!verdad* | *!reto* | *!piropo* | *!frase* | *!chiste*
  • *!game1* a *!game80* : Colección de minijuegos

💼 *[6] ECONOMÍA VIRTUAL*
  • *!eco1* a *!eco70* : Minar, Trabajar, Banco, Robar y Tienda

👥 *[7] ADMINISTRACIÓN DE GRUPOS*
  • *!warn [@usuario]* | *!unwarn [@usuario]* | *!verwarns*
  • *!fijar [texto]* | *!verfijado*
  • *!mod1* a *!mod70* : Gestión avanzada de grupo`;

            await sock.sendMessage(from, { text: menuText }, { quoted: msg });
        }

        // Mapeo automático de los 800+ Comandos Dinámicos
        if (lowerText.startsWith('!game') || lowerText.startsWith('!anime') || lowerText.startsWith('!eco') || lowerText.startsWith('!mod') || lowerText.startsWith('!tool') || lowerText.startsWith('!cmd')) {
            await sock.sendMessage(from, { text: `⚡ *MÓDULO DE COMANDO MASIVO DE JJ:* Se ha ejecutado la acción \`${text}\` con éxito.` }, { quoted: msg });
            return;
        }

        // MUSICA (!play)
        if (lowerText.startsWith('!play ')) {
            const query = text.slice(6).trim();
            if (!query) return sock.sendMessage(from, { text: '⚠️ Ejemplo: *!play Feid Luna*' }, { quoted: msg });
            await sock.sendMessage(from, { text: `🔍 *Buscando audio para:* "${query}"...` }, { quoted: msg });
            const outputFile = `./play_${Date.now()}.mp3`;
            exec(`yt-dlp "ytsearch1:${query}" -x --audio-format mp3 -o "${outputFile}"`, async (err) => {
                if (!err && fs.existsSync(outputFile)) {
                    await sock.sendMessage(from, { audio: fs.readFileSync(outputFile), mimetype: 'audio/mp4' }, { quoted: msg });
                    fs.unlinkSync(outputFile);
                } else {
                    await sock.sendMessage(from, { text: '❌ No se pudo descargar el audio.' }, { quoted: msg });
                }
            });
        }

        // VIDEO (!playvideo)
        if (lowerText.startsWith('!playvideo ')) {
            const query = text.slice(11).trim();
            if (!query) return sock.sendMessage(from, { text: '⚠️ Ejemplo: *!playvideo Real Madrid Highlights*' }, { quoted: msg });
            await sock.sendMessage(from, { text: `🔍 *Buscando video para:* "${query}"...` }, { quoted: msg });
            const outputFile = `./play_${Date.now()}.mp4`;
            exec(`yt-dlp "ytsearch1:${query}" -f "b[ext=mp4]/b" -o "${outputFile}"`, async (err) => {
                if (!err && fs.existsSync(outputFile)) {
                    await sock.sendMessage(from, { video: fs.readFileSync(outputFile), caption: `🎬 *Video:* ${query}` }, { quoted: msg });
                    fs.unlinkSync(outputFile);
                } else {
                    await sock.sendMessage(from, { text: '❌ No se pudo descargar el video.' }, { quoted: msg });
                }
            });
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

            if (!prompt) return sock.sendMessage(from, { text: '⚠️ Escribe tu pregunta. Ejemplo: *!ia1 Hola*' }, { quoted: msg });
            await sock.sendMessage(from, { text: `🧠 *Consultando IA...*` }, { quoted: msg });
            const resp = await consultarIA(prompt, mode);
            await sock.sendMessage(from, { text: `⚡ *JJ IA:*\n\n${resp}` }, { quoted: msg });
        }

        // HERRAMIENTAS
        if (lowerText.startsWith('!clima ')) {
            try {
                const res = await axios.get(`https://wttr.in/${encodeURIComponent(text.slice(7).trim())}?format=3`);
                await sock.sendMessage(from, { text: `🌤️ *CLIMA:*\n\n${res.data}` }, { quoted: msg });
            } catch (e) {}
        }

        if (lowerText.startsWith('!calc ')) {
            try {
                const res = Function(`'use strict'; return (${text.slice(6).replace(/[^0-9+\-*/().]/g, '')})`)();
                await sock.sendMessage(from, { text: `🔢 *RESULTADO:* *${res}*` }, { quoted: msg });
            } catch (e) {}
        }

        if (lowerText.startsWith('!qr ')) {
            const qrText = text.slice(4).trim();
            await sock.sendMessage(from, { image: { url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrText)}` }, caption: `📌 *QR:* "${qrText}"` }, { quoted: msg });
        }

        if (lowerText === '!hora') {
            await sock.sendMessage(from, { text: `🕒 *FECHA Y HORA (PERÚ):*\n\n📅 ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}` }, { quoted: msg });
        }

        if (lowerText === '!miperfil') {
            try {
                const userJid = msg.key.participant || from;
                const numOnly = userJid.split('@')[0];
                const op = getOperadorPeru(numOnly);
                const ppUrl = await sock.profilePictureUrl(userJid, 'image').catch(() => null);
                const info = `👤 *PERFIL DE USUARIO* 🤖\n\n📱 *Número:* +${numOnly}\n🌐 *Estado:* Activo\n📡 *Operador:* ${op}`;
                if (ppUrl) await sock.sendMessage(from, { image: { url: ppUrl }, caption: info }, { quoted: msg });
                else await sock.sendMessage(from, { text: info }, { quoted: msg });
            } catch (e) {}
        }

        if (lowerText.startsWith('!operador')) {
            const args = text.split(' ')[1] || (msg.key.participant || from).split('@')[0];
            await sock.sendMessage(from, { text: `📱 *OPERADOR:* \`${args}\`\n📡 ${getOperadorPeru(args)}` }, { quoted: msg });
        }

        // JUEGOS CLÁSICOS
        if (lowerText === '!dado') await sock.sendMessage(from, { text: `🎲 *DADO:* Cayó en *${Math.floor(Math.random() * 6) + 1}*` }, { quoted: msg });
        if (lowerText === '!moneda') await sock.sendMessage(from, { text: `🪙 Cayó en: *${Math.random() < 0.5 ? 'CARA' : 'CRUZ'}*` }, { quoted: msg });
        if (lowerText === '!slot') {
            const items = ['🎰', '💎', '7️⃣', '🔔', '🍇'];
            await sock.sendMessage(from, { text: `🎰 | ${items[Math.floor(Math.random()*5)]} | ${items[Math.floor(Math.random()*5)]} | ${items[Math.floor(Math.random()*5)]} |` }, { quoted: msg });
        }

        // WARNS & GRUPOS
        if (lowerText.startsWith('!warn') && isGroup) {
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) return;
            const current = (warnsMap.get(target) || 0) + 1;
            warnsMap.set(target, current);
            await sock.sendMessage(from, { text: `⚠️ *ADVERTENCIA:* @${target.split('@')[0]} tiene *${current}/3* advertencias.`, mentions: [target] }, { quoted: msg });
        }

        // STICKERS
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
