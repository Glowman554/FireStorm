import { Compare } from "./features/compare.ts";
import { compare } from "./features/compare.ts";
import { Datatype, datatypes, NamedDatatype, UnnamedDatatype } from "./features/datatype.ts";
import { attributes, Function, FunctionAttribute, FunctionCall } from "./features/function.ts";
import { LexerToken, LexerTokenType, LexerTokenValue } from "./lexer.ts";

export type ParserNodeValue =  undefined|Function|FunctionCall|ParserNode[]|string|LexerTokenValue|NamedDatatype|Compare;

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

	CONDITIONAL_LOOP = "conditional_loop",
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

    constructor (tokens: LexerToken[]) {
        this.tokens = tokens;
        this.pos = -1;
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

    expect(type: LexerTokenType) {
        if (!(this.current && this.current.id == type)) {
            throw new Error("Expected " + type + " but was " + (this.current ? this.current.id : "EOF" ));
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
            throw new Error("Unexpected " + (this.current ? this.current.id : "EOF" ));
        }
    }

    datatype(named: boolean): NamedDatatype | UnnamedDatatype {
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
                throw new Error("Expected datatype");
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
                throw new Error("Expected datatype");
            }
        }
    }

    try_datatype(named: boolean): NamedDatatype | UnnamedDatatype | undefined {
        const begin = this.pos;
        try {
            return this.datatype(named);
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
                            throw new Error("Expected expression");
                        }
                        args.push(expr);
                        if (this.comma_or_rparen()) {
                            return new ParserNode(ParserNodeType.FUNCTION_CALL, undefined, undefined, new FunctionCall(token.value as string, args));
                        }
                    }
                    throw new Error("Not implemented");
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

        console.log(this.current);
        console.log(token);
        throw new Error("Invalid factor");
    }

    power(): ParserNode | undefined {
        let result = this.factor();

        while (this.current && (this.current.id == LexerTokenType.POWER)) {
            if (this.current.id == LexerTokenType.POWER) {
                this.advance();
                result = new ParserNode(ParserNodeType.POWER, result, this.factor(), undefined);
            } else {
                throw new Error("Invalid power");
            }
        }

        return result;
    }

    term(): ParserNode | undefined {
        let result = this.power();

        while (this.current && (this.current.id == LexerTokenType.MULTIPLY || this.current.id == LexerTokenType.DIVIDE || this.current.id == LexerTokenType.MODULO)) {
            if (this.current.id == LexerTokenType.MULTIPLY) {
                this.advance()
                result = new ParserNode(ParserNodeType.MULTIPLY, result, this.power(), undefined);
            } else if (this.current.id == LexerTokenType.DIVIDE) {
                this.advance();
                result = new ParserNode(ParserNodeType.DIVIDE, result, this.power(), undefined);
            } else if (this.current.id == LexerTokenType.MODULO) {
				this.advance();
                result = new ParserNode(ParserNodeType.MODULO, result, this.power(), undefined);
            } else {
                throw new Error("Invalid term");
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
                throw new Error("Invalid compare");
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
                throw new Error("Invalid expression");
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
                    throw new Error("Unexpected attribute " + this.current.value);
                }
            }
            throw new Error("Unexpected EOF");
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
        throw new Error("Unexpected EOF");
    }

    code_block(): ParserNode[] {
        const body: ParserNode[] = [];
        this.expect(LexerTokenType.LBRACE);
        this.advance();
        while (this.current) {
            const dt = this.try_datatype(true) as NamedDatatype;
            // console.log(dt);
            if (dt) {
                // console.log(dt);
                // variable declaration
                if (this.current && this.current.id == LexerTokenType.END_OF_LINE) {
                    body.push(new ParserNode(ParserNodeType.VARIABLE_DECLARATION, undefined, undefined, dt));
                } else {
                    this.expect(LexerTokenType.ASSIGN);
                    this.advance();
                    // parse expression here
                    body.push(new ParserNode(ParserNodeType.VARIABLE_DECLARATION, this.expression(), undefined, dt));
					// console.log(this.current);
                    this.expect(LexerTokenType.END_OF_LINE);
                }
            } else if (this.current.id == LexerTokenType.RBRACE) {
                return body;
            } else if (this.current.id == LexerTokenType.ID) {
                // keywords variable assignment and function calls
                // TODO variable assignment
                switch (this.current.value as string) {
                    case "return":
                        this.advance();
                        body.push(new ParserNode(ParserNodeType.RETURN, this.expression(), undefined, undefined));
                        break;
                    
                    case "if":
                        {
                            this.advance();
                            const expr = this.expression();
                            this.expect(LexerTokenType.LBRACE);
                            if (expr) {
                                const code_block = this.code_block();
                                this.expect(LexerTokenType.RBRACE);
                                body.push(new ParserNode(ParserNodeType.IF, expr, undefined, code_block));
                            } else {
                                throw new Error("Expected expression");
                            }
                        }
                        break;
					case "while":
                        {
                            this.advance();
                            const expr = this.expression();
                            this.expect(LexerTokenType.LBRACE);
                            if (expr) {
                                const code_block = this.code_block();
                                this.expect(LexerTokenType.RBRACE);
                                body.push(new ParserNode(ParserNodeType.CONDITIONAL_LOOP, expr, undefined, code_block));
                            } else {
                                throw new Error("Expected expression");
                            }
                        }
                        break;

                    default:
                        {
                            const possible_variable_name = this.current.value as string;
                            this.advance();
                            if (this.current && this.current.id as LexerTokenType == LexerTokenType.ASSIGN) {
                                this.advance();
                                const expr = this.expression();
                                this.expect(LexerTokenType.END_OF_LINE);
                                if (expr) {
                                    body.push(new ParserNode(ParserNodeType.VARIABLE_ASSIGN, expr, undefined, possible_variable_name));
                                } else {
                                    throw new Error("Expected expression");
                                }
                            } else if (this.current && this.current.id as LexerTokenType == LexerTokenType.LBRACKET) {
								this.advance();
								const idx_expr = this.expression();
                                this.expect(LexerTokenType.RBRACKET);
								this.advance_expect(LexerTokenType.ASSIGN);
                                if (idx_expr) {
									this.advance();
                                    const expr = this.expression();
									this.expect(LexerTokenType.END_OF_LINE);
									if (expr) {
										body.push(new ParserNode(ParserNodeType.VARIABLE_ASSIGN_ARRAY, idx_expr, expr, possible_variable_name));
									} else {
										throw new Error("Expected expression");
									}
                                } else {
                                    throw new Error("Expected expression");
                                }
							} else {
                                this.reverse();
                                const expr = this.expression();
                                this.expect(LexerTokenType.END_OF_LINE);
                                if (expr) {
                                    body.push(expr);
                                } else {
                                    throw new Error("Expected expression");
                                }
                            }
                        }
                        break;
                }
            } else {
                // console.log(this.current);
                // console.log(body);
                throw new Error("Expected ID");
            }



            this.advance();
        }
        throw new Error("Unexpected EOF");
    }

    global(): ParserNode {
        const global = new ParserNode(ParserNodeType.GLOBAL, undefined, undefined, []);
        while (this.current) {
            switch (this.current.id) {
                case LexerTokenType.ID:
                    {
                        if (datatypes.includes(this.current.value as Datatype)) {
                            throw new Error("GLobal variables not yet supported!");
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
                                    throw new Error("Unexpected " + this.current.value);
                            }
                        }
                    }
                    break;
                default:
                    throw new Error("Did not expect: " + this.current.id);
            }

            this.advance();
        }
        return global;
    }
}