import { Router, Response } from 'express';
import { User } from '../models/user.model';
import { AdLog } from '../models/ad-log.model';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// Apply authMiddleware to all routes here
router.use(authMiddleware);

/**
 * GET /api/user/me
 * Retrieves current user's profile, resolving energy regeneration.
 */
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tgUser = req.user!;
    const user = await User.findOne({ telegramId: tgUser.telegramId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Process energy regeneration
    const now = new Date();
    const secondsPassed = Math.floor((now.getTime() - new Date(user.lastEnergyRefill).getTime()) / 1000);
    
    // Regenerate energy slowly (completely refills in 4 hours)
    if (secondsPassed > 0 && user.energy < user.maxEnergy) {
      const refillRate = user.maxEnergy / 14400; // 4 hours
      const regenerated = secondsPassed * refillRate;
      user.energy = Math.min(user.maxEnergy, user.energy + regenerated);
      user.lastEnergyRefill = now;
      await user.save();
    }

    const adminIdsStr = process.env.ADMIN_IDS || '';
    const adminIds = adminIdsStr.split(',').map(id => id.trim());
    
    const adminUsernamesStr = process.env.ADMIN_USERNAMES || '';
    const adminUsernames = adminUsernamesStr.split(',')
      .map(name => name.trim().replace(/^@/, '').toLowerCase())
      .concat(['vilasv8', 'varun_5812']);

    const isNumericAdmin = adminIds.includes(tgUser.telegramId);
    const isUsernameAdmin = tgUser.username && adminUsernames.includes(tgUser.username.toLowerCase());
    const isAdmin = isNumericAdmin || isUsernameAdmin;

    return res.status(200).json({ success: true, user, isAdmin });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/user/tap
 * Taps to earn money. Deducts energy, adds money, checks for cheating.
 */
router.post('/tap', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tgUser = req.user!;
    const { taps } = req.body; // number of taps done in this batch

    if (!taps || typeof taps !== 'number' || taps <= 0) {
      return res.status(400).json({ error: 'Invalid tap count' });
    }

    // Anti-cheat limit: Max 20 taps in a single request / batch per second
    if (taps > 30) {
      return res.status(400).json({ error: 'Anti-cheat: Tap rate exceeded threshold' });
    }

    const user = await User.findOne({ telegramId: tgUser.telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const secondsPassed = Math.floor((now.getTime() - new Date(user.lastEnergyRefill).getTime()) / 1000);
    
    // 1. First, regenerate energy since last action slowly (4 hours)
    if (secondsPassed > 0 && user.energy < user.maxEnergy) {
      const refillRate = user.maxEnergy / 14400;
      const regenerated = secondsPassed * refillRate;
      user.energy = Math.min(user.maxEnergy, user.energy + regenerated);
    }
    user.lastEnergyRefill = now;

    // 2. Check if user has enough energy
    const energyRequired = taps; // 1 energy per tap
    if (user.energy < energyRequired) {
      return res.status(400).json({ error: 'Not enough energy', currentEnergy: user.energy });
    }

    // 3. Calculate earnings: ₹0.05 per tap (with a small bonus based on user level)
    const multiplier = 1 + (user.level - 1) * 0.05; // 5% bonus per level
    const earningPerTap = 0.05 * multiplier;
    const totalEarning = Math.round(taps * earningPerTap * 100) / 100;

    // 4. Update user
    user.energy -= energyRequired;
    user.balance = Math.round((user.balance + totalEarning) * 100) / 100;
    user.totalEarned = Math.round((user.totalEarned + totalEarning) * 100) / 100;

    await user.save();

    return res.status(200).json({
      success: true,
      balance: user.balance,
      totalEarned: user.totalEarned,
      energy: user.energy,
      earned: totalEarning,
    });
  } catch (error) {
    console.error('Error recording taps:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/user/daily-claim
 * Claims the daily streak login reward.
 */
router.post('/daily-claim', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tgUser = req.user!;
    const user = await User.findOne({ telegramId: tgUser.telegramId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const rewards = [1, 2, 5, 10, 15, 25, 50]; // Day 1 to Day 7 rewards in ₹

    if (user.lastDailyClaim) {
      const lastClaim = new Date(user.lastDailyClaim);
      
      // Reset hours to compare calendar days
      const diffTime = now.setHours(0,0,0,0) - lastClaim.setHours(0,0,0,0);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return res.status(400).json({ error: 'Daily reward already claimed today' });
      }

      if (diffDays === 1) {
        // Continuous streak
        user.streak = (user.streak % 7) + 1;
      } else {
        // Streak broken
        user.streak = 1;
      }
    } else {
      // First claim ever
      user.streak = 1;
    }

    const rewardAmount = rewards[user.streak - 1];
    user.balance = Math.round((user.balance + rewardAmount) * 100) / 100;
    user.totalEarned = Math.round((user.totalEarned + rewardAmount) * 100) / 100;
    user.lastDailyClaim = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      balance: user.balance,
      streak: user.streak,
      rewardAmount,
    });
  } catch (error) {
    console.error('Error claiming daily reward:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/user/game-reward
 * Secures rewards won from Mini Games (Spin Wheel or Scratch Card).
 */
router.post('/game-reward', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tgUser = req.user!;
    const { game, rewardType, rewardValue, energyCost, wasDoubled, playWithAd } = req.body;

    if (!game || !rewardType || rewardValue === undefined || energyCost === undefined) {
      return res.status(400).json({ error: 'Missing game reward parameters' });
    }

    // Anti-cheat maximum bounds check
    if (rewardType === 'cash' && rewardValue > 100) {
      return res.status(400).json({ error: 'Anti-cheat: Reward value exceeds limits' });
    }
    if (rewardType === 'energy' && rewardValue > 1000) {
      return res.status(400).json({ error: 'Anti-cheat: Energy reward exceeds limits' });
    }

    const user = await User.findOne({ telegramId: tgUser.telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Process energy recovery first
    const now = new Date();
    const secondsPassed = Math.floor((now.getTime() - new Date(user.lastEnergyRefill).getTime()) / 1000);
    if (secondsPassed > 0 && user.energy < user.maxEnergy) {
      const refillRate = user.maxEnergy / 14400;
      user.energy = Math.min(user.maxEnergy, user.energy + secondsPassed * refillRate);
    }
    user.lastEnergyRefill = now;

    // Verify energy cost
    if (user.energy < energyCost) {
      return res.status(400).json({ error: 'Not enough energy to play this game', currentEnergy: user.energy });
    }

    // Deduct cost and credit rewards
    user.energy -= energyCost;

    if (rewardType === 'cash') {
      user.balance = Math.round((user.balance + rewardValue) * 100) / 100;
      user.totalEarned = Math.round((user.totalEarned + rewardValue) * 100) / 100;
    } else if (rewardType === 'energy') {
      user.energy = Math.min(user.maxEnergy, user.energy + rewardValue);
    }

    await user.save();

    // Log ad views in the database
    if (playWithAd) {
      try {
        await AdLog.create({
          telegramId: tgUser.telegramId,
          action: `free_game_${game}` as any,
        });
      } catch (err) {
        console.error('Error logging free game ad watch:', err);
      }
    }

    if (wasDoubled && rewardType === 'cash') {
      try {
        await AdLog.create({
          telegramId: tgUser.telegramId,
          action: 'double_game',
          rewardValue: rewardValue / 2, // The ad payout represents half the total reward
        });
      } catch (err) {
        console.error('Error logging double reward ad watch:', err);
      }
    }

    return res.status(200).json({
      success: true,
      balance: user.balance,
      energy: user.energy,
      message: rewardType === 'cash' 
        ? `Congratulations! You won ₹${rewardValue}!` 
        : `Congratulations! You gained ${rewardValue} energy!`,
    });
  } catch (error) {
    console.error('Error claiming game reward:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/user/ad-watch
 * Records a rewarded ad watch and rewards the user.
 * Action types: 'energy_refill' or 'task_reward'
 */
router.post('/ad-watch', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tgUser = req.user!;
    const { action } = req.body;

    if (!action || !['energy_refill', 'task_reward'].includes(action)) {
      return res.status(400).json({ error: 'Invalid ad watch action' });
    }

    const user = await User.findOne({ telegramId: tgUser.telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 1. Recover energy first
    const now = new Date();
    const secondsPassed = Math.floor((now.getTime() - new Date(user.lastEnergyRefill).getTime()) / 1000);
    if (secondsPassed > 0 && user.energy < user.maxEnergy) {
      const refillRate = user.maxEnergy / 14400;
      user.energy = Math.min(user.maxEnergy, user.energy + secondsPassed * refillRate);
    }
    user.lastEnergyRefill = now;

    if (action === 'energy_refill') {
      // Increment watch count
      user.adRefillsWatched = (user.adRefillsWatched || 0) + 1;
      
      let refilled = false;
      if (user.adRefillsWatched >= 3) {
        user.energy = user.maxEnergy;
        user.adRefillsWatched = 0;
        refilled = true;
      }

      await user.save();

      // Log the ad watch
      try {
        await AdLog.create({
          telegramId: tgUser.telegramId,
          action: 'energy_refill'
        });
      } catch (err) {
        console.error('Error logging energy refill ad watch:', err);
      }

      return res.status(200).json({
        success: true,
        energy: user.energy,
        adRefillsWatched: user.adRefillsWatched,
        message: refilled ? 'Energy fully refilled!' : `Ad watch registered (${user.adRefillsWatched}/3).`
      });
    } else if (action === 'task_reward') {
      // Watch & Earn Cash Task
      const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
      
      if (user.lastAdTaskWatched) {
        const timePassed = now.getTime() - new Date(user.lastAdTaskWatched).getTime();
        if (timePassed < COOLDOWN_MS) {
          const remainingSeconds = Math.ceil((COOLDOWN_MS - timePassed) / 1000);
          return res.status(400).json({
            error: `Ad task is on cooldown. Please wait ${remainingSeconds} seconds.`,
            remainingSeconds
          });
        }
      }

      // Reward ₹0.50
      const reward = 0.50;
      user.balance = Math.round((user.balance + reward) * 100) / 100;
      user.totalEarned = Math.round((user.totalEarned + reward) * 100) / 100;
      user.lastAdTaskWatched = now;

      await user.save();

      // Log the ad watch
      try {
        await AdLog.create({
          telegramId: tgUser.telegramId,
          action: 'task_reward',
          rewardValue: reward
        });
      } catch (err) {
        console.error('Error logging task ad watch:', err);
      }

      return res.status(200).json({
        success: true,
        balance: user.balance,
        totalEarned: user.totalEarned,
        message: 'Congratulations! You earned ₹0.50 for watching the ad.'
      });
    }
  } catch (error) {
    console.error('Error in ad-watch endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
