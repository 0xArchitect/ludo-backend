import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'users',
})
export class User {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  balance: number;

  @Column({
    type: 'varchar',
    collation: 'utf8mb4_unicode_ci',
    length: 255,
    default: '0',
  })
  wallet_address: string;

  @Column()
  google2fa_secret: string;
}
