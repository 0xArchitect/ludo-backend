import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JsonRpcProvider, Wallet, ethers, formatEther } from 'ethers';
import { WithdrawalDto, WithdrawalResponseDto } from './dto/withdrawal.dto';
import { Repository, getConnection } from 'typeorm';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/users.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { balancePoolAbi } from './abi/abis';
import { LastBlock } from './entities/lastblock.entity';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { JsonWebTokenError, JwtService } from '@nestjs/jwt';
import { PendingList } from './entities/pending.list';
import * as fs from 'fs';
import * as path from 'path';
import { BalanceDto } from './dto/balance.dto';
const publicKey = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'oauth-public.key'),
  'utf8',
);
if (!publicKey) {
  throw new Error('Public key not found');
}
@Injectable()
export class AppService {
  private provider: JsonRpcProvider;
  private domain = {
    name: 'LudoBalancePool',
    version: '1',
    chainId: 11155111,
    verifyingContract: process.env.POOL_ADDRESS,
  };
  private types = {
    UserInfo: [
      { name: 'user', type: 'address' },
      { name: 'withdrawalAmount', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      // { name: 'signature', type: 'bytes' },
    ],
  };
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(LastBlock.name)
    private readonly lastBlockModel: Model<LastBlock>,
    @InjectModel(PendingList.name)
    private readonly pendingList: Model<PendingList>,
  ) {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  }

