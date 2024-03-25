import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Wallet, ethers } from 'ethers';
import { SignDto } from './dto/sign.dto';
import { Not, Repository, Connection } from 'typeorm';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/users.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private connection: Connection,
  ) {}

  async withdraw(signDto: SignDto) {
    try {
      const signedBy = await ethers.verifyMessage(
        signDto.message,
        signDto.signature,
      );
      const test = await this.cacheManager.get(signedBy);
      if (test) {
        console.log('cache', test);
        return test;
      }
      const user = await this.userRepository.findOne({
        where: {
          wallet_address: signedBy.toLocaleUpperCase(),
        },
      });
      // if (!user) {
      //   throw new HttpException(
      //     {
      //       status: HttpStatus.NOT_FOUND,
      //       errors: {
      //         message: 'User not found',
      //       },
      //     },
      //     HttpStatus.NOT_FOUND,
      //   );
      // }
      // return user;

      // if (signedBy !== signDto.user) {
      //   throw new HttpException(
      //     {
      //       status: HttpStatus.UNAUTHORIZED,
      //       errors: {
      //         message: 'Invalid signature',
      //       },
      //     },
      //     HttpStatus.UNAUTHORIZED,
      //   );
      // }

      const domain = {
        name: 'Ludo',
        version: '1',
        chainId: 11155111,
        verifyingContract: '0xf3609AEe83A41a5c2dD721983416D3439bceC2e9',
      };
      const types = {
        Signer: [
          { name: 'user', type: 'address' },
          { name: 'withdrawlAmount', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'signature', type: 'bytes' },
        ],
      };

      //insert data here to sign
      const value = {
        user: signedBy,
        withdrawlAmount: 100, // from db
        timestamp: Date.now(),
        nonce: Math.round(Math.random() * 9) + Date.now(),
        signature: signDto.signature,
      };
      const signer = new Wallet(process.env.PRIVATE_KEY);
      const sign = await signer.signTypedData(domain, types, value);
      await this.cacheManager.set(signedBy, sign);
      // console.log('sign', sign);
      // const test = await ethers.verifyTypedData(domain, types, value, sign);
      // console.log('test', test);
      return sign;
    } catch (e) {
      console.log(e);
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

    // const provider = new ethers.JsonRpcProvider(
    //   'https://arb-mainnet.g.alchemy.com/v2/_po3CxkM98ODTTcKJrEqDsCelHRamvAh',
    // );
    return 'Hello World!';
  }
}
