package firestorm

import (
	"fire/firestorm/lexer"
	"fire/firestorm/parser"
	"fire/firestorm/utils"
	"fmt"
	"strconv"
	"strings"
)

type Parser struct {
	tokens  []lexer.Token
	current *lexer.Token
	pos     int
	code    string
}

func NewParser(tokens []lexer.Token, code string) Parser {
	p := Parser{
		tokens:  tokens,
		current: nil,
		pos:     -1,
		code:    code,
	}
	p.advance()
	return p
}

func (p *Parser) advance() {
	p.pos++
	if p.pos < len(p.tokens) {
		p.current = &p.tokens[p.pos]
	} else {
		p.current = nil
	}
}

func (p *Parser) reverse() {
	p.pos--
	p.current = &p.tokens[p.pos]
}

func (p *Parser) error(message string, pos int) {
	errorLine := parser.FindErrorLineFile(p.code, pos)
	fmt.Println("error:", message, "(at", errorLine.File+":"+strconv.Itoa(errorLine.Line)+":"+strconv.Itoa(errorLine.Char)+")")

	fmt.Println(strings.ReplaceAll(strings.ReplaceAll(errorLine.LineString, "\t", " "), "\r", " "))

	for i := 0; i < errorLine.Char; i++ {
		fmt.Print(" ")
	}
	fmt.Println("^")

	panic("Parser failed")
}

func (p *Parser) expect(tokenType lexer.TokenType) {
	if p.current.Type != tokenType {
		p.error("Expected "+lexer.ToString(tokenType)+" but was "+lexer.ToString(p.current.Type), p.current.Pos)
	}
}

func (p *Parser) advanceExpect(tokenType lexer.TokenType) {
	p.advance()
	p.expect(tokenType)
}

func (p *Parser) commaOrRparen() bool {
	if p.current.Type == lexer.COMMA {
		p.advance()
		return false
	} else if p.current.Type == lexer.RPAREN {
		p.advance()
		return true
	} else {
		p.error("Unexpected "+lexer.ToString(p.current.Type), p.current.Pos)
	}
	panic("?")
}

func (p *Parser) datatypeNamed() parser.NamedDatatype {
	if p.current.Type == lexer.ID {
		datatype, err := parser.GetDatatypeFromString(p.current.Value.(string))
		if err != nil {
			p.error(err.Error(), p.current.Pos)
		}
		p.advance()
		if p.current.Type == lexer.LBRACKET {
			p.advanceExpect(lexer.RBRACKET)
			p.advanceExpect(lexer.ID)
			tmp := parser.NamedDatatype{
				UnnamedDatatype: parser.UnnamedDatatype{
					Type:    datatype,
					IsArray: true,
				},
				Name: p.current.Value.(string),
			}
			p.advance()
			return tmp
		} else {
			p.expect(lexer.ID)
			tmp := parser.NamedDatatype{
				UnnamedDatatype: parser.UnnamedDatatype{
					Type:    datatype,
					IsArray: false,
				},
				Name: p.current.Value.(string),
			}
			p.advance()
			return tmp
		}
	} else {
		p.error("Expected datatype", p.current.Pos)
	}
	panic("?")
}

func (p *Parser) datatypeUnnamed() parser.UnnamedDatatype {
	if p.current.Type == lexer.ID {
		datatype, err := parser.GetDatatypeFromString(p.current.Value.(string))
		if err != nil {
			p.error(err.Error(), p.current.Pos)
		}
		p.advance()
		if p.current.Type == lexer.LBRACKET {
			p.advanceExpect(lexer.RBRACKET)
			p.advance()
			return parser.UnnamedDatatype{
				Type:    datatype,
				IsArray: true,
			}
		} else {
			return parser.UnnamedDatatype{
				Type:    datatype,
				IsArray: false,
			}
		}
	} else {
		p.error("Expected id", p.current.Pos)
	}

	panic("?")
}

