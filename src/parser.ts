import { Compare } from "./features/compare.ts";
import { compare } from "./features/compare.ts";
import { Datatype, datatypes, NamedDatatype, UnnamedDatatype } from "./features/datatype.ts";
import { findErrorLineFile } from "./features/error.ts";
import { attributes, Function, FunctionAttribute, FunctionCall } from "./features/function.ts";
import { If } from "./features/if.ts";
import { LexerToken, LexerTokenType, LexerTokenValue } from "./lexer.ts";

export type ParserNodeValue =  undefined|Function|FunctionCall|ParserNode[]|string|LexerTokenValue|NamedDatatype|Compare|If;

export enum ParserNodeType {
    GLOBAL = "global",
    FUNCTION = "function",
    ASSEMBLY_CODE = "assembly",
    VARIABLE_DECLARATION = "variable_declaration",

    NUMBER = "number",
    STRING = "string",
    ADD = "add",
    SUBSTRACT = "substract",
    MULTIPLY = "multiply",
    DIVIDE = "divide",
    PLUS = "plus",
    MINUS = "Minus",
    MODULO = "modulo",
    POWER = "power",
    VARIABLE_LOOKUP = "variable_lookup",
    VARIABLE_LOOKUP_ARRAY = "variable_lookup_array",

    COMPARE = "compare",
    NOT = "not",

    IF = "if",

    FUNCTION_CALL = "function_call",

    RETURN = "return",

    VARIABLE_ASSIGN = "variable_assign",
    VARIABLE_ASSIGN_ARRAY = "variable_assign_array",

	VARIABLE_INCREASE = "variable_increase",
	VARIABLE_DECREASE = "variable_decrease",

	CONDITIONAL_LOOP = "conditional_loop",
	POST_CONDITIONAL_LOOP = "post_conditional_loop",
	LOOP = "loop",

	SHIFT_LEFT = "shift_left",
	SHIFT_RIGHT = "shift_right",
	AND = "and",
	OR = "or",
	XOR = "xor",
	BIT_NOT = "bit_not",
}

export class ParserNode {
    id: ParserNodeType;
    a: ParserNode | undefined;
    b: ParserNode | undefined;
    value: ParserNodeValue;

    constructor (id: ParserNodeType, a: ParserNode | undefined, b: ParserNode | undefined, value: ParserNodeValue) {
        this.id = id;
        this.a = a;
        this.b = b;
        this.value = value;
    }
}


export class Parser {
    tokens: LexerToken[];
    current: LexerToken | undefined;
    pos: number;

    code: string;
    codeFile: string;

    constructor (tokens: LexerToken[], code: string, codeFile: string) {
        this.tokens = tokens;
        this.pos = -1;
        this.code = code;
        this.codeFile = codeFile;
        this.advance();
    }

    advance() {
        this.pos++;
        if (this.pos < this.tokens.length) {
            this.current = this.tokens[this.pos];
        } else {
            this.current = undefined;
        }
        // console.log(this.pos, this.current);
    }

    reverse() {
        this.pos--;
        this.current = this.tokens[this.pos];
    }

    error(message: string, pos: number | undefined, suppressErrorMessages = false): never {
        if (!suppressErrorMessages) {
            if (pos) {
                const line = findErrorLineFile(this.code, pos);
                if (line.file == undefined) {
                    line.file = this.codeFile;
                }
                const encoder = new TextEncoder();

                Deno.stdout.writeSync(encoder.encode(`error: ${message} (at ${line.file}:${line.line}:${line.char})\n`));

                
                Deno.stdout.writeSync(encoder.encode(line.lineStr.replaceAll("\t", " ") + "\n"));
                for (let j = 0; j < line.char; j++) {
                    Deno.stdout.writeSync(encoder.encode(" "));
                }
                Deno.stdout.writeSync(encoder.encode("^"));
                Deno.stdout.writeSync(encoder.encode("\n"));
            } else {
                console.log("error: " + message);
            }
        }

        throw new Error("Compilation failed!");
    }

