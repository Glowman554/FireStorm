import { LexerTokenType } from "../lexer.ts";

export type Datatype = "int" | "str" | "void";

export const datatypes: Datatype[] = [ "int", "str", "void" ];

export function datatype_token(datatype: Datatype) {
    switch (datatype) {
        case "int":
            return LexerTokenType.NUMBER
        case "str":
            return LexerTokenType.STRING;
        case "void":
            throw new Error("Not possible");    
    }
}

export class NamedDatatype {
    name: string;
    datatype: Datatype;
    array: boolean

    constructor (name: string, datatype: Datatype, array: boolean) {
        this.name = name;
        this.datatype = datatype;
        this.array = array;
    }
}

export class UnnamedDatatype {
    datatype: Datatype;
    array: boolean

    constructor (datatype: Datatype, array: boolean) {
        this.datatype = datatype;
        this.array = array;
    }
}