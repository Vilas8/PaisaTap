import { Schema, model, Document } from 'mongoose';

export interface IAdLog extends Document {
  telegramId: string;
  action: 'energy_refill' | 'task_reward' | 'double_game' | 'free_game_spin' | 'free_game_scratch' | 'free_game_catcher';
  rewardValue?: number;
  createdAt: Date;
}

const adLogSchema = new Schema<IAdLog>({
  telegramId: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  rewardValue: { type: Number },
  createdAt: { type: Date, default: Date.now, index: true }
});

export const AdLog = model<IAdLog>('AdLog', adLogSchema);
