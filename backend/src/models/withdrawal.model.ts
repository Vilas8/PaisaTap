import { Schema, model, Document } from 'mongoose';

export interface IWithdrawal extends Document {
  telegramId: string; // References User.telegramId
  amount: number; // Gross amount requested
  fee: number; // Razorpay gateway fee (e.g. 5-8%)
  netAmount: number; // Amount user actually receives (amount - fee)
  upiId: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  razorpayPayoutId?: string;
  createdAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>({
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

export const Withdrawal = model<IWithdrawal>('Withdrawal', withdrawalSchema);
