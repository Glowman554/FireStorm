package llvm

import (
	"fire/firestorm/analyzer"
	"fire/firestorm/constexpr"
	"fire/firestorm/lineerror"
	"fire/firestorm/parser"
	"fire/firestorm/parser/compare"
	"fire/firestorm/parser/datatype"
	"fire/firestorm/parser/function"
	"fire/firestorm/parser/node"
	"fire/firestorm/utils"
	"log/slog"
	"strconv"

	"github.com/llir/llvm/ir"
	"github.com/llir/llvm/ir/constant"
	"github.com/llir/llvm/ir/enum"
	"github.com/llir/llvm/ir/types"
	"github.com/llir/llvm/ir/value"
)

type GlobalVariable struct {
	varivable *ir.Global
	final     bool
}

type LLVM struct {
	global          *node.Node
	globalVariables map[string]GlobalVariable
	functions       map[string]*ir.Func
	module          *ir.Module
	globalId        int
	ptrType         types.Type
	target          string
	code            string
	analyzer        *analyzer.Analyzer
}

func NewLLVM(global *node.Node, target string, code string, analyzer *analyzer.Analyzer) *LLVM {
	return &LLVM{
		global:          global,
		globalVariables: make(map[string]GlobalVariable),
		functions:       make(map[string]*ir.Func),
		globalId:        0,
		ptrType:         types.I64,
		target:          target,
		code:            code,
		analyzer:        analyzer,
	}
}

func (l *LLVM) error(message string, pos int, cf *CompiledFunction) {
	if cf == nil {
		lineerror.Error(l.code, message, pos)
	} else {
		lineerror.Error(l.code, message+" (in: "+cf.name+")", pos)
	}
}

func (l *LLVM) findFunction(name string, pos int, cf *CompiledFunction) *ir.Func {
	if f, ok := l.functions[name]; ok {
		return f
	}
	l.error("Function "+name+" not found!", pos, cf)
	panic("?")
}

func (l *LLVM) findVariable(name string, pos int, cf *CompiledFunction, assign bool) (value.Value, types.Type) {
	if v, ok := l.globalVariables[name]; ok {
		if assign && v.final {
			panic("Cannot assign to final variable " + name)
		}
		return v.varivable, v.varivable.ContentType
	}
	return cf.findVariable(name, pos, l.error)
}

func (b *LLVM) newGlobalString(v string) value.Value {
	id := "str." + strconv.Itoa(b.globalId)
	b.globalId++

	str := constant.NewCharArrayFromString(v + "\x00")
	globalStr := b.module.NewGlobalDef(id, str)

	zero := constant.NewInt(types.I64, 0)
	return constant.NewGetElementPtr(str.Typ, globalStr, zero, zero)
}

func (b *LLVM) compareToLLVM(c compare.Compare) enum.IPred {
	switch c {
	case compare.More:
		return enum.IPredSGT
	case compare.Less:
		return enum.IPredSLT
	case compare.MoreEquals:
		return enum.IPredSGE
	case compare.LessEquals:
		return enum.IPredSLE
	case compare.Equals:
		return enum.IPredEQ
	case compare.NotEquals:
		return enum.IPredNE
	}
	panic("?")
}

func (b *LLVM) datatypeArraySelect(d datatype.UnnamedDatatype, single types.Type, array types.Type) types.Type {
	if d.IsArray {
		return array
	} else {
		return single
	}
}

func (b *LLVM) datatypeToLLVM(d datatype.UnnamedDatatype) types.Type {
	switch d.Type {
	case datatype.INT:
		return b.datatypeArraySelect(d, types.I64, types.I64Ptr)
	case datatype.STR:
		return b.datatypeArraySelect(d, types.I8Ptr, types.NewPointer(types.I8Ptr))
	case datatype.VOID:
		return types.Void
	case datatype.CHR:
		return b.datatypeArraySelect(d, types.I8, types.I8Ptr)
	case datatype.PTR:
		return b.datatypeArraySelect(d, b.ptrType, types.NewPointer(b.ptrType))
	case datatype.INT_32:
		return b.datatypeArraySelect(d, types.I32, types.I32Ptr)
	case datatype.INT_16:
		return b.datatypeArraySelect(d, types.I16, types.I16Ptr)
	default:
		panic("Invalid datatype")
	}
}

