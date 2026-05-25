import { Router, Response, Request, NextFunction } from 'express';
import { User } from '../models/user.model';
import { Task } from '../models/task.model';
import { Gig } from '../models/gig.model';
import { Withdrawal } from '../models/withdrawal.model';
import { TaskCompletion } from '../models/task-completion.model';
import { Referral } from '../models/referral.model';

const router = Router();

// Middleware to verify Admin Password
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const adminPassword = req.headers['x-admin-password'] as string;
  const expectedPassword = process.env.ADMIN_PASSWORD || 'PaisaTapAdmin123';

  if (!adminPassword || adminPassword !== expectedPassword) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin credentials' });
  }
  next();
};

router.use(adminAuth);

/**
 * GET /api/admin/stats
 * Fetches dashboard details.
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTasks = await Task.countDocuments();
    
    // Aggregation of user balances and earnings
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$balance' },
          totalEarning: { $sum: '$totalEarned' },
        },
      },
    ]);

    const totalBalanceHeld = userStats[0]?.totalBalance || 0;
    const totalEarnedOverall = userStats[0]?.totalEarning || 0;

    // Withdrawal aggregates
    const pendingWithdrawalsCount = await Withdrawal.countDocuments({ status: 'pending' });
    const processingWithdrawalsCount = await Withdrawal.countDocuments({ status: 'processing' });
    
    const completedWithdrawals = await Withdrawal.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalPayout: { $sum: '$netAmount' } } },
    ]);
    const totalPaidOut = completedWithdrawals[0]?.totalPayout || 0;

    const pendingTaskCompletions = await TaskCompletion.countDocuments({ status: 'pending' });

    // Fetch lists for approval dashboards
    const pendingWithdrawals = await Withdrawal.find({ status: 'pending' }).sort({ createdAt: -1 });
    const pendingTasks = await TaskCompletion.find({ status: 'pending' }).populate('taskId').sort({ completedAt: -1 });

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalTasks,
        totalBalanceHeld,
        totalEarnedOverall,
        totalPaidOut,
        pendingWithdrawalsCount,
        processingWithdrawalsCount,
        pendingTaskCompletions,
      },
      pendingWithdrawals,
      pendingTasks,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/tasks
 * Adds a new Task.
 */
router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { title, description, rewardAmount, type, link, verificationMethod, verificationCode } = req.body;

    if (!title || !description || !rewardAmount || !type) {
      return res.status(400).json({ error: 'Missing required task fields' });
    }

    const task = new Task({
      title,
      description,
      rewardAmount,
      type,
      link,
      verificationMethod,
      verificationCode,
      isActive: true,
    });

    await task.save();
    return res.status(201).json({ success: true, task });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/gigs
 * Adds a new sponsored Gig.
 */