  async balance(balanceDto: BalanceDto) {
    try {
      const decoded = this.jwtService.verify(balanceDto.accessToken, {
        algorithms: ['RS256'],
        secret: publicKey,
      });
      const userId = parseInt(decoded.sub);
      const user = await this.userRepository.findOne({
        where: {
          id: userId,
        },
      });
      if (!user) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            errors: {
              message: 'User not found',
            },
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        balance: user.balance,
        userId: userId,
      };
    } catch (e) {
      if (e instanceof JsonWebTokenError) {
        throw new HttpException(
          {
            status: HttpStatus.UNAUTHORIZED,
            errors: {
              message: e.message,
            },
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (e instanceof HttpException) {
        throw e;
      }
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            [e.argument]: e.shortMessage,
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  async withdraw(signDto: WithdrawalDto): Promise<WithdrawalResponseDto> {
    try {
      const decoded = this.jwtService.verify(signDto.accessToken, {
        algorithms: ['RS256'],
        secret: publicKey,
      });
      const existingWithdrawPayload: string = await this.cacheManager.get(
        `${decoded.sub}${signDto.amount}`,
      );
      if (existingWithdrawPayload) return JSON.parse(existingWithdrawPayload);
      const userId = parseInt(decoded.sub);
      const withdrawPayload = await this.userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const userEntity = await transactionalEntityManager.findOne(User, {
            where: {
              id: userId,
            },
            lock: {
              mode: 'pessimistic_write',
            },
          });
          if (!userEntity) {
            throw new HttpException(
              {
                status: HttpStatus.NOT_FOUND,
                errors: {
                  message: 'User not found',
                },
              },
              HttpStatus.NOT_FOUND,
            );
          }
          if (userEntity.balance < signDto.amount) {
            throw new HttpException(
              {
                status: HttpStatus.UNPROCESSABLE_ENTITY,
                errors: {
                  amount: 'Insufficient balance',
                },
              },
              HttpStatus.UNPROCESSABLE_ENTITY,
            );
          }
          userEntity.balance -= signDto.amount;
          const nonce = Math.round(Math.random() * 9) + Date.now();
          const value = {
            user: signDto.user_address,
            withdrawalAmount: ethers.parseEther(signDto.amount.toString()),
            timestamp: Math.floor(Date.now() / 1000),
            nonce: nonce,
          };
          const signer = new Wallet(process.env.PRIVATE_KEY);
          const sign = await signer.signTypedData(
            this.domain,
            this.types,
            value,
          );
          const withdrawPayload = {
            sign,
            ...value,
            withdrawalAmount: value.withdrawalAmount.toString(),
          };
          await this.pendingList.create({
            user_address: value.user,
            amount: signDto.amount,
            timestamp: value.timestamp,
            nonce: value.nonce,
            userId: userId,
          });
          await transactionalEntityManager.save(userEntity);
          await this.cacheManager.set(
            `${decoded.sub}${signDto.amount}`,
            JSON.stringify(withdrawPayload),
            300000,
          );
          return withdrawPayload;
        },
      );
      return withdrawPayload;
    } catch (e) {
      if (e instanceof JsonWebTokenError) {
        throw new HttpException(
          {
            status: HttpStatus.UNAUTHORIZED,
            errors: {
              message: e.message,
            },
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (e instanceof HttpException) {
        throw e;
      }
      console.log(e);
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            [e.argument]: e.shortMessage,
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  async deposit(useremail: string) {
    const user = await this.userRepository.findOne({
      where: {
        email: useremail,
      },
    });
    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          errors: {
            message: 'User not found',
          },
        },
        HttpStatus.NOT_FOUND,
      );
    }
    if (user.wallet_address == '0') {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          errors: {
            wallet_address: 'User wallet address not found',
          },
        },
        HttpStatus.NOT_FOUND,
      );
    }
    const signer = new Wallet(process.env.PRIVATE_KEY);
    const sign = await signer.signTypedData(this.domain, this.types, {});
    return sign;
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async depositCheck() {
    const contract = new ethers.Contract(
      process.env.POOL_ADDRESS,
      balancePoolAbi,
      this.provider,
    );
    const transfer = contract.filters.Deposit(null, null);
    const block = await this.lastBlockModel.findOne({
      type: 'deposit',
    });
    if (!block) {
      await this.lastBlockModel.create({ block_number: 0, type: 'deposit' });
    }
    const currentBlock = await this.provider.getBlockNumber();
    const events = await contract.queryFilter(
      transfer,
      block.block_number,
      currentBlock - 1,
    );
    this.updateDeposit(events);
    block.block_number = currentBlock;
    await block.save();
  }

  async updateDeposit(events: any) {
    const contract = new ethers.Contract(
      process.env.POOL_ADDRESS,
      balancePoolAbi,
    );
    if (events.length) {
      for (const event of events) {
        const decodedDepositEvent: ethers.Result =
          contract.interface.decodeEventLog(
            event.fragment,
            event.data,
            event.topics,
          );
        const user = decodedDepositEvent[0];
        const amount = decodedDepositEvent[1];
        try {
          await this.userRepository.manager.transaction(
            async (transactionalEntityManager) => {
              const userEntity = await transactionalEntityManager.findOne(
                User,
                {
                  where: {
                    id: parseInt(user),
                  },
                  lock: {
                    mode: 'pessimistic_write',
                  },
                },
              );
              if (userEntity) {
                userEntity.balance += parseFloat(formatEther(amount));
                await transactionalEntityManager.save(userEntity);
              }
            },
          );
        } catch (e) {
          console.log(
            `Error in deposit ${user} ${parseFloat(formatEther(amount))}`,
            e,
          );
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async withdrawCheck() {
    const contract = new ethers.Contract(
      process.env.POOL_ADDRESS,
      balancePoolAbi,
      this.provider,
    );
    const block = await this.lastBlockModel.findOne({
      type: 'withdraw',
    });
    if (!block) {
      await this.lastBlockModel.create({ block_number: 0, type: 'withdraw' });
    }
    const currentBlock = await this.provider.getBlockNumber();
    const transfer = contract.filters.Withdrawal(null, null);
    const withdrwal = await contract.queryFilter(
      transfer,
      block.block_number,
      currentBlock - 1,
    );
    if (withdrwal.length) this.removePending(withdrwal);
    block.block_number = currentBlock;
    await block.save();
  }

  async removePending(events: any) {
    const contract = new ethers.Contract(
      process.env.POOL_ADDRESS,
      balancePoolAbi,
    );
    if (events.length) {
      for (const event of events) {
        const decodedWithdrawEvent: ethers.Result =
          contract.interface.decodeEventLog(
            event.fragment,
            event.data,
            event.topics,
          );
        const nonce = parseInt(decodedWithdrawEvent[0]);
        const user = decodedWithdrawEvent[1];
        const amount = decodedWithdrawEvent[2];
        try {
          const pending = await this.pendingList.findOneAndDelete({
            user_address: RegExp(user, 'i'),
            nonce: nonce,
          });
          if (pending)
            await this.cacheManager.del(
              `${pending.userId}${parseFloat(formatEther(amount))}`,
            );
        } catch (e) {
          console.log('removePending Error', e);
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async notExecuted() {
    const contract = new ethers.Contract(
      process.env.POOL_ADDRESS,
      balancePoolAbi,
      this.provider,
    );
    const pending = await this.pendingList.find({
      createdAt: {
        $lt: new Date(Date.now() - 600000),
      },
    });
    for (const item of pending) {
      const user = item.user_address;
      const nonce = item.nonce;
      const filters = contract.filters.Withdrawal(nonce, user);
      const events = await contract.queryFilter(filters);
      if (!events.length) {
        try {
          await this.userRepository.manager.transaction(
            async (transactionalEntityManager) => {
              const userEntity = await transactionalEntityManager.findOne(
                User,
                {
                  where: {
                    id: item.userId,
                  },
                  lock: {
                    mode: 'pessimistic_write',
                  },
                },
              );
              if (userEntity) {
                userEntity.balance += item.amount;
                await transactionalEntityManager.save(userEntity);
              }
            },
          );
          await this.pendingList.deleteOne({
            user_address: item.user_address,
            nonce: item.nonce,
          });
        } catch (e) {
          console.log('notExecuted Error', e);
        }
      }
    }
  }
}
