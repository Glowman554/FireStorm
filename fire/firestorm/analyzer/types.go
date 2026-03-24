package analyzer

import (
	"fire/firestorm/parser/datatype"
	"fire/firestorm/parser/function"
)

type Function struct {
	Name           string
	FunctionCalls  []string
	LocalVariables []datatype.NamedDatatype
	VariableUsed   []string
	Attributes     []function.FunctionAttribute
}
