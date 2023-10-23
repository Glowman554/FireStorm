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
function findErrorLine(code, index) {
    const lines = code.split('\n');
    let totalChars = 0;
    for(let i = 0; i < lines.length; i++){
        const lineLength = lines[i].length;
        totalChars += lineLength;
        if (totalChars >= index) {
            const lineIndex = i + 1;
            const charInLine = index - (totalChars - lineLength);
            return {
                line: lineIndex,
                char: charInLine
            };
        }
        totalChars++;
    }
    throw new Error("what");
}
function findErrorLineFile(code, index) {
    const line = findErrorLine(code, index);
    const lines = code.split("\n");
    const fileStack = [
        {
            base_offset: 0,
            name: undefined
        }
    ];
    for(let i = 0; i < line.line; i++){
        if (lines[i].startsWith("//@file")) {
            fileStack.push({
                base_offset: i + 1,
                name: lines[i].substring(8)
            });
        } else if (lines[i].startsWith("//@endfile")) {
            fileStack.pop();
        }
    }
    return {
        file: fileStack[fileStack.length - 1].name,
        line: line.line - fileStack[fileStack.length - 1].base_offset,
        char: line.char,
        lineStr: lines[line.line - 1]
    };
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
    code;
    codeFile;
    constructor(tokens, code, codeFile){
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
    }
    reverse() {
        this.pos--;
        this.current = this.tokens[this.pos];
    }
    error(message, pos, suppressErrorMessages = false) {
        if (!suppressErrorMessages) {
            if (pos) {
                const line = findErrorLineFile(this.code, pos);
                if (line.file == undefined) {
                    line.file = this.codeFile;
                }
                const encoder = new TextEncoder();
                Deno.stdout.writeSync(encoder.encode(`error: ${message} (at ${line.file}:${line.line}:${line.char})\n`));
                Deno.stdout.writeSync(encoder.encode(line.lineStr.replaceAll("\t", " ") + "\n"));
                for(let j = 0; j < line.char; j++){
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
    expect(type) {
        if (!(this.current && this.current.id == type)) {
            this.error("Expected " + type + " but was " + (this.current ? this.current.id : "EOF"), this.current?.pos);
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
            this.error("Unexpected " + (this.current ? this.current.id : "EOF"), this.current?.pos);
        }
    }
    datatype(named, try_datatype = false) {
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
                this.error("Expected datatype", this.current?.pos, try_datatype);
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
                this.error("Expected datatype", this.current?.pos, try_datatype);
            }
        }
    }
    try_datatype(named) {
        const begin = this.pos;
        try {
            return this.datatype(named, true);
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
                            this.error("Expected expression", this.current.pos);
                        }
                        args.push(expr);
                        if (this.comma_or_rparen()) {
                            return new ParserNode(ParserNodeType.FUNCTION_CALL, undefined, undefined, new FunctionCall(token.value, args));
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
                this.error("Invalid power", this.current?.pos);
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
                this.error("Invalid term", this.current.pos);
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
                this.error("Invalid compare", this.current.pos);
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
                this.error("Invalid expression", this.current.pos);
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
                    this.error("Unexpected attribute " + this.current.value, this.current.pos);
                }
            }
            this.error("Unexpected EOF", undefined);
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
        this.error("Unexpected EOF", undefined);
    }
    parse_if() {
        this.advance();
        const expr = this.expression();
        this.expect(LexerTokenType.LBRACE);
        if (expr) {
            const code_block = this.code_block();
            this.expect(LexerTokenType.RBRACE);
            this.advance();
            if (this.current && this.current.id == LexerTokenType.ID) {
                if (this.current.value == "else") {
                    this.advance();
                    if (this.current.id == LexerTokenType.ID) {
                        if (this.current.value == "if") {
                            const else_code_block = this.parse_if();
                            this.expect(LexerTokenType.RBRACE);
                            return new ParserNode(ParserNodeType.IF, expr, undefined, new If(code_block, [
                                else_code_block
                            ]));
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
    keyword() {
        if (!this.current) {
            this.error("Unexpected EOF", undefined);
        }
        switch(this.current.value){
            case "return":
                {
                    this.advance();
                    const ret = [
                        new ParserNode(ParserNodeType.RETURN, this.expression(), undefined, undefined)
                    ];
                    this.expect(LexerTokenType.END_OF_LINE);
                    return ret;
                }
            case "for":
                {
                    const for_body = [];
                    this.advance();
                    for_body.push(this.code_line());
                    this.expect(LexerTokenType.END_OF_LINE);
                    this.advance();
                    const expr = this.expression();
                    this.expect(LexerTokenType.END_OF_LINE);
                    this.advance();
                    if (expr) {
                        const update = this.code_line();
                        for_body.push(new ParserNode(ParserNodeType.CONDITIONAL_LOOP, expr, undefined, [
                            ...this.code_block(),
                            update
                        ]));
                        this.expect(LexerTokenType.RBRACE);
                        return for_body;
                    } else {
                        this.error("Expected expressions", this.current?.pos);
                        break;
                    }
                }
            case "if":
                return [
                    this.parse_if()
                ];
            case "while":
                {
                    this.advance();
                    const expr = this.expression();
                    this.expect(LexerTokenType.LBRACE);
                    if (expr) {
                        const code_block = this.code_block();
                        this.expect(LexerTokenType.RBRACE);
                        return [
                            new ParserNode(ParserNodeType.CONDITIONAL_LOOP, expr, undefined, code_block)
                        ];
                    } else {
                        this.error("Expected expressions", this.current?.pos);
                        break;
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
                            return [
                                new ParserNode(ParserNodeType.POST_CONDITIONAL_LOOP, expr, undefined, code_block)
                            ];
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
                    return [
                        new ParserNode(ParserNodeType.LOOP, undefined, undefined, code_block)
                    ];
                }
            default:
                return undefined;
        }
    }
    code_line() {
        if (!this.current) {
            this.error("Unexpected EOF", undefined);
        }
        const dt = this.try_datatype(true);
        if (dt) {
            if (this.current && this.current.id == LexerTokenType.END_OF_LINE) {
                return new ParserNode(ParserNodeType.VARIABLE_DECLARATION, undefined, undefined, dt);
            } else {
                this.expect(LexerTokenType.ASSIGN);
                this.advance();
                return new ParserNode(ParserNodeType.VARIABLE_DECLARATION, this.expression(), undefined, dt);
            }
        } else if (this.current.id == LexerTokenType.ID) {
            const possible_variable_name = this.current.value;
            this.advance();
            if (this.current && this.current.id == LexerTokenType.ASSIGN) {
                this.advance();
                const expr = this.expression();
                if (expr) {
                    return new ParserNode(ParserNodeType.VARIABLE_ASSIGN, expr, undefined, possible_variable_name);
                } else {
                    this.error("Expected expressions", this.current.pos);
                }
            } else if (this.current && this.current.id == LexerTokenType.INCREASE) {
                this.advance();
                return new ParserNode(ParserNodeType.VARIABLE_INCREASE, undefined, undefined, possible_variable_name);
            } else if (this.current && this.current.id == LexerTokenType.DECREASE) {
                this.advance();
                return new ParserNode(ParserNodeType.VARIABLE_DECREASE, undefined, undefined, possible_variable_name);
            } else if (this.current && this.current.id == LexerTokenType.LBRACKET) {
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
    code_block() {
        let body = [];
        this.expect(LexerTokenType.LBRACE);
        this.advance();
        while(this.current){
            if (this.current.id == LexerTokenType.RBRACE) {
                return body;
            } else {
                const keyword = this.keyword();
                if (keyword) {
                    body = [
                        ...body,
                        ...keyword
                    ];
                } else {
                    body.push(this.code_line());
                    this.expect(LexerTokenType.END_OF_LINE);
                }
            }
            this.advance();
        }
        this.error("Unexpected EOF", undefined);
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
    preprocessIncludes(code) {
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
                    code += "\n//@file " + inc;
                    code += "\n" + this.preprocessIncludes(ncode);
                    code += "\n//@endfile";
                }
            }
        }
        return code;
    }
    preprocessDefines(code) {
        const matches = code.match(/\$define ([^ ]*) (.*)/g);
        const defines = [];
        if (matches) {
            for(let i = 0; i < matches.length; i++){
                code = code.replace(matches[i], "");
                const defineSplit = matches[i].split(" ");
                defineSplit.shift();
                const defineName = defineSplit.shift();
                const defineValue = defineSplit.join(" ");
                defines.push({
                    name: defineName,
                    value: defineValue
                });
            }
        }
        for (const define of defines){
            code = code.replaceAll(define.name, define.value);
        }
        return code;
    }
    preprocess(code) {
        code = this.preprocessIncludes(code);
        code = this.preprocessDefines(code);
        return code;
    }
}
async function runCommand(command) {
    console.log("cmd: " + command);
    const proc = Deno.run({
        cmd: command.split(" "),
        stderr: "inherit",
        stdout: "inherit"
    });
    const status = await proc.status();
    proc.close();
    if (!status.success) {
        throw new Error("Could not execute: " + command);
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
class NamedVariable {
    datatype;
    constructor(datatype){
        this.datatype = datatype;
    }
    size() {
        return dt_to_size(this.datatype.datatype, this.datatype.array);
    }
}
class NamedVariablePtr extends NamedVariable {
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
    name;
    constructor(name){
        this.variables = [];
        this.local_labels = [];
        this.used_functions = [];
        this.ptr = 8;
        this.name = name;
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
        this.ptr += 8;
    }
    label() {
        const label = `${this.name}_${this.local_labels.length}`;
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
        return "\taddi sp, sp, -" + this.ptr + "\n\tsd ra, (sp)\n";
    }
    generateEnd() {
        return "\tld ra, (sp)\n\taddi sp, sp, " + this.ptr + "\n";
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
        const dt = this.global_labels.find((vr)=>vr.name.name == name)?.name;
        if (dt) {
            return new NamedVariable(dt);
        } else {
            return undefined;
        }
    }
    generate() {
        let code = ".data\n";
        for(let i = 0; i < this.global_labels.length; i++){
            switch(this.global_labels[i].name.datatype){
                case "str":
                    code += `${this.global_labels[i].name.name}: .string "${this.global_labels[i].val}"\n`;
                    break;
                case "int":
                case "chr":
                    code += `${this.global_labels[i].name.name}: .quad ${this.global_labels[i].val || 0}\n`;
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
class RISCV64_Linux {
    global;
    constructor(global){
        this.global = global;
    }
    registers = [
        "x5",
        "x6",
        "x7",
        "x8",
        "x9",
        "x10",
        "x11",
        "x12",
        "x13",
        "x14",
        "x15",
        "x16",
        "x17",
        "x18"
    ];
    lookupContext(name, sc, gc) {
        if (sc.get(name)) {
            return sc;
        } else if (gc.get(name)) {
            return gc;
        } else {
            throw new Error(name + " not found!");
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
                    return `\tli x30, ${dt_to_size(dt, false)}\n\tmul x31, ${idx}, x30\n\tadd x31, x31, ${ptr}\n\tsd ${reg}, (x31)\n`;
                case "str":
                    return `\tli x30, ${dt_to_size(dt, false)}\n\tmul x31, ${idx}, x30\n\tadd x31, x31, ${ptr}\n\tsd ${reg}, (x31)\n`;
                case "chr":
                    return `\tli x30, ${dt_to_size(dt, false)}\n\tmul x31, ${idx}, x30\n\tadd x31, x31, ${ptr}\n\tsb ${reg}, (x31)\n`;
                default:
                    throw new Error("Not supported!");
            }
        } else {
            switch(dt){
                case "int":
                    return `\tli x30, ${dt_to_size(dt, false)}\n\tmul x31, ${idx}, x30\n\tadd x31, x31, ${ptr}\n\tld ${reg}, (x31)\n`;
                case "str":
                    return `\tli x30, ${dt_to_size(dt, false)}\n\tmul x31, ${idx}, x30\n\tadd x31, x31, ${ptr}\n\tld ${reg}, (x31)\n`;
                case "chr":
                    return `\tli x30, ${dt_to_size(dt, false)}\n\tmul x31, ${idx}, x30\n\tadd x31, x31, ${ptr}\n\tlb ${reg}, (x31)\n`;
                default:
                    throw new Error("Not supported!");
            }
        }
    }
    generateStackVariableAccess(write, ptr, reg, dt) {
        if (write) {
            switch(dt.datatype){
                case "int":
                    return `\tsd ${reg}, ${ptr}(sp)\n`;
                case "str":
                    return `\tsd ${reg}, ${ptr}(sp)\n`;
                case "chr":
                    if (dt.array) {
                        return `\tsd ${reg}, ${ptr}(sp)\n`;
                    } else {
                        return `\tsb ${reg}, ${ptr}(sp)\n`;
                    }
                default:
                    throw new Error("Not supported!");
            }
        } else {
            switch(dt.datatype){
                case "int":
                    return `\tld ${reg}, ${ptr}(sp)\n`;
                case "str":
                    return `\tld ${reg}, ${ptr}(sp)\n`;
                case "chr":
                    if (dt.array) {
                        return `\tld ${reg}, ${ptr}(sp)\n`;
                    } else {
                        return `\tlb ${reg}, ${ptr}(sp)\n`;
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
                    return `\tla x31, ${ptr}\n\tsd ${reg}, (x31)\n`;
                case "chr":
                    if (dt.array) {
                        return `\tla x31, ${ptr}\n\tsd ${reg}, (x31)\n`;
                    } else {
                        return `\tla x31, ${ptr}\n\tsb ${reg}, (x31)\n`;
                    }
                default:
                    throw new Error("Not supported!");
            }
        } else {
            switch(dt.datatype){
                case "int":
                    return `\tla x31, ${ptr}\n\tld ${reg}, (x31)\n`;
                case "chr":
                    if (dt.array) {
                        return `\tla x31, ${ptr}\n\tld ${reg}, (x31)\n`;
                    } else {
                        return `\tla x31, ${ptr}\n\tlb ${reg}, (x31)\n`;
                    }
                default:
                    throw new Error("Not supported!");
            }
        }
    }
    generateExpression(exp, gc, sc, target = this.registers[0]) {
        let code = "";
        const second_reg = this.registers[this.registers.indexOf(target) + 1];
        switch(exp.id){
            case ParserNodeType.NUMBER:
                code += `\tli ${target}, ${exp.value}\n`;
                break;
            case ParserNodeType.STRING:
                code += `\tla ${target}, ${gc.label(exp.value, "str")}\n`;
                break;
            case ParserNodeType.COMPARE:
                {
                    const third_reg = this.registers[this.registers.indexOf(target) + 2];
                    code += this.generateExpression(exp.a, gc, sc, target);
                    code += this.generateExpression(exp.b, gc, sc, second_reg);
                    const label = sc.label();
                    switch(exp.value){
                        case "equals":
                            code += `\tli ${third_reg}, 1\n`;
                            code += `\tbeq ${target}, ${second_reg}, ${label}\n`;
                            code += `\tli ${third_reg}, 0\n`;
                            code += `${label}:\n`;
                            code += `\tmv ${target}, ${third_reg}\n`;
                            break;
                        case "not_equals":
                            code += `\tli ${third_reg}, 1\n`;
                            code += `\tbne ${target}, ${second_reg}, ${label}\n`;
                            code += `\tli ${third_reg}, 0\n`;
                            code += `${label}:\n`;
                            code += `\tmv ${target}, ${third_reg}\n`;
                            break;
                        case "less_equals":
                            code += `\tli ${third_reg}, 1\n`;
                            code += `\tble ${target}, ${second_reg}, ${label}\n`;
                            code += `\tli ${third_reg}, 0\n`;
                            code += `${label}:\n`;
                            code += `\tmv ${target}, ${third_reg}\n`;
                            break;
                        case "less":
                            code += `\tli ${third_reg}, 1\n`;
                            code += `\tblt ${target}, ${second_reg}, ${label}\n`;
                            code += `\tli ${third_reg}, 0\n`;
                            code += `${label}:\n`;
                            code += `\tmv ${target}, ${third_reg}\n`;
                            break;
                        case "more":
                            code += `\tli ${third_reg}, 1\n`;
                            code += `\tbgt ${target}, ${second_reg}, ${label}\n`;
                            code += `\tli ${third_reg}, 0\n`;
                            code += `${label}:\n`;
                            code += `\tmv ${target}, ${third_reg}\n`;
                            break;
                        case "more_equals":
                            code += `\tli ${third_reg}, 1\n`;
                            code += `\tbge ${target}, ${second_reg}, ${label}\n`;
                            code += `\tli ${third_reg}, 0\n`;
                            code += `${label}:\n`;
                            code += `\tmv ${target}, ${third_reg}\n`;
                            break;
                        default:
                            throw new Error("Unsupported " + exp.value);
                    }
                }
                break;
            case ParserNodeType.NOT:
                {
                    const label = sc.label();
                    code += this.generateExpression(exp.a, gc, sc, target);
                    code += `\tli ${second_reg}, 1\n`;
                    code += `\tbeqz ${target}, ${label}\n`;
                    code += `\tli ${second_reg}, 0\n`;
                    code += `${label}:\n`;
                    code += `\tmv ${target}, ${second_reg}\n`;
                }
                break;
            case ParserNodeType.ADD:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\tadd ${target}, ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.SUBSTRACT:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\tsub ${target}, ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.MULTIPLY:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\tmul ${target}, ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.DIVIDE:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\tdiv ${target}, ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.MODULO:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\trem ${target}, ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.OR:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\tor ${target}, ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.AND:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\tand ${target}, ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.XOR:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += this.generateExpression(exp.b, gc, sc, second_reg);
                code += `\txor ${target}, ${target}, ${second_reg}\n`;
                break;
            case ParserNodeType.BIT_NOT:
                code += this.generateExpression(exp.a, gc, sc, target);
                code += `\tnot ${target}, ${target}\n`;
                break;
            case ParserNodeType.SHIFT_LEFT:
                {
                    code += this.generateExpression(exp.a, gc, sc, target);
                    code += this.generateExpression(exp.b, gc, sc, second_reg);
                    code += `\tsll ${target}, ${target}, ${second_reg}\n`;
                }
                break;
            case ParserNodeType.SHIFT_RIGHT:
                {
                    code += this.generateExpression(exp.a, gc, sc, target);
                    code += this.generateExpression(exp.b, gc, sc, second_reg);
                    code += `\srl ${target}, ${target}, ${second_reg}\n`;
                }
                break;
            case ParserNodeType.FUNCTION_CALL:
                {
                    const fc = exp.value;
                    sc.use_function(fc.name);
                    code += `\taddi x31, sp, -${this.registers.indexOf(target) * 8}\n`;
                    for(let i = 0; i < this.registers.indexOf(target); i++){
                        code += `\tsd ${this.registers[i]}, ${i * 8}(x31)\n`;
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
                    code += `\taddi sp, sp, -${this.registers.indexOf(target) * 8}\n`;
                    code += `\tcall ${fc.name}\n`;
                    code += `\tmv ${target}, x5\n`;
                    for(let i = 0; i < this.registers.indexOf(target); i++){
                        code += `\tld ${this.registers[i]}, ${i * 8}(sp)\n`;
                    }
                    code += `\taddi sp, sp, ${this.registers.indexOf(target) * 8}\n`;
                }
                break;
            case ParserNodeType.VARIABLE_LOOKUP:
                {
                    if (this.lookupContext(exp.value, sc, gc) == sc) {
                        code += this.generateStackVariableAccess(false, sc.getPtr(exp.value), target, sc.get(exp.value).datatype);
                    } else {
                        if (gc.getDatatype(exp.value) == "str") {
                            code += `\tla ${target}, ${gc.getPtr(exp.value)}\n`;
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
                        code += `\tld ${target}, ${sc.getPtr(exp.value)}(sp)\n`;
                        const nv = sc.get(exp.value);
                        if (!nv.datatype.array) {
                            const third_reg = this.registers[this.registers.indexOf(target) + 2];
                            code += `\tli ${third_reg}, 1\n`;
                            code += `\tsll ${third_reg}, ${third_reg}, ${second_reg}\n`;
                            code += `\tand ${target}, ${target}, ${third_reg}\n`;
                        } else {
                            code += this.generateArrayAccess(false, target, second_reg, target, sc.getDatatype(exp.value));
                        }
                    } else {
                        code += `\tla x31, ${gc.getPtr(exp.value)}\n\tld ${target}, (x31)\n`;
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
                        sc.register(new NamedVariable(d));
                        if (block[i].a) {
                            code += this.generateExpression(block[i].a, gc, sc);
                            code += this.generateStackVariableAccess(true, sc.getPtr(d.name), "x5", d);
                        }
                    }
                    break;
                case ParserNodeType.VARIABLE_ASSIGN:
                    {
                        if (block[i].a) {
                            const ctx = this.lookupContext(block[i].value, sc, gc);
                            code += this.generateExpression(block[i].a, gc, sc);
                            if (ctx == sc) {
                                code += this.generateStackVariableAccess(true, sc.getPtr(block[i].value), "x5", sc.get(block[i].value).datatype);
                            } else {
                                code += this.generateGlobalVariableAccess(true, gc.getPtr(block[i].value), "x5", gc.get(block[i].value).datatype);
                            }
                        }
                    }
                    break;
                case ParserNodeType.VARIABLE_INCREASE:
                    {
                        const ctx = this.lookupContext(block[i].value, sc, gc);
                        if (ctx == sc) {
                            code += `\tld x31, ${sc.getPtr(block[i].value)}(sp)\n`;
                            code += `\taddi x31, x31, 1\n`;
                            code += `\tsd x31, ${sc.getPtr(block[i].value)}(sp)\n`;
                        } else {
                            throw new Error("No");
                        }
                    }
                    break;
                case ParserNodeType.VARIABLE_DECREASE:
                    {
                        const ctx = this.lookupContext(block[i].value, sc, gc);
                        if (ctx == sc) {
                            code += `\tld x31, ${sc.getPtr(block[i].value)}(sp)\n`;
                            code += `\taddi x31, x31, -1\n`;
                            code += `\tsd x31, ${sc.getPtr(block[i].value)}(sp)\n`;
                        } else {
                            throw new Error("No");
                        }
                    }
                    break;
                case ParserNodeType.VARIABLE_ASSIGN_ARRAY:
                    {
                        code += this.generateExpression(block[i].a, gc, sc, "x6");
                        code += this.generateExpression(block[i].b, gc, sc, "x7");
                        if (this.lookupContext(block[i].value, sc, gc) == sc) {
                            const nv = sc.get(block[i].value);
                            if (!nv.datatype.array) {
                                throw new Error("Bit assignment not supported");
                            }
                            code += `\tld x5, ${sc.getPtr(block[i].value)}(sp)\n`;
                            code += this.generateArrayAccess(true, "x5", "x6", "x7", sc.getDatatype(block[i].value));
                        } else {
                            const nv = gc.get(block[i].value);
                            if (!nv) {
                                throw new Error("Could not find " + block[i].value);
                            }
                            if (!nv.datatype.array) {
                                throw new Error("Bit assignment not supported");
                            }
                            code += `\tla x31, ${gc.getPtr(block[i].value)}\nld x5, (x31)\n`;
                            code += this.generateArrayAccess(true, "x5", "x6", "x7", gc.getDatatype(block[i].value));
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
                    code += "\tj " + sc.name + "_out\n";
                    break;
                case ParserNodeType.IF:
                    {
                        code += this.generateExpression(block[i].a, gc, sc);
                        const iff = block[i].value;
                        const label = sc.label();
                        if (iff.false_block) {
                            const label2 = sc.label();
                            code += `\tbeqz x5, ${label}\n`;
                            code += this.generateCodeBlock(f, gc, sc, iff.true_block);
                            code += `\tj ${label2}\n`;
                            code += label + ":\n";
                            code += this.generateCodeBlock(f, gc, sc, iff.false_block);
                            code += label2 + ":\n";
                        } else {
                            code += `\tbeqz x5, ${label}\n`;
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
                        code += `\tbeqz x5, ${loop_exit_label}\n`;
                        code += this.generateCodeBlock(f, gc, sc, block[i].value);
                        code += `\tj ${loop_back_label}\n`;
                        code += loop_exit_label + ":\n";
                    }
                    break;
                case ParserNodeType.POST_CONDITIONAL_LOOP:
                    {
                        const loop_back_label = sc.label();
                        code += loop_back_label + ":\n";
                        code += this.generateCodeBlock(f, gc, sc, block[i].value);
                        code += this.generateExpression(block[i].a, gc, sc);
                        code += `\tbnez x5, ${loop_back_label}\n`;
                    }
                    break;
                case ParserNodeType.LOOP:
                    {
                        const label = sc.label();
                        code += label + ":\n";
                        code += this.generateCodeBlock(f, gc, sc, block[i].value);
                        code += `\tj ${label}\n`;
                    }
                    break;
                default:
                    throw new Error("Unsupported " + block[i].id);
            }
        }
        return code;
    }
    generateFunction(f, gc) {
        const sc = new StackContext(f.name);
        let code = "";
        let precode = "";
        let aftercode = "";
        if (f.attributes.includes("global")) {
            precode += `.global ${f.name}\n`;
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
                sc.register(new NamedVariable(f._arguments[i]));
                code += `\tsd ${this.registers[i]}, ${sc.getPtr(f._arguments[i].name)}(sp)\n`;
            }
            code += this.generateCodeBlock(f, gc, sc, f.body);
        }
        return {
            code: precode + f.name + ":\n" + sc.generateBegin() + code + f.name + "_out:\n" + sc.generateEnd() + aftercode,
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
        let code = ".text\n";
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
    async compile(mode, output, generated) {
        switch(mode){
            case "asm":
                Deno.writeTextFileSync(output, generated);
                break;
            case "o":
                Deno.writeTextFileSync(output + ".S", generated);
                await runCommand(`riscv64-linux-gnu-as ${output + ".S"} -o ${output} -g`);
                break;
            case "elf":
                Deno.writeTextFileSync(output + ".S", generated);
                await runCommand(`riscv64-linux-gnu-as ${output + ".S"} -o ${output + ".o"} -g`);
                await runCommand(`riscv64-linux-gnu-gcc ${output + ".o"} -o ${output} --static -fno-pie -g`);
                break;
            default:
                throw new Error("Mode " + mode + " not found!");
        }
    }
}
class BYTECODE_Writer {
    output;
    constructor(file){
        this.output = Deno.openSync(file, {
            create: true,
            write: true,
            truncate: true
        });
    }
    symbols = [];
    linlocs = [];
    write(linesStr) {
        const lines = linesStr.split("\n").map((l)=>l.trim());
        let byteIdx = 0;
        for (let i of lines){
            if (i == "") {
                continue;
            }
            if (i.includes(";")) {
                i = i.substring(0, i.indexOf(";")).trim();
            }
            if (i.startsWith("[")) {} else if (i.endsWith(":")) {
                this.symbols.push({
                    name: i.substring(0, i.length - 1),
                    byteIdx: byteIdx
                });
            } else if (i.startsWith("db ")) {
                const values = i.substring(3).split(",");
                for (let val of values){
                    if (val.startsWith("\"") && val.endsWith("\"")) {
                        val = val.substring(1, val.length - 1);
                        for (const c of val){
                            this.output.writeSync(new Uint8Array([
                                c.charCodeAt(0)
                            ]));
                            byteIdx++;
                        }
                    } else {
                        this.output.writeSync(new Uint8Array([
                            parseInt(val)
                        ]));
                        byteIdx++;
                    }
                }
            } else if (i.startsWith("dq ")) {
                const values = i.substring(3).split(",");
                for (const val of values){
                    const parsed = parseInt(val);
                    if (isNaN(parsed)) {
                        this.linlocs.push({
                            name: val,
                            byteIdx: byteIdx
                        });
                        this.output.writeSync(new Uint8Array(new BigUint64Array([
                            BigInt(0)
                        ]).buffer));
                    } else {
                        this.output.writeSync(new Uint8Array(new BigUint64Array([
                            BigInt(parsed)
                        ]).buffer));
                    }
                    byteIdx += 8;
                }
            } else {
                throw new Error("Invalid line " + i);
            }
        }
        console.log(this.symbols);
        for (const loc of this.linlocs){
            const symbol = this.symbols.find((s)=>s.name == loc.name);
            if (symbol) {
                this.output.seekSync(loc.byteIdx, Deno.SeekMode.Start);
                this.output.writeSync(new Uint8Array(new BigUint64Array([
                    BigInt(symbol.byteIdx)
                ]).buffer));
            } else {
                throw new Error("Symbol " + loc.name + " not found!");
            }
        }
        this.output.close();
    }
}
class BYTECODE_Encoder {
    instructions = [
        "global_reserve",
        "assign",
        "assign_indexed",
        "load",
        "load_indexed",
        "number",
        "string",
        "goto",
        "goto_true",
        "goto_false",
        "invoke",
        "invoke_native",
        "return",
        "variable",
        "increase",
        "decrease",
        "add",
        "sub",
        "mul",
        "div",
        "mod",
        "less",
        "less_equals",
        "more",
        "more_equals",
        "equals",
        "not_equals",
        "invert",
        "shift_left",
        "shift_right",
        "or",
        "and",
        "xor",
        "not",
        "noreturn",
        "delete"
    ];
    datatypes = [
        "int",
        "chr",
        "str"
    ];
    natives = [
        "printc",
        "allocate",
        "deallocate",
        "do_exit",
        "file_open",
        "file_write",
        "file_read",
        "file_close",
        "file_size"
    ];
    globals = [];
    parseCode(lines) {
        const sections = [];
        let currentSection = null;
        for (const line of lines){
            if (line.startsWith("@")) {
                const pis = line.split(" ");
                switch(pis[0]){
                    case "@begin":
                        currentSection = {
                            name: pis[2],
                            body: [],
                            type: pis[1]
                        };
                        break;
                    case "@end":
                        sections.push(currentSection);
                        currentSection = null;
                        break;
                }
            } else if (currentSection) {
                currentSection.body.push(line);
            }
        }
        return sections;
    }
    translateFunction(f) {
        let bin = "";
        const locales = [];
        const varID = (name)=>{
            if (locales.includes(name)) {
                return locales.indexOf(name);
            } else if (this.globals.includes(name)) {
                return this.globals.indexOf(name) + 256;
            } else {
                throw new Error(name + " not found!");
            }
        };
        for (const is of f.body){
            if (is == "") {
                continue;
            }
            const instruction = is.split(" ");
            if (is.endsWith(":")) {
                bin += `_${is}\n`;
                continue;
            }
            bin += `\tdb ${this.instructions.indexOf(instruction[0])} ; ${is}\n`;
            switch(instruction[0]){
                case "global_reserve":
                case "variable":
                    if (instruction[0] == "variable") {
                        locales.push(instruction[1]);
                    }
                    bin += `\t\tdq ${varID(instruction[1])}\n\t\tdb ${this.datatypes.indexOf(instruction[2])}, ${instruction[3] == "true" ? 1 : 0}\n`;
                    break;
                case "load":
                case "load_indexed":
                case "assign":
                case "assign_indexed":
                case "increase":
                case "decrease":
                    bin += `\t\tdq ${varID(instruction[1])}\n`;
                    break;
                case "number":
                    bin += `\t\tdq ${instruction[1]}\n`;
                    break;
                case "invoke":
                case "goto":
                case "goto_false":
                case "goto_true":
                    bin += `\t\tdq _${instruction[1]}\n`;
                    break;
                case "invoke_native":
                    {
                        const maybeId = parseInt(instruction[1]);
                        if (isNaN(maybeId)) {
                            if (!this.natives.includes(instruction[1])) {
                                throw new Error("Native " + instruction[1] + " not found!");
                            }
                            bin += `\t\tdq ${this.natives.indexOf(instruction[1])}\n`;
                        } else {
                            bin += `\t\tdq ${maybeId}\n`;
                        }
                    }
                    break;
                case "string":
                    {
                        const s = is.substring(is.indexOf("\"") + 1, is.lastIndexOf("\""));
                        bin += `\t\tdq ${s.length}\n`;
                        bin += `\t\tdb "${s}", 0\n`;
                    }
                    break;
                default:
                    if (!this.instructions.includes(instruction[0]) || instruction.length != 1) {
                        throw new Error("Invalid instruction " + instruction[0]);
                    }
            }
        }
        return bin;
    }
    mergeGlobals(s) {
        const finalGlobal = {
            name: "global",
            body: [],
            type: "global"
        };
        const otherSections = [];
        for (const i of s){
            if (i.type == "global") {
                for (const j of i.body){
                    finalGlobal.body.push(j);
                }
            } else {
                otherSections.push(i);
            }
        }
        return [
            finalGlobal,
            ...otherSections
        ];
    }
    translateGlobal(f) {
        const globalInitSection = {
            name: "global",
            body: [],
            type: "function"
        };
        globalInitSection.body.push("global:");
        for (const is of f.body){
            if (is == "") {
                continue;
            }
            const instruction = is.split(" ");
            switch(instruction[0]){
                case "global":
                    this.globals.push(instruction[1]);
                    globalInitSection.body.push(`global_reserve ${instruction[1]} ${instruction[2]} false`);
                    if (instruction[2] == "int" || instruction[2] == "chr") {
                        globalInitSection.body.push(`number ${instruction[3]}`);
                    } else if (instruction[2] == "str") {
                        globalInitSection.body.push(`string "${is.substring(is.indexOf("\"") + 1, is.lastIndexOf("\""))}"`);
                    } else {
                        throw new Error("Invalid instruction!");
                    }
                    globalInitSection.body.push(`assign ${instruction[1]}`);
                    break;
                case "global_reserve":
                    this.globals.push(instruction[1]);
                    globalInitSection.body.push(is);
                    break;
                default:
                    if (!this.instructions.includes(instruction[0]) || instruction.length != 1) {
                        throw new Error("Invalid instruction " + instruction[0]);
                    }
            }
        }
        globalInitSection.body.push("number 0");
        globalInitSection.body.push("return");
        return this.translateFunction(globalInitSection);
    }
    encode(code) {
        const codeEnc = code.split("\n").map((l)=>l.trim());
        let __final = "[org 0]\ndq _spark\ndq _global\ndq _unreachable\n";
        const sections = this.mergeGlobals(this.parseCode(codeEnc));
        for (const s of sections){
            if (s.type == "function") {
                __final += this.translateFunction(s);
            } else {
                __final += this.translateGlobal(s);
            }
        }
        return __final;
    }
}
class CompiledFunction1 {
    code;
    name;
    used_functions;
    keep;
    constructor(name){
        this.code = "";
        this.name = name;
        this.used_functions = [];
        this.keep = false;
    }
    use(name) {
        if (!this.used_functions.includes(name)) {
            this.used_functions.push(name);
        }
    }
}
class BYTECODE {
    global;
    constructor(global){
        this.global = global;
    }
    resolveFunction(name) {
        for (const i of this.global.value){
            if (i.value.name == name) {
                return i;
            }
        }
    }
    clabel = 0;
    label() {
        return String(this.clabel++);
    }
    emitNativeCall(fc, f) {
        const maybeId = parseInt(f.body[0].value);
        if (isNaN(maybeId)) {
            return `\tinvoke_native ${fc.name}\n`;
        } else {
            return `\tinvoke_native ${maybeId} ; ${f.name}\n`;
        }
    }
    generateExpression(exp, cf) {
        let code = "";
        switch(exp.id){
            case ParserNodeType.NUMBER:
                code += `\tnumber ${exp.value}\n`;
                break;
            case ParserNodeType.STRING:
                code += `\tstring "${exp.value}"\n`;
                break;
            case ParserNodeType.COMPARE:
                code += this.generateExpression(exp.a, cf);
                code += this.generateExpression(exp.b, cf);
                code += `\t${exp.value}\n`;
                break;
            case ParserNodeType.NOT:
                code += this.generateExpression(exp.a, cf);
                code += `\tinvert\n`;
                break;
            case ParserNodeType.ADD:
                code += this.generateExpression(exp.a, cf);
                code += this.generateExpression(exp.b, cf);
                code += `\tadd\n`;
                break;
            case ParserNodeType.SUBSTRACT:
                code += this.generateExpression(exp.a, cf);
                code += this.generateExpression(exp.b, cf);
                code += `\tsub\n`;
                break;
            case ParserNodeType.MULTIPLY:
                code += this.generateExpression(exp.a, cf);
                code += this.generateExpression(exp.b, cf);
                code += `\tmul\n`;
                break;
            case ParserNodeType.DIVIDE:
                code += this.generateExpression(exp.a, cf);
                code += this.generateExpression(exp.b, cf);
                code += `\tdiv\n`;
                break;
            case ParserNodeType.MODULO:
                code += this.generateExpression(exp.a, cf);
                code += this.generateExpression(exp.b, cf);
                code += `\tmod\n`;
                break;
            case ParserNodeType.OR:
                code += this.generateExpression(exp.a, cf);
                code += this.generateExpression(exp.b, cf);
                code += `\tor\n`;
                break;
            case ParserNodeType.AND:
                code += this.generateExpression(exp.a, cf);
                code += this.generateExpression(exp.b, cf);
                code += `\tand\n`;
                break;
            case ParserNodeType.XOR:
                code += this.generateExpression(exp.a, cf);
                code += this.generateExpression(exp.b, cf);
                code += `\txor\n`;
                break;
            case ParserNodeType.BIT_NOT:
                code += this.generateExpression(exp.a, cf);
                code += `\tnot\n`;
                break;
            case ParserNodeType.SHIFT_LEFT:
                code += this.generateExpression(exp.a, cf);
                code += this.generateExpression(exp.b, cf);
                code += `\tshift_left\n`;
                break;
            case ParserNodeType.SHIFT_RIGHT:
                code += this.generateExpression(exp.a, cf);
                code += this.generateExpression(exp.b, cf);
                code += `\tshift_right\n`;
                break;
            case ParserNodeType.FUNCTION_CALL:
                {
                    const fc = exp.value;
                    cf.use(fc.name);
                    for(let i = 0; i < fc._arguments.length; i++){
                        code += this.generateExpression(fc._arguments[i], cf);
                    }
                    const f = this.resolveFunction(fc.name)?.value;
                    if (f) {
                        if (f._arguments.length != fc._arguments.length) {
                            throw new Error("To manny or not enough arguments!");
                        }
                    } else {
                        throw new Error("Function " + fc.name + " not found!");
                    }
                    if (f.attributes.includes("assembly")) {
                        code += this.emitNativeCall(fc, f);
                    } else {
                        code += `\tinvoke ${fc.name}\n`;
                    }
                }
                break;
            case ParserNodeType.VARIABLE_LOOKUP:
                code += `\tload ${exp.value}\n`;
                break;
            case ParserNodeType.VARIABLE_LOOKUP_ARRAY:
                code += this.generateExpression(exp.a, cf);
                code += `\tload_indexed ${exp.value}\n`;
                break;
            default:
                throw new Error("Unsupported " + exp.id);
        }
        return code;
    }
    generateCodeBlock(f, block, cf) {
        let code = "";
        for(let i = 0; i < block.length; i++){
            switch(block[i].id){
                case ParserNodeType.VARIABLE_DECLARATION:
                    {
                        const d = block[i].value;
                        code += `\tvariable ${d.name} ${d.datatype} ${d.array}\n`;
                        if (block[i].a) {
                            code += this.generateExpression(block[i].a, cf);
                            code += `\tassign ${d.name}\n`;
                        }
                    }
                    break;
                case ParserNodeType.VARIABLE_ASSIGN:
                    if (block[i].a) {
                        code += this.generateExpression(block[i].a, cf);
                        code += `\tassign ${block[i].value}\n`;
                    }
                    break;
                case ParserNodeType.VARIABLE_INCREASE:
                    code += `\tincrease ${block[i].value}\n`;
                    break;
                case ParserNodeType.VARIABLE_DECREASE:
                    code += `\tdecrease ${block[i].value}\n`;
                    break;
                case ParserNodeType.VARIABLE_ASSIGN_ARRAY:
                    code += this.generateExpression(block[i].a, cf);
                    code += this.generateExpression(block[i].b, cf);
                    code += `\tassign_indexed ${block[i].value}\n`;
                    break;
                case ParserNodeType.FUNCTION_CALL:
                    {
                        const fc = block[i].value;
                        cf.use(fc.name);
                        for(let i = 0; i < fc._arguments.length; i++){
                            code += this.generateExpression(fc._arguments[i], cf);
                        }
                        const f = this.resolveFunction(fc.name)?.value;
                        if (f) {
                            if (f._arguments.length != fc._arguments.length) {
                                throw new Error("To manny or not enough arguments!");
                            }
                        } else {
                            throw new Error("Function " + fc.name + " not found!");
                        }
                        if (f.attributes.includes("assembly")) {
                            code += this.emitNativeCall(fc, f);
                        } else {
                            code += `\tinvoke ${fc.name}\n`;
                        }
                        code += "\tdelete\n";
                    }
                    break;
                case ParserNodeType.RETURN:
                    if (block[i].a) {
                        code += this.generateExpression(block[i].a, cf);
                    } else {
                        code += "\tnumber 0\n";
                    }
                    code += "\treturn\n";
                    break;
                case ParserNodeType.IF:
                    {
                        code += this.generateExpression(block[i].a, cf);
                        const iff = block[i].value;
                        const label = this.label();
                        if (iff.false_block) {
                            const label2 = this.label();
                            code += `\tgoto_false ${label}\n`;
                            code += this.generateCodeBlock(f, iff.true_block, cf);
                            code += `\tgoto ${label2}\n`;
                            code += label + ":\n";
                            code += this.generateCodeBlock(f, iff.false_block, cf);
                            code += label2 + ":\n";
                        } else {
                            code += `\tgoto_false ${label}\n`;
                            code += this.generateCodeBlock(f, iff.true_block, cf);
                            code += label + ":\n";
                        }
                    }
                    break;
                case ParserNodeType.CONDITIONAL_LOOP:
                    {
                        const loop_back_label = this.label();
                        code += loop_back_label + ":\n";
                        code += this.generateExpression(block[i].a, cf);
                        const loop_exit_label = this.label();
                        code += `\tgoto_false ${loop_exit_label}\n`;
                        code += this.generateCodeBlock(f, block[i].value, cf);
                        code += `\tgoto ${loop_back_label}\n`;
                        code += loop_exit_label + ":\n";
                    }
                    break;
                case ParserNodeType.POST_CONDITIONAL_LOOP:
                    {
                        const loop_back_label = this.label();
                        code += loop_back_label + ":\n";
                        code += this.generateCodeBlock(f, block[i].value, cf);
                        code += this.generateExpression(block[i].a, cf);
                        code += `\tgoto_true ${loop_back_label}\n`;
                    }
                    break;
                case ParserNodeType.LOOP:
                    {
                        const label = this.label();
                        code += label + ":\n";
                        code += this.generateCodeBlock(f, block[i].value, cf);
                        code += `\tgoto ${label}\n`;
                    }
                    break;
                default:
                    throw new Error("Unsupported " + block[i].id);
            }
        }
        return code;
    }
    generateFunction(f) {
        const cf = new CompiledFunction1(f.name);
        let code = "";
        let aftercode = "";
        let precode = "";
        if (f.attributes.includes("assembly")) {
            return undefined;
        } else {
            for(let i = f._arguments.length - 1; i >= 0; i--){
                const a = f._arguments[i];
                code += `\tvariable ${a.name} ${a.datatype} ${a.array}\n`;
                code += `\tassign ${a.name}\n`;
            }
            if (f.attributes.includes("noreturn")) {
                precode += "\tnoreturn\n";
            }
            aftercode += "\tnumber 0\n";
            aftercode += "\treturn\n";
            code += this.generateCodeBlock(f, f.body, cf);
        }
        cf.code = `@begin function ${f.name}\n` + f.name + ":\n" + precode + code + aftercode + "@end function\n";
        return cf;
    }
    compiledFunctions = [];
    keepFunction(name) {
        const f = this.compiledFunctions.find((v)=>v.name == name);
        if (f == undefined || f.keep) {
            return;
        }
        f.keep = true;
        for(let i = 0; i < f.used_functions.length; i++){
            this.keepFunction(f.used_functions[i]);
        }
    }
    generate() {
        const tmp = this.global.value;
        let code = "";
        code += "@begin global\n";
        for(let i = 0; i < tmp.length; i++){
            switch(tmp[i].id){
                case ParserNodeType.FUNCTION:
                    break;
                case ParserNodeType.VARIABLE_DECLARATION:
                    if (tmp[i].a) {
                        if (tmp[i].value.array) {
                            throw new Error("Global array inizializers not supported!");
                        }
                        if (tmp[i].a?.id == ParserNodeType.STRING || tmp[i].a?.id == ParserNodeType.NUMBER) {
                            const dt = tmp[i].value;
                            switch(dt.datatype){
                                case "str":
                                    code += `global ${dt.name} ${dt.datatype} "${tmp[i].a?.value}"\n`;
                                    break;
                                case "int":
                                case "chr":
                                    code += `global ${dt.name} ${dt.datatype} ${tmp[i].a?.value}\n`;
                                    break;
                            }
                        } else {
                            throw new Error("Only string and number are supported for globals!");
                        }
                    } else {
                        const dt = tmp[i].value;
                        code += `global_reserve ${dt.name} ${dt.datatype} ${dt.array}\n`;
                    }
                    break;
                default:
                    throw new Error("Unsupported " + tmp[i].id);
            }
        }
        code += "@end global\n";
        for(let i = 0; i < tmp.length; i++){
            switch(tmp[i].id){
                case ParserNodeType.FUNCTION:
                    {
                        const f = this.generateFunction(tmp[i].value);
                        if (f) {
                            this.compiledFunctions.push(f);
                        }
                    }
                    break;
                case ParserNodeType.VARIABLE_DECLARATION:
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
                            this.keepFunction(tmp[i].value.name);
                        }
                    }
                    break;
            }
        }
        if (this.compiledFunctions.find((v)=>v.name == "spark")) {
            this.keepFunction("spark");
        }
        for(let i = 0; i < this.compiledFunctions.length; i++){
            if (this.compiledFunctions[i].keep) {
                code += this.compiledFunctions[i].code;
            } else {
                console.log("Removing unused function " + this.compiledFunctions[i].name);
            }
        }
        return code;
    }
    async compile(mode, output, generated) {
        switch(mode){
            case "flb":
                Deno.writeTextFileSync(output, generated);
                break;
            case "flenc":
                Deno.writeTextFileSync(output, new BYTECODE_Encoder().encode(generated));
                break;
            case "flbb":
                new BYTECODE_Writer(output).write(new BYTECODE_Encoder().encode(generated));
                break;
            default:
                throw new Error("Mode " + mode + " not found!");
        }
    }
}
function dt_to_size1(dt, array) {
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
        return dt_to_size1(this.datatype.datatype, this.datatype.array);
    }
}
class NamedVariablePtr1 extends NamedVariable1 {
    ptr;
    constructor(datatype, ptr){
        super(datatype);
        this.ptr = ptr;
    }
}
class StackContext1 {
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
        this.variables.push(new NamedVariablePtr1(v.datatype, this.ptr));
        this.ptr += 8;
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
class GlobalContext1 {
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
        const dt = this.global_labels.find((vr)=>vr.name.name == name)?.name;
        if (dt) {
            return new NamedVariable1(dt);
        } else {
            return undefined;
        }
    }
    generate() {
        let code = "[section .data]\n";
        for(let i = 0; i < this.global_labels.length; i++){
            switch(this.global_labels[i].name.datatype){
                case "str":
                    code += `${this.global_labels[i].name.name}: db "${this.global_labels[i].val?.replaceAll("\n", "\", 10, \"") || 0}", 0\n`;
                    break;
                case "int":
                case "chr":
                    code += `${this.global_labels[i].name.name}: dq ${this.global_labels[i].val || 0}\n`;
                    break;
                default:
                    throw new Error("Unsupported");
            }
        }
        return code;
    }
}
class CompiledFunction2 {
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
            throw new Error(name + " not found!");
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
                    return `\tmov [${ptr} + ${dt_to_size1(dt, false)} * ${idx}], ${reg}\n`;
                case "str":
                    return `\tmov [${ptr} + ${dt_to_size1(dt, false)} * ${idx}], ${reg}\n`;
                case "chr":
                    return `\tmov [${ptr} + ${dt_to_size1(dt, false)} * ${idx}], ${this.toLowReg(reg)}\n`;
                default:
                    throw new Error("Not supported!");
            }
        } else {
            switch(dt){
                case "int":
                    return `\tmov ${reg}, [${ptr} + ${dt_to_size1(dt, false)} * ${idx}]\n`;
                case "str":
                    return `\tmov ${reg}, [${ptr} + ${dt_to_size1(dt, false)} * ${idx}]\n`;
                case "chr":
                    return `\tmov ${this.toLowReg(reg)}, [${ptr} + ${dt_to_size1(dt, false)} * ${idx}]\n\tand ${reg}, 0xff\n`;
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
                            if (!nv) {
                                throw new Error("Could not find " + block[i].value);
                            }
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
        const sc = new StackContext1();
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
        const gc = new GlobalContext1();
        let code = "[bits 64]\n";
        code += "[section .text]\n";
        let functions = [];
        for(let i = 0; i < tmp.length; i++){
            switch(tmp[i].id){
                case ParserNodeType.FUNCTION:
                    {
                        const { code , sc  } = this.generateFunction(tmp[i].value, gc);
                        functions.push(new CompiledFunction2(code, tmp[i].value.name, sc.used_functions));
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
    async compile(mode, output, generated) {
        switch(mode){
            case "asm":
                Deno.writeTextFileSync(output, generated);
                break;
            case "o":
                Deno.writeTextFileSync(output + ".asm", generated);
                await runCommand(`nasm ${output + ".asm"} -felf64 -o ${output} -g`);
                break;
            case "elf":
                Deno.writeTextFileSync(output + ".asm", generated);
                await runCommand(`nasm ${output + ".asm"} -felf64 -o ${output + ".o"} -g`);
                await runCommand(`gcc ${output + ".o"} -o ${output} --static -fno-pie -g`);
                break;
            default:
                throw new Error("Mode " + mode + " not found!");
        }
    }
}
function toTarget(target, global) {
    switch(target){
        case "riscv64-linux-gnu":
            return new RISCV64_Linux(global);
        case "x86_64-linux-nasm":
            return new X86_64_Linux(global);
        case "bytecode":
            return new BYTECODE(global);
        default:
            throw new Error(`Target ${target} not found!`);
    }
}
function compile(code, ctarget) {
    const preprocessor = new Preprocessor([
        "stdlib/",
        "stdlib/" + ctarget + "/"
    ]);
    code = preprocessor.preprocess(code);
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, code, "<in>");
    const global = parser.global();
    const target = toTarget(ctarget, global);
    const generated = target.generate();
    return generated;
}
export { compile as compile };

