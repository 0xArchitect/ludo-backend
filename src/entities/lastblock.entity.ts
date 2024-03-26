import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  collection: 'lastblocks',
})
export class LastBlock {
  @Prop({ required: true, type: Number })
  block_number: number;

  @Prop({ required: true, type: String })
  type: string;
}
export const LastBlockSchema = SchemaFactory.createForClass(LastBlock);
