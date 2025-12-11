export declare const redisConfig: (() => {
    host: string;
    port: number;
    password: string | undefined;
    db: number;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    host: string;
    port: number;
    password: string | undefined;
    db: number;
}>;
