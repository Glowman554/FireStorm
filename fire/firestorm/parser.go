package firestorm

import (
	"fire/firestorm/lexer"
	"fire/firestorm/parser"
	"fire/firestorm/parser/compare"
	"fire/firestorm/parser/datatype"
	"fire/firestorm/parser/function"
	"fire/firestorm/parser/node"
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

func (p *Parser) datatypeNamed() datatype.NamedDatatype {
	if p.current.Type == lexer.ID {
		dt, err := datatype.GetDatatypeFromString(p.current.Value.(string))
		if err != nil {
			p.error(err.Error(), p.current.Pos)
		}
		p.advance()
		if p.current.Type == lexer.LBRACKET {
			p.advanceExpect(lexer.RBRACKET)
			p.advanceExpect(lexer.ID)
			tmp := datatype.NamedDatatype{
				UnnamedDatatype: datatype.UnnamedDatatype{
					Type:    dt,
					IsArray: true,
				},
				Name: p.current.Value.(string),
			}
			p.advance()
			return tmp
		} else {
			p.expect(lexer.ID)
			tmp := datatype.NamedDatatype{
				UnnamedDatatype: datatype.UnnamedDatatype{
					Type:    dt,
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

func (p *Parser) datatypeUnnamed() datatype.UnnamedDatatype {
	if p.current.Type == lexer.ID {
		dt, err := datatype.GetDatatypeFromString(p.current.Value.(string))
		if err != nil {
			p.error(err.Error(), p.current.Pos)
		}
		p.advance()
		if p.current.Type == lexer.LBRACKET {
			p.advanceExpect(lexer.RBRACKET)
			p.advance()
			return datatype.UnnamedDatatype{
				Type:    dt,
				IsArray: true,
			}
		} else {
			return datatype.UnnamedDatatype{
				Type:    dt,
				IsArray: false,
			}
		}
	} else {
		p.error("Expected id", p.current.Pos)
	}

	panic("?")
}

func (p *Parser) factor() *node.Node {
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
		return node.NewNode(node.NUMBER, nil, nil, token.Value)
	} else if token.Type == lexer.STRING {
		p.advance()
		return node.NewNode(node.STRING, nil, nil, token.Value)
	} else if token.Type == lexer.NOT {
		p.advance()
		return node.NewNode(node.NOT, p.expression(), nil, token.Value)
	} else if token.Type == lexer.BIT_NOT {
		p.advance()
		return node.NewNode(node.BIT_NOT, p.expression(), nil, token.Value)
	} else if token.Type == lexer.PLUS {
		p.advance()
		return node.NewNode(node.PLUS, p.factor(), nil, token.Value)
	} else if token.Type == lexer.MINUS {
		p.advance()
		return node.NewNode(node.MINUS, p.factor(), nil, token.Value)
	} else if token.Type == lexer.ID {
		p.advance()
		if p.current.Type == lexer.LPAREN {
			p.advance()
			// function call
			if p.current.Type == lexer.RPAREN {
				p.advance()
				return node.NewNode(node.FUNCTION_CALL, nil, nil, function.FunctionCall{Name: token.Value.(string), Arguments: []*node.Node{}})
			} else {
				arguments := []*node.Node{}
				for {
					expression := p.expression()
					if expression == nil {
						p.error("Expected expression", p.current.Pos)
						panic("?")
					}
					arguments = append(arguments, expression)
					if p.commaOrRparen() {
						return node.NewNode(node.FUNCTION_CALL, nil, nil, function.FunctionCall{Name: token.Value.(string), Arguments: arguments})
					}
				}
			}
		} else {
			if p.current.Type == lexer.LBRACKET {
				p.advance()
				expression := p.expression()
				p.expect(lexer.RBRACKET)
				p.advance()
				return node.NewNode(node.VARIABLE_LOOKUP_ARRAY, expression, nil, token.Value)
			} else {
				return node.NewNode(node.VARIABLE_LOOKUP, nil, nil, token.Value)
			}
		}
	} else if token.Type == lexer.END_OF_LINE {
		return nil
	}
	p.error("Invalid factor", p.current.Pos)
	panic("?")
}

func (p *Parser) bitLogic() *node.Node {
	result := p.factor()

	for p.current.Type == lexer.AND ||
		p.current.Type == lexer.OR ||
		p.current.Type == lexer.XOR ||
		p.current.Type == lexer.SHIFT_LEFT ||
		p.current.Type == lexer.SHIFT_RIGHT {
		if p.current.Type == lexer.AND {
			p.advance()
			result = node.NewNode(node.AND, result, p.factor(), nil)
		} else if p.current.Type == lexer.OR {
			p.advance()
			result = node.NewNode(node.OR, result, p.factor(), nil)
		} else if p.current.Type == lexer.XOR {
			p.advance()
			result = node.NewNode(node.XOR, result, p.factor(), nil)
		} else if p.current.Type == lexer.SHIFT_LEFT {
			p.advance()
			result = node.NewNode(node.SHIFT_LEFT, result, p.factor(), nil)
		} else if p.current.Type == lexer.SHIFT_RIGHT {
			p.advance()
			result = node.NewNode(node.SHIFT_RIGHT, result, p.factor(), nil)
		} else {
			p.error("Invalid power", p.current.Pos)
		}
	}

	return result
}

func (p *Parser) term() *node.Node {
	result := p.bitLogic()

	for p.current.Type == lexer.MULTIPLY ||
		p.current.Type == lexer.DIVIDE ||
		p.current.Type == lexer.MODULO {

		if p.current.Type == lexer.MULTIPLY {
			p.advance()
			result = node.NewNode(node.MULTIPLY, result, p.bitLogic(), nil)
		} else if p.current.Type == lexer.DIVIDE {
			p.advance()
			result = node.NewNode(node.DIVIDE, result, p.bitLogic(), nil)
		} else if p.current.Type == lexer.MODULO {
			p.advance()
			result = node.NewNode(node.MODULO, result, p.bitLogic(), nil)
		} else {
			p.error("Invalid term", p.current.Pos)
		}
	}

	return result
}

func (p *Parser) compare() *node.Node {
	result := p.term()

	for p.current.Type == lexer.EQUALS ||
		p.current.Type == lexer.NOT_EQUALS ||
		p.current.Type == lexer.LESS ||
		p.current.Type == lexer.LESS_EQUALS ||
		p.current.Type == lexer.MORE ||
		p.current.Type == lexer.MORE_EQUALS {
		c, _ := compare.TokenTypeToCompare(p.current.Type)
		p.advance()
		result = node.NewNode(node.COMPARE, result, p.term(), c)
	}

	return result
}

func (p *Parser) expression() *node.Node {
	result := p.compare()

	for p.current.Type == lexer.PLUS ||
		p.current.Type == lexer.MINUS {
		if p.current.Type == lexer.MINUS {
			p.advance()
			result = node.NewNode(node.SUBTRACT, result, p.term(), nil)
		} else if p.current.Type == lexer.PLUS {
			p.advance()
			result = node.NewNode(node.ADD, result, p.term(), nil)
		} else {
			p.error("Invalid expression", p.current.Pos)
		}
	}

	return result
}

func (p *Parser) functionAttributes() []function.FunctionAttribute {
	attributes := []function.FunctionAttribute{}

	if p.current.Type == lexer.LPAREN {
		p.advance()
		for {
			if p.current.Type == lexer.ID {
				attributes = append(attributes, function.StringToFunctionAttribute(p.current.Value.(string)))
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

func (p *Parser) functionArguments() []datatype.NamedDatatype {
	arguments := []datatype.NamedDatatype{}
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

func (p *Parser) parseIf(f *function.Function) *node.Node {
	p.advance()
	expression := p.expression()
	if expression == nil {
		p.error("Expected expression", p.current.Pos)
	}
	p.expect(lexer.LBRACE)
	codeBlock := p.codeBlock(f)
	p.expect(lexer.RBRACE)
	p.advance()
	if p.current.Type == lexer.ID {
		if p.current.Value == "else" {
			p.advance()
			if p.current.Type == lexer.ID {
				if p.current.Value == "if" {
					elseCodeBlock := p.parseIf(f)
					p.expect(lexer.RBRACE)
					return node.NewNode(node.IF, expression, nil, parser.If{TrueBlock: codeBlock, FalseBlock: []*node.Node{elseCodeBlock}})
				} else {
					p.error("Expected if", p.current.Pos)
					panic("?")
				}
			} else {
				p.expect(lexer.LBRACE)
				elseCodeBlock := p.codeBlock(f)
				p.expect(lexer.RBRACE)
				return node.NewNode(node.IF, expression, nil, parser.If{TrueBlock: codeBlock, FalseBlock: elseCodeBlock})
			}
		} else {
			p.reverse()
			return node.NewNode(node.IF, expression, nil, parser.If{TrueBlock: codeBlock, FalseBlock: []*node.Node{}})
		}
	} else {
		p.reverse()
		return node.NewNode(node.IF, expression, nil, parser.If{TrueBlock: codeBlock, FalseBlock: []*node.Node{}})
	}
}

func (p *Parser) keyword(f *function.Function) []*node.Node {
	if p.current.Type != lexer.ID {
		return nil
	}
	switch p.current.Value.(string) {
	case "return":
		p.advance()
		ret := []*node.Node{node.NewNode(node.RETURN, p.expression(), nil, nil)}
		p.expect(lexer.END_OF_LINE)
		return ret
	case "for":
		forBody := []*node.Node{}
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
		codeBlock := p.codeBlock(f)
		codeBlock = append(codeBlock, update)
		forBody = append(forBody, node.NewNode(node.CONDITIONAL_LOOP, expression, nil, codeBlock))
		p.expect(lexer.RBRACE)

		return forBody
	case "if":
		return []*node.Node{p.parseIf(f)}
	case "while":
		p.advance()
		expression := p.expression()
		p.expect(lexer.LBRACE)
		if expression == nil {
			p.error("Expected expression", p.current.Pos)
		}

		codeBlock := p.codeBlock(f)
		p.expect(lexer.RBRACE)
		return []*node.Node{node.NewNode(node.CONDITIONAL_LOOP, expression, nil, codeBlock)}
	case "do":
		p.advanceExpect(lexer.LBRACE)
		codeBlock := p.codeBlock(f)
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
		return []*node.Node{node.NewNode(node.POST_CONDITIONAL_LOOP, expression, nil, codeBlock)}
	case "loop":
		p.advance()
		p.expect(lexer.LBRACE)
		codeBlock := p.codeBlock(f)
		p.expect(lexer.RBRACE)
		return []*node.Node{node.NewNode(node.LOOP, nil, nil, codeBlock)}
	case "end":
		p.advance()
		p.expect(lexer.LBRACE)
		codeBlock := p.codeBlock(f)
		p.expect(lexer.RBRACE)

		endId := "end_" + strconv.Itoa(f.EndId)
		f.EndId++

		f.Entry = append(f.Entry, node.NewNode(node.VARIABLE_DECLARATION, node.NewNode(node.NUMBER, nil, nil, 0), nil, datatype.NamedDatatype{
			UnnamedDatatype: datatype.UnnamedDatatype{Type: datatype.INT, IsArray: false},
			Name:            endId,
		}))
		f.Exit = append(f.Exit, node.NewNode(node.IF, node.NewNode(node.VARIABLE_LOOKUP, nil, nil, endId), nil, parser.If{TrueBlock: codeBlock}))

		return []*node.Node{node.NewNode(node.VARIABLE_ASSIGN, node.NewNode(node.NUMBER, nil, nil, 1), nil, endId)}
	case "range":
		p.advance()
		from := p.expression()
		p.expect(lexer.RANGE_DOT)

		p.advance()
		to := p.expression()
		p.expect(lexer.ID)

		if p.current.Value.(string) != "as" {
			p.error("Expected as", p.current.Pos)
		}
		p.advanceExpect(lexer.ID)

		as := p.current.Value.(string)
		p.advanceExpect(lexer.ID)

		modeStr := p.current.Value.(string)
		mode, err := parser.GetRangeMode(modeStr)
		if err != nil {
			p.error(err.Error(), p.current.Pos)
		}
		p.advanceExpect(lexer.LBRACE)

		codeBlock := p.codeBlock(f)
		switch mode {
		case parser.RANGE_UP:
			codeBlock = append(codeBlock, p.variableSelfModify(as, node.ADD))
		case parser.RANGE_DOWN:
			codeBlock = append(codeBlock, p.variableSelfModify(as, node.SUBTRACT))
		default:
			panic("?")
		}
		p.expect(lexer.RBRACE)

		ret := []*node.Node{
			node.NewNode(node.VARIABLE_DECLARATION, from, nil, datatype.NamedDatatype{
				UnnamedDatatype: datatype.UnnamedDatatype{
					Type:    datatype.INT,
					IsArray: false,
				},
				Name: as,
			}),
		}

		switch mode {
		case parser.RANGE_UP:
			ret = append(ret, node.NewNode(node.CONDITIONAL_LOOP, node.NewNode(node.COMPARE,
				node.NewNode(node.VARIABLE_LOOKUP, nil, nil, as), to, compare.Less), nil, codeBlock))
		case parser.RANGE_DOWN:
			ret = append(ret, node.NewNode(node.CONDITIONAL_LOOP, node.NewNode(node.COMPARE,
				node.NewNode(node.VARIABLE_LOOKUP, nil, nil, as), to, compare.More), nil, codeBlock))
		default:
			panic("?")
		}

		return ret
	default:
		return nil
	}
}

func (p *Parser) variableSelfModify(name string, operation node.NodeType) *node.Node {
	return &node.Node{
		Type: node.VARIABLE_ASSIGN,
		A: &node.Node{
			Type: operation,
			A: &node.Node{
				Type:  node.VARIABLE_LOOKUP,
				Value: name,
			},
			B: &node.Node{
				Type:  node.NUMBER,
				Value: 1,
			},
		},
		Value: name,
	}
}

func (p *Parser) codeLine() *node.Node {
	if p.current.Type == lexer.ID {
		if datatype.IsDatatypeString(p.current.Value.(string)) {
			datatype := p.datatypeNamed()
			if p.current.Type == lexer.END_OF_LINE {
				return node.NewNode(node.VARIABLE_DECLARATION, nil, nil, datatype)
			}
			p.expect(lexer.ASSIGN)
			p.advance()
			return node.NewNode(node.VARIABLE_DECLARATION, p.expression(), nil, datatype)
		} else {
			possibleVariableName := p.current.Value.(string)
			p.advance()
			if p.current.Type == lexer.ASSIGN {
				p.advance()
				expression := p.expression()
				if expression == nil {
					p.error("Expected expression", p.current.Pos)
				}
				return node.NewNode(node.VARIABLE_ASSIGN, expression, nil, possibleVariableName)
			} else if p.current.Type == lexer.INCREASE {
				p.advance()
				return p.variableSelfModify(possibleVariableName, node.ADD)
			} else if p.current.Type == lexer.DECREASE {
				p.advance()
				return p.variableSelfModify(possibleVariableName, node.SUBTRACT)
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
				return node.NewNode(node.VARIABLE_ASSIGN_ARRAY, indexExpression, expression, possibleVariableName)
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

func (p *Parser) codeBlock(f *function.Function) []*node.Node {
	body := []*node.Node{}
	p.expect(lexer.LBRACE)
	p.advance()
	for {
		if p.current.Type == lexer.RBRACE {
			return body
		}
		keyword := p.keyword(f)
		if keyword != nil {
			body = append(body, keyword...)
		} else {
			body = append(body, p.codeLine())
			p.expect(lexer.END_OF_LINE)
		}
		p.advance()
	}
}

func (p *Parser) Global() *node.Node {
	global := []*node.Node{}

	for p.current != nil {
		if p.current.Type == lexer.ID {
			if datatype.IsDatatypeString(p.current.Value.(string)) {
				datatype := p.datatypeNamed()
				if p.current.Type == lexer.END_OF_LINE {
					global = append(global, node.NewNode(node.VARIABLE_DECLARATION, nil, nil, datatype))
				} else {
					p.expect(lexer.ASSIGN)
					p.advance()
					global = append(global, node.NewNode(node.VARIABLE_DECLARATION, p.expression(), nil, datatype))
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
				if utils.IndexOf(attributes, function.Assembly) >= 0 {
					p.expect(lexer.LBRACE)
					p.advanceExpect(lexer.STRING)
					body := []*node.Node{node.NewNode(node.ASSEMBLY_CODE, nil, nil, p.current.Value)}
					p.advanceExpect(lexer.RBRACE)
					global = append(global, node.NewNode(node.FUNCTION, nil, nil, function.Function{
						Name:           name,
						Attributes:     attributes,
						Body:           body,
						ReturnDatatype: returnDatatype,
						Arguments:      arguments,
						EndId:          0,
						Exit:           []*node.Node{},
						Entry:          []*node.Node{},
					}))
				} else if utils.IndexOf(attributes, function.External) >= 0 {
					p.expect(lexer.END_OF_LINE)
					global = append(global, node.NewNode(node.FUNCTION, nil, nil, function.Function{
						Name:           name,
						Attributes:     attributes,
						Body:           nil,
						ReturnDatatype: returnDatatype,
						Arguments:      arguments,
						EndId:          0,
						Exit:           []*node.Node{},
						Entry:          []*node.Node{},
					}))
				} else {
					function := function.Function{
						Name:           name,
						Attributes:     attributes,
						ReturnDatatype: returnDatatype,
						Arguments:      arguments,
						Exit:           []*node.Node{},
						Entry:          []*node.Node{},
					}
					function.Body = p.codeBlock(&function)

					global = append(global, node.NewNode(node.FUNCTION, nil, nil, function))
				}
			} else if p.current.Value == "offset" {
				p.advanceExpect(lexer.ID)
				name := p.current.Value.(string)
				p.advanceExpect(lexer.LBRACE)

				entries := []datatype.NamedDatatype{}

				for {
					p.advance()
					if p.current.Type == lexer.RBRACE {
						break
					}
					entries = append(entries, p.datatypeNamed())
					p.expect(lexer.END_OF_LINE)
				}

				p.expect(lexer.RBRACE)
				global = append(global, node.NewNode(node.OFFSET, nil, nil, parser.Offset{
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

	return node.NewNode(node.GLOBAL, nil, nil, global)
}
