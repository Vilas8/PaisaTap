import { Schema, model, Document } from 'mongoose';

export interface IGig extends Document {
  title: string;
  description: string;
  reward: number;
  imageUrl?: string;
  instructions: string;
  externalLink: string;
  isActive: boolean;
  createdAt: Date;
}

const gigSchema = new Schema<IGig>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  reward: { type: Number, required: true },
  imageUrl: { type: String },
  instructions: { type: String, required: true },
  externalLink: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export const Gig = model<IGig>('Gig', gigSchema);
