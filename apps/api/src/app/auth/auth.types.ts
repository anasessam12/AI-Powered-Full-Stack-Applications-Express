import { Request } from 'express';
import { Session } from '../../database/entities/session.entity';
import { User } from '../../database/entities/user.entity';

export interface AuthenticatedSession {
  session: Session;
  user: User;
  rawToken: string;
}

export interface AuthenticatedRequest extends Request {
  authSession?: AuthenticatedSession;
}
