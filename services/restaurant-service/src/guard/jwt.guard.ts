import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>(); 

    const token = request.cookies['access_token'];
    if (token) {
      request.headers['authorization'] = `Bearer ${token}`;
    }

    return super.canActivate(context);
  }
}
