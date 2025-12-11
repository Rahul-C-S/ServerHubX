export declare const databaseConfig: (() => {
    host: string;
    port: number;
    username: string | undefined;
    password: string | undefined;
    database: string | undefined;
    synchronize: boolean;
    logging: boolean;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    host: string;
    port: number;
    username: string | undefined;
    password: string | undefined;
    database: string | undefined;
    synchronize: boolean;
    logging: boolean;
}>;
