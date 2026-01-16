import { app } from "./bundle.cjs";

console.log("Vercel entry point loading...");

// Vercel Serverless Function Config
export const config = {
    api: {
        bodyParser: false, // Express handles body parsing
    },
};

const logs: string[] = [];

app.use((req: any, _res: any, next: any) => {
    logs.push(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Vercel handles default exports of Express instances
app.get("/api/vercel-entry-check", (_req: any, res: any) => {
    res.json({ status: "entry-point-ready", timestamp: new Date().toISOString(), logs });
});

app.get("/api/dump-logs", (_req: any, res: any) => {
    res.json(logs);
});

export default app;
