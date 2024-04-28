import { User } from '../../src/schemas/user.schema';

declare module 'express-session' {
    interface SessionData {
        user: User;
    }
}
