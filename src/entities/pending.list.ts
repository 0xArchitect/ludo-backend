import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  collection: 'pending_list',
  timestamps: true,
})
export class PendingList {
  @Prop({ required: true })
  user_address: string;

  @Prop({
    type: Number,
  })
  amount: number;

  @Prop({
    type: Number,
  })
  timestamp: number;

  @Prop({
    type: Number,
  })
  nonce: number;

  @Prop({
    type: Number,
  })
  userId: number;
}

export const PendingListSchema = SchemaFactory.createForClass(PendingList);
