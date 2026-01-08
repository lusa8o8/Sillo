const functions = require("firebase-functions");
const { app } = require("../dist/index.cjs");

exports.api = functions.https.onRequest(app);
