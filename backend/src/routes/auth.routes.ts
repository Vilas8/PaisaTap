import { Router, Response } from 'express';
import { User } from '../models/user.model';
import { Referral } from '../models/referral.model';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/auth/telegram
 * Authenticates user from Telegram Init Data, creates profile if not exists,
 * and sets up referrals.
 */
router.post('/telegram', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tgUser = req.user;
    if (!tgUser) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const { referredBy } = req.body; // telegramId of the referrer passed by client

    let user = await User.findOne({ telegramId: tgUser.telegramId });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;

      // Ensure user doesn't refer themselves
      const referrerId = referredBy && referredBy !== tgUser.telegramId ? referredBy : undefined;

      user = new User({
        telegramId: tgUser.telegramId,
        username: tgUser.username,
        firstName: tgUser.firstName,
        lastName: tgUser.lastName,
        referredBy: referrerId,
        balance: 0,
        totalEarned: 0,
        streak: 0,
        energy: 1000,
        maxEnergy: 1000,
      });

      await user.save();

      // If referred by someone, record the referral relation
      if (referrerId) {
        const referrerExists = await User.findOne({ telegramId: referrerId });
        if (referrerExists) {
          const referral = new Referral({
            referrerId,
            referredId: tgUser.telegramId,
            rewardDistributed: false,
          });
          await referral.save();

          // Increment referral count on referrer
          referrerExists.referralCount += 1;
          await referrerExists.save();
        }
      }
    } else {
      // Update username/names if changed in Telegram
      let modified = false;
      if (tgUser.username && user.username !== tgUser.username) {
        user.username = tgUser.username;
        modified = true;
      }
      if (tgUser.firstName && user.firstName !== tgUser.firstName) {
        user.firstName = tgUser.firstName;
        modified = true;
      }
      if (tgUser.lastName && user.lastName !== tgUser.lastName) {
        user.lastName = tgUser.lastName;
        modified = true;
      }

      // Restore energy slowly (completely refills in 4 hours)
      const now = new Date();
      const secondsPassed = Math.floor((now.getTime() - new Date(user.lastEnergyRefill).getTime()) / 1000);
      
      if (secondsPassed > 0 && user.energy < user.maxEnergy) {
        const refillRate = user.maxEnergy / 14400; // 4 hours
        const regenerated = secondsPassed * refillRate;
        user.energy = Math.min(user.maxEnergy, user.energy + regenerated);
        user.lastEnergyRefill = now;
        modified = true;
      }

      if (modified) {
        await user.save();
      }
    }

    const adminIdsStr = process.env.ADMIN_IDS || '';
    const adminIds = adminIdsStr.split(',').map(id => id.trim()).concat(['1232204900']);

    const adminUsernamesStr = process.env.ADMIN_USERNAMES || '';
    const adminUsernames = adminUsernamesStr.split(',')
      .map(name => name.trim().replace(/^@/, '').toLowerCase())
      .concat(['vilasv8', 'varun_5812']);

    const isNumericAdmin = adminIds.includes(tgUser.telegramId);
    const isUsernameAdmin = tgUser.username && adminUsernames.includes(tgUser.username.toLowerCase());
    const isAdmin = isNumericAdmin || isUsernameAdmin;

    return res.status(200).json({
      success: true,
      user,
      isNewUser,
      isAdmin,
    });
  } catch (error) {
    console.error('Error authenticating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
