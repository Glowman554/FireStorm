// deno-lint-ignore-file no-explicit-any
import { Compare } from "./features/compare.ts";
import { Datatype, NamedDatatype, UnnamedDatatype } from "./features/datatype.ts";
import { Function, FunctionCall } from "./features/function.ts";
import { ParserNode, ParserNodeType } from "./parser.ts";

class UnnamedVariable {
    datatype: UnnamedDatatype;
    value: any;

    constructor (datatype: UnnamedDatatype, value: any) {
        this.datatype = datatype;
        this.value = value;
    }

    check(other: UnnamedDatatype) {
        return other.array == this.datatype.array && other.datatype == this.datatype.datatype;
    }
}

class NamedVariable {
    datatype: NamedDatatype;
    value: any;

    constructor (datatype: NamedDatatype, value: any) {
        this.datatype = datatype;
        this.value = value;
    }

    check(other: UnnamedDatatype) {
        return other.array == this.datatype.array && other.datatype == this.datatype.datatype;
    }
}

function to_datatype(what: any): Datatype {
    switch (typeof(what)) {
        case "number":
            return "int";
        case "string":
            return "str";
        default:
            throw new Error("ehh");
    }
}

export class Interpreter {
    global: ParserNode;

    constructor (global: ParserNode) {
        this.global = global;
    }

    resolveFunction(name: string): ParserNode | undefined {
        for (const i of this.global.value as ParserNode[]) {
            if ((i.value as Function).name == name) {
                return i;
            }
        }
    }

    interpretExpression(expression: ParserNode, context: NamedVariable[]): any {
        if (!expression) {
            return 0;
        }
        // console.log(expression);
        switch (expression.id) {
            case ParserNodeType.NUMBER:
                return expression.value as number;
            case ParserNodeType.STRING:
                return expression.value as string;
            case ParserNodeType.ADD:
                return this.interpretExpression(expression.a as ParserNode, context) + this.interpretExpression(expression.b as ParserNode, context);
            case ParserNodeType.SUBSTRACT:
                return this.interpretExpression(expression.a as ParserNode, context) - this.interpretExpression(expression.b as ParserNode, context);
            case ParserNodeType.MULTIPLY:
                return this.interpretExpression(expression.a as ParserNode, context) * this.interpretExpression(expression.b as ParserNode, context);
            case ParserNodeType.VARIABLE_LOOKUP:
                return context.find((val) => val.datatype.name == (expression.value as string))?.value;
            case ParserNodeType.COMPARE:
                {
                    const a = this.interpretExpression(expression.a as ParserNode, context);
                    const b = this.interpretExpression(expression.b as ParserNode, context);

                    switch(expression.value as Compare) {
                        case "more":
                            return a > b ? 1 : 0;
                        default:
                            throw new Error("Unsupported " + expression.value);
                    }
                }
            case ParserNodeType.NOT:
                return (!this.interpretExpression(expression.a as ParserNode, context)) ? 1 : 0;
            case ParserNodeType.FUNCTION_CALL:
                {
                    const call = expression.value as FunctionCall;
                    const args: UnnamedVariable[] = [];
                    for (let j = 0; j < call._arguments.length; j++) {
                        const res = this.interpretExpression(call._arguments[j], context);
                        args.push(new UnnamedVariable(new UnnamedDatatype(to_datatype(res), false), res));
                    }

                    const cf = this.resolveFunction(call.name)?.value as Function;
                    return this.callFunction(cf, args)?.value;
                }
            default:
                throw new Error("Unsupported " + expression.id);
        }
    }

    executeCodeBlock(f: Function, block: ParserNode[], context: NamedVariable[]): UnnamedVariable | undefined {
        for (let i = 0; i < block.length; i++) {
            switch (block[i].id) {
                case ParserNodeType.VARIABLE_DECLARATION:
                    if (context.find((val) => val.datatype.name == (block[i].value as NamedDatatype).name) != undefined) {
                        throw new Error("Already declared!");
                    } else {
                        context.push(new NamedVariable(block[i].value as NamedDatatype, this.interpretExpression(block[i].a as ParserNode, context)));
                    }
                    break;
                case ParserNodeType.FUNCTION_CALL:
                    {
                        const call = block[i].value as FunctionCall;
                        const args: UnnamedVariable[] = [];
                        for (let j = 0; j < call._arguments.length; j++) {
                            const res = this.interpretExpression(call._arguments[j], context);
                            args.push(new UnnamedVariable(new UnnamedDatatype(to_datatype(res), false), res));
                        }

                        const cf = this.resolveFunction(call.name)?.value as Function;
                        this.callFunction(cf, args);
                    }
                    break;
                case ParserNodeType.VARIABLE_ASSIGN:
                    {
                        const v = context.find((val) => val.datatype.name == (block[i].value as string));
                        if (v) {
                            v.value = this.interpretExpression(block[i].a as ParserNode, context);
                        } else {
                            throw new Error("Not declared!");
                        }
                    }
                    break;
                case ParserNodeType.RETURN:
                    {
                        const res = this.interpretExpression(block[i].a as ParserNode, context);
                        const ret = new UnnamedVariable(new UnnamedDatatype(to_datatype(res), false), res);
                        if (ret.check(f.return_datatype)) {
                            return ret;
                        } else {
                            throw new Error("Datatype mismatch");
                        }
                    }
                case ParserNodeType.IF:
                    {
                        if (this.interpretExpression(block[i].a as ParserNode, context) != 0) {
                            const res = this.executeCodeBlock(f, block[i].value as ParserNode[], context);
                            if (res) {
                                return res;
                            }
                        }
                    }
                    break;
                default:
                    console.log(block[i]);
                    throw new Error("Unsupported " + block[i].id);
            }
        }
    }

    callFunction(f: Function, args: UnnamedVariable[]): UnnamedVariable | undefined {
        for (let i = 0; i < f._arguments.length; i++) {
            if (!args[i].check(f._arguments[i])) {
                throw new Error("Datatype mismatch!");
            }
        }

        if (f.attributes.includes("assembly")) {
            console.log(args);
            return undefined;
        }

        const context: NamedVariable[] = [];

        for (let i = 0; i < f._arguments.length; i++) {
            context.push(new NamedVariable(f._arguments[i], args[i].value));
        }

        return this.executeCodeBlock(f, f.body, context);
    }

    execute() {
        console.log(this.callFunction(this.resolveFunction("main")?.value as Function, [ new UnnamedVariable(new UnnamedDatatype("int", false), 1), new UnnamedVariable(new UnnamedDatatype("str", true), [ "main" ]) ])) ;
    }
}