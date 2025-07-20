import { BG } from "bgutils-js";
import { JSDOM } from "jsdom";
import { Innertube } from "youtubei.js";
import http, { IncomingMessage, ServerResponse } from "http";

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";

// --- Global State ---
let usage = 0;

// --- JSDOM Setup ---
// Set up a simulated DOM environment once at startup, as youtubei.js requires it.
const dom = new JSDOM();
Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
});

// --- Route Handlers ---

/**
 * Handles requests to the /data endpoint.
 * A new Innertube instance is created for each request to ensure a fresh poToken is generated.
 */
async function handleDataRequest(res: ServerResponse) {
    usage++;
    try {
        // Create a new Innertube instance on each call to get fresh visitor data.
        const innertube = await Innertube.create({ retrieve_player: false });
        const visitorData = innertube.session.context.client.visitorData;

        if (!visitorData) {
            throw new Error("Could not retrieve visitor data from Innertube session.");
        }

        const bgConfig = {
            fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
            globalObj: globalThis,
            identifier: visitorData,
            requestKey: REQUEST_KEY,
        };

        const bgChallenge = await BG.Challenge.create(bgConfig);
        if (!bgChallenge) {
            throw new Error("Could not create BG Challenge.");
        }

        const interpreterJs = bgChallenge.interpreterJavascript.privateDoNotAccessOrElseSafeScriptWrappedValue;
        if (interpreterJs) {
            new Function(interpreterJs)();
        } else {
            throw new Error("Could not load the VM from the BG Challenge.");
        }

        const poTokenResult = await BG.PoToken.generate({
            program: bgChallenge.program,
            globalName: bgChallenge.globalName,
            bgConfig,
        });

        const responseBody = JSON.stringify({
            visitorData,
            poToken: poTokenResult.poToken,
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(responseBody);

    } catch (error: any) {
        console.error("[/data] Error:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message || "An unexpected error occurred." }));
    }
}

/**
 * Handles requests to the /usage endpoint.
 */
function handleUsageRequest(res: ServerResponse) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`${usage} requests made`);
}

/**
 * Handles all other requests with a simple "I'm Alive" message.
 */
function handleNotFound(res: ServerResponse) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("I'm Alive");
}

// --- Server Initialization ---

function main() {
    const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
        switch (req.url) {
            case "/data":
                handleDataRequest(res);
                break;
            case "/usage":
                handleUsageRequest(res);
                break;
            default:
                handleNotFound(res);
                break;
        }
    });

    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

main();
