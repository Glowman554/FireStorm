package parser

import (
	"fire/firestorm/lexer"
	"fmt"
)

type DataType int

const (
	INVALID          = -1
	INT     DataType = iota
	STR
	VOID
	CHR
	PTR
	INT_32
	INT_16
)

func GetDatatypeFromString(t string) (DataType, error) {
	switch t {
	case "int":
		return INT, nil
	case "str":
		return STR, nil
	case "void":
		return VOID, nil
	case "chr":
		return CHR, nil
	case "ptr":
		return PTR, nil
	case "i32":
		return INT_32, nil
	case "i16":
		return INT_16, nil
	default:
		return INVALID, fmt.Errorf("Invalid datatype " + t)
	}
}

func IsDatatypeString(t string) bool {
	return t == "int" || t == "str" || t == "void" || t == "chr" || t == "ptr" || t == "i32" || t == "i16"
}

func GetTokenFromDatatype(d DataType) lexer.TokenType {
	switch d {
	case INT:
		return lexer.NUMBER
	case STR:
		return lexer.STRING
	default:
		panic("Invalid")
	}
}

type UnnamedDatatype struct {
	Type    DataType
	IsArray bool
}

type NamedDatatype struct {
	UnnamedDatatype
	Name string
}
