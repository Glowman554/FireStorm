export enum LexerTokenType {
    ID = "id",
    LPAREN = "lparen", // (
    RPAREN = "rparen", // )
    LBRACE = "lbrace", // {
    RBRACE = "rbrace", // }
    LBRACKET = "lbracket", // [
    RBRACKET = "rbracket", // ]
    DIVIDE = "divide", // /
    COMMA = "comma", // ,
    ARROW = "arrow", // ->
    STRING = "string",
    ASSIGN = "assign", // = 
    PLUS = "plus", // +
    MINUS = "minus", // -
    MULTIPLY = "multiply", // *
    NUMBER = "number", 
    MODULO = "modulo", // %
    XOR = "xor", // ^
    AND = "and", // &
    OR = "or", // |
	SHIFT_LEFT = "shift_left", // <<
	SHIFT_RIGHT = "shift_right", // >>
	BIT_NOT = "bit_not", // ~
    END_OF_LINE = "eol", // ;

    EQUALS = "equals", // ==
    NOT_EQUALS = "not_equals", // !=
    LESS = "less", // <
    LESS_EQUALS = "less_equals", // <=
    MORE = "more", // >
    MORE_EQUALS = "more_equals", // >=
    NOT = "not", // !

	INCREASE = "increase", // ++
	DECREASE = "decrease", // --
}

export type LexerTokenValue =  undefined|string|number;

export class LexerToken {
    id: LexerTokenType;
    value: LexerTokenValue;

    pos: number;

    constructor (id: LexerTokenType, value: LexerTokenValue, pos: number) {
        this.id = id;
        this.value = value;
        this.pos = pos;
    }
}
export class Lexer {
    code: string;
    pos: number;
    current: string | undefined;

    constructor (code: string) {
        this.code = code;
        this.pos = -1;
        this.advance();
    }

    advance() {
        this.pos++;
        if (this.pos < this.code.length) {
            this.current = this.code[this.pos];
        } else {
            this.current = undefined;
        }
    }

    reverse() {
        this.pos--;
        this.current = this.code[this.pos];
    }

