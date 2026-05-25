import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  balance: number;
  totalEarned: number;
  streak: number;
  lastDailyClaim?: Date;
  level: number;
  energy: number;
  maxEnergy: number;
  lastEnergyRefill: Date;
  referredBy?: string;
  referralCount: number;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
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
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', function (next) {
  if (this.isModified('totalEarned')) {
    this.level = Math.max(1, 1 + Math.floor(this.totalEarned / 1000));
  }
  next();
});

export const User = model<IUser>('User', userSchema);
