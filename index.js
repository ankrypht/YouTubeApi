const { BG } = require("bgutils-js");
const { JSDOM } = require("jsdom");
const { Innertube } = require("youtubei.js");
const express = require("express");
const fetch = require("node-fetch"); // if your Node version doesn't include fetch
const app = express();

(async () => {
    app.get("/data", async (req, res) => {
    // Create a barebones Innertube instance to get a visitor data string from YouTube.
    let innertube = await Innertube.create({ retrieve_player: false });
    const requestKey = "O43z0dpjhgX20SCx4KAo";
    const visitorData = innertube.session.context.client.visitorData;
    if (!visitorData)
        throw new Error("Could not get visitor data");

    // Create a JSDOM instance to simulate a browser DOM.
    const dom = new JSDOM();
    Object.assign(globalThis, {
        window: dom.window,
        document: dom.window.document,
    });

    // Prepare the bgConfig object.
    const bgConfig = {
        fetch: (input, init) => fetch(input, init),
        globalObj: globalThis,
        identifier: visitorData,
        requestKey,
    };

    // Create the BG challenge.
    const bgChallenge = await BG.Challenge.create(bgConfig);
    if (!bgChallenge)
        throw new Error("Could not get challenge");

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

    //const placeholderPoToken = BG.PoToken.generatePlaceholder(visitorData);

    /* console.info("Session Info:", {
         visitorData,
         placeholderPoToken,
         poToken: poTokenResult.poToken,
         integrityTokenData: poTokenResult.integrityTokenData,
     });
 */
    // Define the /data endpoint that sends the desired information.

        res.json({
            visitorData,
            poToken: poTokenResult.poToken,
        });
    });

    app.get('/', function (req, res) {
        res.send("I'm alive");
    });

    // Start the server.
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
})();
