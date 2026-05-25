"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gig = void 0;
const mongoose_1 = require("mongoose");
const gigSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    reward: { type: Number, required: true },
    imageUrl: { type: String },
    instructions: { type: String, required: true },
    externalLink: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
exports.Gig = (0, mongoose_1.model)('Gig', gigSchema);
