// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

var LexerTokenType;
(function(LexerTokenType) {
    LexerTokenType["ID"] = "id";
    LexerTokenType["LPAREN"] = "lparen";
    LexerTokenType["RPAREN"] = "rparen";
    LexerTokenType["LBRACE"] = "lbrace";
    LexerTokenType["RBRACE"] = "rbrace";
    LexerTokenType["LBRACKET"] = "lbracket";
    LexerTokenType["RBRACKET"] = "rbracket";
    LexerTokenType["DIVIDE"] = "divide";
    LexerTokenType["COMMA"] = "comma";
    LexerTokenType["ARROW"] = "arrow";
    LexerTokenType["STRING"] = "string";
    LexerTokenType["ASSIGN"] = "assign";
    LexerTokenType["PLUS"] = "plus";
    LexerTokenType["MINUS"] = "minus";
    LexerTokenType["MULTIPLY"] = "multiply";
    LexerTokenType["NUMBER"] = "number";
    LexerTokenType["MODULO"] = "modulo";
    LexerTokenType["XOR"] = "xor";
    LexerTokenType["AND"] = "and";
    LexerTokenType["OR"] = "or";
    LexerTokenType["SHIFT_LEFT"] = "shift_left";
    LexerTokenType["SHIFT_RIGHT"] = "shift_right";
    LexerTokenType["BIT_NOT"] = "bit_not";
    LexerTokenType["END_OF_LINE"] = "eol";
    LexerTokenType["EQUALS"] = "equals";
    LexerTokenType["NOT_EQUALS"] = "not_equals";
    LexerTokenType["LESS"] = "less";
    LexerTokenType["LESS_EQUALS"] = "less_equals";
    LexerTokenType["MORE"] = "more";
    LexerTokenType["MORE_EQUALS"] = "more_equals";
    LexerTokenType["NOT"] = "not";
    LexerTokenType["INCREASE"] = "increase";
    LexerTokenType["DECREASE"] = "decrease";
})(LexerTokenType || (LexerTokenType = {}));
class LexerToken {
    id;
    value;
    pos;
    constructor(id, value, pos){
        this.id = id;
        this.value = value;
        this.pos = pos;
    }
}
class Lexer {
    code;
    pos;
    current;
    constructor(code){
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
    tokenize() {
        const tokens = [];
        while(this.current){
            if (this.current.match(/\d/)) {
                const start_pos = this.pos;
                let num = "";
                while(this.current.match(/\d/)){
                    num += this.current;
                    this.advance();
                }
                tokens.push(new LexerToken(LexerTokenType.NUMBER, parseInt(num), start_pos));
            }
            if (this.current.match(/\w/)) {
                const start_pos = this.pos;
                let id = "";
                while(this.current.match(/\w/)){
                    id += this.current;
                    this.advance();
                }
                tokens.push(new LexerToken(LexerTokenType.ID, id, start_pos));
            }
            if (this.current.match(/\s/)) {
                this.advance();
                continue;
            }
            switch(this.current){
                case "'":
                    {
                        this.advance();
                        const __char = this.current;
                        this.advance();
                        if (this.current != "'") {
                            throw new Error("Expected '");
                        } else {
                            tokens.push(new LexerToken(LexerTokenType.NUMBER, __char.charCodeAt(0), this.pos));
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
                    if (this.current && this.current == "+") {
                        tokens.push(new LexerToken(LexerTokenType.INCREASE, undefined, this.pos));
                    } else {
                        this.reverse();
                        tokens.push(new LexerToken(LexerTokenType.PLUS, undefined, this.pos));
                    }
                    break;
                case "=":
                    this.advance();
                    if (this.current && this.current == "=") {
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
                    if (this.current && this.current == "=") {
                        tokens.push(new LexerToken(LexerTokenType.MORE_EQUALS, undefined, this.pos - 1));
                    } else if (this.current && this.current == ">") {
                        tokens.push(new LexerToken(LexerTokenType.SHIFT_RIGHT, undefined, this.pos - 1));
                    } else {
                        tokens.push(new LexerToken(LexerTokenType.MORE, undefined, this.pos));
                    }
                    break;
                case "<":
                    this.advance();
                    if (this.current && this.current == "=") {
                        tokens.push(new LexerToken(LexerTokenType.LESS_EQUALS, undefined, this.pos - 1));
                    } else if (this.current && this.current == "<") {
                        tokens.push(new LexerToken(LexerTokenType.SHIFT_LEFT, undefined, this.pos - 1));
                    } else {
                        tokens.push(new LexerToken(LexerTokenType.LESS, undefined, this.pos));
                    }
                    break;
                case "!":
                    this.advance();
                    if (this.current && this.current == "=") {
                        tokens.push(new LexerToken(LexerTokenType.NOT_EQUALS, undefined, this.pos - 1));
                    } else {
                        this.reverse();
                        tokens.push(new LexerToken(LexerTokenType.NOT, undefined, this.pos));
                    }
                    break;
                case "-":
                    this.advance();
                    if (this.current == ">") {
                        tokens.push(new LexerToken(LexerTokenType.ARROW, undefined, this.pos - 1));
                    } else if (this.current == "-") {
                        tokens.push(new LexerToken(LexerTokenType.DECREASE, undefined, this.pos - 1));
                    } else {
                        this.reverse();
                        tokens.push(new LexerToken(LexerTokenType.MINUS, undefined, this.pos));
                    }
                    break;
                case "/":
                    this.advance();
                    if (this.current == "/") {
                        this.advance();
                        while(this.current && this.current != "\n"){
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
                        while(this.current && this.current != "\""){
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
const compare = [
    "more",
    "less",
    "more_equals",
    "less_equals",
    "equals",
    "not_equals"
];
const datatypes = [
    "int",
    "str",
    "void",
    "chr"
];
class NamedDatatype {
    name;
    datatype;
    array;
    constructor(name, datatype, array){
        this.name = name;
        this.datatype = datatype;
        this.array = array;
    }
}
class UnnamedDatatype {
    datatype;
    array;
    constructor(datatype, array){
        this.datatype = datatype;
        this.array = array;
    }
}
const attributes = [
    "assembly",
    "noreturn",
    "global",
    "keep"
];
class Function {
    name;
    attributes;
    body;
    return_datatype;
    _arguments;
    constructor(name, attibutes, body, return_datatype, _arguments){
        this.name = name;
        this.attributes = attibutes;
        this.body = body;
        this.return_datatype = return_datatype;
        this._arguments = _arguments;
    }
}
class FunctionCall {
    name;
    _arguments;
    constructor(name, _arguments){
        this.name = name;
        this._arguments = _arguments;
    }
}
class If {
    true_block;
    false_block;
    constructor(true_block, false_block){
        this.true_block = true_block;
        this.false_block = false_block;
    }
}
var ParserNodeType;
(function(ParserNodeType) {
    ParserNodeType["GLOBAL"] = "global";
    ParserNodeType["FUNCTION"] = "function";
    ParserNodeType["ASSEMBLY_CODE"] = "assembly";
    ParserNodeType["VARIABLE_DECLARATION"] = "variable_declaration";
    ParserNodeType["NUMBER"] = "number";
    ParserNodeType["STRING"] = "string";
    ParserNodeType["ADD"] = "add";
    ParserNodeType["SUBSTRACT"] = "substract";
    ParserNodeType["MULTIPLY"] = "multiply";
    ParserNodeType["DIVIDE"] = "divide";
    ParserNodeType["PLUS"] = "plus";
    ParserNodeType["MINUS"] = "Minus";
    ParserNodeType["MODULO"] = "modulo";
    ParserNodeType["POWER"] = "power";
    ParserNodeType["VARIABLE_LOOKUP"] = "variable_lookup";
    ParserNodeType["VARIABLE_LOOKUP_ARRAY"] = "variable_lookup_array";
    ParserNodeType["COMPARE"] = "compare";
    ParserNodeType["NOT"] = "not";
    ParserNodeType["IF"] = "if";
    ParserNodeType["FUNCTION_CALL"] = "function_call";
    ParserNodeType["RETURN"] = "return";
    ParserNodeType["VARIABLE_ASSIGN"] = "variable_assign";
    ParserNodeType["VARIABLE_ASSIGN_ARRAY"] = "variable_assign_array";
    ParserNodeType["VARIABLE_INCREASE"] = "variable_increase";
    ParserNodeType["VARIABLE_DECREASE"] = "variable_decrease";
    ParserNodeType["CONDITIONAL_LOOP"] = "conditional_loop";
    ParserNodeType["POST_CONDITIONAL_LOOP"] = "post_conditional_loop";
    ParserNodeType["LOOP"] = "loop";
    ParserNodeType["SHIFT_LEFT"] = "shift_left";
    ParserNodeType["SHIFT_RIGHT"] = "shift_right";
    ParserNodeType["AND"] = "and";
    ParserNodeType["OR"] = "or";
    ParserNodeType["XOR"] = "xor";
    ParserNodeType["BIT_NOT"] = "bit_not";
})(ParserNodeType || (ParserNodeType = {}));
class ParserNode {
    id;
    a;
    b;
    value;
    constructor(id, a, b, value){
        this.id = id;
        this.a = a;
        this.b = b;
        this.value = value;
    }
}
class Parser {
    tokens;
    current;
    pos;
    constructor(tokens){
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
    }
    reverse() {
        this.pos--;
        this.current = this.tokens[this.pos];
    }
    expect(type) {
        if (!(this.current && this.current.id == type)) {
            throw new Error("Expected " + type + " but was " + (this.current ? this.current.id : "EOF"));
        }
    }
    advance_expect(type) {
        this.advance();
        this.expect(type);
    }
    comma_or_rparen() {
        if (this.current && this.current.id == LexerTokenType.COMMA) {
            this.advance();
            return false;
        } else if (this.current && this.current.id == LexerTokenType.RPAREN) {
            this.advance();
            return true;
        } else {
            throw new Error("Unexpected " + (this.current ? this.current.id : "EOF"));
        }
    }
    datatype(named) {
        if (named) {
            if (this.current && this.current.id == LexerTokenType.ID && datatypes.includes(this.current.value)) {
                const datatype = this.current.value;
                this.advance();
                if (this.current && this.current.id == LexerTokenType.LBRACKET) {
                    this.advance_expect(LexerTokenType.RBRACKET);
                    this.advance_expect(LexerTokenType.ID);
                    const tmp = new NamedDatatype(this.current.value, datatype, true);
                    this.advance();
                    return tmp;
                } else {
                    this.expect(LexerTokenType.ID);
                    const tmp = new NamedDatatype(this.current.value, datatype, false);
                    this.advance();
                    return tmp;
                }
            } else {
                throw new Error("Expected datatype");
            }
        } else {
            if (this.current && this.current.id == LexerTokenType.ID && datatypes.includes(this.current.value)) {
                const datatype = this.current.value;
                this.advance();
                if (this.current && this.current.id == LexerTokenType.LBRACKET) {
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
    try_datatype(named) {
        const begin = this.pos;
        try {
            return this.datatype(named);
        } catch (_) {
            this.pos = begin;
            return undefined;
        }
    }
    factor() {
        const token = this.current;
        if (!token) {
            return undefined;
        }
        if (token.id == LexerTokenType.LPAREN) {
            this.advance();
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
                if (this.current && this.current.id == LexerTokenType.RPAREN) {
                    this.advance();
                    return new ParserNode(ParserNodeType.FUNCTION_CALL, undefined, undefined, new FunctionCall(token.value, []));
                } else {
                    const args = [];
                    while(this.current){
                        const expr = this.expression();
                        if (!expr) {
                            throw new Error("Expected expression");
                        }
                        args.push(expr);
                        if (this.comma_or_rparen()) {
                            return new ParserNode(ParserNodeType.FUNCTION_CALL, undefined, undefined, new FunctionCall(token.value, args));
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
    bit_logic() {
        let result = this.factor();
        while(this.current && (this.current.id == LexerTokenType.AND || this.current.id == LexerTokenType.OR || this.current.id == LexerTokenType.XOR || this.current.id == LexerTokenType.SHIFT_LEFT || this.current.id == LexerTokenType.SHIFT_RIGHT)){
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
                throw new Error("Invalid power");
            }
        }
        return result;
    }
    term() {
        let result = this.bit_logic();
        while(this.current && (this.current.id == LexerTokenType.MULTIPLY || this.current.id == LexerTokenType.DIVIDE || this.current.id == LexerTokenType.MODULO)){
            if (this.current.id == LexerTokenType.MULTIPLY) {
                this.advance();
                result = new ParserNode(ParserNodeType.MULTIPLY, result, this.bit_logic(), undefined);
            } else if (this.current.id == LexerTokenType.DIVIDE) {
                this.advance();
                result = new ParserNode(ParserNodeType.DIVIDE, result, this.bit_logic(), undefined);
            } else if (this.current.id == LexerTokenType.MODULO) {
                this.advance();
                result = new ParserNode(ParserNodeType.MODULO, result, this.bit_logic(), undefined);
            } else {
                throw new Error("Invalid term");
            }
        }
        return result;
    }
    compare() {
        let result = this.term();
        while(this.current && (this.current.id == LexerTokenType.EQUALS || this.current.id == LexerTokenType.NOT_EQUALS || this.current.id == LexerTokenType.LESS || this.current.id == LexerTokenType.LESS_EQUALS || this.current.id == LexerTokenType.MORE || this.current.id == LexerTokenType.MORE_EQUALS)){
            if (compare.includes(this.current.id)) {
                const com = this.current.id;
                this.advance();
                result = new ParserNode(ParserNodeType.COMPARE, result, this.term(), com);
            } else {
                throw new Error("Invalid compare");
            }
        }
        return result;
    }
    expression() {
        let result = this.compare();
        while(this.current && (this.current.id == LexerTokenType.PLUS || this.current.id == LexerTokenType.MINUS)){
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
    function_attributes() {
        const attr = [];
        if (this.current && this.current.id == LexerTokenType.LPAREN) {
            this.advance();
            while(this.current){
                if (this.current && this.current.id == LexerTokenType.ID && attributes.includes(this.current.value)) {
                    attr.push(this.current.value);
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
    function_arguments() {
        const args = [];
        this.expect(LexerTokenType.LPAREN);
        this.advance();
        if (this.current && this.current.id == LexerTokenType.RPAREN) {
            this.advance();
            return args;
        }
        while(this.current){
            args.push(this.datatype(true));
            if (this.comma_or_rparen()) {
                return args;
            }
        }
        throw new Error("Unexpected EOF");
    }
    code_block() {
        const body = [];
        this.expect(LexerTokenType.LBRACE);
        this.advance();
        while(this.current){
            const dt = this.try_datatype(true);
            if (dt) {
                if (this.current && this.current.id == LexerTokenType.END_OF_LINE) {
                    body.push(new ParserNode(ParserNodeType.VARIABLE_DECLARATION, undefined, undefined, dt));
                } else {
                    this.expect(LexerTokenType.ASSIGN);
                    this.advance();
                    body.push(new ParserNode(ParserNodeType.VARIABLE_DECLARATION, this.expression(), undefined, dt));
                    this.expect(LexerTokenType.END_OF_LINE);
                }
            } else if (this.current.id == LexerTokenType.RBRACE) {
                return body;
            } else if (this.current.id == LexerTokenType.ID) {
                switch(this.current.value){
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
                                this.advance();
                                if (this.current && this.current.id == LexerTokenType.ID) {
                                    if (this.current.value == "else") {
                                        this.advance_expect(LexerTokenType.LBRACE);
                                        const else_code_block = this.code_block();
                                        this.expect(LexerTokenType.RBRACE);
                                        body.push(new ParserNode(ParserNodeType.IF, expr, undefined, new If(code_block, else_code_block)));
                                    } else {
                                        this.reverse();
                                        body.push(new ParserNode(ParserNodeType.IF, expr, undefined, new If(code_block, undefined)));
                                    }
                                } else {
                                    this.reverse();
                                    body.push(new ParserNode(ParserNodeType.IF, expr, undefined, new If(code_block, undefined)));
                                }
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
                                    body.push(new ParserNode(ParserNodeType.POST_CONDITIONAL_LOOP, expr, undefined, code_block));
                                } else {
                                    throw new Error("Expected expression");
                                }
                            } else {
                                throw new Error("Expected while");
                            }
                        }
                        break;
                    case "loop":
                        {
                            this.advance();
                            this.expect(LexerTokenType.LBRACE);
                            const code_block = this.code_block();
                            this.expect(LexerTokenType.RBRACE);
                            body.push(new ParserNode(ParserNodeType.LOOP, undefined, undefined, code_block));
                        }
                        break;
                    default:
                        {
                            const possible_variable_name = this.current.value;
                            this.advance();
                            if (this.current && this.current.id == LexerTokenType.ASSIGN) {
                                this.advance();
                                const expr = this.expression();
                                this.expect(LexerTokenType.END_OF_LINE);
                                if (expr) {
                                    body.push(new ParserNode(ParserNodeType.VARIABLE_ASSIGN, expr, undefined, possible_variable_name));
                                } else {
                                    throw new Error("Expected expression");
                                }
                            } else if (this.current && this.current.id == LexerTokenType.INCREASE) {
                                this.advance_expect(LexerTokenType.END_OF_LINE);
                                body.push(new ParserNode(ParserNodeType.VARIABLE_INCREASE, undefined, undefined, possible_variable_name));
                            } else if (this.current && this.current.id == LexerTokenType.DECREASE) {
                                this.advance_expect(LexerTokenType.END_OF_LINE);
                                body.push(new ParserNode(ParserNodeType.VARIABLE_DECREASE, undefined, undefined, possible_variable_name));
                            } else if (this.current && this.current.id == LexerTokenType.LBRACKET) {
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
                console.log(this.current);
                console.log(body);
                throw new Error("Expected ID");
            }
            this.advance();
        }
        throw new Error("Unexpected EOF");
    }
    global() {
        const global = new ParserNode(ParserNodeType.GLOBAL, undefined, undefined, []);
        while(this.current){
            switch(this.current.id){
                case LexerTokenType.ID:
                    {
                        if (datatypes.includes(this.current.value)) {
                            const dt = this.datatype(true);
                            if (this.current && this.current.id == LexerTokenType.END_OF_LINE) {
                                global.value.push(new ParserNode(ParserNodeType.VARIABLE_DECLARATION, undefined, undefined, dt));
                            } else {
                                this.expect(LexerTokenType.ASSIGN);
                                this.advance();
                                global.value.push(new ParserNode(ParserNodeType.VARIABLE_DECLARATION, this.expression(), undefined, dt));
                                this.expect(LexerTokenType.END_OF_LINE);
                            }
                        } else {
                            switch(this.current.value){
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
                                            const body = [
                                                new ParserNode(ParserNodeType.ASSEMBLY_CODE, undefined, undefined, this.current.value)
                                            ];
                                            this.advance_expect(LexerTokenType.RBRACE);
                                            global.value.push(new ParserNode(ParserNodeType.FUNCTION, undefined, undefined, new Function(name, attr, body, return_datatype, args)));
                                        } else {
                                            const body = this.code_block();
                                            global.value.push(new ParserNode(ParserNodeType.FUNCTION, undefined, undefined, new Function(name, attr, body, return_datatype, args)));
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
class Preprocessor {
    include_paths;
    included_files;
    constructor(include_paths){
        this.include_paths = include_paths;
        this.included_files = [];
    }
    try_read(file) {
        try {
            return Deno.readTextFileSync(file);
        } catch (_) {
            return undefined;
        }
    }
    preprocess(code) {
        const matches = code.match(/\$include ?<[\w/\.]*.\w*>/g);
        if (matches) {
            for(let i = 0; i < matches.length; i++){
                code = code.replace(matches[i], "");
                const inc = matches[i].split("<")[1].split(">")[0];
                let ncode = this.try_read(inc);
                for (const i of this.include_paths){
                    if (ncode) {
                        break;
                    }
                    ncode = this.try_read(i + inc);
                }
                if (ncode == undefined) {
                    throw new Error("Could not include " + inc);
                }
                if (!this.included_files.includes(inc)) {
                    this.included_files.push(inc);
                    code += "\n" + this.preprocess(ncode);
                }
            }
        }
        return code;
    }
}
class NamedVariable {
    datatype;
    val;
    constructor(datatype, val){
        this.datatype = datatype;
        this.val = val;
    }
    check(other) {
        return other.array == this.datatype.array && other.datatype == this.datatype.datatype;
    }
}
class UnnamedVariable {
    datatype;
    val;
    constructor(datatype, val){
        this.datatype = datatype;
        this.val = val;
    }
    check(other) {
        return other.array == this.datatype.array && other.datatype == this.datatype.datatype;
    }
}
class Memory {
    memory;
    bitmap;
    strings;
    allocations;
    constructor(){
        this.memory = new Uint32Array(1024);
        this.bitmap = new Uint32Array(1024 / 32);
        this.strings = [];
        this.allocations = [];
    }
    bitmapGet(idx) {
        return Boolean(this.bitmap[Math.floor(idx / 32)] & 1 << idx % 32);
    }
    bitmapeSet(idx, val) {
        if (val) {
            this.bitmap[Math.floor(idx / 32)] |= 1 << idx % 32;
        } else {
            this.bitmap[Math.floor(idx / 32)] &= ~(1 << idx % 32);
        }
    }
    bitmapeSetRange(idx, range, val) {
        for(let i = 0; i < range; i++){
            this.bitmapeSet(idx + i, val);
        }
    }
    bitmapeCheckRange(idx, range, expected) {
        for(let i = 0; i < range; i++){
            if (this.bitmapGet(idx + i) != expected) {
                return false;
            }
        }
        return true;
    }
    allocate(length) {
        for(let x = 0; x < this.memory.length; x++){
            if (this.bitmapGet(x)) {
                continue;
            }
            if (this.bitmapeCheckRange(x, length, false)) {
                this.bitmapeSetRange(x, length, true);
                this.allocations.push({
                    ptr: x,
                    size: length
                });
                return x;
            }
        }
        throw new Error("Out of memory!");
    }
    deallocate(ptr) {
        const allocation = this.allocations.findIndex((v)=>v ? v.ptr == ptr : false);
        if (allocation != -1) {
            this.bitmapeSetRange(this.allocations[allocation].ptr, this.allocations[allocation].size, false);
            this.allocations.splice(allocation, 1);
        } else {
            throw new Error("Invalid pointer!");
        }
    }
    arrayRead(ptr, offset) {
        return this.memory[ptr + offset];
    }
    arrayWrite(ptr, offset, val) {
        this.memory[ptr + offset] = val;
    }
    allocateString(input) {
        const tmp = this.strings.find((v)=>v.str == input);
        if (tmp) {
            return tmp.ptr;
        }
        const chars = input.split("");
        const ptr = this.allocate(chars.length + 1);
        for(let i = 0; i < chars.length; i++){
            this.memory[ptr + i] = chars[i].charCodeAt(0);
        }
        this.memory[ptr + chars.length + 1] = 0;
        this.strings.push({
            ptr: ptr,
            str: input
        });
        return ptr;
    }
}
class NativeFunction {
    name;
    f;
    constructor(name, f){
        this.name = name;
        this.f = f;
    }
}
class Interpreter {
    global;
    args;
    memory;
    native;
    global_context;
    constructor(global, args){
        this.global = global;
        this.args = args;
        this.memory = new Memory();
        this.native = [];
        this.global_context = [];
    }
    contextFind(name, context) {
        const tmp = context.find((val)=>val.datatype.name == name);
        if (tmp) {
            return tmp;
        } else {
            const tmp = this.global_context.find((val)=>val.datatype.name == name);
            if (tmp) {
                return tmp;
            } else {
                throw new Error("Could not find " + name);
            }
        }
    }
    interpretExpression(expression, context) {
        switch(expression.id){
            case ParserNodeType.NUMBER:
                return expression.value;
            case ParserNodeType.STRING:
                return this.memory.allocateString(expression.value);
            case ParserNodeType.ADD:
                return this.interpretExpression(expression.a, context) + this.interpretExpression(expression.b, context);
            case ParserNodeType.SUBSTRACT:
                return this.interpretExpression(expression.a, context) - this.interpretExpression(expression.b, context);
            case ParserNodeType.MULTIPLY:
                return this.interpretExpression(expression.a, context) * this.interpretExpression(expression.b, context);
            case ParserNodeType.DIVIDE:
                return Math.floor(this.interpretExpression(expression.a, context) / this.interpretExpression(expression.b, context));
            case ParserNodeType.MODULO:
                return this.interpretExpression(expression.a, context) % this.interpretExpression(expression.b, context);
            case ParserNodeType.OR:
                return this.interpretExpression(expression.a, context) | this.interpretExpression(expression.b, context);
            case ParserNodeType.AND:
                return this.interpretExpression(expression.a, context) & this.interpretExpression(expression.b, context);
            case ParserNodeType.XOR:
                return this.interpretExpression(expression.a, context) ^ this.interpretExpression(expression.b, context);
            case ParserNodeType.SHIFT_LEFT:
                return this.interpretExpression(expression.a, context) << this.interpretExpression(expression.b, context);
            case ParserNodeType.SHIFT_RIGHT:
                return this.interpretExpression(expression.a, context) >> this.interpretExpression(expression.b, context);
            case ParserNodeType.BIT_NOT:
                return ~this.interpretExpression(expression.a, context);
            case ParserNodeType.NOT:
                return !this.interpretExpression(expression.a, context) ? 1 : 0;
            case ParserNodeType.COMPARE:
                {
                    const a = this.interpretExpression(expression.a, context);
                    const b = this.interpretExpression(expression.b, context);
                    switch(expression.value){
                        case "more":
                            return a > b ? 1 : 0;
                        case "more_equals":
                            return a >= b ? 1 : 0;
                        case "less":
                            return a < b ? 1 : 0;
                        case "less_equals":
                            return a <= b ? 1 : 0;
                        case "equals":
                            return a == b ? 1 : 0;
                        case "not_equals":
                            return a != b ? 1 : 0;
                        default:
                            throw new Error("Unsupported " + expression.value);
                    }
                }
            case ParserNodeType.VARIABLE_LOOKUP_ARRAY:
                {
                    if (this.contextFind(expression.value, context).datatype.array) {
                        const ptr = this.contextFind(expression.value, context);
                        return this.memory.arrayRead(ptr.val, this.interpretExpression(expression.a, context));
                    } else {
                        return this.contextFind(expression.value, context).val & 1 << this.interpretExpression(expression.a, context);
                    }
                }
            case ParserNodeType.VARIABLE_LOOKUP:
                return this.contextFind(expression.value, context).val;
            case ParserNodeType.FUNCTION_CALL:
                {
                    const call = expression.value;
                    const nf = this.resolveFunction(call.name).value;
                    const args = [];
                    for(let j = 0; j < call._arguments.length; j++){
                        const res = this.interpretExpression(call._arguments[j], context);
                        args.push(new UnnamedVariable(new UnnamedDatatype(nf._arguments[j].datatype, nf._arguments[j].array), res));
                    }
                    const ret = this.callFunction(nf, args);
                    return ret?.val;
                }
            default:
                throw new Error("Unsupported " + expression.id);
        }
    }
    executeCodeBlock(f, block, context) {
        for(let i = 0; i < block.length; i++){
            switch(block[i].id){
                case ParserNodeType.FUNCTION_CALL:
                    {
                        const call = block[i].value;
                        const nf = this.resolveFunction(call.name).value;
                        const args = [];
                        for(let j = 0; j < call._arguments.length; j++){
                            const res = this.interpretExpression(call._arguments[j], context);
                            args.push(new UnnamedVariable(new UnnamedDatatype(nf._arguments[j].datatype, nf._arguments[j].array), res));
                        }
                        this.callFunction(nf, args);
                    }
                    break;
                case ParserNodeType.VARIABLE_DECLARATION:
                    if (context.find((val)=>val.datatype.name == block[i].value.name) != undefined) {
                        if (block[i].a) {
                            this.contextFind(block[i].value.name, context).val = this.interpretExpression(block[i].a, context);
                        }
                    } else {
                        if (block[i].a) {
                            context.push(new NamedVariable(block[i].value, this.interpretExpression(block[i].a, context)));
                        } else {
                            context.push(new NamedVariable(block[i].value, 0));
                        }
                    }
                    break;
                case ParserNodeType.VARIABLE_ASSIGN:
                    this.contextFind(block[i].value, context).val = this.interpretExpression(block[i].a, context);
                    break;
                case ParserNodeType.VARIABLE_ASSIGN_ARRAY:
                    if (this.contextFind(block[i].value, context).datatype.array) {
                        this.memory.arrayWrite(this.contextFind(block[i].value, context).val, this.interpretExpression(block[i].a, context), this.interpretExpression(block[i].b, context));
                    } else {
                        throw new Error("Bit index assignment not supported!");
                    }
                    break;
                case ParserNodeType.CONDITIONAL_LOOP:
                    while(this.interpretExpression(block[i].a, context)){
                        const res = this.executeCodeBlock(f, block[i].value, context);
                        if (res) {
                            return res;
                        }
                    }
                    break;
                case ParserNodeType.POST_CONDITIONAL_LOOP:
                    do {
                        const res = this.executeCodeBlock(f, block[i].value, context);
                        if (res) {
                            return res;
                        }
                    }while (this.interpretExpression(block[i].a, context))
                    break;
                case ParserNodeType.LOOP:
                    {
                        while(true){
                            const res = this.executeCodeBlock(f, block[i].value, context);
                            if (res) {
                                return res;
                            }
                        }
                    }
                case ParserNodeType.VARIABLE_INCREASE:
                    this.contextFind(block[i].value, context).val++;
                    break;
                case ParserNodeType.VARIABLE_DECREASE:
                    this.contextFind(block[i].value, context).val--;
                    break;
                case ParserNodeType.IF:
                    {
                        const iff = block[i].value;
                        if (this.interpretExpression(block[i].a, context) != 0) {
                            const res = this.executeCodeBlock(f, iff.true_block, context);
                            if (res) {
                                return res;
                            }
                        } else {
                            if (iff.false_block) {
                                const res = this.executeCodeBlock(f, iff.false_block, context);
                                if (res) {
                                    return res;
                                }
                            }
                        }
                    }
                    break;
                case ParserNodeType.RETURN:
                    {
                        if (block[i].a) {
                            const res = this.interpretExpression(block[i].a, context);
                            return new UnnamedVariable(new UnnamedDatatype(f.return_datatype.datatype, f.return_datatype.array), res);
                        } else {
                            return new UnnamedVariable(new UnnamedDatatype("void", false), undefined);
                        }
                    }
                default:
                    throw new Error("Unsupported " + block[i].id);
            }
        }
        return undefined;
    }
    callFunction(f, args) {
        for(let i = 0; i < f._arguments.length; i++){
            if (!args[i].check(f._arguments[i])) {
                throw new Error("Datatype mismatch!");
            }
        }
        if (f.attributes.includes("assembly")) {
            const __native = this.native.find((v)=>v.name == f.name);
            if (__native) {
                return __native.f(f, args);
            } else {
                throw new Error("Native function " + f.name + " not found!");
            }
        }
        const context = [];
        for(let i = 0; i < f._arguments.length; i++){
            context.push(new NamedVariable(f._arguments[i], args[i].val));
        }
        const ret = this.executeCodeBlock(f, f.body, context);
        if (f.attributes.includes("noreturn")) {
            throw new Error("Reached unreachable code!");
        }
        return ret;
    }
    resolveFunction(name) {
        for (const i of this.global.value){
            if (i.id == ParserNodeType.FUNCTION && i.value.name == name) {
                return i;
            }
        }
    }
    populateGlobalContext() {
        for (const i of this.global.value){
            if (i.id == ParserNodeType.VARIABLE_DECLARATION) {
                if (i.a) {
                    if (i.value.array) {
                        throw new Error("Global array inizializers not supported!");
                    }
                    if (i.a.id == ParserNodeType.STRING) {
                        this.global_context.push(new NamedVariable(i.value, this.memory.allocateString(i.a.value)));
                    } else if (i.a.id == ParserNodeType.NUMBER) {
                        this.global_context.push(new NamedVariable(i.value, i.a.value));
                    } else {
                        throw new Error("Only string and number are supported for globals!");
                    }
                } else {
                    this.global_context.push(new NamedVariable(i.value, undefined));
                }
            }
        }
    }
    execute() {
        this.populateGlobalContext();
        this.native.push(new NativeFunction("printc", (_f, args)=>{
            Deno.stdout.writeSync(new Uint8Array([
                args[0].val
            ]));
            return undefined;
        }));
        this.native.push(new NativeFunction("allocate", (_f, args)=>{
            return new UnnamedVariable(new UnnamedDatatype("int", false), this.memory.allocate(args[0].val));
        }));
        this.native.push(new NativeFunction("deallocate", (_f, args)=>{
            this.memory.deallocate(args[0].val);
            return undefined;
        }));
        const args = [];
        for(let i = 0; i < this.args.length; i++){
            args.push(new UnnamedVariable(new UnnamedDatatype("str", false), this.memory.allocateString(this.args[i])));
        }
        const argc = new UnnamedVariable(new UnnamedDatatype("int", false), args.length);
        const argv = new UnnamedVariable(new UnnamedDatatype("str", true), this.memory.allocate(args.length));
        for(let i = 0; i < this.args.length; i++){
            this.memory.arrayWrite(argv.val, i, args[i].val);
        }
        if (this.callFunction(this.resolveFunction("spark").value, [
            argc,
            argv
        ])?.val) {
            throw new Error("Non zero return code!");
        }
        this.memory.deallocate(argv.val);
    }
}
function dt_to_size(dt, array) {
    switch(dt){
        case "int":
            return 8;
        case "str":
            return 8;
        case "chr":
            return array ? 8 : 1;
        default:
            throw new Error("Could not get size for " + dt);
    }
}
class NamedVariable1 {
    datatype;
    constructor(datatype){
        this.datatype = datatype;
    }
    size() {
        return dt_to_size(this.datatype.datatype, this.datatype.array);
    }
}
class NamedVariablePtr extends NamedVariable1 {
    ptr;
    constructor(datatype, ptr){
        super(datatype);
        this.ptr = ptr;
    }
}
class StackContext {
    variables;
    local_labels;
    used_functions;
    ptr;
    constructor(){
        this.variables = [];
        this.local_labels = [];
        this.used_functions = [];
        this.ptr = 8;
    }
    use_function(name) {
        if (!this.used_functions.includes(name)) {
            this.used_functions.push(name);
        }
    }
    register(v) {
        if (this.variables.find((vr)=>vr.datatype.name == v.datatype.name)) {
            throw new Error("Already exists");
        }
        this.variables.push(new NamedVariablePtr(v.datatype, this.ptr));
        this.ptr += v.size();
    }
    label() {
        const label = `._${this.local_labels.length}`;
        this.local_labels.push(label);
        return label;
    }
    getPtr(name) {
        return this.variables.find((vr)=>vr.datatype.name == name)?.ptr;
    }
    getDatatype(name) {
        return this.variables.find((vr)=>vr.datatype.name == name)?.datatype.datatype;
    }
    get(name) {
        return this.variables.find((vr)=>vr.datatype.name == name);
    }
    align() {
        if (this.ptr % 16 != 0) {
            this.ptr += 1;
            this.align();
        }
    }
    generateBegin() {
        this.align();
        return "\tpush rbp\n\tmov rbp, rsp\n\tsub rsp, " + this.ptr + "\n";
    }
    generateEnd() {
        return "\tadd rsp, " + this.ptr + "\n\tpop rbp\n";
    }
}
class GlobalContext {
    global_labels;
    constructor(){
        this.global_labels = [];
    }
    label(val, datatype) {
        const label = `global_${this.global_labels.length}`;
        this.global_labels.push({
            val: val,
            name: new NamedDatatype(label, datatype, false)
        });
        return label;
    }
    namedLabel(val, datatype) {
        if (this.global_labels.find((v)=>v.name.name == datatype.name)) {
            throw new Error("Already exsists!");
        }
        this.global_labels.push({
            val: val,
            name: datatype
        });
    }
    getPtr(name) {
        return this.global_labels.find((vr)=>vr.name.name == name)?.name.name;
    }
    getDatatype(name) {
        return this.global_labels.find((vr)=>vr.name.name == name)?.name.datatype;
    }
    get(name) {
        return new NamedVariable1(this.global_labels.find((vr)=>vr.name.name == name)?.name);
    }
    generate() {
        let code = "[section .data]\n";
        for(let i = 0; i < this.global_labels.length; i++){
            switch(this.global_labels[i].name.datatype){
                case "str":
                    code += `${this.global_labels[i].name.name}: db "${this.global_labels[i].val?.replaceAll("\n", "\", 10, \"") || 0}", 0\n`;
                    break;
                case "int":
                    code += `${this.global_labels[i].name.name}: dq ${this.global_labels[i].val || 0}\n`;
                    break;
                default:
                    throw new Error("Unsupported");
            }
        }
        return code;
    }
}
class CompiledFunction {
    code;
    name;
    used_functions;
    keep;
    constructor(code, name, used_functions){
        this.code = code;
        this.name = name;
        this.used_functions = used_functions;
        this.keep = false;
    }
}
class X86_64_Linux {
    global;
    constructor(global){
        this.global = global;
    }
    registers = [
        "rax",
        "rbx",
        "rcx",
        "rdx",
        "rsi",
        "rdi",
        "r8",
        "r9",
        "r10",
        "r11",
        "r12",
        "r13",
        "r14",
        "r15"
    ];
    low_registers = [
        "al",
        "bl",
        "cl",
        "dl",
        "sil",
        "dil",
        "r8l",
        "r9l",
        "r10l",
        "r11l",
        "r12l",
        "r13l",
        "r14l",
        "r15l"
    ];
    toLowReg(input) {
        return this.low_registers[this.registers.indexOf(input)];
    }
    lookupContext(name, sc, gc) {
        if (sc.get(name)) {
            return sc;
        } else if (gc.get(name)) {
            return gc;
        } else {
            throw new Error(name + "not found!");
        }
    }
    resolveFunction(name) {
        for (const i of this.global.value){
            if (i.value.name == name) {
                return i;
            }
        }
    }
    generateArrayAccess(write, ptr, idx, reg, dt) {
        if (write) {
            switch(dt){
                case "int":
                    return `\tmov [${ptr} + ${dt_to_size(dt, false)} * ${idx}], ${reg}\n`;
                case "str":
                    return `\tmov [${ptr} + ${dt_to_size(dt, false)} * ${idx}], ${reg}\n`;
                case "chr":
                    return `\tmov [${ptr} + ${dt_to_size(dt, false)} * ${idx}], ${this.toLowReg(reg)}\n`;
                default:
                    throw new Error("Not supported!");
            }
        } else {
            switch(dt){
                case "int":
                    return `\tmov ${reg}, [${ptr} + ${dt_to_size(dt, false)} * ${idx}]\n`;
                case "str":
                    return `\tmov ${reg}, [${ptr} + ${dt_to_size(dt, false)} * ${idx}]\n`;
                case "chr":
                    return `\tmov ${this.toLowReg(reg)}, [${ptr} + ${dt_to_size(dt, false)} * ${idx}]\n\tand ${reg}, 0xff\n`;
                default:
                    throw new Error("Not supported!");
            }
        }
    }
    generateStackVariableAccess(write, ptr, reg, dt) {
        if (write) {
            switch(dt.datatype){
                case "int":
                    return `\tmov [rbp - ${ptr}], ${reg}\n`;
                case "str":
                    return `\tmov [rbp - ${ptr}], ${reg}\n`;
                case "chr":
                    if (dt.array) {
                        return `\tmov [rbp - ${ptr}], ${reg}\n`;
                    } else {
                        return `\tmov [rbp - ${ptr}], ${this.toLowReg(reg)}\n`;
                    }
                default:
                    throw new Error("Not supported!");
            }
        } else {
            switch(dt.datatype){
                case "int":
                    return `\tmov ${reg}, [rbp - ${ptr}]\n`;
                case "str":
                    return `\tmov ${reg}, [rbp - ${ptr}]\n`;
                case "chr":
                    if (dt.array) {
                        return `\tmov ${reg}, [rbp - ${ptr}]\n`;
                    } else {
                        return `\tmov ${this.toLowReg(reg)}, [rbp - ${ptr}]\n\tand ${reg}, 0xff\n`;
                    }
                default:
                    throw new Error("Not supported!");
            }
        }
    }
    generateGlobalVariableAccess(write, ptr, reg, dt) {
        if (write) {
            switch(dt.datatype){
                case "int":
                    return `\tmov [${ptr}], ${reg}\n`;
                case "chr":
                    if (dt.array) {
                        return `\tmov [${ptr}], ${reg}\n`;
                    } else {
                        return `\tmov [${ptr}], ${this.toLowReg(reg)}\n`;
                    }
                default:
                    throw new Error("Not supported!");
            }
        } else {
            switch(dt.datatype){
                case "int":
                    return `\tmov ${reg}, [${ptr}]\n`;
                case "chr":
                    if (dt.array) {
                        return `\tmov ${reg}, [${ptr}]\n`;
                    } else {
                        return `\tmov ${this.toLowReg(reg)}, [${ptr}]\n\tand ${reg}, 0xff\n`;
                    }
                default:
                    throw new Error("Not supported!");
            }
        }
    }
    datatypeToNasmSize(dt, array) {
        switch(dt){
            case "int":
                return "qword";
            case "str":
                return "qword";
            case "chr":
                return array ? "qword" : "byte";
            default:
                throw new Error("Not supported!");
        }
    }
    generateExpression(exp, gc, sc, target = this.registers[0]) {
        let code = "";
        const second_reg = this.registers[this.registers.indexOf(target) + 1];
        switch(exp.id){
            case ParserNodeType.NUMBER:
                code += `\tmov ${target}, ${exp.value}\n`;
                break;
            case ParserNodeType.STRING:
                code += `\tmov ${target}, ${gc.label(exp.value, "str")}\n`;
                break;
            case ParserNodeType.COMPARE:
                {
                    const third_reg = this.registers[this.registers.indexOf(target) + 2];
                    code += this.generateExpression(exp.a, gc, sc, target);
                    code += this.generateExpression(exp.b, gc, sc, second_reg);
                    switch(exp.value){
                        case "equals":
                            code += `\tcmp ${target}, ${second_reg}\n`;
                            code += `\tmov ${third_reg}, 1\n`;
                            code += `\tmov ${target}, 0\n`;
                            code += `\tcmove ${target}, ${third_reg}\n`;
                            break;
                        case "not_equals":
                            code += `\tcmp ${target}, ${second_reg}\n`;
                            code += `\tmov ${third_reg}, 1\n`;
                            code += `\tmov ${target}, 0\n`;
                            code += `\tcmovne ${target}, ${third_reg}\n`;
                            break;
                        case "less_equals":
                            code += `\tcmp ${target}, ${second_reg}\n`;
                            code += `\tmov ${third_reg}, 1\n`;
                            code += `\tmov ${target}, 0\n`;
                            code += `\tcmovle ${target}, ${third_reg}\n`;
                            break;
                        case "less":
                            code += `\tcmp ${target}, ${second_reg}\n`;
                            code += `\tmov ${third_reg}, 1\n`;
                            code += `\tmov ${target}, 0\n`;
                            code += `\tcmovl ${target}, ${third_reg}\n`;
                            break;
                        case "more":
                            code += `\tcmp ${target}, ${second_reg}\n`;
                            code += `\tmov ${third_reg}, 1\n`;
                            code += `\tmov ${target}, 0\n`;
                            code += `\tcmovg ${target}, ${third_reg}\n`;
                            break;
                        case "more_equals":
                            code += `\tcmp ${target}, ${second_reg}\n`;
                            code += `\tmov ${third_reg}, 1\n`;
                            code += `\tmov ${target}, 0\n`;
                            code += `\tcmovge ${target}, ${third_reg}\n`;
                            break;
                        default:
                            throw new Error("Unsupported " + exp.value);
                    }
                }
                break;
            case ParserNodeType.NOT:
                {
                    code += this.generateExpression(exp.a, gc, sc, target);
                    code += `\tcmp ${target}, 0\n`;
                    code += `\tmov ${second_reg}, 1\n`;
                    code += `\tmov ${target}, 0\n`;
                    code += `\tcmove ${target}, ${second_reg}\n`;
                }
                break;
            case ParserNodeType.ADD:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\tadd ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.SUBSTRACT:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\tsub ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.MULTIPLY:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\timul ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.DIVIDE:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                if (target != "rax") code += "\tpush rax\n";
                if (target != "rdx") code += "\tpush rdx\n";
                if (target != "rax") code += `\tmov rax, ${target}\n`;
                code += "\tcqo\n";
                code += `\tidiv ${second_reg}\n`;
                if (target != "rax") code += `\tmov ${target}, rax\n`;
                if (target != "rdx") code += "\tpop rdx\n";
                if (target != "rax") code += "\tpop rax\n";
                break;
            case ParserNodeType.MODULO:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                if (target != "rax") code += "\tpush rax\n";
                if (target != "rdx") code += "\tpush rdx\n";
                if (target != "rax") code += `\tmov rax, ${target}\n`;
                code += "\tcqo\n";
                code += `\tidiv ${second_reg}\n`;
                if (target != "rdx") code += `\tmov ${target}, rdx\n`;
                if (target != "rdx") code += "\tpop rdx\n";
                if (target != "rax") code += "\tpop rax\n";
                break;
            case ParserNodeType.OR:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\tor ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.AND:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\tand ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.XOR:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\txor ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.BIT_NOT:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += `\tnot ${target}\n`;
                break;
            case ParserNodeType.SHIFT_LEFT:
                {
                    code += this.generateExpression(exp.a, gc, sc, target);
                    code += this.generateExpression(exp.b, gc, sc, second_reg);
                    let third_reg = this.registers[this.registers.indexOf(target) + 2];
                    if (third_reg == "rcx") {
                        third_reg = "rdx";
                    }
                    if (target == "rcx") {
                        code += `\tmov ${third_reg}, ${target}\n`;
                        code += "\tpush rcx\n";
                        code += `\tmov rcx, ${second_reg}\n`;
                        code += `\tshl ${third_reg}, cl\n`;
                        code += "\tpop rcx\n";
                        code += `\tmov ${target}, ${third_reg}\n`;
                    } else {
                        code += "\tpush rcx\n";
                        code += `\tmov rcx, ${second_reg}\n`;
                        code += `\tshl ${target}, cl\n`;
                        code += "\tpop rcx\n";
                    }
                }
                break;
            case ParserNodeType.SHIFT_RIGHT:
                {
                    code += this.generateExpression(exp.a, gc, sc, target);
                    code += this.generateExpression(exp.b, gc, sc, second_reg);
                    let third_reg = this.registers[this.registers.indexOf(target) + 2];
                    if (third_reg == "rcx") {
                        third_reg = "rdx";
                    }
                    if (target == "rcx") {
                        code += `\tmov ${third_reg}, ${target}\n`;
                        code += "\tpush rcx\n";
                        code += `\tmov rcx, ${second_reg}\n`;
                        code += `\tshr ${third_reg}, cl\n`;
                        code += "\tpop rcx\n";
                        code += `\tmov ${target}, ${third_reg}\n`;
                    } else {
                        code += "\tpush rcx\n";
                        code += `\tmov rcx, ${second_reg}\n`;
                        code += `\tshr ${target}, cl\n`;
                        code += "\tpop rcx\n";
                    }
                }
                break;
            case ParserNodeType.FUNCTION_CALL:
                {
                    const fc = exp.value;
                    sc.use_function(fc.name);
                    for(let i = 0; i < this.registers.indexOf(target); i++){
                        code += `\tpush ${this.registers[i]}\n`;
                    }
                    for(let i = 0; i < fc._arguments.length; i++){
                        code += this.generateExpression(fc._arguments[i], gc, sc, this.registers[i]);
                    }
                    const f = this.resolveFunction(fc.name)?.value;
                    if (f) {
                        if (f._arguments.length != fc._arguments.length) {
                            throw new Error("To manny or not enough arguments!");
                        }
                    } else {
                        throw new Error("Function " + fc.name + " not found!");
                    }
                    code += `\tcall ${fc.name}\n`;
                    code += `\tmov ${target}, rax\n`;
                    for(let i = 0; i < this.registers.indexOf(target); i++){
                        code += `\tpop ${this.registers[this.registers.indexOf(target) - i - 1]}\n`;
                    }
                }
                break;
            case ParserNodeType.VARIABLE_LOOKUP:
                {
                    if (this.lookupContext(exp.value, sc, gc) == sc) {
                        code += this.generateStackVariableAccess(false, sc.getPtr(exp.value), target, sc.get(exp.value).datatype);
                    } else {
                        if (gc.getDatatype(exp.value) == "str") {
                            code += `\tmov ${target}, ${gc.getPtr(exp.value)}\n`;
                        } else {
                            code += this.generateGlobalVariableAccess(false, gc.getPtr(exp.value), target, gc.get(exp.value).datatype);
                        }
                    }
                }
                break;
            case ParserNodeType.VARIABLE_LOOKUP_ARRAY:
                {
                    code += this.generateExpression(exp.a, gc, sc, second_reg);
                    if (this.lookupContext(exp.value, sc, gc) == sc) {
                        code += `\tmov ${target}, [rbp - ${sc.getPtr(exp.value)}]\n`;
                        const nv = sc.get(exp.value);
                        if (!nv.datatype.array) {
                            let third_reg = this.registers[this.registers.indexOf(target) + 2];
                            if (third_reg == "rcx") {
                                third_reg = "rdx";
                            }
                            code += `\tmov ${third_reg}, 1\n`;
                            code += "\tpush rcx\n";
                            code += `\tmov rcx, ${second_reg}\n`;
                            code += `\tshl ${third_reg}, cl\n`;
                            code += "\tpop rcx\n";
                            code += `\tand ${target}, ${third_reg}\n`;
                        } else {
                            code += this.generateArrayAccess(false, target, second_reg, target, sc.getDatatype(exp.value));
                        }
                    } else {
                        code += `\tmov ${target}, [${gc.getPtr(exp.value)}]\n`;
                        const nv = gc.get(exp.value);
                        if (!nv.datatype.array) {
                            throw new Error("Bit indexing not supported here!");
                        } else {
                            code += this.generateArrayAccess(false, target, second_reg, target, gc.getDatatype(exp.value));
                        }
                    }
                }
                break;
            default:
                throw new Error("Unsupported " + exp.id);
        }
        return code;
    }
    generateCodeBlock(f, gc, sc, block) {
        let code = "";
        for(let i = 0; i < block.length; i++){
            switch(block[i].id){
                case ParserNodeType.VARIABLE_DECLARATION:
                    {
                        const d = block[i].value;
                        sc.register(new NamedVariable1(d));
                        if (block[i].a) {
                            code += this.generateExpression(block[i].a, gc, sc);
                            code += this.generateStackVariableAccess(true, sc.getPtr(d.name), "rax", d);
                        }
                    }
                    break;
                case ParserNodeType.VARIABLE_ASSIGN:
                    {
                        if (block[i].a) {
                            const ctx = this.lookupContext(block[i].value, sc, gc);
                            code += this.generateExpression(block[i].a, gc, sc);
                            if (ctx == sc) {
                                code += this.generateStackVariableAccess(true, sc.getPtr(block[i].value), "rax", sc.get(block[i].value).datatype);
                            } else {
                                code += this.generateGlobalVariableAccess(true, gc.getPtr(block[i].value), "rax", gc.get(block[i].value).datatype);
                            }
                        }
                    }
                    break;
                case ParserNodeType.VARIABLE_INCREASE:
                    {
                        const ctx = this.lookupContext(block[i].value, sc, gc);
                        if (ctx == sc) {
                            code += `\tinc ${this.datatypeToNasmSize(sc.getDatatype(block[i].value), sc.get(block[i].value).datatype.array)} [rbp - ${sc.getPtr(block[i].value)}]\n`;
                        } else {
                            code += `\tinc ${this.datatypeToNasmSize(gc.getDatatype(block[i].value), gc.get(block[i].value).datatype.array)} [${gc.getPtr(block[i].value)}]\n`;
                        }
                    }
                    break;
                case ParserNodeType.VARIABLE_DECREASE:
                    {
                        const ctx = this.lookupContext(block[i].value, sc, gc);
                        if (ctx == sc) {
                            code += `\tdec ${this.datatypeToNasmSize(sc.getDatatype(block[i].value), sc.get(block[i].value).datatype.array)} [rbp - ${sc.getPtr(block[i].value)}]\n`;
                        } else {
                            code += `\tdec ${this.datatypeToNasmSize(gc.getDatatype(block[i].value), gc.get(block[i].value).datatype.array)} [${gc.getPtr(block[i].value)}]\n`;
                        }
                    }
                    break;
                case ParserNodeType.VARIABLE_ASSIGN_ARRAY:
                    {
                        code += this.generateExpression(block[i].a, gc, sc, "rbx");
                        code += this.generateExpression(block[i].b, gc, sc, "rcx");
                        if (this.lookupContext(block[i].value, sc, gc) == sc) {
                            const nv = sc.get(block[i].value);
                            if (!nv.datatype.array) {
                                throw new Error("Bit assignment not supported");
                            }
                            code += `\tmov rax, [rbp - ${sc.getPtr(block[i].value)}]\n`;
                            code += this.generateArrayAccess(true, "rax", "rbx", "rcx", sc.getDatatype(block[i].value));
                        } else {
                            const nv = gc.get(block[i].value);
                            if (!nv.datatype.array) {
                                throw new Error("Bit assignment not supported");
                            }
                            code += `\tmov rax, [${gc.getPtr(block[i].value)}]\n`;
                            code += this.generateArrayAccess(true, "rax", "rbx", "rcx", gc.getDatatype(block[i].value));
                        }
                    }
                    break;
                case ParserNodeType.FUNCTION_CALL:
                    {
                        const fc = block[i].value;
                        sc.use_function(fc.name);
                        for(let i = 0; i < fc._arguments.length; i++){
                            code += this.generateExpression(fc._arguments[i], gc, sc, this.registers[i]);
                        }
                        const f = this.resolveFunction(fc.name)?.value;
                        if (f) {
                            if (f._arguments.length != fc._arguments.length) {
                                throw new Error("To manny or not enough arguments!");
                            }
                        } else {
                            throw new Error("Function " + fc.name + " not found!");
                        }
                        code += `\tcall ${fc.name}\n`;
                    }
                    break;
                case ParserNodeType.RETURN:
                    if (block[i].a) {
                        code += this.generateExpression(block[i].a, gc, sc);
                    }
                    code += "\tjmp .out\n";
                    break;
                case ParserNodeType.IF:
                    {
                        code += this.generateExpression(block[i].a, gc, sc);
                        const iff = block[i].value;
                        const label = sc.label();
                        if (iff.false_block) {
                            const label2 = sc.label();
                            code += "\tcmp rax, 0\n";
                            code += `\tjz ${label}\n`;
                            code += this.generateCodeBlock(f, gc, sc, iff.true_block);
                            code += `\tjmp ${label2}\n`;
                            code += label + ":\n";
                            code += this.generateCodeBlock(f, gc, sc, iff.false_block);
                            code += label2 + ":\n";
                        } else {
                            code += "\tcmp rax, 0\n";
                            code += `\tjz ${label}\n`;
                            code += this.generateCodeBlock(f, gc, sc, iff.true_block);
                            code += label + ":\n";
                        }
                    }
                    break;
                case ParserNodeType.CONDITIONAL_LOOP:
                    {
                        const loop_back_label = sc.label();
                        code += loop_back_label + ":\n";
                        code += this.generateExpression(block[i].a, gc, sc);
                        const loop_exit_label = sc.label();
                        code += "\tcmp rax, 0\n";
                        code += `\tjz ${loop_exit_label}\n`;
                        code += this.generateCodeBlock(f, gc, sc, block[i].value);
                        code += `\tjmp ${loop_back_label}\n`;
                        code += loop_exit_label + ":\n";
                    }
                    break;
                case ParserNodeType.POST_CONDITIONAL_LOOP:
                    {
                        const loop_back_label = sc.label();
                        code += loop_back_label + ":\n";
                        code += this.generateCodeBlock(f, gc, sc, block[i].value);
                        code += this.generateExpression(block[i].a, gc, sc);
                        code += "\tcmp rax, 0\n";
                        code += `\tjnz ${loop_back_label}\n`;
                    }
                    break;
                case ParserNodeType.LOOP:
                    {
                        const label = sc.label();
                        code += label + ":\n";
                        code += this.generateCodeBlock(f, gc, sc, block[i].value);
                        code += `\tjmp ${label}\n`;
                    }
                    break;
                default:
                    throw new Error("Unsupported " + block[i].id);
            }
        }
        return code;
    }
    generateFunction(f, gc) {
        const sc = new StackContext();
        let code = "";
        let precode = "";
        let aftercode = "";
        if (f.attributes.includes("global")) {
            precode += `[global ${f.name}]\n`;
        }
        if (f.attributes.includes("assembly")) {
            return {
                code: precode + f.name + ":\n" + code + f.body[0].value,
                sc
            };
        } else {
            if (f.attributes.includes("noreturn")) {
                aftercode += `\tcall unreachable\n`;
            } else {
                aftercode += `\tret\n`;
            }
            for(let i = 0; i < f._arguments.length; i++){
                sc.register(new NamedVariable1(f._arguments[i]));
                code += `\tmov [rbp - ${sc.getPtr(f._arguments[i].name)}], ${this.registers[i]}\n`;
            }
            code += this.generateCodeBlock(f, gc, sc, f.body);
        }
        return {
            code: precode + f.name + ":\n" + sc.generateBegin() + code + ".out:\n" + sc.generateEnd() + aftercode,
            sc
        };
    }
    keepFunction(functions, name) {
        const f = functions.find((v)=>v.name == name);
        if (f.keep) {
            return;
        }
        f.keep = true;
        for(let i = 0; i < f.used_functions.length; i++){
            this.keepFunction(functions, f.used_functions[i]);
        }
    }
    generate() {
        const tmp = this.global.value;
        const gc = new GlobalContext();
        let code = "[bits 64]\n";
        code += "[section .text]\n";
        let functions = [];
        for(let i = 0; i < tmp.length; i++){
            switch(tmp[i].id){
                case ParserNodeType.FUNCTION:
                    {
                        const { code , sc  } = this.generateFunction(tmp[i].value, gc);
                        functions.push(new CompiledFunction(code, tmp[i].value.name, sc.used_functions));
                    }
                    break;
                case ParserNodeType.VARIABLE_DECLARATION:
                    if (tmp[i].a) {
                        if (tmp[i].value.array) {
                            throw new Error("Global array inizializers not supported!");
                        }
                        if (tmp[i].a?.id == ParserNodeType.STRING || tmp[i].a?.id == ParserNodeType.NUMBER) {
                            gc.namedLabel(tmp[i].a?.value, tmp[i].value);
                        } else {
                            throw new Error("Only string and number are supported for globals!");
                        }
                    } else {
                        gc.namedLabel(undefined, tmp[i].value);
                    }
                    break;
                default:
                    throw new Error("Unsupported " + tmp[i].id);
            }
        }
        for(let i = 0; i < tmp.length; i++){
            switch(tmp[i].id){
                case ParserNodeType.FUNCTION:
                    {
                        if (tmp[i].value.attributes.includes("keep")) {
                            this.keepFunction(functions, tmp[i].value.name);
                        }
                    }
                    break;
            }
        }
        if (functions.find((v)=>v.name == "spark")) {
            this.keepFunction(functions, "spark");
        }
        for(let i = 0; i < functions.length; i++){
            if (functions[i].keep) {
                code += functions[i].code;
            } else {
                console.log("Removing unused function " + functions[i].name);
            }
        }
        code += gc.generate();
        return code;
    }
}
function compile(code) {
    const preprocessor = new Preprocessor([
        "stdlib/"
    ]);
    code = preprocessor.preprocess(code);
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const global = parser.global();
    const target = new X86_64_Linux(global);
    const generated = target.generate();
    return generated;
}
function execute(code, args) {
    const preprocessor = new Preprocessor([
        "stdlib/"
    ]);
    code = preprocessor.preprocess(code);
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const global = parser.global();
    const interpreter = new Interpreter(global, args);
    interpreter.execute();
    console.log(interpreter.memory);
    console.log("=== DETECTED LEAKS ===");
    for(let i = 0; i < interpreter.memory.allocations.length; i++){
        if (!interpreter.memory.strings.find((v)=>v.ptr == interpreter.memory.allocations[i].ptr)) {
            console.log("Leak at: " + interpreter.memory.allocations[i].ptr + " with size " + interpreter.memory.allocations[i].size);
        }
    }
}
export { compile as compile };
export { execute as execute };