func (p *Parser) factor() *parser.Node {
	token := p.current
	if token == nil {
		return nil
	}

	if token.Type == lexer.LPAREN {
		p.advance()

		result := p.expression()
		p.expect(lexer.RPAREN)
		p.advance()
		return result
	} else if token.Type == lexer.NUMBER {
		p.advance()
		return parser.NewNode(parser.NUMBER, nil, nil, token.Value)
	} else if token.Type == lexer.STRING {
		p.advance()
		return parser.NewNode(parser.STRING, nil, nil, token.Value)
	} else if token.Type == lexer.NOT {
		p.advance()
		return parser.NewNode(parser.NOT, p.expression(), nil, token.Value)
	} else if token.Type == lexer.BIT_NOT {
		p.advance()
		return parser.NewNode(parser.BIT_NOT, p.expression(), nil, token.Value)
	} else if token.Type == lexer.PLUS {
		p.advance()
		return parser.NewNode(parser.PLUS, p.factor(), nil, token.Value)
	} else if token.Type == lexer.MINUS {
		p.advance()
		return parser.NewNode(parser.MINUS, p.factor(), nil, token.Value)
	} else if token.Type == lexer.ID {
		p.advance()
		if p.current.Type == lexer.LPAREN {
			p.advance()
			// function call
			if p.current.Type == lexer.RPAREN {
				p.advance()
				return parser.NewNode(parser.FUNCTION_CALL, nil, nil, parser.FunctionCall{Name: token.Value.(string), Arguments: []*parser.Node{}})
			} else {
				arguments := []*parser.Node{}
				for {
					expression := p.expression()
					if expression == nil {
						p.error("Expected expression", p.current.Pos)
						panic("?")
					}
					arguments = append(arguments, expression)
					if p.commaOrRparen() {
						return parser.NewNode(parser.FUNCTION_CALL, nil, nil, parser.FunctionCall{Name: token.Value.(string), Arguments: arguments})
					}
				}
			}
		} else {
			if p.current.Type == lexer.LBRACKET {
				p.advance()
				expression := p.expression()
				p.expect(lexer.RBRACKET)
				p.advance()
				return parser.NewNode(parser.VARIABLE_LOOKUP_ARRAY, expression, nil, token.Value)
			} else {
				return parser.NewNode(parser.VARIABLE_LOOKUP, nil, nil, token.Value)
			}
		}
	} else if token.Type == lexer.END_OF_LINE {
		return nil
	}
	p.error("Invalid factor", p.current.Pos)
	panic("?")
}

func (p *Parser) bitLogic() *parser.Node {
	result := p.factor()

	for p.current.Type == lexer.AND ||
		p.current.Type == lexer.OR ||
		p.current.Type == lexer.XOR ||
		p.current.Type == lexer.SHIFT_LEFT ||
		p.current.Type == lexer.SHIFT_RIGHT {
		if p.current.Type == lexer.AND {
			p.advance()
			result = parser.NewNode(parser.AND, result, p.factor(), nil)
		} else if p.current.Type == lexer.OR {
			p.advance()
			result = parser.NewNode(parser.OR, result, p.factor(), nil)
		} else if p.current.Type == lexer.XOR {
			p.advance()
			result = parser.NewNode(parser.XOR, result, p.factor(), nil)
		} else if p.current.Type == lexer.SHIFT_LEFT {
			p.advance()
			result = parser.NewNode(parser.SHIFT_LEFT, result, p.factor(), nil)
		} else if p.current.Type == lexer.SHIFT_RIGHT {
			p.advance()
			result = parser.NewNode(parser.SHIFT_RIGHT, result, p.factor(), nil)
		} else {
			p.error("Invalid power", p.current.Pos)
		}
	}

	return result
}

func (p *Parser) term() *parser.Node {
	result := p.bitLogic()

	for p.current.Type == lexer.MULTIPLY ||
		p.current.Type == lexer.DIVIDE ||
		p.current.Type == lexer.MODULO {

		if p.current.Type == lexer.MULTIPLY {
			p.advance()
			result = parser.NewNode(parser.MULTIPLY, result, p.bitLogic(), nil)
		} else if p.current.Type == lexer.DIVIDE {
			p.advance()
			result = parser.NewNode(parser.DIVIDE, result, p.bitLogic(), nil)
		} else if p.current.Type == lexer.MODULO {
			p.advance()
			result = parser.NewNode(parser.MODULO, result, p.bitLogic(), nil)
		} else {
			p.error("Invalid term", p.current.Pos)
		}
	}

	return result
}

