"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_model_1 = require("../models/user.model");
const withdrawal_model_1 = require("../models/withdrawal.model");
const payment_service_1 = require("../config/payment.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Endpoint for Webhook (does NOT use authMiddleware, since it is called by Razorpay servers)
router.post('/webhook', async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = JSON.stringify(req.body);
    const isValid = payment_service_1.paymentService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    try {
        const event = req.body.event;
        const payout = req.body.payload?.payout?.entity;
        if (!payout) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }
        const referenceId = payout.reference_id;
        const payoutId = payout.id;
        // Find the withdrawal record
        const withdrawal = referenceId
            ? await withdrawal_model_1.Withdrawal.findById(referenceId)
            : await withdrawal_model_1.Withdrawal.findOne({ razorpayPayoutId: payoutId });
        if (!withdrawal) {
            console.warn(`Withdrawal not found for webhook: payoutId=${payoutId}, referenceId=${referenceId}`);
            return res.status(200).json({ status: 'ignored' });
        }
        const previousStatus = withdrawal.status;
        if (event === 'payout.processed') {
            withdrawal.status = 'completed';
            await withdrawal.save();
            console.log(`Withdrawal ${withdrawal._id} marked completed via webhook.`);
        }
        else if (event === 'payout.reversed' || event === 'payout.rejected' || event === 'payout.failed') {
            if (previousStatus !== 'rejected') {
                withdrawal.status = 'rejected';
                await withdrawal.save();
                // Refund user balance
                const user = await user_model_1.User.findOne({ telegramId: withdrawal.telegramId });
                if (user) {
                    user.balance = Math.round((user.balance + withdrawal.amount) * 100) / 100;
                    await user.save();
                    console.log(`Withdrawal ${withdrawal._id} failed. Refunded ₹${withdrawal.amount} to user ${user.telegramId}.`);
                }
            }
        }
        return res.status(200).json({ status: 'ok' });
    }
    catch (error) {
        console.error('Error handling Razorpay webhook:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Authenticated routes require token
router.use(auth_middleware_1.authMiddleware);
/**
 * GET /api/wallet/balance
 * Returns current user's balance and recent withdrawals.
 */
router.get('/balance', async (req, res) => {
    try {
        const tgUser = req.user;
        const user = await user_model_1.User.findOne({ telegramId: tgUser.telegramId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const withdrawals = await withdrawal_model_1.Withdrawal.find({ telegramId: tgUser.telegramId })
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            balance: user.balance,
            totalEarned: user.totalEarned,
            level: user.level,
            withdrawals,
        });
    }
    catch (error) {
        console.error('Error fetching wallet balance:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/withdraw
 * Initiates a UPI withdrawal. Deducts balance immediately and creates payout.
 */
router.post('/withdraw', async (req, res) => {
    try {
        const tgUser = req.user;
        const { amount, upiId } = req.body;
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }
        if (!upiId || !upiId.includes('@')) {
            return res.status(400).json({ error: 'Invalid UPI ID format' });
        }
        const minWithdrawal = 100; // Minimum limit: ₹100
        if (amount < minWithdrawal) {
            return res.status(400).json({ error: `Minimum withdrawal amount is ₹${minWithdrawal}` });
        }
        const user = await user_model_1.User.findOne({ telegramId: tgUser.telegramId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        const fee = payment_service_1.paymentService.calculateFee(amount);
        const netAmount = Math.round((amount - fee) * 100) / 100;
        // 1. Deduct user's balance immediately (prevents race conditions)
        user.balance = Math.round((user.balance - amount) * 100) / 100;
        await user.save();
        // 2. Create the pending withdrawal record
        const withdrawal = new withdrawal_model_1.Withdrawal({
            telegramId: tgUser.telegramId,
            amount,
            fee,
            netAmount,
            upiId,
            status: 'pending',
        });
        await withdrawal.save();
        try {
            // 3. Initiate payout via Razorpay service
            const payoutResult = await payment_service_1.paymentService.createPayout({
                telegramId: tgUser.telegramId,
                upiId,
                amount,
                fee,
                netAmount,
                withdrawalId: withdrawal._id.toString(),
            });
            // Update record with payout details
            withdrawal.razorpayPayoutId = payoutResult.payoutId;
            withdrawal.status = payoutResult.status; // e.g. processing
            await withdrawal.save();
            // For sandbox simulation, start a timer that automatically completes the payout in 10 seconds
            if (payoutResult.mode === 'SIMULATOR') {
                setTimeout(async () => {
                    try {
                        const freshWithdrawal = await withdrawal_model_1.Withdrawal.findById(withdrawal._id);
                        if (freshWithdrawal && freshWithdrawal.status === 'processing') {
                            freshWithdrawal.status = 'completed';
                            await freshWithdrawal.save();
                            console.log(`[SIMULATOR] Automatically marked withdrawal ${withdrawal._id} as completed.`);
                        }
                    }
                    catch (e) {
                        console.error('Error auto-completing simulated payout:', e);
                    }
                }, 10000);
            }
            return res.status(200).json({
                success: true,
                message: 'Withdrawal request initiated successfully.',
                withdrawal,
            });
        }
        catch (paymentError) {
            // Refund balance if payout generation failed completely
            user.balance = Math.round((user.balance + amount) * 100) / 100;
            await user.save();
            // Delete/update withdrawal record to failed
            withdrawal.status = 'rejected';
            await withdrawal.save();
            console.error('Payment payout failed, refunded user balance:', paymentError);
            return res.status(500).json({ error: 'Failed to initiate payout. Restored your balance.' });
        }
    }
    catch (error) {
        console.error('Error initiating withdrawal:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
