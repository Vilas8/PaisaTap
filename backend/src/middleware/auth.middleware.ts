import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AuthenticatedRequest extends Request {
  user?: {
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

/**
 * Validates Telegram initData query string.
 * Uses the Telegram bot token to verify the signature (hash).
 */
export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;

    // Filter out hash and sort the remaining parameters
    const keys = Array.from(params.keys())
      .filter((key) => key !== 'hash')
      .sort();

    const dataCheckString = keys
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n');

    // Create the secret key using the HMAC SHA256 of the token with the key "WebAppData"
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Generate the validation hash
    const validationHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return validationHash === hash;
  } catch (error) {
    console.error('Error verifying Telegram initData:', error);
    return false;
  }
}

/**
 * Authentication middleware for Telegram WebApp requests.
 */
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const initDataHeader = req.headers['x-telegram-init-data'] as string;
  const authHeader = req.headers['authorization'] as string;
  const devUserHeader = req.headers['x-dev-user-id'] as string;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  // Development bypass (only if NODE_ENV is development)
  if (process.env.NODE_ENV === 'development' && devUserHeader) {
    req.user = {
      telegramId: devUserHeader,
      username: (req.headers['x-dev-username'] as string) || 'dev_user',
      firstName: (req.headers['x-dev-first-name'] as string) || 'Dev',
      lastName: (req.headers['x-dev-last-name'] as string) || 'User',
    };
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

    next();
  } catch (error) {
    console.error('Error parsing Telegram user data:', error);
    return res.status(400).json({ error: 'Invalid payload: Failed to parse user data' });
  }
};
