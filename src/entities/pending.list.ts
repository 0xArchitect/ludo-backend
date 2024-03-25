import { Column, Entity } from 'typeorm';

@Entity()
export class PendingList {
  // insert fields here
  @Column({
    type: 'varchar',
  })
  user_address: number;

  @Column({
    type: 'int',
  })
  amount: number;
}