    tokenize(): LexerToken[] {
        const tokens: LexerToken[] = [];

        while (this.current) {
            if (this.current.match(/\d/)) {
                const start_pos = this.pos;
                let num = "";
                while (this.current.match(/\d/)) {
                    num += this.current;
                    this.advance();
                }
                tokens.push(new LexerToken(LexerTokenType.NUMBER, parseInt(num), start_pos));
            }

            if (this.current.match(/\w/)) {
                const start_pos = this.pos;
                let id = "";
                while (this.current.match(/\w/)) {
                    id += this.current;
                    this.advance();
                }
                tokens.push(new LexerToken(LexerTokenType.ID, id, start_pos));
            }

            if (this.current.match(/\s/)) {
                this.advance();
                continue;
            }

            switch (this.current) {
				case "'":
					{
						this.advance();
						const char = this.current as string;
						this.advance();
						if (this.current != "'") {
							throw new Error("Expected '");
						} else {
							tokens.push(new LexerToken(LexerTokenType.NUMBER, char.charCodeAt(0), this.pos));
						}
					}
					break;
                case "(":
                    tokens.push(new LexerToken(LexerTokenType.LPAREN, undefined, this.pos));
                    break;
                case ")":
                    tokens.push(new LexerToken(LexerTokenType.RPAREN, undefined, this.pos));
                    break;
                case "{":
                    tokens.push(new LexerToken(LexerTokenType.LBRACE, undefined, this.pos));
                    break;
                case "}":
                    tokens.push(new LexerToken(LexerTokenType.RBRACE, undefined, this.pos));
                    break;
                case "[":
                    tokens.push(new LexerToken(LexerTokenType.LBRACKET, undefined, this.pos));
                    break;
                case "]":
                    tokens.push(new LexerToken(LexerTokenType.RBRACKET, undefined, this.pos));
                    break;
                case ",":
                    tokens.push(new LexerToken(LexerTokenType.COMMA, undefined, this.pos));
                    break;
                case "+":
					this.advance();
					if (this.current && this.current as string == "+") {
                    	tokens.push(new LexerToken(LexerTokenType.INCREASE, undefined, this.pos));
					} else {
						this.reverse();
                    	tokens.push(new LexerToken(LexerTokenType.PLUS, undefined, this.pos));
					}
                    break;
                case "=":
                    this.advance();
                    if (this.current && this.current as string == "=") {
                        tokens.push(new LexerToken(LexerTokenType.EQUALS, undefined, this.pos - 1));
                    } else {
                        this.reverse();
                        tokens.push(new LexerToken(LexerTokenType.ASSIGN, undefined, this.pos));
                    }
                    break;
                case "*":
                    tokens.push(new LexerToken(LexerTokenType.MULTIPLY, undefined, this.pos));
                    break;
                case "%":
                    tokens.push(new LexerToken(LexerTokenType.MODULO, undefined, this.pos));
                    break;
                case "^":
                    tokens.push(new LexerToken(LexerTokenType.XOR, undefined, this.pos));
                    break;
				case "|":
					tokens.push(new LexerToken(LexerTokenType.OR, undefined, this.pos));
					break;
				case "&":
					tokens.push(new LexerToken(LexerTokenType.AND, undefined, this.pos));
					break;
				case "~":
					tokens.push(new LexerToken(LexerTokenType.BIT_NOT, undefined, this.pos));
					break;
                case ";":
                    tokens.push(new LexerToken(LexerTokenType.END_OF_LINE, undefined, this.pos));
                    break;

                case ">":
                    this.advance();
                    if (this.current && this.current as string == "=") {
                        tokens.push(new LexerToken(LexerTokenType.MORE_EQUALS, undefined, this.pos - 1));
					} else if (this.current && this.current as string == ">") {
                        tokens.push(new LexerToken(LexerTokenType.SHIFT_RIGHT, undefined, this.pos - 1));
                    } else {
                        tokens.push(new LexerToken(LexerTokenType.MORE, undefined, this.pos));
                    }
                    break;

                case "<":
                    this.advance();
                    if (this.current && this.current as string == "=") {
                        tokens.push(new LexerToken(LexerTokenType.LESS_EQUALS, undefined, this.pos - 1));
					} else if (this.current && this.current as string == "<") {
                        tokens.push(new LexerToken(LexerTokenType.SHIFT_LEFT, undefined, this.pos - 1));
					} else {
                        tokens.push(new LexerToken(LexerTokenType.LESS, undefined, this.pos));
                    }
                    break;

                case "!":
                    this.advance();
                    if (this.current && this.current as string == "=") {
                        tokens.push(new LexerToken(LexerTokenType.NOT_EQUALS, undefined, this.pos - 1));
                    } else {
                        this.reverse();
                        tokens.push(new LexerToken(LexerTokenType.NOT, undefined, this.pos));
                    }
                    break;
                
                case "-":
                    this.advance();
                    if (this.current as string == ">") {
                        tokens.push(new LexerToken(LexerTokenType.ARROW, undefined, this.pos - 1));
                    } else if (this.current as string == "-") {
                        tokens.push(new LexerToken(LexerTokenType.DECREASE, undefined, this.pos - 1));
					} else {
                        this.reverse();
                        tokens.push(new LexerToken(LexerTokenType.MINUS, undefined, this.pos));
                    }
                    break;

                case "/":
                    this.advance();
                    if (this.current as string == "/") {
                        this.advance();
                        while (this.current && this.current as string != "\n") {
                            this.advance();
                        }
                    } else {
                        this.reverse();
                        tokens.push(new LexerToken(LexerTokenType.DIVIDE, undefined, this.pos));
                    }
                    break;

                case "\"":
                    {
                        const start_pos = this.pos;
                        let str = "";
                        this.advance();
                        while (this.current && this.current as string != "\"") {
                            str += this.current;
                            this.advance();
                        }
                        tokens.push(new LexerToken(LexerTokenType.STRING, str, start_pos));
                    }
                    break;


                default:
                    throw new Error("Illegal token: " + this.current);
            }

            this.advance();
        }

        return tokens;
    }
}