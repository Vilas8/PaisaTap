"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_model_1 = require("../models/user.model");
const referral_model_1 = require("../models/referral.model");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
/**
 * GET /api/referral/stats
 * Retrieves statistics for the user's referrals.
 */
router.get('/stats', async (req, res) => {
    try {
        const tgUser = req.user;
        const user = await user_model_1.User.findOne({ telegramId: tgUser.telegramId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // A referral is active (successful) if rewardDistributed is true
        const activeReferralsCount = await referral_model_1.Referral.countDocuments({
            referrerId: tgUser.telegramId,
            rewardDistributed: true,
        });
        const pendingReferralsCount = await referral_model_1.Referral.countDocuments({
            referrerId: tgUser.telegramId,
            rewardDistributed: false,
        });
        const referralLink = `https://t.me/${process.env.BOT_USERNAME || 'PaisaTapBot'}?start=ref_${tgUser.telegramId}`;
        const referralEarnings = activeReferralsCount * 40; // Referrer earns ₹40 per active referral
        // Get list of referred users
        const referrals = await referral_model_1.Referral.find({ referrerId: tgUser.telegramId });
        const referredIds = referrals.map(r => r.referredId);
        // Find usernames / names of referred users
        const referredUsers = await user_model_1.User.find({ telegramId: { $in: referredIds } }, { telegramId: 1, username: 1, firstName: 1, lastName: 1, level: 1 });
        const referralList = referrals.map(ref => {
            const match = referredUsers.find(u => u.telegramId === ref.referredId);
            return {
                telegramId: ref.referredId,
                username: match?.username || 'Anonymous',
                name: match ? `${match.firstName || ''} ${match.lastName || ''}`.trim() : 'Anonymous',
                level: match?.level || 1,
                status: ref.rewardDistributed ? 'completed' : 'pending',
                createdAt: ref.createdAt,
            };
        });
        return res.status(200).json({
            success: true,
            referralLink,
            totalReferred: user.referralCount,
            activeReferrals: activeReferralsCount,
            pendingReferrals: pendingReferralsCount,
            earnings: referralEarnings,
            referrals: referralList,
        });
    }
    catch (error) {
        console.error('Error fetching referral stats:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/referral/leaderboard
 * Fetches top 10 referrers on the platform.
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const topReferrers = await user_model_1.User.find({ referralCount: { $gt: 0 } }, { username: 1, firstName: 1, lastName: 1, referralCount: 1, totalEarned: 1 })
            .sort({ referralCount: -1 })
            .limit(10);
        const leaderboard = topReferrers.map((user, idx) => ({
            rank: idx + 1,
            username: user.username || 'Anonymous',
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous',
            referralCount: user.referralCount,
            totalEarned: user.totalEarned,
        }));
        return res.status(200).json({
            success: true,
            leaderboard,
        });
    }
    catch (error) {
        console.error('Error fetching referral leaderboard:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