func (p *Parser) compare() *parser.Node {
	result := p.term()

	for p.current.Type == lexer.EQUALS ||
		p.current.Type == lexer.NOT_EQUALS ||
		p.current.Type == lexer.LESS ||
		p.current.Type == lexer.LESS_EQUALS ||
		p.current.Type == lexer.MORE ||
		p.current.Type == lexer.MORE_EQUALS {
		compare, _ := parser.TokenTypeToCompare(p.current.Type)
		p.advance()
		result = parser.NewNode(parser.COMPARE, result, p.term(), compare)
	}

	return result
}

func (p *Parser) expression() *parser.Node {
	result := p.compare()

	for p.current.Type == lexer.PLUS ||
		p.current.Type == lexer.MINUS {
		if p.current.Type == lexer.MINUS {
			p.advance()
			result = parser.NewNode(parser.SUBTRACT, result, p.term(), nil)
		} else if p.current.Type == lexer.PLUS {
			p.advance()
			result = parser.NewNode(parser.ADD, result, p.term(), nil)
		} else {
			p.error("Invalid expression", p.current.Pos)
		}
	}

	return result
}

func (p *Parser) functionAttributes() []parser.FunctionAttribute {
	attributes := []parser.FunctionAttribute{}

	if p.current.Type == lexer.LPAREN {
		p.advance()
		for {
			if p.current.Type == lexer.ID {
				attributes = append(attributes, parser.StringToFunctionAttribute(p.current.Value.(string)))
				p.advance()
				if p.commaOrRparen() {
					return attributes
				}
			} else {
				p.error("Failed to parse attributes", p.current.Pos)
			}
		}
	} else {
		return attributes
	}
}

func (p *Parser) functionArguments() []parser.NamedDatatype {
	arguments := []parser.NamedDatatype{}
	p.expect(lexer.LPAREN)
	p.advance()
	if p.current.Type == lexer.RPAREN {
		p.advance()
		return arguments
	}
	for {
		arguments = append(arguments, p.datatypeNamed())
		if p.commaOrRparen() {
			return arguments
		}
	}
}

func (p *Parser) parseIf() *parser.Node {
	p.advance()
	expression := p.expression()
	if expression == nil {
		p.error("Expected expression", p.current.Pos)
	}
	p.expect(lexer.LBRACE)
	codeBlock := p.codeBlock()
	p.expect(lexer.RBRACE)
	p.advance()
	if p.current.Type == lexer.ID {
		if p.current.Value == "else" {
			p.advance()
			if p.current.Type == lexer.ID {
				if p.current.Value == "if" {
					elseCodeBlock := p.parseIf()
					p.expect(lexer.RBRACE)
					return parser.NewNode(parser.IF, expression, nil, parser.If{TrueBlock: codeBlock, FalseBlock: []*parser.Node{elseCodeBlock}})
				} else {
					p.error("Expected if", p.current.Pos)
					panic("?")
				}
			} else {
				p.expect(lexer.LBRACE)
				elseCodeBlock := p.codeBlock()
				p.expect(lexer.RBRACE)
				return parser.NewNode(parser.IF, expression, nil, parser.If{TrueBlock: codeBlock, FalseBlock: elseCodeBlock})
			}
		} else {
			p.reverse()
			return parser.NewNode(parser.IF, expression, nil, parser.If{TrueBlock: codeBlock, FalseBlock: []*parser.Node{}})
		}
	} else {
		p.reverse()
		return parser.NewNode(parser.IF, expression, nil, parser.If{TrueBlock: codeBlock, FalseBlock: []*parser.Node{}})
	}
}

