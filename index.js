const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Variable global para guardar el código actual
let currentPairingCode = "Cargando código...";

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

const msgCache = new Map();
const triviaState = new Map();
const warnsMap = new Map();
const fijadosMap = new Map();

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
        const url = `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}&owner=Jhey&botname=JJ`;
        const res = await axios.get(url, { timeout: 8000 });
        if (res.data && res.data.response) {
            let respuesta = res.data.response;
            if (modo === '3') return `💻 *GPT Códex:*\n\n\`\`\`javascript\n${respuesta}\n\`\`\``;
            if (modo === '5') return `🥷 *Kakashi Sensei:*\n\n${respuesta}`;
            return respuesta;
        }
    } catch (e) {
        try {
            const res2 = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(prompt)}&lc=es`, { timeout: 6000 });
            if (res2.data && res2.data.success) return res2.data.success;
        } catch (err) {}
    }
    return `Consulta procesada sobre "${prompt}".`;
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
                console.error("Error al pedir código:", error);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) startBotJJ();
        } else if (connection === 'open') {
            currentPairingCode = "¡BOT CONECTADO CORRECTAMENTE! 🎉";
            console.log('\n========================================\n✅ ¡BOT JJ CONECTADO!\n========================================\n');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
        const lowerText = text.toLowerCase();

        if (lowerText === '!menu') {
            await sock.sendMessage(from, { text: `⛩️ *BOT JJ - ACTIVO 24/7* ⚡\n\nUsa *!ia1 [pregunta]* o *!play [canción]*` }, { quoted: msg });
        }
    });
}

startBotJJ();
