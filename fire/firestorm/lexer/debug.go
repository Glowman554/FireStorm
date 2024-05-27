package lexer

import "strconv"

var debug = map[TokenType]string{
	ID:          "identifier",
	LPAREN:      "(",
	RPAREN:      ")",
	LBRACE:      "{",
	RBRACE:      "}",
	LBRACKET:    "[",
	RBRACKET:    "]",
	DIVIDE:      "/",
	COMMA:       ",",
	ARROW:       "->",
	STRING:      "string",
	ASSIGN:      "=",
	PLUS:        "+",
	MINUS:       "-",
	MULTIPLY:    "*",
	NUMBER:      "number",
	MODULO:      "%",
	XOR:         "^",
	AND:         "&",
	OR:          "|",
	SHIFT_LEFT:  "<<",
	SHIFT_RIGHT: ">>",
	BIT_NOT:     "~",
	END_OF_LINE: ";",
	EQUALS:      "==",
	NOT_EQUALS:  "!=",
	LESS:        "<",
	LESS_EQUALS: "<=",
	MORE:        ">",
	MORE_EQUALS: ">=",
	NOT:         "!",
	INCREASE:    "++",
	DECREASE:    "--",
}

func ToString(token TokenType) string {
	if str, ok := debug[token]; ok {
		return str
	} else {
		return strconv.Itoa(int(token))
	}
}
