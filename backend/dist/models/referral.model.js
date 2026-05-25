"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Referral = void 0;
const mongoose_1 = require("mongoose");
const referralSchema = new mongoose_1.Schema({
    referrerId: { type: String, required: true, index: true },
    referredId: { type: String, required: true, unique: true, index: true },
    rewardDistributed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
exports.Referral = (0, mongoose_1.model)('Referral', referralSchema);
