package function

import (
	"fire/firestorm/parser/datatype"
	"fire/firestorm/parser/node"
)

type FunctionCall struct {
	Name      string
	Arguments []*node.Node
}

type FunctionAttribute int

const (
	Assembly FunctionAttribute = iota
	NoReturn
	Global
	Keep
	External
)

func StringToFunctionAttribute(s string) FunctionAttribute {
	switch s {
	case "assembly":
		return Assembly
	case "noreturn":
		return NoReturn
	case "global":
		return Global
	case "keep":
		return Keep
	case "external":
		return External
	default:
		panic("Invalid function attribute")
	}
}

type Function struct {
	Name           string
	Attributes     []FunctionAttribute
	Body           []*node.Node
	ReturnDatatype datatype.UnnamedDatatype
	Arguments      []datatype.NamedDatatype
	EndId          int
	Exit           []*node.Node
	Entry          []*node.Node
}