    expect(type: LexerTokenType) {
        if (!(this.current && this.current.id == type)) {
            this.error("Expected " + type + " but was " + (this.current ? this.current.id : "EOF" ), this.current?.pos);
        }
    }

    advance_expect(type: LexerTokenType) {
        this.advance();
        this.expect(type);
    }

    comma_or_rparen(): boolean {
        if (this.current && this.current.id as LexerTokenType == LexerTokenType.COMMA) {
            this.advance();
            return false;
        } else if (this.current && this.current.id as LexerTokenType == LexerTokenType.RPAREN) {
            this.advance();
            return true;
        } else {
            this.error("Unexpected " + (this.current ? this.current.id : "EOF" ), this.current?.pos);
        }
    }

    datatype(named: boolean, try_datatype = false): NamedDatatype | UnnamedDatatype {
        if (named) {
            if (this.current && this.current.id as LexerTokenType == LexerTokenType.ID && datatypes.includes(this.current.value as Datatype)) {
                const datatype = this.current.value as Datatype;
                this.advance();
                if (this.current && this.current.id as LexerTokenType == LexerTokenType.LBRACKET) {
                    this.advance_expect(LexerTokenType.RBRACKET);
                    this.advance_expect(LexerTokenType.ID);
                    const tmp =  new NamedDatatype(this.current.value as string, datatype, true);
                    this.advance();
                    return tmp;
                } else {
                    this.expect(LexerTokenType.ID);
                    const tmp = new NamedDatatype(this.current.value as string, datatype, false);
                    this.advance();
                    return tmp;
                }
            } else {
                this.error("Expected datatype", this.current?.pos, try_datatype);
            }
        } else {
            if (this.current && this.current.id as LexerTokenType == LexerTokenType.ID && datatypes.includes(this.current.value as Datatype)) {
                const datatype = this.current.value as Datatype;
                this.advance();
                if (this.current && this.current.id as LexerTokenType == LexerTokenType.LBRACKET) {
                    this.advance_expect(LexerTokenType.RBRACKET);
                    this.advance();
                    return new UnnamedDatatype(datatype, true);
                } else {
                    return new UnnamedDatatype(datatype, false);
                }
            } else {
                this.error("Expected datatype", this.current?.pos, try_datatype);
            }
        }
    }

    try_datatype(named: boolean): NamedDatatype | UnnamedDatatype | undefined {
        const begin = this.pos;
        try {
            return this.datatype(named, true);
        } catch(_) {
            this.pos = begin;
            return undefined;
        }
    }

    factor(): ParserNode | undefined {
        const token = this.current;
        if (!token) {
            return undefined;
        }

        if (token.id == LexerTokenType.LPAREN) {
            this.advance()

            const result = this.expression();
            this.expect(LexerTokenType.RPAREN);
            this.advance();

            return result;
        } else if (token.id == LexerTokenType.NUMBER) {
            this.advance();
            return new ParserNode(ParserNodeType.NUMBER, undefined, undefined, token.value);
        } else if (token.id == LexerTokenType.STRING) {
            this.advance();
            return new ParserNode(ParserNodeType.STRING, undefined, undefined, token.value);
        } else if (token.id == LexerTokenType.NOT) {
            this.advance();
            return new ParserNode(ParserNodeType.NOT, this.expression(), undefined, undefined);
		} else if (token.id == LexerTokenType.BIT_NOT) {
            this.advance();
            return new ParserNode(ParserNodeType.BIT_NOT, this.expression(), undefined, undefined);
        } else if (token.id == LexerTokenType.PLUS) {
            this.advance();
            return new ParserNode(ParserNodeType.PLUS, this.factor(), undefined, undefined);
        } else if (token.id == LexerTokenType.MINUS) {
            this.advance();
            return new ParserNode(ParserNodeType.MINUS, this.factor(), undefined, undefined);
        } else if (token.id == LexerTokenType.ID) {
            this.advance();
            if (this.current && this.current.id == LexerTokenType.LPAREN) {
                this.advance();
                // function call
                if (this.current && this.current.id as LexerTokenType == LexerTokenType.RPAREN) {
                    this.advance();
                    return new ParserNode(ParserNodeType.FUNCTION_CALL, undefined, undefined, new FunctionCall(token.value as string, []));
                } else {
                    const args: ParserNode[] = [];
                    while (this.current) {
                        const expr = this.expression();
                        if (!expr) {
                            this.error("Expected expression", this.current.pos);
                        }
                        args.push(expr);
                        if (this.comma_or_rparen()) {
                            return new ParserNode(ParserNodeType.FUNCTION_CALL, undefined, undefined, new FunctionCall(token.value as string, args));
                        }
                    }
                    this.error("Not implemented", undefined);
                }
            } else {
				if (this.current && this.current.id == LexerTokenType.LBRACKET) {
					this.advance();
					const expr = this.expression();
					this.expect(LexerTokenType.RBRACKET);
					this.advance();
            		return new ParserNode(ParserNodeType.VARIABLE_LOOKUP_ARRAY, expr, undefined, token.value);
				} else {
            		return new ParserNode(ParserNodeType.VARIABLE_LOOKUP, undefined, undefined, token.value);
				}
            }
        } else if (token.id == LexerTokenType.END_OF_LINE) {
            return undefined;
        }

        this.error("Invalid factor", this.current?.pos);
    }

