import { app } from "../server/index";

// Vercel Serverless Function Config
export const config = {
    api: {
        bodyParser: false, // Express handles body parsing
    },
};

export default app;
