import { app } from "./bundle.cjs";

// Vercel Serverless Function Config
export const config = {
    api: {
        bodyParser: false, // Express handles body parsing
    },
};

// Vercel handles default exports of Express instances
export default app;