router.post('/gigs', async (req: Request, res: Response) => {
  try {
    const { title, description, reward, imageUrl, instructions, externalLink } = req.body;

    if (!title || !description || !reward || !instructions || !externalLink) {
      return res.status(400).json({ error: 'Missing required gig fields' });
    }

    const gig = new Gig({
      title,
      description,
      reward,
      imageUrl,
      instructions,
      externalLink,
      isActive: true,
    });

    await gig.save();
    return res.status(201).json({ success: true, gig });
  } catch (error) {
    console.error('Error creating gig:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/adjust-balance
 * Manually adjusts a user's balance.
 */
router.post('/adjust-balance', async (req: Request, res: Response) => {
  try {
    const { telegramId, amount, type } = req.body; // type: 'add' or 'subtract' or 'set'

    if (!telegramId || amount === undefined || !type) {
      return res.status(400).json({ error: 'Missing adjustment parameters' });
    }

    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const amountNum = Number(amount);
    if (type === 'add') {
      user.balance = Math.round((user.balance + amountNum) * 100) / 100;
      user.totalEarned = Math.round((user.totalEarned + amountNum) * 100) / 100;
    } else if (type === 'subtract') {
      user.balance = Math.max(0, Math.round((user.balance - amountNum) * 100) / 100);
    } else if (type === 'set') {
      user.balance = Math.round(amountNum * 100) / 100;
    }

    await user.save();
    return res.status(200).json({ success: true, balance: user.balance, user });
  } catch (error) {
    console.error('Error adjusting user balance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/withdraw/approve
 * Manually approves a withdrawal payout (useful if in pending state).
 */
router.post('/withdraw/approve', async (req: Request, res: Response) => {
  try {
    const { withdrawalId } = req.body;
    if (!withdrawalId) {
      return res.status(400).json({ error: 'Withdrawal ID required' });
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
      return res.status(400).json({ error: `Withdrawal has already been marked ${withdrawal.status}` });
    }

    withdrawal.status = 'completed';
    await withdrawal.save();

    return res.status(200).json({ success: true, withdrawal });
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/withdraw/reject
 * Rejects a withdrawal payout and refunds user balance.
 */
router.post('/withdraw/reject', async (req: Request, res: Response) => {
  try {
    const { withdrawalId } = req.body;
    if (!withdrawalId) {
      return res.status(400).json({ error: 'Withdrawal ID required' });
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    if (withdrawal.status === 'completed' || withdrawal.status === 'rejected') {
      return res.status(400).json({ error: `Withdrawal has already been marked ${withdrawal.status}` });
    }

    withdrawal.status = 'rejected';
    await withdrawal.save();

    // Refund user balance
    const user = await User.findOne({ telegramId: withdrawal.telegramId });
    if (user) {
      user.balance = Math.round((user.balance + withdrawal.amount) * 100) / 100;
      await user.save();
    }

    return res.status(200).json({ success: true, withdrawal });
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/task-completion/review
 * Approves or rejects a manual task completion.
 */
router.post('/task-completion/review', async (req: Request, res: Response) => {
  try {
    const { completionId, status } = req.body; // status: 'approved' or 'rejected'

    if (!completionId || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Completion ID and valid review status are required' });
    }

    const completion = await TaskCompletion.findById(completionId);
    if (!completion) {
      return res.status(404).json({ error: 'Task completion log not found' });
    }

    if (completion.status !== 'pending') {
      return res.status(400).json({ error: `Task completion already reviewed: ${completion.status}` });
    }

    completion.status = status;
    await completion.save();

    let referralRewarded = false;

    if (status === 'approved') {
      const task = await Task.findById(completion.taskId);
      if (task) {
        const user = await User.findOne({ telegramId: completion.telegramId });
        if (user) {
          user.balance = Math.round((user.balance + task.rewardAmount) * 100) / 100;
          user.totalEarned = Math.round((user.totalEarned + task.rewardAmount) * 100) / 100;
          await user.save();

          // Check if this was the user's first approved task
          const approvedCount = await TaskCompletion.countDocuments({
            telegramId: completion.telegramId,
            status: 'approved',
          });

          if (approvedCount === 1) {
            const referral = await Referral.findOne({
              referredId: completion.telegramId,
              rewardDistributed: false,
            });

            if (referral) {
              const referrer = await User.findOne({ telegramId: referral.referrerId });
              if (referrer) {
                referrer.balance = Math.round((referrer.balance + 40) * 100) / 100;
                referrer.totalEarned = Math.round((referrer.totalEarned + 40) * 100) / 100;
                await referrer.save();

                user.balance = Math.round((user.balance + 20) * 100) / 100;
                user.totalEarned = Math.round((user.totalEarned + 20) * 100) / 100;
                await user.save();

                referral.rewardDistributed = true;
                await referral.save();
                referralRewarded = true;
              }
            }
          }
        }
      }
    }

    return res.status(200).json({ success: true, completion, referralRewarded });
  } catch (error) {
    console.error('Error reviewing task completion:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
