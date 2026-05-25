"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const task_model_1 = require("../models/task.model");
const task_completion_model_1 = require("../models/task-completion.model");
const user_model_1 = require("../models/user.model");
const referral_model_1 = require("../models/referral.model");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
/**
 * GET /api/tasks/available
 * Lists active tasks along with the current user's completion status.
 */
router.get('/available', async (req, res) => {
    try {
        const tgUser = req.user;
        // Fetch all active tasks
        const tasks = await task_model_1.Task.find({ isActive: true });
        // Fetch all completions by this user
        const completions = await task_completion_model_1.TaskCompletion.find({ telegramId: tgUser.telegramId });
        // Create a mapping of taskId -> completion status
        const completionMap = new Map();
        completions.forEach((c) => {
            completionMap.set(c.taskId.toString(), c.status);
        });
        // Map tasks with status
        const tasksWithStatus = tasks.map((task) => {
            const status = completionMap.get(task._id.toString()) || 'not_started';
            return {
                ...task.toObject(),
                status,
            };
        });
        return res.status(200).json({ success: true, tasks: tasksWithStatus });
    }
    catch (error) {
        console.error('Error fetching tasks:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/tasks/complete/:taskId
 * Submits proof of task completion and verifies based on verificationMethod.
 */
router.post('/complete/:taskId', async (req, res) => {
    try {
        const tgUser = req.user;
        const { taskId } = req.params;
        const { proof } = req.body; // Verification code or manual proof screenshot link
        const task = await task_model_1.Task.findById(taskId);
        if (!task || !task.isActive) {
            return res.status(404).json({ error: 'Task not found or inactive' });
        }
        // Check if user already submitted this task
        const existingCompletion = await task_completion_model_1.TaskCompletion.findOne({
            telegramId: tgUser.telegramId,
            taskId: task._id,
        });
        if (existingCompletion) {
            return res.status(400).json({
                error: `Task already submitted. Current status: ${existingCompletion.status}`,
            });
        }
        let status = 'pending';
        // Verify task based on method
        if (task.verificationMethod === 'instant') {
            status = 'approved';
        }
        else if (task.verificationMethod === 'code') {
            if (!proof || proof.trim() !== task.verificationCode?.trim()) {
                return res.status(400).json({ error: 'Invalid verification code' });
            }
            status = 'approved';
        }
        else if (task.verificationMethod === 'manual') {
            if (!proof) {
                return res.status(400).json({ error: 'Proof is required for manual review' });
            }
            status = 'pending';
        }
        const completion = new task_completion_model_1.TaskCompletion({
            telegramId: tgUser.telegramId,
            taskId: task._id,
            proof,
            status,
        });
        await completion.save();
        let earned = 0;
        let referralRewarded = false;
        if (status === 'approved') {
            earned = task.rewardAmount;
            const user = await user_model_1.User.findOne({ telegramId: tgUser.telegramId });
            if (user) {
                user.balance = Math.round((user.balance + earned) * 100) / 100;
                user.totalEarned = Math.round((user.totalEarned + earned) * 100) / 100;
                await user.save();
                // Check if this was the user's first approved task
                const approvedCompletionsCount = await task_completion_model_1.TaskCompletion.countDocuments({
                    telegramId: tgUser.telegramId,
                    status: 'approved',
                });
                // Trigger referral rewards on first completed task
                if (approvedCompletionsCount === 1) {
                    const referral = await referral_model_1.Referral.findOne({
                        referredId: tgUser.telegramId,
                        rewardDistributed: false,
                    });
                    if (referral) {
                        // Referrer gets ₹40, New User gets ₹20
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
        return res.status(200).json({
            success: true,
            status,
            earned,
            referralRewarded,
            message: status === 'approved'
                ? 'Task completed successfully! Balance updated.'
                : 'Task submitted successfully. Pending administrator verification.',
        });
    }
    catch (error) {
        console.error('Error submitting task completion:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
