package firestorm

import (
	"fire/firestorm/lexer"
	"fire/firestorm/utils"
	"strconv"
	"unicode"
)

type Lexer struct {
	code    string
	pos     int
	current rune
}

func NewLexer(code string) Lexer {
	l := Lexer{
		code:    code,
		pos:     -1,
		current: 0,
	}
	l.advance()
	return l
}

func (l *Lexer) advance() {
	l.pos++
	if l.pos < len(l.code) {
		l.current = rune(l.code[l.pos])
	} else {
		l.current = 0
	}
}

func (l *Lexer) reverse() {
	l.pos--
	l.current = rune(l.code[l.pos])
}

func (l *Lexer) Tokenize() []lexer.Token {
	tokens := []lexer.Token{}

	for l.current != 0 {
		if unicode.IsDigit(l.current) {
			start := l.pos

			num := ""
			base := 10
			if l.current == '0' {
				l.advance()
				if l.current == 'x' {
					base = 16
					l.advance()
				} else if l.current == 'b' {
					base = 2
					l.advance()
				} else {
					l.reverse()
				}
			}

			for l.current != 0 {
				if !unicode.IsDigit(l.current) {
					if !(base == 16 && utils.IndexOf([]rune{'a', 'b', 'c', 'd', 'e', 'f'}, l.current) != -1) {
						break
					}
				}
				num += string(l.current)
				l.advance()
			}

			value, err := strconv.ParseInt(num, base, 64)
			if err != nil {
				panic(err)
			}
			tokens = append(tokens, lexer.NewToken(lexer.NUMBER, int(value), start))
		}

		if unicode.IsLetter(l.current) {
			start := l.pos
			id := ""
			for unicode.IsLetter(l.current) || unicode.IsDigit(l.current) || l.current == '_' {
				id += string(l.current)
				l.advance()
			}
			tokens = append(tokens, lexer.NewToken(lexer.ID, id, start))
		}

		if unicode.IsSpace(l.current) {
			l.advance()
			continue
		}

		switch l.current {
		case '\'':
			l.advance()
			chr := l.current
			l.advance()
			if l.current != '\'' {
				panic("Expected '")
			}
			tokens = append(tokens, lexer.NewToken(lexer.NUMBER, int(chr), l.pos))
		case '(':
			tokens = append(tokens, lexer.NewToken(lexer.LPAREN, nil, l.pos))
		case ')':
			tokens = append(tokens, lexer.NewToken(lexer.RPAREN, nil, l.pos))
		case '{':
			tokens = append(tokens, lexer.NewToken(lexer.LBRACE, nil, l.pos))
		case '}':
			tokens = append(tokens, lexer.NewToken(lexer.RBRACE, nil, l.pos))
		case '[':
			tokens = append(tokens, lexer.NewToken(lexer.LBRACKET, nil, l.pos))
		case ']':
			tokens = append(tokens, lexer.NewToken(lexer.RBRACKET, nil, l.pos))
		case ',':
			tokens = append(tokens, lexer.NewToken(lexer.COMMA, nil, l.pos))
		case '+':
			l.advance()
			if l.current == '+' {
				tokens = append(tokens, lexer.NewToken(lexer.INCREASE, nil, l.pos))
			} else {
				l.reverse()
				tokens = append(tokens, lexer.NewToken(lexer.PLUS, nil, l.pos))
			}
		case '=':
			l.advance()
			if l.current == '=' {
				tokens = append(tokens, lexer.NewToken(lexer.EQUALS, nil, l.pos))
			} else {
				l.reverse()
				tokens = append(tokens, lexer.NewToken(lexer.ASSIGN, nil, l.pos))
			}
		case '*':
			tokens = append(tokens, lexer.NewToken(lexer.MULTIPLY, nil, l.pos))
		case '%':
			tokens = append(tokens, lexer.NewToken(lexer.MODULO, nil, l.pos))
		case '^':
			tokens = append(tokens, lexer.NewToken(lexer.XOR, nil, l.pos))
		case '|':
			tokens = append(tokens, lexer.NewToken(lexer.OR, nil, l.pos))
		case '&':
			tokens = append(tokens, lexer.NewToken(lexer.AND, nil, l.pos))
		case '~':
			tokens = append(tokens, lexer.NewToken(lexer.BIT_NOT, nil, l.pos))
		case ';':
			tokens = append(tokens, lexer.NewToken(lexer.END_OF_LINE, nil, l.pos))
		case '>':
			l.advance()
			if l.current == '=' {
				tokens = append(tokens, lexer.NewToken(lexer.MORE_EQUALS, nil, l.pos))
			} else if l.current == '>' {
				tokens = append(tokens, lexer.NewToken(lexer.SHIFT_RIGHT, nil, l.pos))
			} else {
				l.reverse()
				tokens = append(tokens, lexer.NewToken(lexer.MORE, nil, l.pos))
			}
		case '<':
			l.advance()
			if l.current == '=' {
				tokens = append(tokens, lexer.NewToken(lexer.LESS_EQUALS, nil, l.pos))
			} else if l.current == '<' {
				tokens = append(tokens, lexer.NewToken(lexer.SHIFT_LEFT, nil, l.pos))
			} else {
				l.reverse()
				tokens = append(tokens, lexer.NewToken(lexer.LESS, nil, l.pos))
			}
		case '!':
			l.advance()
			if l.current == '=' {
				tokens = append(tokens, lexer.NewToken(lexer.NOT_EQUALS, nil, l.pos))
			} else {
				l.reverse()
				tokens = append(tokens, lexer.NewToken(lexer.NOT, nil, l.pos))
			}
		case '-':
			l.advance()
			if l.current == '>' {
				tokens = append(tokens, lexer.NewToken(lexer.ARROW, nil, l.pos))
			} else if l.current == '-' {
				tokens = append(tokens, lexer.NewToken(lexer.DECREASE, nil, l.pos))
			} else {
				l.reverse()
				tokens = append(tokens, lexer.NewToken(lexer.MINUS, nil, l.pos))
			}
		case '/':
			l.advance()
			if l.current == '/' {
				l.advance()
				for l.current != 0 && l.current != '\n' {
					l.advance()
				}
			} else {
				l.reverse()
				tokens = append(tokens, lexer.NewToken(lexer.DIVIDE, nil, l.pos))
			}
		case '"':
			start := l.pos
			str := ""
			l.advance()
			for l.current != '"' {
				str += string(l.current)
				l.advance()
			}
			tokens = append(tokens, lexer.NewToken(lexer.STRING, str, start))
		default:
			panic("Illegal token " + string(l.current))
		}

		l.advance()
	}

	return tokens
}
