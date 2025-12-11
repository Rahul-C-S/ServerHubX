export declare const jwtConfig: (() => {
    secret: string | undefined;
    accessExpiry: string;
    refreshExpiry: string;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    secret: string | undefined;
    accessExpiry: string;
    refreshExpiry: string;
}>;
