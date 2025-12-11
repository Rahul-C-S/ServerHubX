export interface CommandDefinition {
    command: string;
    description: string;
    requiresSudo: boolean;
    allowedArgumentPatterns?: RegExp[];
}
export declare const COMMAND_WHITELIST: Record<string, CommandDefinition>;
export declare function isCommandAllowed(command: string): boolean;
export declare function getCommandDefinition(command: string): CommandDefinition | undefined;
export declare function validateArgument(command: string, argument: string): boolean;
