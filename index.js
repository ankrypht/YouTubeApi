const { BG } = require("bgutils-js");
const { JSDOM } = require("jsdom");
const { Innertube } = require("youtubei.js");
const http = require("http");

let usage = 0;
const PORT = process.env.PORT || 3000;
const requestKey = "O43z0dpjhgX20SCx4KAo";

// Set up the simulated DOM once at startup.
const dom = new JSDOM();
Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
});

const server = http.createServer(async (req, res) => {
    if (req.url === "/data") {
        usage++;
        try {
            // Create a new Innertube instance to obtain fresh visitorData.
            let innertube = await Innertube.create({ retrieve_player: false });
            const visitorData = innertube.session.context.client.visitorData;
            if (!visitorData) throw new Error("Could not get visitor data");

            // Build the BG configuration.
            const bgConfig = {
                fetch: (input, init) => fetch(input, init),
                globalObj: globalThis,
                identifier: visitorData,
                requestKey,
            };

            // Create the BG challenge.
            const bgChallenge = await BG.Challenge.create(bgConfig);
            if (!bgChallenge) throw new Error("Could not get challenge");

            // Execute the interpreter code.
            const interpreterJavascript =
                bgChallenge.interpreterJavascript.privateDoNotAccessOrElseSafeScriptWrappedValue;
            if (interpreterJavascript) {
                new Function(interpreterJavascript)();
            } else {
                throw new Error("Could not load VM");
            }

            // Generate the poToken.
            const poTokenResult = await BG.PoToken.generate({
                program: bgChallenge.program,
                globalName: bgChallenge.globalName,
                bgConfig,
            });

            // Return only visitorData and poToken in the JSON response.
            const responseBody = JSON.stringify({
                visitorData,
                poToken: poTokenResult.poToken,
            });

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(responseBody);
        } catch (err) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
        }
    }
    else if (req.url === "/usage") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(usage + " requests made");
    }
    else {
        // For any other route, return "I'm Alive".
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("I'm Alive");
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
