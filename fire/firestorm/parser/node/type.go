package node

type NodeType int

const (
	GLOBAL NodeType = iota
	FUNCTION
	ASSEMBLY_CODE
	VARIABLE_DECLARATION

	NUMBER
	STRING
	ADD
	SUBTRACT
	MULTIPLY
	DIVIDE
	PLUS
	MINUS
	MODULO
	VARIABLE_LOOKUP
	VARIABLE_LOOKUP_ARRAY

	COMPARE
	NOT

	IF

	FUNCTION_CALL

	RETURN

	VARIABLE_ASSIGN
	VARIABLE_ASSIGN_ARRAY

	CONDITIONAL_LOOP
	UPDATE_CONDITIONAL_LOOP
	POST_CONDITIONAL_LOOP
	LOOP

	SHIFT_LEFT
	SHIFT_RIGHT
	AND
	OR
	XOR
	BIT_NOT

	OFFSET

	CONTINUE
	BREAK
)

type Node struct {
	Type  NodeType
	A     *Node
	B     *Node
	Value any
	Pos   int
}

func NewNode(nodeType NodeType, a *Node, b *Node, value any, pos int) *Node {
	return &Node{
		Type:  nodeType,
		A:     a,
		B:     b,
		Value: value,
		Pos:   pos,
	}
}
