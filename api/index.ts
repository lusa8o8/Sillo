import { app } from "./bundle.cjs";

// Vercel Serverless Function Config
export const config = {
    api: {
        bodyParser: false, // Express handles body parsing
    },
};

// Vercel handles default exports of Express instances
app.get("/api/vercel-entry-check", (_req, res) => {
    res.json({ status: "entry-point-ready", timestamp: new Date().toISOString() });
});

export default app;
