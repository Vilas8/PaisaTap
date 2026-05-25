"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
const mongoose_1 = require("mongoose");
const taskSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    rewardAmount: { type: Number, required: true },
    type: {
        type: String,
        enum: ['daily', 'social', 'quiz', 'gig'],
        required: true
    },
    link: { type: String },
    verificationMethod: {
        type: String,
        enum: ['instant', 'manual', 'code'],
        default: 'instant'
    },
    verificationCode: { type: String },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
exports.Task = (0, mongoose_1.model)('Task', taskSchema);
