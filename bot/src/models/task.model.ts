import { Schema, model, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description: string;
  rewardAmount: number;
  type: 'daily' | 'social' | 'quiz' | 'gig';
  link?: string;
  verificationMethod: 'instant' | 'manual' | 'code';
  verificationCode?: string;
  isActive: boolean;
  createdAt: Date;
}

const taskSchema = new Schema<ITask>({
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

export const Task = model<ITask>('Task', taskSchema);
