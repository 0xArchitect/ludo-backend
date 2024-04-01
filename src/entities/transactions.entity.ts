import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
  collection: 'transactions',
})
export class Transactions {
  @Prop({
    type: Number,
    required: true,
  })
  userId: number;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({
    type: String,
    required: true,
  })
  txHash: string;

  @Prop({
    type: String,
    required: true,
  })
  type: string;

  @Prop({
    type: String,
    required: true,
  })
  address: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}
export const transactionsSchema = SchemaFactory.createForClass(Transactions);
transactionsSchema.index({ txHash: 1 }, { unique: true });
transactionsSchema.index({ createdAt: -1, userId: 1 }, { name: 'created' });
