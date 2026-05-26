"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_model_1 = require("../models/user.model");
const task_model_1 = require("../models/task.model");
const gig_model_1 = require("../models/gig.model");
const withdrawal_model_1 = require("../models/withdrawal.model");
const task_completion_model_1 = require("../models/task-completion.model");
const referral_model_1 = require("../models/referral.model");
const ad_log_model_1 = require("../models/ad-log.model");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Apply general authentication middleware first
router.use(auth_middleware_1.authMiddleware);
// Middleware to verify Telegram ID matches process.env.ADMIN_IDS
const adminAuth = (req, res, next) => {
    const user = req.user;
    if (!user || !user.telegramId) {
        return res.status(401).json({ error: 'Unauthorized: Missing credentials' });
    }
    const adminIdsStr = process.env.ADMIN_IDS || '';
    const adminIds = adminIdsStr.split(',').map(id => id.trim());
    if (!adminIds.includes(user.telegramId)) {
        return res.status(403).json({ error: 'Forbidden: Access Denied' });
    }
    next();
};
router.use(adminAuth);
/**
 * GET /api/admin/stats
 * Fetches dashboard details.
 */
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await user_model_1.User.countDocuments();
        const totalTasks = await task_model_1.Task.countDocuments();
        // Aggregation of user balances and earnings
        const userStats = await user_model_1.User.aggregate([
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
        const pendingWithdrawalsCount = await withdrawal_model_1.Withdrawal.countDocuments({ status: 'pending' });
        const processingWithdrawalsCount = await withdrawal_model_1.Withdrawal.countDocuments({ status: 'processing' });
        const completedWithdrawals = await withdrawal_model_1.Withdrawal.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, totalPayout: { $sum: '$netAmount' } } },
        ]);
        const totalPaidOut = completedWithdrawals[0]?.totalPayout || 0;
        const pendingTaskCompletions = await task_completion_model_1.TaskCompletion.countDocuments({ status: 'pending' });
        // Ad Watch aggregates & breakdowns
        const totalAdsWatched = await ad_log_model_1.AdLog.countDocuments();
        const adBreakdown = await ad_log_model_1.AdLog.aggregate([
            { $group: { _id: '$action', count: { $sum: 1 } } },
        ]);
        const adStats = {
            energy_refill: 0,
            task_reward: 0,
            double_game: 0,
            free_game_spin: 0,
            free_game_scratch: 0,
            free_game_catcher: 0,
        };
        adBreakdown.forEach((item) => {
            if (item._id in adStats) {
                adStats[item._id] = item.count;
            }
        });
        // Daily Growth metrics (past 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const registrationStats = await user_model_1.User.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        const adDailyStats = await ad_log_model_1.AdLog.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        // Fetch lists for approval dashboards
        const pendingWithdrawals = await withdrawal_model_1.Withdrawal.find({ status: 'pending' }).sort({ createdAt: -1 });
        const pendingTasks = await task_completion_model_1.TaskCompletion.find({ status: 'pending' }).populate('taskId').sort({ completedAt: -1 });
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
                totalAdsWatched,
                adBreakdown: adStats,
                registrations: registrationStats,
                adDailyStats,
            },
            pendingWithdrawals,
            pendingTasks,
        });
    }
    catch (error) {
        console.error('Error fetching admin stats:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/admin/tasks
 * Adds a new Task.
 */
router.post('/tasks', async (req, res) => {
    try {
        const { title, description, rewardAmount, type, link, verificationMethod, verificationCode } = req.body;
        if (!title || !description || !rewardAmount || !type) {
            return res.status(400).json({ error: 'Missing required task fields' });
        }
        const task = new task_model_1.Task({
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
    }
    catch (error) {
        console.error('Error creating task:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/admin/gigs
 * Adds a new sponsored Gig.
 */
router.post('/gigs', async (req, res) => {
    try {
        const { title, description, reward, imageUrl, instructions, externalLink } = req.body;
        if (!title || !description || !reward || !instructions || !externalLink) {
            return res.status(400).json({ error: 'Missing required gig fields' });
        }
        const gig = new gig_model_1.Gig({
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
    }
    catch (error) {
        console.error('Error creating gig:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/admin/adjust-balance
 * Manually adjusts a user's balance.
 */
router.post('/adjust-balance', async (req, res) => {
    try {
        const { telegramId, amount, type } = req.body; // type: 'add' or 'subtract' or 'set'
        if (!telegramId || amount === undefined || !type) {
            return res.status(400).json({ error: 'Missing adjustment parameters' });
        }
        const user = await user_model_1.User.findOne({ telegramId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const amountNum = Number(amount);
        if (type === 'add') {
            user.balance = Math.round((user.balance + amountNum) * 100) / 100;
            user.totalEarned = Math.round((user.totalEarned + amountNum) * 100) / 100;
        }
        else if (type === 'subtract') {
            user.balance = Math.max(0, Math.round((user.balance - amountNum) * 100) / 100);
        }
        else if (type === 'set') {
            user.balance = Math.round(amountNum * 100) / 100;
        }
        await user.save();
        return res.status(200).json({ success: true, balance: user.balance, user });
    }
    catch (error) {
        console.error('Error adjusting user balance:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/admin/withdraw/approve
 * Manually approves a withdrawal payout (useful if in pending state).
 */
router.post('/withdraw/approve', async (req, res) => {
    try {
        const { withdrawalId } = req.body;
        if (!withdrawalId) {
            return res.status(400).json({ error: 'Withdrawal ID required' });
        }
        const withdrawal = await withdrawal_model_1.Withdrawal.findById(withdrawalId);
        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal request not found' });
        }
        if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
            return res.status(400).json({ error: `Withdrawal has already been marked ${withdrawal.status}` });
        }
        withdrawal.status = 'completed';
        await withdrawal.save();
        return res.status(200).json({ success: true, withdrawal });
    }
    catch (error) {
        console.error('Error approving withdrawal:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/admin/withdraw/reject
 * Rejects a withdrawal payout and refunds user balance.
 */
router.post('/withdraw/reject', async (req, res) => {
    try {
        const { withdrawalId } = req.body;
        if (!withdrawalId) {
            return res.status(400).json({ error: 'Withdrawal ID required' });
        }
        const withdrawal = await withdrawal_model_1.Withdrawal.findById(withdrawalId);
        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal request not found' });
        }
        if (withdrawal.status === 'completed' || withdrawal.status === 'rejected') {
            return res.status(400).json({ error: `Withdrawal has already been marked ${withdrawal.status}` });
        }
        withdrawal.status = 'rejected';
        await withdrawal.save();
        // Refund user balance
        const user = await user_model_1.User.findOne({ telegramId: withdrawal.telegramId });
        if (user) {
            user.balance = Math.round((user.balance + withdrawal.amount) * 100) / 100;
            await user.save();
        }
        return res.status(200).json({ success: true, withdrawal });
    }
    catch (error) {
        console.error('Error rejecting withdrawal:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/admin/task-completion/review
 * Approves or rejects a manual task completion.
 */
router.post('/task-completion/review', async (req, res) => {
    try {
        const { completionId, status } = req.body; // status: 'approved' or 'rejected'
        if (!completionId || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Completion ID and valid review status are required' });
        }
        const completion = await task_completion_model_1.TaskCompletion.findById(completionId);
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
            const task = await task_model_1.Task.findById(completion.taskId);
            if (task) {
                const user = await user_model_1.User.findOne({ telegramId: completion.telegramId });
                if (user) {
                    user.balance = Math.round((user.balance + task.rewardAmount) * 100) / 100;
                    user.totalEarned = Math.round((user.totalEarned + task.rewardAmount) * 100) / 100;
                    await user.save();
                    // Check if this was the user's first approved task
                    const approvedCount = await task_completion_model_1.TaskCompletion.countDocuments({
                        telegramId: completion.telegramId,
                        status: 'approved',
                    });
                    if (approvedCount === 1) {
                        const referral = await referral_model_1.Referral.findOne({
                            referredId: completion.telegramId,
                            rewardDistributed: false,
                        });
                        if (referral) {
                            const referrer = await user_model_1.User.findOne({ telegramId: referral.referrerId });
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
    }
    catch (error) {
        console.error('Error reviewing task completion:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/admin/users
 * Search and list users with pagination.
 */
router.get('/users', async (req, res) => {
    try {
        const search = req.query.search;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;
        const query = {};
        if (search) {
            // Search by username or telegramId
            query.$or = [
                { telegramId: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }
        const totalUsers = await user_model_1.User.countDocuments(query);
        const users = await user_model_1.User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const totalPages = Math.ceil(totalUsers / limit);
        return res.status(200).json({
            success: true,
            users,
            pagination: {
                totalUsers,
                totalPages,
                currentPage: page,
                limit
            }
        });
    }
    catch (error) {
        console.error('Error fetching admin users list:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/admin/users/ban
 * Suspends or reinstates a user's account.
 */
router.post('/users/ban', async (req, res) => {
    try {
        const { telegramId, isBanned } = req.body;
        if (!telegramId || isBanned === undefined) {
            return res.status(400).json({ error: 'Telegram ID and ban state are required' });
        }
        const user = await user_model_1.User.findOne({ telegramId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.isBanned = Boolean(isBanned);
        await user.save();
        return res.status(200).json({
            success: true,
            user,
            message: user.isBanned
                ? 'User account has been suspended.'
                : 'User account has been reinstated.'
        });
    }
    catch (error) {
        console.error('Error toggling user ban:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
