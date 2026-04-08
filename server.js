const express = require('express');
const cors = require('cors');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
app.use(cors());
app.use(express.json());

let clients = {};

app.get('/connect/:username', async (req, res) => {
    const username = req.params.username;
    
    if (clients[username]) {
        clients[username].disconnect();
        delete clients[username];
    }

    const tiktok = new WebcastPushConnection(username);
    clients[username] = tiktok;

    try {
        await tiktok.connect();
        res.json({ success: true, message: 'Connecté à ' + username });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/events/:username', (req, res) => {
    const username = req.params.username;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const tiktok = clients[username];
    if (!tiktok) {
        res.write('data: {"error": "Non connecté"}\n\n');
        return;
    }

    tiktok.on('gift', (data) => {
        const gift = {
            type: 'gift',
            giftId: data.giftId,
            giftName: data.giftName,
            diamonds: data.diamondCount,
            username: data.uniqueId
        };
        res.write('data: ' + JSON.stringify(gift) + '\n\n');
    });

    tiktok.on('like', (data) => {
        const like = {
            type: 'like',
            count: data.likeCount,
            username: data.uniqueId
        };
        res.write('data: ' + JSON.stringify(like) + '\n\n');
    });

    req.on('close', () => {
        tiktok.removeAllListeners('gift');
        tiktok.removeAllListeners('like');
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Serveur lancé sur le port ' + PORT);
});
