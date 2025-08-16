package bytecode

import (
	"fire/firestorm/constexpr"
	"fire/firestorm/parser"
	"fire/firestorm/parser/compare"
	"fire/firestorm/parser/datatype"
	"fire/firestorm/parser/function"
	"fire/firestorm/parser/node"
	"fire/firestorm/utils"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
)

type BYTECODE struct {
	global            *node.Node
	clabel            int
	compiledFunctions []*CompiledFunction
}

func NewBYTECODE(global *node.Node) *BYTECODE {
	return &BYTECODE{
		global:            global,
		clabel:            0,
		compiledFunctions: []*CompiledFunction{},
	}
}

func (b *BYTECODE) resolveFunction(name string) *node.Node {
	tmp := b.global.Value.([]*node.Node)
	for i := range tmp {
		if tmp[i].Type == node.FUNCTION {
			f := tmp[i].Value.(function.Function)
			if f.Name == name {
				return tmp[i]
			}
		}
	}

	return nil
}

func (b *BYTECODE) label() string {
	str := fmt.Sprint(b.clabel)
	b.clabel++
	return str
}

func (b *BYTECODE) emitNativeCall(fc function.FunctionCall) string {
	return "\tinvoke_native " + fc.Name + "\n"
}

func (b *BYTECODE) error(message string, cf *CompiledFunction) {
	if cf == nil {
		fmt.Println("error:", message)
	} else {
		fmt.Println("error: (in:", cf.name+"):", message)
	}
	panic("Compilation failed")
}

func (b *BYTECODE) datatypeToSize(d datatype.UnnamedDatatype) int {
	if d.IsArray {
		return 8
	}

	switch d.Type {
	case datatype.INT:
		return 8
	case datatype.STR:
		return 8
	case datatype.VOID:
		return 0
	case datatype.CHR:
		return 1
	case datatype.PTR:
		return 8
	case datatype.INT_32:
		return 4
	case datatype.INT_16:
		return 2
	default:
		panic("Invalid datatype")
	}
}

func (b *BYTECODE) generateExpression(exp *node.Node, cf *CompiledFunction) string {
	code := ""

	genAB := func() string {
		return b.generateExpression(exp.A, cf) + b.generateExpression(exp.B, cf)
	}

	switch exp.Type {
	case node.NUMBER:
		code += "\tnumber " + fmt.Sprint(exp.Value.(int)) + "\n"
	case node.STRING:
		code += "\tstring \"" + b.encodeString(exp) + "\"\n"
	case node.COMPARE:
		code += genAB()
		code += "\t" + compare.CompareToString(exp.Value.(compare.Compare)) + "\n"
	case node.NOT:
		code += b.generateExpression(exp.A, cf)
		code += "\tinvert\n"
	case node.ADD:
		code += genAB()
		code += "\tadd\n"
	case node.SUBTRACT:
		code += genAB()
		code += "\tsub\n"
	case node.MULTIPLY:
		code += genAB()
		code += "\tmul\n"
	case node.DIVIDE:
		code += genAB()
		code += "\tdiv\n"
	case node.MODULO:
		code += genAB()
		code += "\tmod\n"
	case node.OR:
		code += genAB()
		code += "\tor\n"
	case node.AND:
		code += genAB()
		code += "\tand\n"
	case node.XOR:
		code += genAB()
		code += "\txor\n"
	case node.BIT_NOT:
		code += b.generateExpression(exp.A, cf)
		code += "\tnot\n"
	case node.SHIFT_LEFT:
		code += genAB()
		code += "\tshift_left\n"
	case node.SHIFT_RIGHT:
		code += genAB()
		code += "\tshift_right\n"
	case node.FUNCTION_CALL:
		fc := exp.Value.(function.FunctionCall)
		cf.use(fc.Name)

		for i := range fc.Arguments {
			code += b.generateExpression(fc.Arguments[i], cf)
		}

		fn := b.resolveFunction(fc.Name)
		if fn != nil {
			if len(fn.Value.(function.Function).Arguments) != len(fc.Arguments) {
				b.error("To manny or not enough arguments!", cf)
			}

		} else {
			b.error("Function "+fc.Name+" not found!", cf)
		}

		f := fn.Value.(function.Function)
		if utils.IndexOf(f.Attributes, function.External) != -1 {
			code += b.emitNativeCall(fc)
		} else {
			code += "\tinvoke " + fc.Name + "\n"
		}

	case node.VARIABLE_LOOKUP:
		code += "\tload " + exp.Value.(string) + "\n"
	case node.VARIABLE_LOOKUP_ARRAY:
		code += b.generateExpression(exp.A, cf)
		code += "\tload_indexed " + exp.Value.(string) + "\n"

	case node.MINUS:
		code += b.generateExpression(exp.A, cf)
		code += "\tchange_sign\n"

	default:
		panic("Unknown " + strconv.Itoa(int(exp.Type)))
	}

	return code
}

