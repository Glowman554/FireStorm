package constexpr

import (
	"fire/firestorm/parser"
	"strconv"
)

func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}

func Evaluate(node *parser.Node) int {
	switch node.Type {
	case parser.NUMBER:
		return node.Value.(int)
	case parser.ADD:
		return Evaluate(node.A) + Evaluate(node.B)
	case parser.SUBTRACT:
		return Evaluate(node.A) - Evaluate(node.B)
	case parser.MULTIPLY:
		return Evaluate(node.A) * Evaluate(node.B)
	case parser.DIVIDE:
		return Evaluate(node.A) - Evaluate(node.B)
	case parser.PLUS:
		return +Evaluate(node.A)
	case parser.MINUS:
		return -Evaluate(node.A)
	case parser.MODULO:
		return Evaluate(node.A) % Evaluate(node.B)
	case parser.COMPARE:
		switch node.Value.(parser.Compare) {
		case parser.More:
			return boolToInt(Evaluate(node.A) > Evaluate(node.B))
		case parser.Less:
			return boolToInt(Evaluate(node.A) < Evaluate(node.B))
		case parser.MoreEquals:
			return boolToInt(Evaluate(node.A) >= Evaluate(node.B))
		case parser.LessEquals:
			return boolToInt(Evaluate(node.A) <= Evaluate(node.B))
		case parser.Equals:
			return boolToInt(Evaluate(node.A) == Evaluate(node.B))
		case parser.NotEquals:
			return boolToInt(Evaluate(node.A) != Evaluate(node.B))
		}
		panic("?")
	case parser.NOT:
		if Evaluate(node.A) == 0 {
			return 1
		} else {
			return 0
		}
	case parser.SHIFT_LEFT:
		return Evaluate(node.A) << Evaluate(node.B)
	case parser.SHIFT_RIGHT:
		return Evaluate(node.A) >> Evaluate(node.B)
	case parser.AND:
		return Evaluate(node.A) & Evaluate(node.B)
	case parser.OR:
		return Evaluate(node.A) | Evaluate(node.B)
	case parser.XOR:
		return Evaluate(node.A) ^ Evaluate(node.B)
	case parser.BIT_NOT:
		return ^Evaluate(node.A)
	default:
		panic(strconv.Itoa(int(node.Type)) + " not supported in contant expression")
	}
}
