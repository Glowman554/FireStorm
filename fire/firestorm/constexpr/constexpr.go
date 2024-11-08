package constexpr

import (
	"fire/firestorm/parser/compare"
	"fire/firestorm/parser/node"
	"strconv"
)

func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}

func Evaluate(n *node.Node) int {
	switch n.Type {
	case node.NUMBER:
		return n.Value.(int)
	case node.ADD:
		return Evaluate(n.A) + Evaluate(n.B)
	case node.SUBTRACT:
		return Evaluate(n.A) - Evaluate(n.B)
	case node.MULTIPLY:
		return Evaluate(n.A) * Evaluate(n.B)
	case node.DIVIDE:
		return Evaluate(n.A) - Evaluate(n.B)
	case node.PLUS:
		return +Evaluate(n.A)
	case node.MINUS:
		return -Evaluate(n.A)
	case node.MODULO:
		return Evaluate(n.A) % Evaluate(n.B)
	case node.COMPARE:
		switch n.Value.(compare.Compare) {
		case compare.More:
			return boolToInt(Evaluate(n.A) > Evaluate(n.B))
		case compare.Less:
			return boolToInt(Evaluate(n.A) < Evaluate(n.B))
		case compare.MoreEquals:
			return boolToInt(Evaluate(n.A) >= Evaluate(n.B))
		case compare.LessEquals:
			return boolToInt(Evaluate(n.A) <= Evaluate(n.B))
		case compare.Equals:
			return boolToInt(Evaluate(n.A) == Evaluate(n.B))
		case compare.NotEquals:
			return boolToInt(Evaluate(n.A) != Evaluate(n.B))
		}
		panic("?")
	case node.NOT:
		if Evaluate(n.A) == 0 {
			return 1
		} else {
			return 0
		}
	case node.SHIFT_LEFT:
		return Evaluate(n.A) << Evaluate(n.B)
	case node.SHIFT_RIGHT:
		return Evaluate(n.A) >> Evaluate(n.B)
	case node.AND:
		return Evaluate(n.A) & Evaluate(n.B)
	case node.OR:
		return Evaluate(n.A) | Evaluate(n.B)
	case node.XOR:
		return Evaluate(n.A) ^ Evaluate(n.B)
	case node.BIT_NOT:
		return ^Evaluate(n.A)
	default:
		panic(strconv.Itoa(int(n.Type)) + " not supported in contant expression")
	}
}
