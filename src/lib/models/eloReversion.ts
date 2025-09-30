import mongoose from 'mongoose';

const OpponentSchema = new mongoose.Schema(
  {
    steamid2: { type: String, required: true },
    currentRating: { type: Number, required: false },
    finalRating: { type: Number, required: false },
    delta: { type: Number, required: true }
  },
  { _id: false }
);

const ChangeSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    target: { type: String, enum: ['winner', 'loser'], required: true },
    opponent: { type: String, required: true },
    outcome: { type: String, enum: ['win', 'loss'], required: true },
    from: { type: Number, required: false },
    to: { type: Number, required: false },
    delta: { type: Number, required: false }
  },
  { _id: false }
);

const EloReversionSchema = new mongoose.Schema(
  {
    region: { type: String, required: true },
    targetSteam2: { type: String, required: true },
    targetSteam64: { type: String, required: false },
    actorSteam64: { type: String, required: false },
    actorName: { type: String, required: false },
    request: {
      scope: { type: String },
      filters: { type: Object },
      matchIds: { type: [Number] }
    },
    summary: {
      currentRatingBefore: { type: Number, required: false },
      finalRatingApplied: { type: Number, required: false },
      matchesConsidered: { type: Number, required: true },
      opponentsCount: { type: Number, required: true },
      opponentsTotalDelta: { type: Number, required: true }
    },
    opponents: { type: [OpponentSchema], default: [] },
    changes: { type: [ChangeSchema], default: [] }
  },
  { timestamps: true }
);

EloReversionSchema.index({ region: 1, targetSteam2: 1, createdAt: -1 });

export const EloReversion = mongoose.model('EloReversion', EloReversionSchema);



