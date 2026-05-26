"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
exports.verifyTelegramInitData = verifyTelegramInitData;
const crypto_1 = __importDefault(require("crypto"));
const user_model_1 = require("../models/user.model");
/**
 * Validates Telegram initData query string.
 * Uses the Telegram bot token to verify the signature (hash).
 */
function verifyTelegramInitData(initData, botToken) {
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash)
            return false;
        // Filter out hash and sort the remaining parameters
        const keys = Array.from(params.keys())
            .filter((key) => key !== 'hash')
            .sort();
        const dataCheckString = keys
            .map((key) => `${key}=${params.get(key)}`)
            .join('\n');
        // Create the secret key using the HMAC SHA256 of the token with the key "WebAppData"
        const secretKey = crypto_1.default
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();
        // Generate the validation hash
        const validationHash = crypto_1.default
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        return validationHash === hash;
    }
    catch (error) {
        console.error('Error verifying Telegram initData:', error);
        return false;
    }
}
/**
 * Authentication middleware for Telegram WebApp requests.
 */
const authMiddleware = async (req, res, next) => {
    const initDataHeader = req.headers['x-telegram-init-data'];
    const authHeader = req.headers['authorization'];
    const devUserHeader = req.headers['x-dev-user-id'];
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    // Development bypass (only if NODE_ENV is development)
    if (process.env.NODE_ENV === 'development' && devUserHeader) {
        req.user = {
            telegramId: devUserHeader,
            username: req.headers['x-dev-username'] || 'dev_user',
            firstName: req.headers['x-dev-first-name'] || 'Dev',
            lastName: req.headers['x-dev-last-name'] || 'User',
        };
        // Check if user is banned
        const dbUser = await user_model_1.User.findOne({ telegramId: req.user.telegramId });
        if (dbUser && dbUser.isBanned) {
            return res.status(403).json({ error: 'Forbidden: Your account has been suspended by an administrator.' });
        }
        return next();
    }
    let initData = initDataHeader;
    if (!initData && authHeader && authHeader.startsWith('Bearer ')) {
        initData = authHeader.substring(7);
    }
    if (!initData) {
        console.warn('[AUTH ERROR] Missing x-telegram-init-data or Authorization Bearer header. Request headers:', req.headers);
        return res.status(401).json({ error: 'Unauthorized: Missing initData credentials' });
    }
    if (!botToken) {
        console.error('TELEGRAM_BOT_TOKEN environment variable is not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    const isValid = verifyTelegramInitData(initData, botToken);
    if (!isValid) {
        console.warn('[AUTH ERROR] Invalid Telegram initData signature.');
        console.warn('Received initData:', initData);
        return res.status(401).json({ error: 'Unauthorized: Invalid initData signature' });
    }
    try {
        const params = new URLSearchParams(initData);
        const userString = params.get('user');
        if (!userString) {
            return res.status(400).json({ error: 'Invalid payload: User data missing' });
        }
        const tgUser = JSON.parse(userString);
        req.user = {
            telegramId: tgUser.id.toString(),
            username: tgUser.username,
            firstName: tgUser.first_name,
            lastName: tgUser.last_name,
        };
        // Check if user is banned
        const dbUser = await user_model_1.User.findOne({ telegramId: req.user.telegramId });
        if (dbUser && dbUser.isBanned) {
            return res.status(403).json({ error: 'Forbidden: Your account has been suspended by an administrator.' });
        }
        next();
    }
    catch (error) {
        console.error('Error parsing Telegram user data:', error);
        return res.status(400).json({ error: 'Invalid payload: Failed to parse user data' });
    }
};
exports.authMiddleware = authMiddleware;