    bit_logic(): ParserNode | undefined {
        let result = this.factor();

        while (this.current && (this.current.id == LexerTokenType.AND || this.current.id == LexerTokenType.OR || this.current.id == LexerTokenType.XOR || this.current.id == LexerTokenType.SHIFT_LEFT || this.current.id == LexerTokenType.SHIFT_RIGHT)) {
            if (this.current.id == LexerTokenType.AND) {
                this.advance();
                result = new ParserNode(ParserNodeType.AND, result, this.factor(), undefined);
			} else if (this.current.id == LexerTokenType.OR) {
				this.advance();
                result = new ParserNode(ParserNodeType.OR, result, this.factor(), undefined);
			} else if (this.current.id == LexerTokenType.XOR) {
				this.advance();
                result = new ParserNode(ParserNodeType.XOR, result, this.factor(), undefined);
			} else if (this.current.id == LexerTokenType.SHIFT_LEFT) {
				this.advance();
                result = new ParserNode(ParserNodeType.SHIFT_LEFT, result, this.factor(), undefined);
			} else if (this.current.id == LexerTokenType.SHIFT_RIGHT) {
				this.advance();
                result = new ParserNode(ParserNodeType.SHIFT_RIGHT, result, this.factor(), undefined);
            } else {
                this.error("Invalid power", this.current?.pos);
            }
        }

        return result;
    }

    term(): ParserNode | undefined {
        let result = this.bit_logic();

        while (this.current && (this.current.id == LexerTokenType.MULTIPLY || this.current.id == LexerTokenType.DIVIDE || this.current.id == LexerTokenType.MODULO)) {
            if (this.current.id == LexerTokenType.MULTIPLY) {
                this.advance()
                result = new ParserNode(ParserNodeType.MULTIPLY, result, this.bit_logic(), undefined);
            } else if (this.current.id == LexerTokenType.DIVIDE) {
                this.advance();
                result = new ParserNode(ParserNodeType.DIVIDE, result, this.bit_logic(), undefined);
            } else if (this.current.id == LexerTokenType.MODULO) {
				this.advance();
                result = new ParserNode(ParserNodeType.MODULO, result, this.bit_logic(), undefined);
            } else {
                this.error("Invalid term", this.current.pos);
            }
        }

        return result;
    }

