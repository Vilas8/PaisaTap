"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Withdrawal = void 0;
const mongoose_1 = require("mongoose");
const withdrawalSchema = new mongoose_1.Schema({
    telegramId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    fee: { type: Number, required: true },
    netAmount: { type: Number, required: true },
    upiId: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'rejected'],
        default: 'pending'
    },
    razorpayPayoutId: { type: String },
    createdAt: { type: Date, default: Date.now }
});
exports.Withdrawal = (0, mongoose_1.model)('Withdrawal', withdrawalSchema);
