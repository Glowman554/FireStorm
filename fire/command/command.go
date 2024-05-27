package command

import "fire/arguments"

type Command interface {
	PopulateParser(parser *arguments.Parser)
	Execute(parser *arguments.Parser) error
	Description() string
}
