import { Schema, model, Document } from 'mongoose';

export interface ITaskCompletion extends Document {
  telegramId: string; // References User.telegramId
  taskId: Schema.Types.ObjectId; // References Task._id
  completedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  proof?: string; // Verification code or manual proof link
}

const taskCompletionSchema = new Schema<ITaskCompletion>({
  telegramId: { type: String, required: true, index: true },
  taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
  completedAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  proof: { type: String }
});

// Compound index to prevent duplicate submissions for the same task by the same user
taskCompletionSchema.index({ telegramId: 1, taskId: 1 }, { unique: true });

export const TaskCompletion = model<ITaskCompletion>('TaskCompletion', taskCompletionSchema);