func (b *LLVM) datatypeToSize(d datatype.UnnamedDatatype) int {
	if d.IsArray {
		return int(b.ptrType.(*types.IntType).BitSize) / 8
	}

	switch d.Type {
	case datatype.INT:
		return 8
	case datatype.STR:
		return int(b.ptrType.(*types.IntType).BitSize) / 8
	case datatype.VOID:
		return 0
	case datatype.CHR:
		return 1
	case datatype.PTR:
		return int(b.ptrType.(*types.IntType).BitSize) / 8
	case datatype.INT_32:
		return 4
	case datatype.INT_16:
		return 2
	default:
		panic("Invalid datatype")
	}
}

func (b *LLVM) generateExpressionRaw(exp *node.Node, block *ir.Block, cf *CompiledFunction) value.Value {

	switch exp.Type {
	case node.NUMBER:
		return constant.NewInt(types.I64, int64(exp.Value.(int)))
	case node.STRING:
		return b.newGlobalString(exp.Value.(string))
	case node.COMPARE:
		cmp := block.NewICmp(b.compareToLLVM(exp.Value.(compare.Compare)), b.generateExpression(exp.A, block, cf), b.generateExpression(exp.B, block, cf))
		return block.NewZExt(cmp, types.I64)
	case node.NOT:
		cmp := block.NewICmp(enum.IPredEQ, b.generateExpression(exp.A, block, cf), constant.NewInt(types.I64, 0))
		return block.NewZExt(cmp, types.I64)
	case node.ADD:
		return block.NewAdd(b.generateExpression(exp.A, block, cf), b.generateExpression(exp.B, block, cf))
	case node.SUBTRACT:
		return block.NewSub(b.generateExpression(exp.A, block, cf), b.generateExpression(exp.B, block, cf))
	case node.MULTIPLY:
		return block.NewMul(b.generateExpression(exp.A, block, cf), b.generateExpression(exp.B, block, cf))
	case node.DIVIDE:
		return block.NewSDiv(b.generateExpression(exp.A, block, cf), b.generateExpression(exp.B, block, cf))
	case node.MODULO:
		return block.NewSRem(b.generateExpression(exp.A, block, cf), b.generateExpression(exp.B, block, cf))
	case node.OR:
		return block.NewOr(b.generateExpression(exp.A, block, cf), b.generateExpression(exp.B, block, cf))
	case node.AND:
		return block.NewAnd(b.generateExpression(exp.A, block, cf), b.generateExpression(exp.B, block, cf))
	case node.XOR:
		return block.NewXor(b.generateExpression(exp.A, block, cf), b.generateExpression(exp.B, block, cf))
	case node.BIT_NOT:
		return block.NewXor(b.generateExpression(exp.A, block, cf), constant.NewInt(types.I64, -1))
	case node.SHIFT_LEFT:
		return block.NewShl(b.generateExpression(exp.A, block, cf), b.generateExpression(exp.B, block, cf))
	case node.SHIFT_RIGHT:
		return block.NewLShr(b.generateExpression(exp.A, block, cf), b.generateExpression(exp.B, block, cf))
	case node.FUNCTION_CALL:
		fc := exp.Value.(function.FunctionCall)
		return b.generateFunctionCall(fc, exp.Pos, block, cf)
	case node.VARIABLE_LOOKUP:
		v, t := b.findVariable(exp.Value.(string), exp.Pos, cf, false)
		// if _, ok := v.ElemType.(*types.PointerType); ok {
		// 	l := block.NewLoad(v.ElemType, v)
		// 	return b.autoTypeCast(l, b.ptrType, block)
		// }
		return block.NewLoad(t, v)

	case node.VARIABLE_LOOKUP_ARRAY:
		v, t := b.findVariable(exp.Value.(string), exp.Pos, cf, false)
		ptr := block.NewLoad(t, v)
		i := b.generateExpression(exp.A, block, cf)

		if arrPtr, ok := ptr.ElemType.(*types.PointerType); ok {
			indexed := block.NewGetElementPtr(arrPtr.ElemType, ptr, i)
			return block.NewLoad(arrPtr.ElemType, indexed)
		} else {
			// bit index
			index := block.NewShl(constant.NewInt(types.I64, 1), i)
			x := block.NewAnd(ptr, b.autoTypeCast(index, ptr.Type(), block))
			return x
		}

	case node.MINUS:
		return block.NewMul(b.generateExpression(exp.A, block, cf), constant.NewInt(types.I64, -1))
	default:
		b.error("Unknown "+strconv.Itoa(int(exp.Type)), exp.Pos, cf)
		panic("?")
	}

}

