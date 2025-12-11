import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service.js';
import { JwtPayload } from '../dto/auth.dto.js';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly usersService;
    constructor(configService: ConfigService, usersService: UsersService);
    validate(payload: JwtPayload): Promise<{
        id: string;
        email: string;
        role: string;
    }>;
}
export {};
