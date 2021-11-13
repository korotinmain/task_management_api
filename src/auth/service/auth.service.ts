import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersRepository } from '../repository/users.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthCredentialsDto } from '../dto/auth-credentials.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayloadInterface } from '../interfaces/jwt-payload.interface';
import { ConfigService } from '@nestjs/config';
import { User } from '../entity/user.entity';
import { AccessResponseInterface } from '../interfaces/access-response.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UsersRepository) private usersRepository: UsersRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signUp(
    authCredentialsDto: AuthCredentialsDto,
  ): Promise<{ message: string }> {
    return this.usersRepository.createUser(authCredentialsDto);
  }

  async signIn(
    authCredentialsDto: AuthCredentialsDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { username, password } = authCredentialsDto;
    const user = await this.usersRepository.findOne({ username });
    if (user && (await bcrypt.compare(password, user.password))) {
      const payload: JwtPayloadInterface = { username };
      const accessToken: string = await this.getAccessToken(payload);
      const refreshToken: string = await this.getRefreshToken(payload);
      await this.updateRefreshTokenInUser(refreshToken, username);
      return { accessToken, refreshToken };
    }
    throw new UnauthorizedException('Please check your login credentials');
  }

  async signOut(user: User): Promise<void> {
    await this.updateRefreshTokenInUser(null, user.username);
  }

  async getNewAccessAndRefreshToken(
    payload: JwtPayloadInterface,
  ): Promise<AccessResponseInterface> {
    const refreshToken = await this.getRefreshToken(payload);
    await this.updateRefreshTokenInUser(refreshToken, payload.username);

    return {
      accessToken: await this.getAccessToken(payload),
      refreshToken: refreshToken,
    };
  }

  async updateRefreshTokenInUser(refreshToken: string, username: string) {
    if (refreshToken) {
      refreshToken = await bcrypt.hash(refreshToken, 10);
    }

    await this.usersRepository.update(
      { username: username },
      {
        hashedRefreshToken: refreshToken,
      },
    );
  }

  async getAccessToken(payload: JwtPayloadInterface): Promise<string> {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME'),
    });
  }

  async getRefreshToken(payload: JwtPayloadInterface): Promise<string> {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION_TIME'),
    });
  }

  async getUserIfRefreshTokenMatches(refreshToken: string, username: string) {
    const user = await this.usersRepository.getUserInfoByUsername(username);

    const isRefreshTokenMatching = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );

    if (isRefreshTokenMatching) {
      await this.updateRefreshTokenInUser(null, username);
      return user;
    } else {
      throw new UnauthorizedException();
    }
  }
}