func (b *LLVM) generateExpression(exp *node.Node, block *ir.Block, cf *CompiledFunction) value.Value {
	return b.autoTypeCast(b.generateExpressionRaw(exp, block, cf), types.I64, block)
}

func (b *LLVM) generateFunctionCall(fc function.FunctionCall, pos int, block *ir.Block, cf *CompiledFunction) *ir.InstCall {
	f := b.findFunction(fc.Name, pos, cf)

	if len(fc.Arguments) != len(f.Sig.Params) {
		b.error("Argument count mismatch in call to "+f.GlobalName, pos, cf)
	}

	arguments := []value.Value{}
	for i := range fc.Arguments {
		arguments = append(arguments, b.autoTypeCast(b.generateExpression(fc.Arguments[i], block, cf), f.Sig.Params[i], block))
	}

	return block.NewCall(f, arguments...)
}

func (b *LLVM) autoTypeCast(source value.Value, target types.Type, block *ir.Block) value.Value {
	if source.Type().Equal(target) {
		return source
	}

	if _, ok := source.Type().(*types.PointerType); ok {
		return block.NewPtrToInt(source, target)
	} else {
		if _, ok := target.(*types.PointerType); ok {
			return block.NewIntToPtr(source, target)
		} else {
			if target.(*types.IntType).BitSize > source.Type().(*types.IntType).BitSize {
				return block.NewZExt(source, target)
			}
			return block.NewTrunc(source, target)
		}
	}
}

func (b *LLVM) newBlock(block *ir.Block) *ir.Block {
	new := block.Parent.NewBlock("")
	return new
}

func (b *LLVM) generateIf(block *ir.Block, node *node.Node, iff parser.If, cf *CompiledFunction, currentContinue *ir.Block, currentBack *ir.Block) *ir.Block {
	ifTrue := b.newBlock(block)
	ifFalse := b.newBlock(block)
	ifAfter := b.newBlock(block)

	x := b.generateExpression(node.A, block, cf)
	cmp := block.NewICmp(enum.IPredNE, x, constant.NewInt(types.I64, 0))
	block.NewCondBr(cmp, ifTrue, ifFalse)

	ifTrue = b.generateCodeBlock(ifTrue, iff.TrueBlock, cf, currentContinue, currentBack)
	if ifTrue.Term == nil {
		ifTrue.NewBr(ifAfter)
	}

	ifFalse = b.generateCodeBlock(ifFalse, iff.FalseBlock, cf, currentContinue, currentBack)
	if ifFalse.Term == nil {
		ifFalse.NewBr(ifAfter)
	}

	return ifAfter
}

func (b *LLVM) generateConditionalLoop(block *ir.Block, n *node.Node, cf *CompiledFunction) *ir.Block {
	loopCompare := b.newBlock(block)
	loopBody := b.newBlock(block)
	loopEnd := b.newBlock(block)

	block.NewBr(loopCompare)

	x := b.generateExpression(n.A, loopCompare, cf)
	cmp := loopCompare.NewICmp(enum.IPredNE, x, constant.NewInt(types.I64, 0))
	loopCompare.NewCondBr(cmp, loopBody, loopEnd)

	loopBody = b.generateCodeBlock(loopBody, n.Value.([]*node.Node), cf, loopCompare, loopEnd)
	if loopBody.Term == nil {
		loopBody.NewBr(loopCompare)
	}

	return loopEnd
}

