package parser

import (
	"fire/firestorm/lexer"
	"fmt"
	"strconv"
)

type Compare int

const (
	Invalid         = -1
	More    Compare = iota
	Less
	MoreEquals
	LessEquals
	Equals
	NotEquals
)

func TokenTypeToCompare(t lexer.TokenType) (Compare, error) {
	switch t {
	case lexer.MORE:
		return More, nil
	case lexer.LESS:
		return Less, nil
	case lexer.MORE_EQUALS:
		return MoreEquals, nil
	case lexer.LESS_EQUALS:
		return LessEquals, nil
	case lexer.EQUALS:
		return Equals, nil
	case lexer.NOT_EQUALS:
		return NotEquals, nil
	default:
		return Invalid, fmt.Errorf("Invalid compare " + strconv.Itoa(int(t)))
	}
}
