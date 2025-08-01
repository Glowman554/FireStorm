package bytecode

import (
	"fire/firestorm/utils"
)

type CompiledFunction struct {
	code          string
	name          string
	usedFunctions []string
	keep          bool
	exitLabel     string
}

func NewCompiledFunction(name string, exitLabel string) *CompiledFunction {
	return &CompiledFunction{
		code:          "",
		name:          name,
		usedFunctions: []string{},
		keep:          false,
		exitLabel:     exitLabel,
	}
}

func (cf *CompiledFunction) use(name string) {
	if utils.IndexOf(cf.usedFunctions, name) == -1 {
		cf.usedFunctions = append(cf.usedFunctions, name)
	}
}
