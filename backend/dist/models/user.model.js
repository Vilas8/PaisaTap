"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    telegramId: { type: String, required: true, unique: true, index: true },
    username: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    balance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastDailyClaim: { type: Date },
    level: { type: Number, default: 1 },
    energy: { type: Number, default: 1000 },
    maxEnergy: { type: Number, default: 1000 },
    lastEnergyRefill: { type: Date, default: () => new Date() },
    referredBy: { type: String, index: true },
    referralCount: { type: Number, default: 0 },
    adRefillsWatched: { type: Number, default: 0 },
    lastAdTaskWatched: { type: Date },
    isBanned: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now }
});
// Pre-save hook to calculate level based on totalEarned
userSchema.pre('save', function (next) {
    if (this.isModified('totalEarned')) {
        // Level up formula: 1 + floor(totalEarned / 1000)
        // E.g., 0-999 earned = Lvl 1, 1000-1999 = Lvl 2, etc.
        this.level = Math.min(100, Math.max(1, 1 + Math.floor(this.totalEarned / 1000)));
    }
    else if (this.level > 100) {
        this.level = 100;
    }
    next();
});
exports.User = (0, mongoose_1.model)('User', userSchema);
