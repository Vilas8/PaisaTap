import { Schema, model, Document } from 'mongoose';

export interface IReferral extends Document {
  referrerId: string; // User.telegramId who invited
  referredId: string; // User.telegramId who was invited (unique)
  rewardDistributed: boolean; // True when ₹40 and ₹20 rewards have been credited
  createdAt: Date;
}

const referralSchema = new Schema<IReferral>({
  referrerId: { type: String, required: true, index: true },
  referredId: { type: String, required: true, unique: true, index: true },
  rewardDistributed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const Referral = model<IReferral>('Referral', referralSchema);
