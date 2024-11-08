package parser

import "fire/firestorm/parser/datatype"

type Offset struct {
	Name    string
	Entries []datatype.NamedDatatype
}
