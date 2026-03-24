package commands

import (
	"fire/arguments"
	"fire/firestorm"
	"fire/firestorm/parser/datatype"
	"fire/firestorm/parser/function"
	"fire/firestorm/parser/node"
	"fire/project"
	"fmt"
	"io/fs"
	"os"
	"strconv"
)

type Bindgen struct{}

func (Bindgen) PopulateParser(parser *arguments.Parser) {
}

func (b Bindgen) datatypeToCType(dt datatype.UnnamedDatatype) string {
	ctype := ""
	switch dt.Type {
	case datatype.INT:
		ctype = "int64_t"
	case datatype.CHR:
		ctype = "char"
	case datatype.STR:
		ctype = "char*"
	case datatype.PTR:
		ctype = "void*"
	case datatype.INT_16:
		ctype = "int16_t"
	case datatype.INT_32:
		ctype = "int32_t"
	case datatype.VOID:
		ctype = "void"
	}
	if dt.IsArray {
		ctype += "*"
	}
	return ctype
}

func (b Bindgen) generateStackPop(dt datatype.UnnamedDatatype, varName string) string {
	ctype := b.datatypeToCType(dt)
	return "\t" + ctype + " " + varName + " = (" + ctype + ") stack_pop(vm);\n"
}

func (b Bindgen) generateStackPush(value string) string {
	return "\tstack_push(vm, (int64_t)" + value + ");\n"
}

func (b Bindgen) generateFunctionCall(f *function.Function) string {
	code := f.Name + "("

	for i := 0; i < len(f.Arguments); i++ {
		if i > 0 {
			code += ", "
		}
		code += f.Arguments[i].Name
	}

	code += ")"
	return code
}

func (Bindgen) findFunction(global *node.Node, name string) *function.Function {
	nodes := global.Value.([]*node.Node)
	for i := range nodes {
		switch nodes[i].Type {
		case node.FUNCTION:
			f := nodes[i].Value.(function.Function)
			if f.Name == name {
				return &f
			}
		}
	}

	return nil
}

func (b Bindgen) Execute(parser *arguments.Parser) error {
	proj, err := project.Load()
	if err != nil {
		return err
	}

	fmt.Println("Binding generation " + proj.Name + "@" + proj.Version)

	code, err := os.ReadFile(proj.Compiler.Input)
	if err != nil {
		panic(err)
	}

	global, processedCode, preprocessor, analyzer := firestorm.PrepareCompilation(proj.Compiler.Output, code, proj.Compiler.Includes)
	_ = processedCode
	_ = analyzer

	output := "#include \"vm.h\"\n\n"

	for i := range preprocessor.NativeFunctions {
		f := b.findFunction(global, i)
		if f == nil {
			continue
		}

		output += "void native_" + f.Name + "(struct vm_instance* vm) {\n"

		for j := len(f.Arguments) - 1; j >= 0; j-- {
			arg := f.Arguments[j]
			dt := datatype.UnnamedDatatype{
				Type:    arg.Type,
				IsArray: arg.IsArray,
			}
			output += b.generateStackPop(dt, arg.Name)
		}

		call := b.generateFunctionCall(f)

		if f.ReturnDatatype.Type != datatype.VOID {
			output += b.generateStackPush(call)
		} else {
			output += "\t" + call + ";\n"
			output += b.generateStackPush("0")
		}

		output += "}\n\n"
	}

	output += "void init() {\n"
	for i, id := range preprocessor.NativeFunctions {
		output += "\tvm_native_register(" + strconv.Itoa(id) + ", native_" + i + ");\n"
	}
	output += "}\n"

	err = os.WriteFile("native.c", []byte(output), fs.ModePerm)
	if err != nil {
		panic(err)
	}

	return nil
}

func (Bindgen) Description() string {
	return "Generate native bindings for flvm"
}
