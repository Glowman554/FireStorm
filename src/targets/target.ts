export interface Target {
    generate(): string;
    compile(mode: string, output: string, generated: string): Promise<void>;
}

