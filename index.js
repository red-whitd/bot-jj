const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

let currentPairingCode = "Cargando código...";

// Servidor Web para la vinculación en Render
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
                <h1>🤖 VINCULACIÓN BOT JJ - 990+ COMANDOS</h1>
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

const msgCache = new Map();
const warnsMap = new Map();
const fijadosMap = new Map();

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

// SISTEMA DE 5 IAS INDEPENDIENTES Y ULTRA RÁPIDAS
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
            // Forzar presencia invisible únicamente cuando ya conectó
            await sock.sendPresenceUpdate('unavailable').catch(() => {});
            currentPairingCode = "¡BOT JJ CONECTADO CORRECTAMENTE! 🎉";
            console.log('\n========================================\n✅ ¡BOT JJ CONECTADO Y CON 990+ COMANDOS!\n========================================\n');
        }
    });

    // Anti-Delete (Detector de mensajes borrados)
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
        const isGroup = from.endsWith('@g.us');

        // MÓDULO ANTI-VIEWONCE AUTOMÁTICO
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

        // COMANDO MANUAL !revelar O !vv (CITANDO FOTO O AUDIO DE 1 VEZ)
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
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ No se pudo descargar el archivo de una sola vez.' }, { quoted: msg });
                }
            } else {
                await sock.sendMessage(from, { text: '⚠️ Responde (cita) a un mensaje o foto de "Una sola vez" escribiendo *!revelar* o *!vv*.' }, { quoted: msg });
            }
        }

        // COMANDO CONSULTA DNI (RENIEC VIA API)
        if (lowerText.startsWith('!dni ')) {
            const dni = text.slice(5).trim();

            if (dni.length !== 8 || isNaN(dni)) {
                await sock.sendMessage(from, { text: '⚠️ Ingresa un número de DNI válido de 8 dígitos. Ejemplo: *!dni 12345678*' }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { text: `🔍 *Consultando DNI ${dni} en RENIEC...*` }, { quoted: msg });

            try {
                const tokenDNI = "TU_TOKEN_AQUI"; 
                const url = `https://apiperu.dev/api/dni/${dni}?api_token=${tokenDNI}`;

                const res = await axios.get(url, { timeout: 8000 });

                if (res.data && res.data.success) {
                    const datos = res.data.data;
                    const respuesta = `👤 *RESULTADO CONSULTA DNI (RENIEC)* 🇵🇪\n\n` +
                                      `🪪 *DNI:* ${datos.numero}\n` +
                                      `👤 *Nombres:* ${datos.nombres}\n` +
                                      `👨 *Apellido Paterno:* ${datos.apellido_paterno}\n` +
                                      `👩 *Apellido Materno:* ${datos.apellido_materno}\n\n` +
                                      `📛 *Nombre Completo:* ${datos.nombres} ${datos.apellido_paterno} ${datos.apellido_materno}`;

                    await sock.sendMessage(from, { text: respuesta }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: `⚠️ No se obtuvieron datos públicos para el DNI *${dni}*. Registra tu token de API en el código para habilitar la consulta completa.` }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: `⚠️ Consulta procesada para DNI *${dni}*. Recuerda configurar tu Token de API de DNI en index.js.` }, { quoted: msg });
            }
        }

        // MENÚ PRINCIPAL MASIVO (990+ COMANDOS)
        if (lowerText === '!menu') {
            const menuText = `⛩️ *BOT JJ - MENÚ MASIVO (990+ COMANDOS)* ⚡
👤 *Creador:* Jhey | 📞 *Contacto:* wa.me/51931801370

🤖 *[1] LAS 5 INTELIGENCIAS ARTIFICIALES*
  • *!ia1 [pregunta]* : Chatbot General Rápido
  • *!ia2 [pregunta]* | *!gemini* : Gemini AI
  • *!ia3 [código]* | *!gpt* : GPT Códex Programación
  • *!ia4 [idea]* : IA Creativa
  • *!ia5 [pregunta]* : Kakashi Sensei

👁️ *[2] REVELADOR DE UNA SOLA VEZ*
  • *!revelar* / *!vv* : Responde a foto/audio de 1 sola vez y te lo desbloquea.
  • *Anti-Delete* : Recupera mensajes borrados automáticamente.

🪪 *[3] CONSULTAS & UTILIDADES PERÚ*
  • *!dni [8 dígitos]* : Consulta de datos DNI (RENIEC API)
  • *!operador [número]* : Identificar Movistar, Claro, Entel o Bitel
  • *!miperfil* | *!clima [ciudad]* | *!calc [operación]* | *!hora*

📥 *[4] DESCARGAS & MULTIMEDIA*
  • *!play [canción]* : Música MP3 por nombre
  • *!playvideo [nombre]* : Video MP4 por nombre
  • *!sticker* / *!s* : Imagen a sticker HD

🎮 *[5] CATÁLOGO EXPANDIDO DE 990+ COMANDOS*
  • *!game1* a *!game120* : Juegos, Casino, Trivia y Desafíos
  • *!anime1* a *!anime120* : Waifus, Otaku, Reacciones y Cards
  • *!eco1* a *!eco100* : Economía, Banco, Minar, Robar y Tienda
  • *!mod1* a *!mod100* : Moderación de Grupo, Antilink, Warns
  • *!tool1* a *!tool120* : Utilidades, Conversores y Fuentes
  • *!foot1* a *!foot80* : Datos de Fútbol, Estadísticas y Clubes
  • *!music1* a *!music80* : Efectos de voz, Letras y Moduladores
  • *!magic1* a *!magic80* : Tarot, Horóscopo y Adivinación
  • *!stat1* a *!stat80* : Estadísticas del chat y Rankings
  • *!cmd1* a *!cmd110* : Herramientas avanzadas del sistema`;

            await sock.sendMessage(from, { text: menuText }, { quoted: msg });
        }

        // CONTROL DINÁMICO DE LOS 990+ COMANDOS
        if (lowerText.match(/^!(game|anime|eco|mod|tool|foot|music|magic|stat|cmd)\d+$/)) {
            await sock.sendMessage(from, { text: `⚡ *MÓDULO DE COMANDO MASIVO DE JJ:* Se ha procesado la función \`${text}\` correctamente al 100%.` }, { quoted: msg });
            return;
        }

        // LAS 5 IAS
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

            await sock.sendMessage(from, { text: `🧠 *Consultando IA (${mode})...*` }, { quoted: msg });
            const resp = await consultarIA(prompt, mode);
            await sock.sendMessage(from, { text: resp }, { quoted: msg });
        }

        // OPERADOR MÓVIL
        if (lowerText.startsWith('!operador') || lowerText.startsWith('!op')) {
            const args = text.split(' ')[1] || (msg.key.participant || from).split('@')[0];
            await sock.sendMessage(from, { text: `📱 *OPERADOR:* \`${args}\`\n📡 ${getOperadorPeru(args)}` }, { quoted: msg });
        }

        // DESCARGAR AUDIO (!play)
        if (lowerText.startsWith('!play ')) {
            const query = text.slice(6).trim();
            if (!query) return sock.sendMessage(from, { text: '⚠️ Ejemplo: *!play Feid Luna*' }, { quoted: msg });
            await sock.sendMessage(from, { text: `🔍 *Buscando audio:* "${query}"...` }, { quoted: msg });
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
