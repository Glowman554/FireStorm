package compare

import (
	"fire/firestorm/lexer"
	"fmt"
	"strconv"
)

type Compare int

const (
	More Compare = iota
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
		return 0, fmt.Errorf("Invalid compare " + strconv.Itoa(int(t)))
	}
}

func CompareToString(compare Compare) string {
	switch compare {
	case More:
		return "more"
	case Less:
		return "less"
	case MoreEquals:
		return "more_equals"
	case LessEquals:
		return "less_equals"
	case Equals:
		return "equals"
	case NotEquals:
		return "not_equals"
	}
	panic("?")
}
