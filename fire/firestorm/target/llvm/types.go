package llvm

import (
	"fire/firestorm/parser"

	"github.com/llir/llvm/ir"
	"github.com/llir/llvm/ir/types"
	"github.com/llir/llvm/ir/value"
)

type CompiledFunction struct {
	variables       map[string]*ir.InstAlloca
	entryBlock      *ir.Block
	returnBlock     *ir.Block
	returnIncomings []*ir.Incoming
	returnType      types.Type
	name            string
	endId           int
	endExec         []*parser.Node
}

func (cf *CompiledFunction) findVariable(name string, err func(string, *CompiledFunction)) (value.Value, types.Type) {
	if v, ok := cf.variables[name]; ok {
		return v, v.ElemType
	}
	err("Variable "+name+" not found!", cf)
	panic("?")
}
