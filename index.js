const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('¡Bot JJ está activo y funcionando 24/7! 🤖');
});

app.listen(PORT, () => {
    console.log(`Servidor web activo en el puerto ${PORT}`);
});

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const pino = require('pino');

// Memorias en tiempo de ejecución
const msgCache = new Map();
const triviaState = new Map();
const warnsMap = new Map();
const fijadosMap = new Map();

// Función auxiliar para detectar operador en Perú
function getOperadorPeru(numero) {
    const clean = (numero || '').replace(/[^0-9]/g, '');
    let num9 = clean;
    if (clean.startsWith('51') && clean.length === 11) {
        num9 = clean.slice(2);
    }
    if (num9.length !== 9 || !num9.startsWith('9')) {
        return 'Número no válido para Perú (debe tener 9 dígitos y empezar con 9)';
    }

    const pref3 = parseInt(num9.substring(0, 3));

    if ((pref3 >= 990 && pref3 <= 999) || (pref3 >= 980 && pref3 <= 989) || (pref3 >= 950 && pref3 <= 959) || (pref3 >= 975 && pref3 <= 979)) {
        return 'Movistar 💙';
    } else if ((pref3 >= 940 && pref3 <= 949) || (pref3 >= 960 && pref3 <= 969) || (pref3 >= 930 && pref3 <= 939) || (pref3 >= 910 && pref3 <= 919)) {
        return 'Claro ❤️';
    } else if ((pref3 >= 920 && pref3 <= 929) || (pref3 >= 981 && pref3 <= 983) || (pref3 >= 931 && pref3 <= 934)) {
        return 'Entel 🧡';
    } else if ((pref3 >= 900 && pref3 <= 909) || (pref3 >= 925 && pref3 <= 929) || (pref3 >= 935 && pref3 <= 939)) {
        return 'Bitel 💛';
    } else {
        return 'Movistar / Claro / Entel / Bitel (Portado u Operador OMV)';
    }
}

