import { ParserNode } from "../parser.ts"
import { NamedDatatype, UnnamedDatatype } from "./datatype.ts";


export type FunctionAttribute = "assembly" | "noreturn";
export const attributes: FunctionAttribute[] = [ "assembly", "noreturn" ];

export class Function {
    name: string;
    attributes: FunctionAttribute[];
    body: ParserNode[];

    return_datatype: UnnamedDatatype;
    _arguments: NamedDatatype[];

    constructor (name: string, attibutes: FunctionAttribute[], body: ParserNode[], return_datatype: UnnamedDatatype, _arguments: NamedDatatype[]) {
        this.name = name;
        this.attributes = attibutes;
        this.body = body;
        this.return_datatype = return_datatype;
        this._arguments = _arguments;
    }
}
export class FunctionCall {
    name: string;
    _arguments: ParserNode[];

    constructor (name: string, _arguments: ParserNode[]) {
        this.name = name;
        this._arguments = _arguments;
    }
}