func (p *Parser) keyword() []*parser.Node {
	if p.current.Type != lexer.ID {
		return nil
	}
	switch p.current.Value.(string) {
	case "return":
		p.advance()
		ret := []*parser.Node{parser.NewNode(parser.RETURN, p.expression(), nil, nil)}
		p.expect(lexer.END_OF_LINE)
		return ret
	case "for":
		forBody := []*parser.Node{}
		p.advance()
		forBody = append(forBody, p.codeLine())
		p.expect(lexer.END_OF_LINE)
		p.advance()

		expression := p.expression()
		p.expect(lexer.END_OF_LINE)
		p.advance()

		if expression == nil {
			p.error("Expected expression", p.current.Pos)
		}
		update := p.codeLine()
		codeBlock := p.codeBlock()
		codeBlock = append(codeBlock, update)
		forBody = append(forBody, parser.NewNode(parser.CONDITIONAL_LOOP, expression, nil, codeBlock))
		p.expect(lexer.RBRACE)

		return forBody
	case "if":
		return []*parser.Node{p.parseIf()}
	case "while":
		p.advance()
		expression := p.expression()
		p.expect(lexer.LBRACE)
		if expression == nil {
			p.error("Expected expression", p.current.Pos)
		}

		codeBlock := p.codeBlock()
		p.expect(lexer.RBRACE)
		return []*parser.Node{parser.NewNode(parser.CONDITIONAL_LOOP, expression, nil, codeBlock)}
	case "do":
		p.advanceExpect(lexer.LBRACE)
		codeBlock := p.codeBlock()
		p.expect(lexer.RBRACE)
		p.advanceExpect(lexer.ID)
		if p.current.Value != "while" {
			p.error("Expected while", p.current.Pos)
		}
		p.advance()
		expression := p.expression()
		if expression == nil {
			p.error("Expected expression", p.current.Pos)
		}
		p.expect(lexer.END_OF_LINE)
		return []*parser.Node{parser.NewNode(parser.POST_CONDITIONAL_LOOP, expression, nil, codeBlock)}
	case "loop":
		p.advance()
		p.expect(lexer.LBRACE)
		codeBlock := p.codeBlock()
		p.expect(lexer.RBRACE)
		return []*parser.Node{parser.NewNode(parser.LOOP, nil, nil, codeBlock)}
	case "end":
		p.advance()
		p.expect(lexer.LBRACE)
		codeBlock := p.codeBlock()
		p.expect(lexer.RBRACE)
		return []*parser.Node{parser.NewNode(parser.END_EXEC, nil, nil, codeBlock)}
	default:
		return nil
	}
}

func (p *Parser) codeLine() *parser.Node {
	if p.current.Type == lexer.ID {
		if parser.IsDatatypeString(p.current.Value.(string)) {
			datatype := p.datatypeNamed()
			if p.current.Type == lexer.END_OF_LINE {
				return parser.NewNode(parser.VARIABLE_DECLARATION, nil, nil, datatype)
			}
			p.expect(lexer.ASSIGN)
			p.advance()
			return parser.NewNode(parser.VARIABLE_DECLARATION, p.expression(), nil, datatype)
		} else {
			possibleVariableName := p.current.Value.(string)
			p.advance()
			if p.current.Type == lexer.ASSIGN {
				p.advance()
				expression := p.expression()
				if expression == nil {
					p.error("Expected expression", p.current.Pos)
				}
				return parser.NewNode(parser.VARIABLE_ASSIGN, expression, nil, possibleVariableName)
			} else if p.current.Type == lexer.INCREASE {
				p.advance()
				return parser.NewNode(parser.VARIABLE_INCREASE, nil, nil, possibleVariableName)
			} else if p.current.Type == lexer.DECREASE {
				p.advance()
				return parser.NewNode(parser.VARIABLE_DECREASE, nil, nil, possibleVariableName)
			} else if p.current.Type == lexer.LBRACKET {
				p.advance()
				indexExpression := p.expression()
				if indexExpression == nil {
					p.error("Expected expression", p.current.Pos)
				}
				p.expect(lexer.RBRACKET)
				p.advanceExpect(lexer.ASSIGN)
				p.advance()
				expression := p.expression()
				if expression == nil {
					p.error("Expected expression", p.current.Pos)
				}
				return parser.NewNode(parser.VARIABLE_ASSIGN_ARRAY, indexExpression, expression, possibleVariableName)
			} else {
				p.reverse()
				expression := p.expression()
				if expression == nil {
					p.error("Expected expression", p.current.Pos)
				}
				return expression
			}
		}
	} else {
		p.error("Expected id", p.current.Pos)
	}
	panic("?")
}

