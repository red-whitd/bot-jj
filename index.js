const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Variable global para almacenar el código de vinculación de 8 dígitos
let currentPairingCode = "Cargando código...";

// Servidor Web para ver el código en la web de Render
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
                <h1>🤖 VINCULACIÓN BOT JJ</h1>
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

// Memorias temporales
const msgCache = new Map();
const triviaState = new Map();
const warnsMap = new Map();
const fijadosMap = new Map();

// Función auxiliar para detectar operador en Perú
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

// Consultar Inteligencia Artificial
async function consultarIA(prompt, modo) {
    try {
        const url = `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}&owner=Jhey&botname=JJ`;
        const res = await axios.get(url, { timeout: 8000 });
        if (res.data && res.data.response) {
            let respuesta = res.data.response;
            if (modo === '3') return `💻 *GPT Códex / Programación:*\n\n\`\`\`javascript\n// Código generado:\n${respuesta}\n\`\`\``;
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

async function startBotJJ() {
    const { state, saveCreds } = await useMultiFileAuthState('session_jj');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'fatal' }),
        printQRInTerminal: false,
        generateHighQualityLinkPreview: false
    });

    sock.ev.on('creds.update', saveCreds);

    // Módulo de generación de código de vinculación
    if (!sock.authState.creds.registered) {
        const phoneNumber = "51931801370";
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                currentPairingCode = code;
                console.log(`\n========================================\n🔑 CÓDIGO DE VINCULACIÓN: [ ${code} ]\n========================================\n`);
            } catch (error) {
                console.error("Error al solicitar código de vinculación:", error);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log('Conexión cerrada. Reconectando JJ...', shouldReconnect);
            if (shouldReconnect) startBotJJ();
        } else if (connection === 'open') {
            currentPairingCode = "¡BOT JJ CONECTADO CORRECTAMENTE! 🎉";
            console.log('\n========================================\n✅ ¡BOT JJ CONECTADO Y 100% OPERATIVO!\n========================================\n');
        }
    });

    // Eventos de Grupo (Bienvenida y Despedida)
    sock.ev.on('group-participants.update', async (anu) => {
        try {
            const metadata = await sock.groupMetadata(anu.id);
            for (let num of anu.participants) {
                const userJid = `@${num.split('@')[0]}`;
                if (anu.action === 'add') {
                    const welcomeMsg = `⚡ *¡NUEVO MIEMBRO EN EL GRUPO!* 🥷\n\n👋 ¡Bienvenido/a a *${metadata.subject}*, ${userJid}!\n\n📜 *Reglas:*\n• Respeta a los miembros.\n• Usa *!menu* para ver la lista de comandos.`;
                    await sock.sendMessage(anu.id, { text: welcomeMsg, mentions: [num] });
                } else if (anu.action === 'remove') {
                    const goodbyeMsg = `🍂 *UN INTEGRANTE SALIÓ DEL GRUPO* 🍂\n\n👋 El usuario ${userJid} ha dejado *${metadata.subject}*.`;
                    await sock.sendMessage(anu.id, { text: goodbyeMsg, mentions: [num] });
                }
            }
        } catch (e) {}
    });

    // Anti-Delete (Mensajes Eliminados)
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.update?.protocolMessage?.type === 0 || update.update?.message === null) {
                const key = update.key;
                const cachedMsg = msgCache.get(key.id);

                if (cachedMsg) {
                    const sender = `@${(cachedMsg.key.participant || cachedMsg.key.remoteJid).split('@')[0]}`;
                    const from = cachedMsg.key.remoteJid;
                    let deletedText = `🕵️ *MENSAJE ELIMINADO DETECTADO POR JJ* 🕵️\n\n👤 *Usuario:* ${sender}\n`;
                    const msgContent = cachedMsg.message;
                    const bodyText = msgContent.conversation || msgContent.extendedTextMessage?.text || msgContent.imageMessage?.caption || msgContent.videoMessage?.caption;

                    if (bodyText) {
                        deletedText += `💬 *Mensaje borrado:* "${bodyText}"`;
                        await sock.sendMessage(from, { text: deletedText, mentions: [cachedMsg.key.participant || cachedMsg.key.remoteJid] });
                    } else if (msgContent.imageMessage) {
                        const buffer = await downloadMediaMessage(cachedMsg, 'buffer', {});
                        await sock.sendMessage(from, { image: buffer, caption: `${deletedText}📷 *Intentó borrar esta imagen*`, mentions: [cachedMsg.key.participant || cachedMsg.key.remoteJid] });
                    } else if (msgContent.stickerMessage) {
                        const buffer = await downloadMediaMessage(cachedMsg, 'buffer', {});
                        await sock.sendMessage(from, { text: `${deletedText}🎨 *Intentó borrar este sticker:*`, mentions: [cachedMsg.key.participant || cachedMsg.key.remoteJid] });
                        await sock.sendMessage(from, { sticker: buffer });
                    }
                }
            }
        }
    });

    // Manejo de Mensajes e Interacciones
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        if (msg.key && msg.key.id) {
            msgCache.set(msg.key.id, msg);
            if (msgCache.size > 500) {
                const firstKey = msgCache.keys().next().value;
                msgCache.delete(firstKey);
            }
        }

        if (msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const type = Object.keys(msg.message)[0];
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
        const text = body.trim();
        const lowerText = text.toLowerCase();
        const isGroup = from.endsWith('@g.us');

        // Saludo
        if (lowerText.includes('hola jj') || lowerText === 'hola') {
            await sock.sendMessage(from, { text: `¡Hola! 👋 Soy *JJ*, el bot de Jhey.\n\nEscribe *!menu* para ver la lista completa de comandos.` }, { quoted: msg });
        }

        // 📂 MENÚ COMPLETO
        if (lowerText === '!menu') {
            const menuText = `⛩️ *BOT JJ - MENÚ COMPLETO DE COMANDOS* ⚡
👤 *Creador:* Jhey | 📞 *Contacto:* wa.me/51931801370

🤖 *[1] IA & MOTORES DE CHAT*
  • *!ia1 [texto]* : Chat IA principal
  • *!ia2 [texto]* : Gemini AI
  • *!ia3 [texto]* : GPT Códex (Programación)
  • *!ia4 [texto]* : Modo creativo
  • *!ia5 [texto]* : Kakashi Sensei

📥 *[2] DESCARGAS & MULTIMEDIA*
  • *!play [canción]* : Audio MP3 por nombre
  • *!playvideo [nombre]* : Video MP4 por nombre
  • *!sticker* / *!s* : Convertir imagen a sticker

🛠️ *[3] HERRAMIENTAS & UTILIDADES*
  • *!clima [ciudad]* : Clima actual
  • *!calc [operación]* : Calculadora matemática
  • *!qr [texto]* : Generar código QR
  • *!hora* : Hora oficial en Perú
  • *!recordar [segundos] [texto]* : Recordatorio
  • *!miperfil* : Ver tu perfil de usuario
  • *!operador [número]* : Identificar operador móvil en Perú
  • *!enviar [número] [texto]* : Enviar mensaje privado
  • *!llamada* : Crear sala de llamada de audio Jitsi

🎮 *[4] JUEGOS & DIVERSIÓN*
  • *!dado* | *!moneda* | *!slot*
  • *!bola8 [pregunta]* : Preguntas a la Bola 8
  • *!ppt [piedra/papel/tijera]* : Jugar contra el bot
  • *!amor [@usuario]* : Medidor de amor
  • *!verdad* | *!reto* | *!piropo* | *!frase* | *!chiste*

👥 *[5] GRUPOS & ADMINISTRACIÓN*
  • *!warn [@usuario]* : Dar advertencia
  • *!unwarn [@usuario]* : Quitar advertencia
  • *!verwarns [@usuario]* : Ver advertencias del usuario
  • *!fijar [texto]* | *!verfijado* : Guardar notas del grupo`;

            await sock.sendMessage(from, { text: menuText }, { quoted: msg });
        }

        // 🎵 MUSICA (!play)
        if (lowerText.startsWith('!play ')) {
            const query = text.slice(6).trim();
            if (!query) {
                await sock.sendMessage(from, { text: '⚠️ Ejemplo: *!play Feid Luna*' }, { quoted: msg });
                return;
            }
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

        // 🎬 VIDEO (!playvideo)
        if (lowerText.startsWith('!playvideo ')) {
            const query = text.slice(11).trim();
            if (!query) {
                await sock.sendMessage(from, { text: '⚠️ Ejemplo: *!playvideo Real Madrid vs Barcelona*' }, { quoted: msg });
                return;
            }
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

        // 🧠 INTELIGENCIA ARTIFICIAL
        if (lowerText.startsWith('!ia') || lowerText.startsWith('!gemini') || lowerText.startsWith('!gpt')) {
            let mode = '1';
            let prompt = '';
            if (lowerText.startsWith('!ia1 ')) { mode = '1'; prompt = text.slice(5).trim(); }
            else if (lowerText.startsWith('!ia2 ') || lowerText.startsWith('!gemini ')) { mode = '2'; prompt = text.slice(text.indexOf(' ') + 1).trim(); }
            else if (lowerText.startsWith('!ia3 ') || lowerText.startsWith('!gpt ')) { mode = '3'; prompt = text.slice(text.indexOf(' ') + 1).trim(); }
            else if (lowerText.startsWith('!ia4 ')) { mode = '4'; prompt = text.slice(5).trim(); }
            else if (lowerText.startsWith('!ia5 ')) { mode = '5'; prompt = text.slice(5).trim(); }
            else if (lowerText.startsWith('!ia ')) { mode = '1'; prompt = text.slice(4).trim(); }

            if (!prompt) {
                await sock.sendMessage(from, { text: '⚠️ Ejemplo: *!ia1 ¿Cuál es la capital de Perú?*' }, { quoted: msg });
                return;
            }
            await sock.sendMessage(from, { text: `🧠 *Consultando IA...*` }, { quoted: msg });
            const resp = await consultarIA(prompt, mode);
            await sock.sendMessage(from, { text: `⚡ *JJ IA:*\n\n${resp}` }, { quoted: msg });
        }

        // 🛠️ HERRAMIENTAS
        if (lowerText.startsWith('!clima ')) {
            const ciudad = text.slice(7).trim();
            try {
                const res = await axios.get(`https://wttr.in/${encodeURIComponent(ciudad)}?format=3`);
                await sock.sendMessage(from, { text: `🌤️ *CLIMA:*\n\n${res.data}` }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ No se pudo consultar el clima.' }, { quoted: msg });
            }
        }

        if (lowerText.startsWith('!calc ')) {
            const expr = text.slice(6).trim();
            try {
                const res = Function(`'use strict'; return (${expr.replace(/[^0-9+\-*/().]/g, '')})`)();
                await sock.sendMessage(from, { text: `🔢 *RESULTADO:* \`${expr}\` = *${res}*` }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Operación no válida.' }, { quoted: msg });
            }
        }

        if (lowerText.startsWith('!qr ')) {
            const qrText = text.slice(4).trim();
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrText)}`;
            await sock.sendMessage(from, { image: { url: qrUrl }, caption: `📌 *CÓDIGO QR GENERADO:* "${qrText}"` }, { quoted: msg });
        }

        if (lowerText === '!hora') {
            const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
            await sock.sendMessage(from, { text: `🕒 *FECHA Y HORA (PERÚ):*\n\n📅 ${now}` }, { quoted: msg });
        }

        if (lowerText.startsWith('!recordar ')) {
            const args = text.split(' ');
            const segundos = parseInt(args[1]);
            const nota = args.slice(2).join(' ');
            if (isNaN(segundos) || !nota) {
                await sock.sendMessage(from, { text: '⚠️ Uso: *!recordar [segundos] [mensaje]*' }, { quoted: msg });
                return;
            }
            await sock.sendMessage(from, { text: `⏰ *RECORDATORIO CONFIGURADO:* En ${segundos} segundos.` }, { quoted: msg });
            setTimeout(async () => {
                await sock.sendMessage(from, { text: `🔔 *¡RECORDATORIO DE JJ!* ⏰\n\n💬 "${nota}"` }, { quoted: msg });
            }, segundos * 1000);
        }

        // 👤 PERFIL & OPERADOR
        if (lowerText === '!miperfil') {
            try {
                const userJid = msg.key.participant || from;
                const numOnly = userJid.split('@')[0];
                const op = getOperadorPeru(numOnly);
                const ppUrl = await sock.profilePictureUrl(userJid, 'image').catch(() => null);
                const info = `👤 *PERFIL DE USUARIO* 🤖\n\n📱 *Número:* +${numOnly}\n🌐 *Estado:* Activo\n📡 *Operador origen:* ${op}`;
                if (ppUrl) await sock.sendMessage(from, { image: { url: ppUrl }, caption: info }, { quoted: msg });
                else await sock.sendMessage(from, { text: info }, { quoted: msg });
            } catch (e) {}
        }

        if (lowerText.startsWith('!operador')) {
            const args = text.split(' ')[1] || (msg.key.participant || from).split('@')[0];
            const op = getOperadorPeru(args);
            await sock.sendMessage(from, { text: `📱 *OPERADOR:* \`${args}\`\n📡 ${op}` }, { quoted: msg });
        }

        // 📩 ENVIAR MENSAJE
        if (lowerText.startsWith('!enviar')) {
            const parts = text.split(' ');
            if (parts.length < 3) {
                await sock.sendMessage(from, { text: '⚠️ Uso: *!enviar 51931801370 Hola desde el bot JJ*' }, { quoted: msg });
                return;
            }
            let targetNum = parts[1].replace(/[^0-9]/g, '');
            if (targetNum.length === 9) targetNum = `51${targetNum}`;
            const mensajeEnviar = parts.slice(2).join(' ');
            try {
                await sock.sendMessage(`${targetNum}@s.whatsapp.net`, { text: `📩 *MENSAJE RECIBIDO DE BOT JJ* 🤖\n\n💬 "${mensajeEnviar}"` });
                await sock.sendMessage(from, { text: `✅ Mensaje enviado a: *+${targetNum}*` }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ No se pudo enviar el mensaje.' }, { quoted: msg });
            }
        }

        if (lowerText === '!llamada') {
            const roomName = `JJ-AudioCall-${Math.floor(100000 + Math.random() * 900000)}`;
            await sock.sendMessage(from, { text: `🎙️ *SALA DE AUDIO CREADA:* https://meet.jit.si/${roomName}#config.startWithVideoMuted=true` }, { quoted: msg });
        }

        // 🎮 JUEGOS
        if (lowerText === '!dado') await sock.sendMessage(from, { text: `🎲 *DADO:* Cayó en *${Math.floor(Math.random() * 6) + 1}*` }, { quoted: msg });
        if (lowerText === '!moneda') await sock.sendMessage(from, { text: `🪙 Cayó en: *${Math.random() < 0.5 ? 'CARA' : 'CRUZ'}*` }, { quoted: msg });
        if (lowerText === '!slot') {
            const items = ['🎰', '💎', '7️⃣', '🔔', '🍇'];
            await sock.sendMessage(from, { text: `🎰 | ${items[Math.floor(Math.random()*5)]} | ${items[Math.floor(Math.random()*5)]} | ${items[Math.floor(Math.random()*5)]} |` }, { quoted: msg });
        }
        if (lowerText.startsWith('!bola8 ')) {
            const r = ['Sí, totalmente.', 'No lo creo.', 'Es muy probable.', 'Definitivamente no.', 'Pregunta de nuevo más tarde.'];
            await sock.sendMessage(from, { text: `🎱 *BOLA 8:* ${r[Math.floor(Math.random() * r.length)]}` }, { quoted: msg });
        }
        if (lowerText.startsWith('!ppt ')) {
            const op = text.split(' ')[1]?.toLowerCase();
            const opciones = ['piedra', 'papel', 'tijera'];
            if (!opciones.includes(op)) return sock.sendMessage(from, { text: '⚠️ Usa: *!ppt piedra*, *!ppt papel* o *!ppt tijera*' }, { quoted: msg });
            const botOp = opciones[Math.floor(Math.random() * 3)];
            let res = (op === botOp) ? '🤝 ¡Empate!' : ((op === 'piedra' && botOp === 'tijera') || (op === 'papel' && botOp === 'piedra') || (op === 'tijera' && botOp === 'papel')) ? '🎉 ¡Ganaste!' : '🤖 ¡Gané yo!';
            await sock.sendMessage(from, { text: `🎮 *PIEDRA, PAPEL O TIJERA*\n\n👤 Tú: *${op}*\n🤖 JJ: *${botOp}*\n\n${res}` }, { quoted: msg });
        }

        if (lowerText.startsWith('!amor')) {
            const percent = Math.floor(Math.random() * 101);
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.key.participant || from;
            await sock.sendMessage(from, { text: `❤️ *COMPATIBILIDAD:* Con @${mentioned.split('@')[0]} es del *${percent}%*`, mentions: [mentioned] }, { quoted: msg });
        }

        if (lowerText === '!verdad') await sock.sendMessage(from, { text: `🗣️ *VERDAD:* ¿Cuál es tu mayor secreto?` }, { quoted: msg });
        if (lowerText === '!reto') await sock.sendMessage(from, { text: `🔥 *RETO:* Envía un sticker divertido al grupo.` }, { quoted: msg });
        if (lowerText === '!piropo') await sock.sendMessage(from, { text: `💌 *PIROPO:* Ni con mil algoritmos descifro lo increíble que eres.` }, { quoted: msg });
        if (lowerText === '!frase') await sock.sendMessage(from, { text: `📖 *FRASE:* "La disciplina tarde o temprano vencerá a la inteligencia."` }, { quoted: msg });
        if (lowerText === '!chiste') await sock.sendMessage(from, { text: `🤡 ¿Qué hace una abeja en el gimnasio? — ¡Zum-ba! 🐝` }, { quoted: msg });

        // 👥 ADMINISTRACIÓN
        if (lowerText.startsWith('!warn') && isGroup) {
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) return sock.sendMessage(from, { text: '⚠️ Menciona a un usuario.' }, { quoted: msg });
            const current = (warnsMap.get(target) || 0) + 1;
            warnsMap.set(target, current);
            await sock.sendMessage(from, { text: `⚠️ *ADVERTENCIA:* @${target.split('@')[0]} tiene *${current}/3* advertencias.`, mentions: [target] }, { quoted: msg });
        }

        if (lowerText.startsWith('!unwarn') && isGroup) {
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) return;
            warnsMap.set(target, 0);
            await sock.sendMessage(from, { text: `✅ *ADVERTENCIAS REINICIADAS:* @${target.split('@')[0]} tiene 0 advertencias.`, mentions: [target] }, { quoted: msg });
        }

        if (lowerText.startsWith('!verwarns') && isGroup) {
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.key.participant;
            const current = warnsMap.get(target) || 0;
            await sock.sendMessage(from, { text: `📋 *HISTORIAL:* @${target.split('@')[0]} tiene *${current}/3* advertencias.`, mentions: [target] }, { quoted: msg });
        }

        if (lowerText.startsWith('!fijar ') && isGroup) {
            fijadosMap.set(from, text.slice(7).trim());
            await sock.sendMessage(from, { text: '📌 *AVISO GUARDADO EN EL GRUPO.*' }, { quoted: msg });
        }

        if (lowerText === '!verfijado' && isGroup) {
            const aviso = fijadosMap.get(from) || 'No hay avisos fijados en este grupo.';
            await sock.sendMessage(from, { text: `📌 *AVISO FIJADO:*\n\n${aviso}` }, { quoted: msg });
        }

        // 🎨 STICKERS
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