func (b *LLVM) generateUpdateConditionalLoop(block *ir.Block, n *node.Node, cf *CompiledFunction) *ir.Block {
	loopCompare := b.newBlock(block)
	loopBody := b.newBlock(block)
	loopUpdate := b.newBlock(block)
	loopEnd := b.newBlock(block)

	block.NewBr(loopCompare)

	x := b.generateExpression(n.A, loopCompare, cf)
	cmp := loopCompare.NewICmp(enum.IPredNE, x, constant.NewInt(types.I64, 0))
	loopCompare.NewCondBr(cmp, loopBody, loopEnd)

	loopBody = b.generateCodeBlock(loopBody, n.Value.([]*node.Node), cf, loopUpdate, loopEnd)
	if loopBody.Term == nil {
		loopBody.NewBr(loopUpdate)
	}

	loopUpdate = b.generateCodeBlock(loopUpdate, []*node.Node{n.B}, cf, nil, nil)
	loopUpdate.NewBr(loopCompare)

	return loopEnd
}

func (b *LLVM) generatePostConditionalLoop(block *ir.Block, n *node.Node, cf *CompiledFunction) *ir.Block {
	loopBody := b.newBlock(block)
	loopEnd := b.newBlock(block)

	block.NewBr(loopBody)

	loopBody = b.generateCodeBlock(loopBody, n.Value.([]*node.Node), cf, loopBody, loopEnd)

	x := b.generateExpression(n.A, loopBody, cf)
	cmp := loopBody.NewICmp(enum.IPredNE, x, constant.NewInt(types.I64, 0))
	if loopBody.Term == nil {
		loopBody.NewCondBr(cmp, loopBody, loopEnd)
	}

	return loopEnd
}

func (b *LLVM) generateCodeBlock(block *ir.Block, body []*node.Node, cf *CompiledFunction, currentContinue *ir.Block, currentBack *ir.Block) *ir.Block {

	for i := range body {
		n := body[i]

		switch n.Type {
		case node.VARIABLE_DECLARATION:
			datatype := n.Value.(datatype.NamedDatatype)
			v := block.NewAlloca(b.datatypeToLLVM(datatype.UnnamedDatatype))
			v.SetName("local_" + datatype.Name)
			cf.variables[datatype.Name] = v

			if n.A != nil {
				x := b.generateExpression(n.A, block, cf)
				c := b.autoTypeCast(x, v.ElemType, block)
				block.NewStore(c, v)
			}
		case node.VARIABLE_ASSIGN:
			v, t := b.findVariable(n.Value.(string), n.Pos, cf, true)
			x := b.generateExpression(n.A, block, cf)
			c := b.autoTypeCast(x, t, block)
			block.NewStore(c, v)
		case node.VARIABLE_ASSIGN_ARRAY:
			v, t := b.findVariable(n.Value.(string), n.Pos, cf, true)
			ptr := block.NewLoad(t, v)
			i := b.generateExpression(n.A, block, cf)
			indexed := block.NewGetElementPtr(ptr.ElemType.(*types.PointerType).ElemType, ptr, i)
			x := b.generateExpression(n.B, block, cf)
			c := b.autoTypeCast(x, ptr.ElemType.(*types.PointerType).ElemType, block)
			block.NewStore(c, indexed)
		case node.FUNCTION_CALL:
			fc := n.Value.(function.FunctionCall)
			b.generateFunctionCall(fc, n.Pos, block, cf)
		case node.RETURN:
			if block.Term != nil {
				b.error("Block already terminated", n.Pos, cf)
			}

			if n.A != nil {
				x := b.generateExpression(n.A, block, cf)
				c := b.autoTypeCast(x, cf.returnType, block)
				cf.returnIncomings = append(cf.returnIncomings, ir.NewIncoming(c, block))
			}
			block.NewBr(cf.returnBlock)

		case node.IF:
			block = b.generateIf(block, n, n.Value.(parser.If), cf, currentContinue, currentBack)
		case node.CONDITIONAL_LOOP:
			block = b.generateConditionalLoop(block, n, cf)
		case node.UPDATE_CONDITIONAL_LOOP:
			block = b.generateUpdateConditionalLoop(block, n, cf)
		case node.POST_CONDITIONAL_LOOP:
			block = b.generatePostConditionalLoop(block, n, cf)
		case node.LOOP:
			origLoopBody := b.newBlock(block)
			loopEnd := b.newBlock(block)
			block.NewBr(origLoopBody)

			loopBody := b.generateCodeBlock(origLoopBody, n.Value.([]*node.Node), cf, origLoopBody, loopEnd)
			if loopBody.Term == nil {
				loopBody.NewBr(origLoopBody)
			}

			block = loopEnd

		case node.CONTINUE:
			if currentContinue == nil {
				b.error("Cannot use 'continue' outside of a loop", n.Pos, cf)
			}
			block.NewBr(currentContinue)

		case node.BREAK:
			if currentBack == nil {
				b.error("Cannot use 'break' outside of a loop", n.Pos, cf)
			}
			block.NewBr(currentBack)

		default:
			b.error("Unknown "+strconv.Itoa(int(n.Type)), n.Pos, cf)
		}
	}
	return block
}

