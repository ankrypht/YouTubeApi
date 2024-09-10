const express = require('express');
const ytdl = require('@distube/ytdl-core');
const app = express();

app.get('/stream', async (req, res) => {
    const videoURL = req.query.url;

    if (!videoURL) {
        return res.status(400).send('No video URL provided');
    }

    try {
        const info = await ytdl.getInfo(videoURL);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

        // Set headers to support streaming
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `inline; filename="audio.mp3"`); // Use inline instead of attachment for streaming
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Accept-Ranges', 'bytes');

        // Handle range requests for partial content
        const range = req.headers.range;
        if (range) {
            const start = Number(range.replace(/\D/g, ""));
            const fileSize = format.contentLength || 0;
            const end = Math.min(fileSize - 1, start + (1e6 - 1)); // 1 MB chunk size

            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', end - start + 1);
            res.status(206); // Partial content status
        } else {
            res.setHeader('Content-Length', format.contentLength);
        }

        ytdl(videoURL, { format }).pipe(res);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error processing video');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

