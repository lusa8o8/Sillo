// @ts-ignore
import { app } from "../dist/index.cjs";

// Vercel Serverless Function Config
export const config = {
    api: {
        bodyParser: false, // Express handles body parsing
    },
};

export default app;
