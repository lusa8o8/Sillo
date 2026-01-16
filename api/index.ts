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

app.get("/api/debug/files", (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const walk = (dir: string): any => {
        const results: any[] = [];
        const list = fs.readdirSync(dir);
        list.forEach((file: string) => {
            const filePath = path.resolve(dir, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                results.push({ name: file, type: 'dir', children: walk(filePath) });
            } else {
                results.push({ name: file, type: 'file', size: stat.size });
            }
        });
        return results;
    };
    try {
        res.json({
            cwd: process.cwd(),
            dirname: __dirname,
            files: walk(process.cwd())
        });
    } catch (e: any) {
        res.json({ error: e.message, stack: e.stack });
    }
});

app.get("/api/dump-logs", (_req: any, res: any) => {
    res.json(logs);
});

export default app;
