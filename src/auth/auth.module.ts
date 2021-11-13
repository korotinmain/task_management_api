import { Module } from '@nestjs/common';
import { AuthService } from './service/auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersRepository } from './repository/users.repository';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule } from '@nestjs/config';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UsersRepository]),
    PassportModule.register({}),
    JwtModule.register({}),
    // MongooseModule.forFeature([
    //   {
    //     name: 'RefreshToken',
    //     schema: RefreshTokenSchema.index(
    //       { expireAt: 1 },
    //       { expireAfterSeconds: 0 },
    //     ),
    //   },
    // ]),
    // JwtModule.registerAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: async (configService: ConfigService) => {
    //     return {
    //       secret: configService.get('JWT_ACCESS_TOKEN_SECRET'),
    //       signOptions: {
    //         expiresIn: 5,
    //       },
    //     };
    //   },
    // }),
  ],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
  exports: [JwtStrategy, PassportModule, JwtRefreshStrategy],
})
export class AuthModule {}