    compare(): ParserNode | undefined {
        let result = this.term();

        while (this.current && (this.current.id == LexerTokenType.EQUALS || this.current.id == LexerTokenType.NOT_EQUALS || this.current.id == LexerTokenType.LESS || this.current.id == LexerTokenType.LESS_EQUALS || this.current.id == LexerTokenType.MORE || this.current.id == LexerTokenType.MORE_EQUALS)) {
            if (compare.includes(this.current.id as Compare)) {
                const com = this.current.id as Compare;
                this.advance();
                result = new ParserNode(ParserNodeType.COMPARE, result, this.term(), com);
            } else {
                this.error("Invalid compare", this.current.pos);
            }
        }
        

        return result;
    }

    expression(): ParserNode | undefined {
        let result = this.compare();

        while (this.current && (this.current.id == LexerTokenType.PLUS || this.current.id == LexerTokenType.MINUS)) {
            if (this.current.id == LexerTokenType.MINUS) {
                this.advance();
                result = new ParserNode(ParserNodeType.SUBSTRACT, result, this.term(), undefined);
            } else if (this.current.id == LexerTokenType.PLUS) {
                this.advance();
                result = new ParserNode(ParserNodeType.ADD, result, this.term(), undefined);
            } else {
                this.error("Invalid expression", this.current.pos);
            }
        }

        return result;
    }

    function_attributes(): FunctionAttribute[] {
        const attr: FunctionAttribute[] = [];

        if (this.current && this.current.id == LexerTokenType.LPAREN) {
            this.advance();
            while (this.current) {
                if (this.current && this.current.id as LexerTokenType == LexerTokenType.ID && attributes.includes(this.current.value as FunctionAttribute)) {
                    attr.push(this.current.value as FunctionAttribute);
                    this.advance();
                    if (this.comma_or_rparen()) {
                        return attr;
                    }
                } else {
                    this.error("Unexpected attribute " + this.current.value, this.current.pos);
                }
            }
            this.error("Unexpected EOF", undefined);
        } else {
            return attr;
        }
    }

    function_arguments(): NamedDatatype[] {
        const args: NamedDatatype[] = [];
        this.expect(LexerTokenType.LPAREN);
        this.advance();
        if (this.current && this.current.id == LexerTokenType.RPAREN) {
            this.advance();
            return args;
        }
        while (this.current) {
            args.push(this.datatype(true) as NamedDatatype);
            if (this.comma_or_rparen()) {
                return args;
            }
        }
        this.error("Unexpected EOF", undefined);
    }

    parse_if(): ParserNode {
        this.advance();
        const expr = this.expression();
        this.expect(LexerTokenType.LBRACE);
        if (expr) {
            const code_block = this.code_block();
            this.expect(LexerTokenType.RBRACE);
			this.advance();
			if (this.current && this.current.id == LexerTokenType.ID) {
				if (this.current.value as string == "else") {
                    this.advance();
                    if (this.current.id == LexerTokenType.ID) {
                        if (this.current.value == "if") {
                            const else_code_block = this.parse_if();
                            this.expect(LexerTokenType.RBRACE);
                            return new ParserNode(ParserNodeType.IF, expr, undefined, new If(code_block, [else_code_block]));
                        } else {
                            this.error("Expected if", this.current.pos);
                        }
                    } else {
                        this.expect(LexerTokenType.LBRACE);
                        const else_code_block = this.code_block();
                        this.expect(LexerTokenType.RBRACE);
                        return new ParserNode(ParserNodeType.IF, expr, undefined, new If(code_block, else_code_block));
                    }
				} else {
					this.reverse();
				    return new ParserNode(ParserNodeType.IF, expr, undefined, new If(code_block, undefined));
			    }
			} else {
				this.reverse();
                return new ParserNode(ParserNodeType.IF, expr, undefined, new If(code_block, undefined));
		    }
        } else {
            this.error("Expected expressions", this.current?.pos);
        }
    }

