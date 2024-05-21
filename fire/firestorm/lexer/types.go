package lexer

type TokenType int

const (
	ID TokenType = iota
	LPAREN
	RPAREN
	LBRACE
	RBRACE
	LBRACKET
	RBRACKET
	DIVIDE
	COMMA
	ARROW
	STRING
	ASSIGN
	PLUS
	MINUS
	MULTIPLY
	NUMBER
	MODULO
	XOR
	AND
	OR
	SHIFT_LEFT
	SHIFT_RIGHT
	BIT_NOT
	END_OF_LINE

	EQUALS
	NOT_EQUALS
	LESS
	LESS_EQUALS
	MORE
	MORE_EQUALS
	NOT

	INCREASE
	DECREASE
)

type Token struct {
	Type  TokenType
	Value any
	Pos   int
}

func NewToken(tokenType TokenType, value any, pos int) Token {
	return Token{
		Type:  tokenType,
		Value: value,
		Pos:   pos,
	}
}