func (p *Parser) codeBlock() []*parser.Node {
	body := []*parser.Node{}
	p.expect(lexer.LBRACE)
	p.advance()
	for {
		if p.current.Type == lexer.RBRACE {
			return body
		}
		keyword := p.keyword()
		if keyword != nil {
			body = append(body, keyword...)
		} else {
			body = append(body, p.codeLine())
			p.expect(lexer.END_OF_LINE)
		}
		p.advance()
	}
}

func (p *Parser) Global() *parser.Node {
	global := []*parser.Node{}

	for p.current != nil {
		if p.current.Type == lexer.ID {
			if parser.IsDatatypeString(p.current.Value.(string)) {
				datatype := p.datatypeNamed()
				if p.current.Type == lexer.END_OF_LINE {
					global = append(global, parser.NewNode(parser.VARIABLE_DECLARATION, nil, nil, datatype))
				} else {
					p.expect(lexer.ASSIGN)
					p.advance()
					global = append(global, parser.NewNode(parser.VARIABLE_DECLARATION, p.expression(), nil, datatype))
					p.expect(lexer.END_OF_LINE)
				}
			} else if p.current.Value == "function" {
				p.advance()

				attributes := p.functionAttributes()
				p.expect(lexer.ID)
				name := p.current.Value.(string)
				p.advance()
				arguments := p.functionArguments()
				p.expect(lexer.ARROW)
				p.advance()
				returnDatatype := p.datatypeUnnamed()
				if utils.IndexOf(attributes, parser.Assembly) >= 0 {
					p.expect(lexer.LBRACE)
					p.advanceExpect(lexer.STRING)
					body := []*parser.Node{parser.NewNode(parser.ASSEMBLY_CODE, nil, nil, p.current.Value)}
					p.advanceExpect(lexer.RBRACE)
					global = append(global, parser.NewNode(parser.FUNCTION, nil, nil, parser.Function{
						Name:           name,
						Attributes:     attributes,
						Body:           body,
						ReturnDatatype: returnDatatype,
						Arguments:      arguments,
					}))
				} else if utils.IndexOf(attributes, parser.External) >= 0 {
					p.expect(lexer.END_OF_LINE)
					global = append(global, parser.NewNode(parser.FUNCTION, nil, nil, parser.Function{
						Name:           name,
						Attributes:     attributes,
						Body:           nil,
						ReturnDatatype: returnDatatype,
						Arguments:      arguments,
					}))
				} else {
					codeBlock := p.codeBlock()
					global = append(global, parser.NewNode(parser.FUNCTION, nil, nil, parser.Function{
						Name:           name,
						Attributes:     attributes,
						Body:           codeBlock,
						ReturnDatatype: returnDatatype,
						Arguments:      arguments,
					}))
				}
			} else if p.current.Value == "offset" {
				p.advanceExpect(lexer.ID)
				name := p.current.Value.(string)
				p.advanceExpect(lexer.LBRACE)

				entries := []parser.NamedDatatype{}

				for {
					p.advance()
					if p.current.Type == lexer.RBRACE {
						break
					}
					entries = append(entries, p.datatypeNamed())
					p.expect(lexer.END_OF_LINE)
				}

				p.expect(lexer.RBRACE)
				global = append(global, parser.NewNode(parser.OFFSET, nil, nil, parser.Offset{
					Name:    name,
					Entries: entries,
				}))
			} else {
				p.error("Expected function", p.pos)
			}
		} else {
			p.error("Expected id", p.current.Pos)
		}
		p.advance()
	}

	return parser.NewNode(parser.GLOBAL, nil, nil, global)
}
