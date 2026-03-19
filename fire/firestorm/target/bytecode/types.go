package bytecode

type CompiledFunction struct {
	code          string
	name          string
	exitLabel     string
}

func NewCompiledFunction(name string, exitLabel string) *CompiledFunction {
	return &CompiledFunction{
		code:      "",
		name:      name,
		exitLabel: exitLabel,
	}
}
