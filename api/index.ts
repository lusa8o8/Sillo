import { app } from "./bundle.cjs";

// Vercel Serverless Function Config
export const config = {
    api: {
        bodyParser: false, // Express handles body parsing
    },
};

const logs: string[] = [];

app.use((req, _res, next) => {
    logs.push(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Vercel handles default exports of Express instances
app.get("/api/vercel-entry-check", (_req, res) => {
    res.json({ status: "entry-point-ready", timestamp: new Date().toISOString(), logs });
});

app.get("/api/dump-logs", (_req, res) => {
    res.json(logs);
});

export default app;