func (b *LLVM) generateFunction(f *ir.Func, pos int, af function.Function) *CompiledFunction {
	cf := CompiledFunction{
		variables:       make(map[string]*ir.InstAlloca),
		returnBlock:     nil,
		returnIncomings: []*ir.Incoming{},
		returnType:      f.Sig.RetType,
		name:            af.Name,
	}

	declareOnly := false
	noReturn := false

	if utils.IndexOf(af.Attributes, function.Assembly) >= 0 {
		b.error("Unsupported attribute assembly", pos, &cf)
	} else if utils.IndexOf(af.Attributes, function.NoReturn) >= 0 {
		noReturn = true
	} else if utils.IndexOf(af.Attributes, function.External) >= 0 {
		declareOnly = true
	}

	if declareOnly {
		return &cf
	} else {
		entry := b.generateCodeBlock(f.NewBlock("entry"), af.Entry, &cf, nil, nil)
		main := f.NewBlock("body")

		for i := range af.Arguments {
			argument := af.Arguments[i]
			v := entry.NewAlloca(b.datatypeToLLVM(argument.UnnamedDatatype))
			v.SetName("arg_" + argument.Name)
			cf.variables[argument.Name] = v
			entry.NewStore(f.Params[i], v)
		}

		cf.entryBlock = entry

		entry.NewBr(main)

		ret := f.NewBlock("return")
		ret.NewUnreachable()

		cf.returnBlock = ret

		main = b.generateCodeBlock(main, af.Body, &cf, nil, nil)

		if main.Term == nil {
			if f.Sig.RetType.Equal(types.Void) {
				main.NewBr(ret)
				ret = b.generateCodeBlock(ret, af.Exit, &cf, nil, nil)
				ret.NewRet(nil)
			} else {
				slog.Debug("no return in non void function", "function", f.Name())
				x := b.generateExpression(node.NewNode(node.NUMBER, nil, nil, 0, 0), main, &cf)
				c := b.autoTypeCast(x, cf.returnType, main)
				cf.returnIncomings = append(cf.returnIncomings, ir.NewIncoming(c, main))
				main.NewBr(ret)
			}
		}
		if noReturn {
			ret = b.generateCodeBlock(ret, af.Exit, &cf, nil, nil)
			b.generateFunctionCall(function.FunctionCall{
				Name:      "unreachable",
				Arguments: []*node.Node{},
			}, pos, ret, &cf)
		} else {
			if len(cf.returnIncomings) > 0 {
				phi := ret.NewPhi(cf.returnIncomings...)
				ret = b.generateCodeBlock(ret, af.Exit, &cf, nil, nil)
				ret.NewRet(phi)
			}
		}
	}

	slog.Debug(f.Name(), "params", len(f.Sig.Params), "variables", len(cf.variables))

	return &cf
}

