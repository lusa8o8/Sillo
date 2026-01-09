import { Response } from "express";

/**
 * Standard API response format
 */
export function apiResponse(res: Response, data: any, status = 200) {
    return res.status(status).json(data);
}

/**
 * Standard API error format
 */
export function apiError(res: Response, message: string, status = 500, details?: any) {
    return res.status(status).json({
        error: message,
        details: details
    });
}
