package parser

import "fire/firestorm/parser/node"

type If struct {
	TrueBlock  []*node.Node
	FalseBlock []*node.Node
}
