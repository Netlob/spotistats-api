import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { decode, verify } from 'jsonwebtoken';
import { Reflector } from '@nestjs/core';
import { Prisma } from '.prisma/client';

const jwtSecret = process.env.JWT_SECRET as string;

@Injectable()
export class UserAuthGuard implements CanActivate {
  private readonly logger = new Logger('Auth');

  constructor(private prisma: PrismaService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = (request?.headers?.authorization ||
      request?.body?.refresh_token) as string;
    let userId;

    try {
      const decodedToken = verify(token, jwtSecret) as Record<string, unknown>;

      if (decodedToken.userId) userId = decodedToken.userId;
      else return false;
    } catch (e) {
      return false;
    }

    const include = this.reflector.get<Prisma.UserInclude[]>(
      'includes',
      context.getHandler(),
    );

    const query: Prisma.UserFindUniqueArgs = { where: { id: userId } };
    if (include) query.include = include[0];

    const user = await this.prisma.user.findUnique(query);

    if (!user) return false;

    request.user = user;

    return true;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger('Auth');

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request?.headers?.authorization as string;

    try {
      const decoded = verify(token, jwtSecret) as Record<string, unknown>;
      if (!('userId' in decoded)) throw Error();
      request.userid = decoded.userId;
    } catch (e) {
      return false;
    }

    return true;
  }
}

@Injectable()
export class NoAuthGuard implements CanActivate {
  async canActivate(): Promise<boolean> {
    return true;
  }
}
