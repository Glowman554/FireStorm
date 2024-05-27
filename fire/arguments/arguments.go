package arguments

import (
	"errors"
	"fmt"
	"strings"
)

type Node struct {
	Name  string
	Value *string
}

type Allowed struct {
	Name        string
	Description string
}

type Parser struct {
	Allowed []Allowed
	Nodes   []Node
}

func NewParser() *Parser {
	return &Parser{
		Allowed: []Allowed{},
		Nodes:   []Node{},
	}
}

func (p *Parser) Parse(args []string) error {
	for i := range args {
		arg := args[i]

		if option, ok := strings.CutPrefix(arg, "--"); ok {
			if option == "help" {
				p.help()
				continue
			}
			split := strings.SplitN(option, "=", 2)
			if !p.isValid(split[0]) {
				return errors.New("encountered invalid option " + split[0])
			}

			if len(split) > 1 {
				p.Nodes = append(p.Nodes, Node{Name: split[0], Value: &split[1]})
			} else {
				p.Nodes = append(p.Nodes, Node{Name: split[0], Value: nil})
			}
		} else {
			return errors.New("No -- prefix " + arg)
		}
	}
	return nil
}

func (p *Parser) isValid(arg string) bool {
	for i := range p.Allowed {
		if p.Allowed[i].Name == arg {
			return true
		}
	}
	return false
}

func (p *Parser) help() {
	maxLen := 0
	for _, entry := range p.Allowed {
		if len(entry.Name) > maxLen {
			maxLen = len(entry.Name)
		}
	}

	fmt.Println("Valid options: ")
	for _, entry := range p.Allowed {
		paddingAmount := maxLen - len(entry.Name)
		padding := ""
		for range paddingAmount {
			padding += " "
		}

		fmt.Println("> --" + entry.Name + padding + " - " + entry.Description)
	}
}

func (p *Parser) Consume(name string, def *string) (*string, error) {
	for i := range p.Nodes {
		node := p.Nodes[i]

		if node.Name == name {
			if node.Value == nil {
				return nil, errors.New("option " + name + " expected argument")
			}

			p.Nodes = remove(p.Nodes, i)
			return node.Value, nil
		}
	}

	if def != nil {
		return def, nil
	}

	return nil, errors.New("option " + name + " not found")
}

func (p *Parser) Has(name string) bool {
	for i := range p.Nodes {
		if p.Nodes[i].Name == name {
			return true
		}
	}
	return false
}

func (p *Parser) Allow(a string, des string) {
	p.Allowed = append(p.Allowed, Allowed{Name: a, Description: des})
}

func remove(s []Node, index int) []Node {
	return append(s[:index], s[index+1:]...)
}
