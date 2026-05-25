"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_model_1 = require("../models/user.model");
const referral_model_1 = require("../models/referral.model");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/telegram
 * Authenticates user from Telegram Init Data, creates profile if not exists,
 * and sets up referrals.
 */
router.post('/telegram', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const tgUser = req.user;
        if (!tgUser) {
            return res.status(401).json({ error: 'Authentication failed' });
        }
        const { referredBy } = req.body; // telegramId of the referrer passed by client
        let user = await user_model_1.User.findOne({ telegramId: tgUser.telegramId });
        let isNewUser = false;
        if (!user) {
            isNewUser = true;
            // Ensure user doesn't refer themselves
            const referrerId = referredBy && referredBy !== tgUser.telegramId ? referredBy : undefined;
            user = new user_model_1.User({
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
                const referrerExists = await user_model_1.User.findOne({ telegramId: referrerId });
                if (referrerExists) {
                    const referral = new referral_model_1.Referral({
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
        }
        else {
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
            // Restore energy based on time elapsed
            const now = new Date();
            const secondsPassed = Math.floor((now.getTime() - new Date(user.lastEnergyRefill).getTime()) / 1000);
            // Regenerate 3 energy per second
            if (secondsPassed > 0 && user.energy < user.maxEnergy) {
                const regenerated = secondsPassed * 3;
                user.energy = Math.min(user.maxEnergy, user.energy + regenerated);
                user.lastEnergyRefill = now;
                modified = true;
            }
            if (modified) {
                await user.save();
            }
        }
        return res.status(200).json({
            success: true,
            user,
            isNewUser,
        });
    }
    catch (error) {
        console.error('Error authenticating user:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
