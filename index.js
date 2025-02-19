const { BG } = require("bgutils-js");
const { JSDOM } = require("jsdom");
const { Innertube } = require("youtubei.js");
const express = require("express");
const fetch = require("node-fetch"); // For Node versions without a global fetch
const app = express();

// Set up the simulated DOM once at startup.
const dom = new JSDOM();
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
});

// Define the /data endpoint to generate and return fresh visitorData and poToken.
app.get("/data", async (req, res) => {
  try {
    // Create a new Innertube instance to obtain fresh visitorData.
    let innertube = await Innertube.create({ retrieve_player: false });
    const requestKey = "O43z0dpjhgX20SCx4KAo";
    const visitorData = innertube.session.context.client.visitorData;
    if (!visitorData) throw new Error("Could not get visitor data");

    // Build the configuration for BG.
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
    res.json({
      visitorData,
      poToken: poTokenResult.poToken,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// For any other route, return "I'm Alive".
app.get("*", (req, res) => {
  res.send("I'm Alive");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});