func (b *BYTECODE) encodeString(node *node.Node) string {
	s := node.Value.(string)

	s = strings.ReplaceAll(s, "\"", "\\\"")
	s = strings.ReplaceAll(s, "\n", "\\n")
	s = strings.ReplaceAll(s, "\r", "\\r")
	s = strings.ReplaceAll(s, "\t", "\\t")
	s = strings.ReplaceAll(s, "\b", "\\b")

	return s
}

func (b *BYTECODE) generateCodeBlock(f function.Function, block []*node.Node, cf *CompiledFunction) string {
	code := ""
	for i := range block {
		switch block[i].Type {
		case node.VARIABLE_DECLARATION:
			d := block[i].Value.(datatype.NamedDatatype)
			code += "\tvariable " + d.Name + " " + datatype.DatatypeToString(d.Type) + " " + fmt.Sprint(d.IsArray) + "\n" // TODO: correct?

			if block[i].A != nil {
				code += b.generateExpression(block[i].A, cf)
				code += "\tassign " + d.Name + "\n"
			}
		case node.VARIABLE_ASSIGN:
			if block[i].A != nil {
				code += b.generateExpression(block[i].A, cf)
				code += "\tassign " + block[i].Value.(string) + "\n"
			}
		case node.VARIABLE_ASSIGN_ARRAY:
			code += b.generateExpression(block[i].A, cf)
			code += b.generateExpression(block[i].B, cf)
			code += "\tassign_indexed " + block[i].Value.(string) + "\n"

		case node.FUNCTION_CALL:
			fc := block[i].Value.(function.FunctionCall)
			cf.use(fc.Name)

			for i := range fc.Arguments {
				code += b.generateExpression(fc.Arguments[i], cf)
			}

			fn := b.resolveFunction(fc.Name)
			if fn != nil {
				if len(fn.Value.(function.Function).Arguments) != len(fc.Arguments) {
					b.error("To many or not enough arguments!", cf)
				}

			} else {
				b.error("Function "+fc.Name+" not found!", cf)
			}

			f := fn.Value.(function.Function)
			if utils.IndexOf(f.Attributes, function.External) != -1 {
				code += b.emitNativeCall(fc)
			} else {
				code += "\tinvoke " + fc.Name + "\n"
			}
			code += "\tdelete\n"

		case node.RETURN:
			if block[i].A != nil {
				code += b.generateExpression(block[i].A, cf)
			} else {
				code += "\tnumber 0\n"
			}
			code += "\tgoto " + cf.exitLabel + "\n"

		case node.IF:
			code += b.generateExpression(block[i].A, cf)
			iff := block[i].Value.(parser.If)
			label := b.label()
			if iff.FalseBlock != nil {
				label2 := b.label()
				code += "\tgoto_false " + label + "\n"
				code += b.generateCodeBlock(f, iff.TrueBlock, cf)
				code += "\tgoto " + label2 + "\n"
				code += label + ":\n"
				code += b.generateCodeBlock(f, iff.FalseBlock, cf)
				code += label2 + ":\n"
			} else {
				code += "\tgoto_false " + label + "\n"
				code += b.generateCodeBlock(f, iff.TrueBlock, cf)
				code += label + ":\n"
			}

		case node.CONDITIONAL_LOOP:
			loop_back_label := b.label()
			code += loop_back_label + ":\n"
			code += b.generateExpression(block[i].A, cf)
			loop_exit_label := b.label()
			code += "\tgoto_false " + loop_exit_label + "\n"
			code += b.generateCodeBlock(f, block[i].Value.([]*node.Node), cf)
			code += "\tgoto " + loop_back_label + "\n"
			code += loop_exit_label + ":\n"

		case node.POST_CONDITIONAL_LOOP:
			loop_back_label := b.label()
			code += loop_back_label + ":\n"
			code += b.generateCodeBlock(f, block[i].Value.([]*node.Node), cf)
			code += b.generateExpression(block[i].A, cf)
			code += "\tgoto_true " + loop_back_label + "\n"

		case node.LOOP:
			label := b.label()
			code += label + ":\n"
			code += b.generateCodeBlock(f, block[i].Value.([]*node.Node), cf)
			code += "\tgoto " + label + "\n"

		default:
			panic("Unknown " + strconv.Itoa(int(block[i].Type)))
		}
	}

	return code
}