    keyword(): ParserNode[] | undefined {
        if (!this.current) {
            this.error("Unexpected EOF", undefined);
        }

        switch (this.current.value as string) {
            case "return":
                {
                    this.advance();
                    const ret = [ new ParserNode(ParserNodeType.RETURN, this.expression(), undefined, undefined) ];
                    this.expect(LexerTokenType.END_OF_LINE);
                    return ret;
                }

            case "for":
                {
                    const for_body: ParserNode[] = [];
                    this.advance();
                    for_body.push(this.code_line());
                    this.expect(LexerTokenType.END_OF_LINE);
                    this.advance();

                    const expr = this.expression();
                    this.expect(LexerTokenType.END_OF_LINE);
                    this.advance();

                    if (expr) {
                        const update = this.code_line();
                        for_body.push(new ParserNode(ParserNodeType.CONDITIONAL_LOOP, expr, undefined, [...this.code_block(), update]));
                        this.expect(LexerTokenType.RBRACE);
                        return for_body;
                    } else {
                        this.error("Expected expressions", this.current?.pos);
                        break; // why mister linter? telling me unreachable code but if i don't put it there complaining about fall-trough?
                    }
                }

            
            case "if":
                return [ this.parse_if() ];

            case "while":
                {
                    this.advance();
                    const expr = this.expression();
                    this.expect(LexerTokenType.LBRACE);
                    if (expr) {
                        const code_block = this.code_block();
                        this.expect(LexerTokenType.RBRACE);
                        return [ new ParserNode(ParserNodeType.CONDITIONAL_LOOP, expr, undefined, code_block) ];
                    } else {
                        this.error("Expected expressions", this.current?.pos);
                        break; // why mister linter? telling me unreachable code but if i don't put it there complaining about fall-trough?
                    }
                }

            case "do":
                {
                    this.advance_expect(LexerTokenType.LBRACE);
                    const code_block = this.code_block();
                    this.expect(LexerTokenType.RBRACE);
                    this.advance_expect(LexerTokenType.ID);
                    if (this.current && this.current.value == "while") {
                        this.advance();
                        const expr = this.expression();
                        this.expect(LexerTokenType.END_OF_LINE);
                        if (expr) {
                            return [ new ParserNode(ParserNodeType.POST_CONDITIONAL_LOOP, expr, undefined, code_block) ];
                        } else {
                            this.error("Expected expressions", this.current?.pos);
                            break;
                        }
                    } else {
                        this.error("Expected while", this.current?.pos);
                        break;
                    }
                }

            case "loop":
                {
                    this.advance();
                    this.expect(LexerTokenType.LBRACE);
                    const code_block = this.code_block();
                    this.expect(LexerTokenType.RBRACE);
                    return [ new ParserNode(ParserNodeType.LOOP, undefined, undefined, code_block) ];
                }

            default:
                return undefined;
        }
    }

    code_line(): ParserNode {
        if (!this.current) {
            this.error("Unexpected EOF", undefined);
        }
        const dt = this.try_datatype(true) as NamedDatatype;
        // console.log(dt);
        if (dt) {
            // console.log(dt);
            // variable declaration
            if (this.current && this.current.id == LexerTokenType.END_OF_LINE) {
                return new ParserNode(ParserNodeType.VARIABLE_DECLARATION, undefined, undefined, dt);
            } else {
                this.expect(LexerTokenType.ASSIGN);
                this.advance();
                // parse expression here
                return new ParserNode(ParserNodeType.VARIABLE_DECLARATION, this.expression(), undefined, dt);
            }
        } else if (this.current.id == LexerTokenType.ID) {
            const possible_variable_name = this.current.value as string;
            this.advance();
            if (this.current && this.current.id as LexerTokenType == LexerTokenType.ASSIGN) {
                this.advance();
                const expr = this.expression();
                if (expr) {
                    return new ParserNode(ParserNodeType.VARIABLE_ASSIGN, expr, undefined, possible_variable_name);
                } else {
                    this.error("Expected expressions", this.current.pos);
                }
            } else if (this.current && this.current.id as LexerTokenType == LexerTokenType.INCREASE) {
                this.advance();
                return new ParserNode(ParserNodeType.VARIABLE_INCREASE, undefined, undefined, possible_variable_name);
            } else if (this.current && this.current.id as LexerTokenType == LexerTokenType.DECREASE) {
                this.advance();
                return new ParserNode(ParserNodeType.VARIABLE_DECREASE, undefined, undefined, possible_variable_name);
            } else if (this.current && this.current.id as LexerTokenType == LexerTokenType.LBRACKET) {
                this.advance();
                const idx_expr = this.expression();
                this.expect(LexerTokenType.RBRACKET);
                this.advance_expect(LexerTokenType.ASSIGN);
                if (idx_expr) {
                    this.advance();
                    const expr = this.expression();
                    if (expr) {
                        return new ParserNode(ParserNodeType.VARIABLE_ASSIGN_ARRAY, idx_expr, expr, possible_variable_name);
                    } else {
                        this.error("Expected expressions", this.current.pos);
                    }
                } else {
                    this.error("Expected expressions", this.current.pos);
                }
            } else {
                this.reverse();
                const expr = this.expression();
                if (expr) {
                    return expr;
                } else {
                    this.error("Expected expressions", this.current.pos);
                }
            }
        } else {
            this.error("Expected ID", this.current.pos);
        }
    }