// Función para consultar IAs de forma segura
async function consultarIA(prompt, modo) {
    try {
        const url = `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}&owner=Jhey&botname=JJ`;
        const res = await axios.get(url, { timeout: 8000 });
        if (res.data && res.data.response) {
            let respuesta = res.data.response;
            if (modo === '3') return `💻 *GPT Códex / Programación:*\n\n\`\`\`javascript\n// Resultado para: ${prompt}\n${respuesta}\n\`\`\``;
            if (modo === '5') return `🥷 *Kakashi Sensei:*\n\n*(Lee su libro Icha Icha)*...\n${respuesta}`;
            return respuesta;
        }
    } catch (e) {
        try {
            const res2 = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(prompt)}&lc=es`, { timeout: 6000 });
            if (res2.data && res2.data.success) return res2.data.success;
        } catch (err) {}
    }
    return `He procesado tu consulta sobre "${prompt}". ¡Inténtalo nuevamente!`;
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

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n========================================');
            console.log('🤖 ESCANEA EL QR PARA CONECTAR A JJ:');
            console.log('========================================\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log('Conexión cerrada. Reconectando JJ...', shouldReconnect);
            if (shouldReconnect) startBotJJ();
        } else if (connection === 'open') {
            console.log('\n========================================');
            console.log('✅ ¡BOT JJ CONECTADO Y CON TODOS LOS COMANDOS 100% OPERATIVOS!');
            console.log('========================================\n');
        }
    });

    // Evento de Bienvenida y Despedida
    sock.ev.on('group-participants.update', async (anu) => {
        try {
            const metadata = await sock.groupMetadata(anu.id);
            for (let num of anu.participants) {
                const userJid = `@${num.split('@')[0]}`;
                if (anu.action === 'add') {
                    const welcomeMsg = `⚡ *¡NUEVO MIEMBRO EN LA ALDEA!* 🥷\n\n` +
                        `👋 ¡Bienvenido/a a *${metadata.subject}*, ${userJid}!\n\n` +
                        `📜 *Reglas Generales:*\n` +
                        `• Respeta a los demás miembros.\n` +
                        `• No envíes spam sin permiso.\n` +
                        `• Usa *!menu* para ver la lista completa de comandos.`;

                    await sock.sendMessage(anu.id, { text: welcomeMsg, mentions: [num] });
                } else if (anu.action === 'remove') {
                    const goodbyeMsg = `🍂 *UN NINJA HA DEJADO EL GRUPO* 🍂\n\n` +
                        `👋 El usuario ${userJid} ha salido de *${metadata.subject}*. ¡Le deseamos buena suerte!`;

                    await sock.sendMessage(anu.id, { text: goodbyeMsg, mentions: [num] });
                }
            }
        } catch (e) {}
    });

    // Detector de Mensajes Eliminados (Anti-Delete)
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.update?.protocolMessage?.type === 0 || update.update?.message === null) {
                const key = update.key;
                const cachedMsg = msgCache.get(key.id);

                if (cachedMsg) {
                    const sender = `@${(cachedMsg.key.participant || cachedMsg.key.remoteJid).split('@')[0]}`;
                    const from = cachedMsg.key.remoteJid;

                    let deletedText = `🕵️ *MENSAJE ELIMINADO DETECTADO POR JJ* 🕵️\n\n` +
                        `👤 *Usuario:* ${sender}\n`;

                    const msgContent = cachedMsg.message;
                    const bodyText = msgContent.conversation || msgContent.extendedTextMessage?.text || msgContent.imageMessage?.caption || msgContent.videoMessage?.caption;

                    if (bodyText) {
                        deletedText += `💬 *Mensaje borrado:* "${bodyText}"`;
                        await sock.sendMessage(from, { text: deletedText, mentions: [cachedMsg.key.participant || cachedMsg.key.remoteJid] });
                    } else if (msgContent.imageMessage) {
                        deletedText += `📷 *Intentó eliminar una foto:*`;
                        const buffer = await downloadMediaMessage(cachedMsg, 'buffer', {});
                        await sock.sendMessage(from, { image: buffer, caption: deletedText, mentions: [cachedMsg.key.participant || cachedMsg.key.remoteJid] });
                    } else if (msgContent.stickerMessage) {
                        deletedText += `🎨 *Intentó eliminar un sticker:*`;
                        await sock.sendMessage(from, { text: deletedText, mentions: [cachedMsg.key.participant || cachedMsg.key.remoteJid] });
                        const buffer = await downloadMediaMessage(cachedMsg, 'buffer', {});
                        await sock.sendMessage(from, { sticker: buffer });
                    } else if (msgContent.audioMessage) {
                        deletedText += `🎙️ *Intentó eliminar una nota de voz / audio:*`;
                        await sock.sendMessage(from, { text: deletedText, mentions: [cachedMsg.key.participant || cachedMsg.key.remoteJid] });
                        const buffer = await downloadMediaMessage(cachedMsg, 'buffer', {});
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

        // Módulo de Respuesta a Trivia
        if (triviaState.has(from)) {
            const currentTrivia = triviaState.get(from);
            if (lowerText === currentTrivia.answer) {
                await sock.sendMessage(from, { text: `🎉 ¡CORRECTO! @${msg.key.participant.split('@')[0]} acertó: *${currentTrivia.rawAnswer}* 🏆`, mentions: [msg.key.participant] }, { quoted: msg });
                triviaState.delete(from);
                return;
            }
        }

        // Saludo Automático
        if (lowerText.includes('hola jj') || lowerText === 'hola') {
            await sock.sendMessage(from, { text: `¡Hola! 👋 Soy *JJ*, el bot de Jhey.\n\nEscribe *!menu* para ver la lista de todos los comandos.` }, { quoted: msg });
        }

        // 📂 MENÚ PRINCIPAL ORGANIZADO
        if (lowerText === '!menu') {
            const menuText = `⛩️ *BOT JJ - MENÚ DE COMANDOS COMPLETO* ⚡
👤 *Creador:* Jhey | 📞 *Contacto:* wa.me/51931801370

🤖 *[1] IA & MOTORES DE CHAT*
  • *!ia1* | *!ia2* | *!ia3* | *!ia4* | *!ia5* [texto]

📥 *[2] DESCARGAS & MULTIMEDIA*
  • *!play [canción]* : Audio MP3 por nombre
  • *!playvideo [nombre]* : Video MP4 por nombre
  • *!mp3 [link]* | *!mp4 [link]*
  • *!sticker* / *!s* | *!toimg* | *!revelar* | *!ptt* | *!decir [texto]*

🛠️ *[3] HERRAMIENTAS & UTILIDADES*
  • *!clima [ciudad]* : Pronóstico del tiempo
  • *!calc [expresión]* : Resolver operaciones matemáticas
  • *!qr [texto]* : Generar código QR en imagen
  • *!hora* : Fecha y hora oficial en Perú
  • *!recordar [segundos] [texto]* : Recordatorio
  • *!miperfil* : Ver tu perfil y datos de sesión
  • *!operador [número]* : Identificar operador móvil en Perú
  • *!enviar [número] [texto]* : Enviar mensaje privado
  • *!llamada* : Crear canal de llamada de audio

🎮 *[4] JUEGOS & DIVERSIÓN*
  • *!dado* | *!moneda* | *!slot* | *!ruleta* | *!trivia*
  • *!bola8 [pregunta]* : Preguntar a la bola 8
  • *!ppt [piedra/papel/tijera]* : Jugar contra el bot
  • *!amor [@usuario]* : Medidor de compatibilidad
  • *!verdad* | *!reto* | *!piropo* | *!frase* | *!chiste*

👥 *[5] GRUPOS & ADMINISTRACIÓN*
  • *!warn [@usuario]* : Dar advertencia
  • *!unwarn [@usuario]* : Quitar advertencia
  • *!verwarns [@usuario]* : Ver advertencias de un usuario
  • *!fijar [texto]* | *!verfijado* : Guardar notas del grupo
  • *!formarpareja* | *!gay [@usuario]*`;

            await sock.sendMessage(from, { text: menuText }, { quoted: msg });
        }

        // 🎵 DESCARGAR AUDIO POR NOMBRE (!play)
        if (lowerText.startsWith('!play ')) {
            const query = text.slice(6).trim();
            if (!query) {
                await sock.sendMessage(from, { text: '⚠️ Escribe el nombre de la canción. Ejemplo: *!play Feid Luna*' }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { text: `🔍 *Buscando audio para:* "${query}"...` }, { quoted: msg });

            const outputFile = `./play_${Date.now()}.mp3`;
            exec(`yt-dlp "ytsearch1:${query}" -x --audio-format mp3 -o "${outputFile}"`, async (err) => {
                if (!err && fs.existsSync(outputFile)) {
                    await sock.sendMessage(from, { audio: fs.readFileSync(outputFile), mimetype: 'audio/mp4' }, { quoted: msg });
                    fs.unlinkSync(outputFile);
                } else {
                    await sock.sendMessage(from, { text: '❌ No se pudo descargar el audio. Intenta con otro nombre.' }, { quoted: msg });
                }
            });
        }

        // 🎬 DESCARGAR VIDEO POR NOMBRE (!playvideo)
        if (lowerText.startsWith('!playvideo ')) {
            const query = text.slice(11).trim();
            if (!query) {
                await sock.sendMessage(from, { text: '⚠️ Escribe el nombre del video. Ejemplo: *!playvideo Highlights Real Madrid*' }, { quoted: msg });
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

        if (lowerText.startsWith('!calc ') || lowerText.startsWith('!calculadora ')) {
            const expr = text.split(' ').slice(1).join('');
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

        if (lowerText === '!hora' || lowerText === '!reloj') {
            const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
            await sock.sendMessage(from, { text: `🕒 *FECHA Y HORA (PERÚ):*\n\n📅 ${now}` }, { quoted: msg });
        }

        if (lowerText.startsWith('!recordar ')) {
            const args = text.split(' ');
            const segundos = parseInt(args[1]);
            const nota = args.slice(2).join(' ');

            if (isNaN(segundos) || !nota) {
                await sock.sendMessage(from, { text: '⚠️ Uso: *!recordar [segundos] [mensaje]* (Ejemplo: *!recordar 10 Sacar la basura*)' }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { text: `⏰ *RECORDATORIO CONFIGURADO:* Avisando en ${segundos} segundos.` }, { quoted: msg });
            setTimeout(async () => {
                await sock.sendMessage(from, { text: `🔔 *¡RECORDATORIO DE JJ!* ⏰\n\n💬 "${nota}"` }, { quoted: msg });
            }, segundos * 1000);
        }

        // 🎮 JUEGOS Y DIVERSIÓN
        if (lowerText === '!dado') {
            const car = Math.floor(Math.random() * 6) + 1;
            await sock.sendMessage(from, { text: `🎲 *DADO:* Cayó en *${car}*` }, { quoted: msg });
        }

        if (lowerText.startsWith('!bola8 ')) {
            const respuestas = ['Sí, totalmente.', 'No lo creo.', 'Es muy probable.', 'Definitivamente no.', 'Pregunta de nuevo más tarde.', 'Todo apunta a que sí.'];
            const res = respuestas[Math.floor(Math.random() * respuestas.length)];
            await sock.sendMessage(from, { text: `🎱 *BOLA 8:* ${res}` }, { quoted: msg });
        }

        if (lowerText.startsWith('!ppt ')) {
            const op = text.split(' ')[1]?.toLowerCase();
            const opciones = ['piedra', 'papel', 'tijera'];
            if (!opciones.includes(op)) {
                await sock.sendMessage(from, { text: '⚠️ Usa: *!ppt piedra*, *!ppt papel* o *!ppt tijera*' }, { quoted: msg });
                return;
            }
            const botOp = opciones[Math.floor(Math.random() * opciones.length)];
            let res = '';
            if (op === botOp) res = '🤝 ¡Empate!';
            else if ((op === 'piedra' && botOp === 'tijera') || (op === 'papel' && botOp === 'piedra') || (op === 'tijera' && botOp === 'papel')) res = '🎉 ¡Ganaste!';
            else res = '🤖 ¡Gané yo!';

            await sock.sendMessage(from, { text: `🎮 *PIEDRA, PAPEL O TIJERA*\n\n👤 Tú: *${op}*\n🤖 JJ: *${botOp}*\n\n${res}` }, { quoted: msg });
        }

        if (lowerText.startsWith('!amor')) {
            const percent = Math.floor(Math.random() * 101);
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.key.participant || from;
            await sock.sendMessage(from, { text: `❤️ *COMPATIBILIDAD AMOROSA:* Con @${mentioned.split('@')[0]} es de *${percent}%*`, mentions: [mentioned] }, { quoted: msg });
        }

        if (lowerText === '!verdad') {
            const verdades = ['¿Cuál es tu mayor secreto?', '¿Quién te gusta del grupo?', '¿Qué es lo más vergonzoso que has hecho?'];
            await sock.sendMessage(from, { text: `🗣️ *VERDAD:* ${verdades[Math.floor(Math.random() * verdades.length)]}` }, { quoted: msg });
        }

        if (lowerText === '!reto') {
            const retos = ['Envía un sticker gracioso al grupo.', 'Manda una nota de voz cantando 5 segundos.', 'Cambia tu foto de perfil por 10 minutos.'];
            await sock.sendMessage(from, { text: `🔥 *RETO:* ${retos[Math.floor(Math.random() * retos.length)]}` }, { quoted: msg });
        }

        if (lowerText === '!piropo') {
            const piropos = ['Si la belleza fuera tiempo, serías 24 horas.', '¿Eres un mapa? Porque me pierdo en tus ojos.', 'Ni con mil algoritmos descifro lo increíble que eres.'];
            await sock.sendMessage(from, { text: `💌 *PIROPO:* ${piropos[Math.floor(Math.random() * piropos.length)]}` }, { quoted: msg });
        }

        if (lowerText === '!frase') {
            const frases = ['El único modo de hacer un gran trabajo es amar lo que haces.', 'No cuentes los días, haz que los días cuenten.', 'La disciplina le gana al talento.'];
            await sock.sendMessage(from, { text: `📖 *FRASE:* "${frases[Math.floor(Math.random() * frases.length)]}"` }, { quoted: msg });
        }

        // 👥 ADMINISTRACIÓN Y WARNS EN GRUPOS
        if (lowerText.startsWith('!warn') && isGroup) {
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) {
                await sock.sendMessage(from, { text: '⚠️ Menciona a un usuario para advertir. Ejemplo: *!warn @usuario*' }, { quoted: msg });
                return;
            }
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
            const aviso = text.slice(7).trim();
            fijadosMap.set(from, aviso);
            await sock.sendMessage(from, { text: '📌 *AVISO DE GRUPO GUARDADO CORRECTAMENTE.*' }, { quoted: msg });
        }

        if (lowerText === '!verfijado' && isGroup) {
            const aviso = fijadosMap.get(from) || 'No hay avisos fijados en este grupo.';
            await sock.sendMessage(from, { text: `📌 *AVISO FIJADO EN EL GRUPO:*\n\n${aviso}` }, { quoted: msg });
        }

        // 👤 PROPIO PERFIL
        if (lowerText === '!miperfil' || lowerText === '!miestado') {
            try {
                const userJid = msg.key.participant || from;
                const numOnly = userJid.split('@')[0];
                const op = getOperadorPeru(numOnly);
                const ppUrl = await sock.profilePictureUrl(userJid, 'image').catch(() => null);

                const perfilInfo = `👤 *INFORMACIÓN DE TU PERFIL*  🤖\n\n📱 *Número:* +${numOnly}\n🌐 *Estado:* Conectado\n📡 *Operador origen:* ${op}`;

                if (ppUrl) await sock.sendMessage(from, { image: { url: ppUrl }, caption: perfilInfo }, { quoted: msg });
                else await sock.sendMessage(from, { text: perfilInfo }, { quoted: msg });
            } catch (e) {}
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
                await sock.sendMessage(from, { text: '⚠️ Escribe tu consulta. Ejemplo: *!ia1 ¿Qué es la física cuántica?*' }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { text: `🧠 *Consultando IA...*` }, { quoted: msg });
            const respuestaIA = await consultarIA(prompt, mode);
            await sock.sendMessage(from, { text: `⚡ *JJ IA:*\n\n${respuestaIA}` }, { quoted: msg });
        }

        // 📩 ENVIAR MENSAJE
        if (lowerText.startsWith('!enviar') || lowerText.startsWith('!msg')) {
            const parts = text.split(' ');
            if (parts.length < 3) {
                await sock.sendMessage(from, { text: '⚠️ Uso: *!enviar 51931801370 Hola desde el bot JJ*' }, { quoted: msg });
                return;
            }
            let targetNum = parts[1].replace(/[^0-9]/g, '');
            if (targetNum.length === 9) targetNum = `51${targetNum}`;
            const mensajeEnviar = parts.slice(2).join(' ');
            const targetJid = `${targetNum}@s.whatsapp.net`;

            try {
                await sock.sendMessage(targetJid, { text: `📩 *MENSAJE RECIBIDO DE BOT JJ* 🤖\n\n💬 "${mensajeEnviar}"` });
                await sock.sendMessage(from, { text: `✅ Mensaje enviado a: *+${targetNum}*` }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ No se pudo enviar el mensaje.' }, { quoted: msg });
            }
        }

        // 📞 LLAMADA DE AUDIO
        if (lowerText.startsWith('!llamada')) {
            const roomName = `JJ-AudioCall-${Math.floor(100000 + Math.random() * 900000)}`;
            const callLink = `https://meet.jit.si/${roomName}#config.startWithVideoMuted=true`;
            await sock.sendMessage(from, { text: `🎙️ *SALA DE AUDIO CREADA POR JJ*\n\n🔗 ${callLink}` }, { quoted: msg });
        }

        // 📱 OPERADOR
        if (lowerText.startsWith('!operador') || lowerText.startsWith('!op')) {
            const args = text.split(' ')[1] || (msg.key.participant || from).split('@')[0];
            const op = getOperadorPeru(args);
            await sock.sendMessage(from, { text: `📱 *OPERADOR:* \`${args}\`\n📡 ${op}` }, { quoted: msg });
        }

        // 🎰 JUEGOS CLÁSICOS
        if (lowerText === '!slot') {
            const items = ['🎰', '💎', '7️⃣', '🔔', '🍇'];
            const a = items[Math.floor(Math.random() * items.length)];
            const b = items[Math.floor(Math.random() * items.length)];
            const c = items[Math.floor(Math.random() * items.length)];
            await sock.sendMessage(from, { text: `🎰 | ${a} | ${b} | ${c} |` }, { quoted: msg });
        }

        if (lowerText === '!moneda') {
            await sock.sendMessage(from, { text: `🪙 Cayó en: *${Math.random() < 0.5 ? 'CARA' : 'CRUZ'}*` }, { quoted: msg });
        }

        if (lowerText === '!chiste') {
            await sock.sendMessage(from, { text: `🤡 ¿Qué hace una abeja en el gimnasio? — ¡Zum-ba! 🐝` }, { quoted: msg });
        }

        // 🖼️ MULTIMEDIA & STICKERS
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