func (b *BYTECODE) generateFunction(f function.Function) *CompiledFunction {
	cf := NewCompiledFunction(f.Name, b.label())

	code := ""
	aftercode := ""
	precode := ""

	if utils.IndexOf(f.Attributes, function.Assembly) != -1 {
		if len(f.Body) != 1 || f.Body[0].Type != node.ASSEMBLY_CODE {
			b.error("Invalid assembly function", cf)
		}
		code += f.Body[0].Value.(string)
	} else if utils.IndexOf(f.Attributes, function.External) != -1 {
		return nil
	} else {
		precode += b.generateCodeBlock(f, f.Entry, cf)

		for i := len(f.Arguments) - 1; i >= 0; i-- {
			a := f.Arguments[i]
			code += "\tvariable " + a.Name + " " + datatype.DatatypeToString(a.Type) + " " + fmt.Sprint(a.IsArray) + "\n"
			code += "\tassign " + a.Name + "\n"
		}

		if utils.IndexOf(f.Attributes, function.NoReturn) != -1 {
			precode += "\tnoreturn\n"
		}

		aftercode += "\tnumber 0\n"

		aftercode += cf.exitLabel + ":\n"
		aftercode += b.generateCodeBlock(f, f.Exit, cf)
		aftercode += "\treturn\n"

		code += b.generateCodeBlock(f, f.Body, cf)
	}

	cf.code = "@begin function " + f.Name + "\n" + f.Name + ":\n" + precode + code + aftercode + "@end function\n"

	return cf
}

func (b *BYTECODE) keepFunction(name string) {
	for i := range b.compiledFunctions {
		f := b.compiledFunctions[i]
		if f.name == name {
			if f.keep {
				return // do not cause loops
			}

			f.keep = true
			for j := range f.usedFunctions {
				b.keepFunction(f.usedFunctions[j])
			}

			return
		}
	}
}

func (b *BYTECODE) generateOffset(offset parser.Offset) string {
	current := 0
	code := ""

	for _, entry := range offset.Entries {
		size := b.datatypeToSize(entry.UnnamedDatatype)
		name := offset.Name + "_" + entry.Name
		code += "global " + name + " " + datatype.DatatypeToString(datatype.INT) + " " + fmt.Sprint(current) + "\n"
		current += size
	}

	name := offset.Name + "_size"
	code += "global " + name + " " + datatype.DatatypeToString(datatype.INT) + " " + fmt.Sprint(current) + "\n"

	return code
}

// TODO: external should be native call and assembly should be raw bytecode unencoded

func (b *BYTECODE) Compile() string {
	tmp := b.global.Value.([]*node.Node)

	code := ""

	code += "@begin global global\n"

	for i := range tmp {
		switch tmp[i].Type {
		case node.FUNCTION:
		case node.VARIABLE_DECLARATION:
			if tmp[i].A != nil {
				if (tmp[i].Value.(datatype.NamedDatatype)).IsArray {
					panic("Global array inizializers not supported!")
				}

				dt := tmp[i].Value.(datatype.NamedDatatype)
				switch dt.Type {
				case datatype.STR:
					if tmp[i].A.Type != node.STRING {
						panic("Expected string!")
					}
					code += "global " + dt.Name + " " + datatype.DatatypeToString(dt.Type) + " \"" + b.encodeString(tmp[i].A) + "\"\n"

				case datatype.CHR:
					fallthrough
				case datatype.INT_16:
					fallthrough
				case datatype.INT_32:
					fallthrough
				case datatype.INT:
					code += "global " + dt.Name + " " + datatype.DatatypeToString(dt.Type) + " " + fmt.Sprint(constexpr.Evaluate(tmp[i].A)) + "\n"
				default:
					panic("Unknown " + datatype.DatatypeToString(dt.Type))
				}
			} else {
				dt := tmp[i].Value.(datatype.NamedDatatype)
				code += "global_reserve " + dt.Name + " " + datatype.DatatypeToString(dt.Type) + " " + fmt.Sprint(dt.IsArray) + "\n"
			}

		case node.OFFSET:
			code += b.generateOffset(tmp[i].Value.(parser.Offset))

		default:
			panic("Unsupported " + strconv.Itoa(int(tmp[i].Type)))
		}
	}
	code += "@end global\n"

	for i := range tmp {
		switch tmp[i].Type {
		case node.FUNCTION:
			f := b.generateFunction(tmp[i].Value.(function.Function))
			if f != nil {
				b.compiledFunctions = append(b.compiledFunctions, f)
			}

		case node.VARIABLE_DECLARATION:
		case node.OFFSET:
		default:
			panic("Unsupported " + strconv.Itoa(int(tmp[i].Type)))
		}
	}

	for i := range tmp {
		switch tmp[i].Type {
		case node.FUNCTION:
			if utils.IndexOf(tmp[i].Value.(function.Function).Attributes, function.Keep) != -1 {
				b.keepFunction((tmp[i].Value.(function.Function)).Name)
			}
		}
	}

	b.keepFunction("spark")

	for i := range b.compiledFunctions {
		if b.compiledFunctions[i].keep {
			code += b.compiledFunctions[i].code
		} else {
			slog.Debug("Removing unused function " + b.compiledFunctions[i].name)
		}
	}

	return code
}