    code_block(): ParserNode[] {
        let body: ParserNode[] = [];
        this.expect(LexerTokenType.LBRACE);
        this.advance();
        while (this.current) {
            if (this.current.id == LexerTokenType.RBRACE) {
                return body;
            } else {
                const keyword = this.keyword();
                if (keyword) {
                    body = [...body, ...keyword];
                } else {
                    body.push(this.code_line());
                    this.expect(LexerTokenType.END_OF_LINE);
                }
            }
            this.advance();
        }
        this.error("Unexpected EOF", undefined);
    }

    global(): ParserNode {
        const global = new ParserNode(ParserNodeType.GLOBAL, undefined, undefined, []);
        while (this.current) {
            switch (this.current.id) {
                case LexerTokenType.ID:
                    {
                        if (datatypes.includes(this.current.value as Datatype)) {
							const dt = this.datatype(true) as NamedDatatype;
							if (this.current && this.current.id as LexerTokenType == LexerTokenType.END_OF_LINE) {
								(global.value as ParserNode[]).push(new ParserNode(ParserNodeType.VARIABLE_DECLARATION, undefined, undefined, dt));
							} else {
								this.expect(LexerTokenType.ASSIGN);
								this.advance();
								(global.value as ParserNode[]).push(new ParserNode(ParserNodeType.VARIABLE_DECLARATION, this.expression(), undefined, dt));
								this.expect(LexerTokenType.END_OF_LINE);
							}
                        } else {
                            switch (this.current.value) {
                                case "function":
                                    {
                                        this.advance();

                                        const attr = this.function_attributes();
                                        this.expect(LexerTokenType.ID);
                                        const name = this.current.value;
                                        this.advance();
                                        const args = this.function_arguments();
                                        this.expect(LexerTokenType.ARROW);
                                        this.advance();
                                        const return_datatype = this.datatype(false);
                                        if (attr.includes("assembly")) {
                                            this.expect(LexerTokenType.LBRACE);
                                            this.advance_expect(LexerTokenType.STRING);
                                            const body = [ new ParserNode(ParserNodeType.ASSEMBLY_CODE, undefined, undefined, this.current.value as string) ];
                                            this.advance_expect(LexerTokenType.RBRACE);
                                            (global.value as ParserNode[]).push(new ParserNode(ParserNodeType.FUNCTION, undefined, undefined, new Function(name, attr, body, return_datatype, args)));

                                        } else {
                                            const body = this.code_block();
                                            (global.value as ParserNode[]).push(new ParserNode(ParserNodeType.FUNCTION, undefined, undefined, new Function(name, attr, body, return_datatype, args)));
                                        }

                                    }
                                    break;
                                default:
                                    this.error("Unexpected " + this.current.value, this.current?.pos);
                            }
                        }
                    }
                    break;
                default:
                    this.error("Unexpected " + this.current.id, this.current?.pos);
            }

            this.advance();
        }
        return global;
    }
}