func (b *LLVM) generateFunctionDeclaration(f function.Function, module *ir.Module) {

	parameters := []*ir.Param{}
	for i := range f.Arguments {
		parameters = append(parameters, ir.NewParam(f.Arguments[i].Name, b.datatypeToLLVM(f.Arguments[i].UnnamedDatatype)))
	}

	b.functions[f.Name] = module.NewFunc(f.Name, b.datatypeToLLVM(f.ReturnDatatype), parameters...)

}

func (b *LLVM) generateOffset(offset parser.Offset, module *ir.Module) {
	current := 0

	for _, entry := range offset.Entries {
		size := b.datatypeToSize(entry.UnnamedDatatype)
		name := offset.Name + "_" + entry.Name
		if b.analyzer.IsGlobalUsed(name) {
			x := module.NewGlobalDef(name, constant.NewInt(types.I64, int64(current)))
			b.globalVariables[name] = GlobalVariable{varivable: x, final: true}
		}
		current += size
	}

	name := offset.Name + "_size"
	if b.analyzer.IsGlobalUsed(name) {
		x := module.NewGlobalDef(name, constant.NewInt(types.I64, int64(current)))
		b.globalVariables[name] = GlobalVariable{varivable: x, final: true}
	}
}

func (b *LLVM) Compile() string {
	tmp := b.global.Value.([]*node.Node)

	b.module = ir.NewModule()
	b.module.TargetTriple = b.target

	for i := range tmp {
		switch tmp[i].Type {
		case node.VARIABLE_DECLARATION:
			datatype := tmp[i].Value.(datatype.NamedDatatype)
			if !b.analyzer.IsGlobalUsed(datatype.Name) {
				continue
			}

			d := b.datatypeToLLVM(datatype.UnnamedDatatype)

			var global *ir.Global

			if tmp[i].A != nil {
				if datatype.IsArray {
					b.error("Global array initializers not supported!", tmp[i].Pos, nil)
				}
				if tmp[i].A.Type == node.STRING {
					s := b.module.NewGlobalDef(datatype.Name+".init", constant.NewCharArrayFromString(tmp[i].A.Value.(string)+"\x00"))
					global = b.module.NewGlobalDef(datatype.Name, constant.NewIntToPtr(constant.NewPtrToInt(s, types.I64), d))
				} else {
					if inttype, ok := d.(*types.IntType); ok {
						global = b.module.NewGlobalDef(datatype.Name, constant.NewInt(inttype, int64(constexpr.Evaluate(tmp[i].A))))
					} else {
						b.error("Expected int type when using constant expression", tmp[i].Pos, nil)
					}
				}
			} else {
				switch d := d.(type) {
				case *types.PointerType:
					global = b.module.NewGlobalDef(datatype.Name, constant.NewIntToPtr(constant.NewInt(types.I64, 0), d))
				case *types.IntType:
					global = b.module.NewGlobalDef(datatype.Name, constant.NewInt(d, 0))
				default:
					b.error("?", tmp[i].Pos, nil)
				}
			}

			b.globalVariables[datatype.Name] = GlobalVariable{varivable: global, final: false}

		case node.OFFSET:
			b.generateOffset(tmp[i].Value.(parser.Offset), b.module)
		}
	}

	for i := range tmp {
		switch tmp[i].Type {
		case node.FUNCTION:
			if !b.analyzer.IsFunctionUsed((tmp[i].Value.(function.Function)).Name) {
				continue
			}

			b.generateFunctionDeclaration(tmp[i].Value.(function.Function), b.module)
		}
	}

	for i := range tmp {
		switch tmp[i].Type {
		case node.FUNCTION:
			if !b.analyzer.IsFunctionUsed((tmp[i].Value.(function.Function)).Name) {
				continue
			}

			b.generateFunction(b.findFunction(tmp[i].Value.(function.Function).Name, tmp[i].Pos, nil), tmp[i].Pos, tmp[i].Value.(function.Function))
		}
	}

	return b.module.String()
}
