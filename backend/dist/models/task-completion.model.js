"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskCompletion = void 0;
const mongoose_1 = require("mongoose");
const taskCompletionSchema = new mongoose_1.Schema({
    telegramId: { type: String, required: true, index: true },
    taskId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    completedAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    proof: { type: String }
});
// Compound index to prevent duplicate submissions for the same task by the same user
taskCompletionSchema.index({ telegramId: 1, taskId: 1 }, { unique: true });
exports.TaskCompletion = (0, mongoose_1.model)('TaskCompletion', taskCompletionSchema);
