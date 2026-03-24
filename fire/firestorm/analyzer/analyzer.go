package analyzer

import (
	"fire/firestorm/lineerror"
	"fire/firestorm/parser"
	"fire/firestorm/parser/datatype"
	"fire/firestorm/parser/function"
	"fire/firestorm/parser/node"
	"fire/firestorm/utils"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
)

type Analyzer struct {
	global            *node.Node
	analyzedFunctions map[string]*Function
	code              string
	functionUsage     map[string]bool
	functionKeep      []string
	globalUsage       map[string]bool
}

func NewAnalyzer(global *node.Node, code string) *Analyzer {
	return &Analyzer{
		global:            global,
		analyzedFunctions: make(map[string]*Function),
		code:              code,
		functionUsage:     make(map[string]bool),
		functionKeep:      make([]string, 0),
		globalUsage:       make(map[string]bool),
	}
}

func (a *Analyzer) error(message string, pos int, fa *Function) {
	if fa == nil {
		lineerror.Error(a.code, message, pos)
	} else {
		lineerror.Error(a.code, message+" (in: "+fa.Name+")", pos)
	}
}
func (a *Analyzer) IsFunctionUsed(name string) bool {
	used, exists := a.functionUsage[name]
	return exists && used
}

func (a *Analyzer) IsGlobalUsed(name string) bool {
	used, exists := a.globalUsage[name]
	return exists && used
}

func (a *Analyzer) analyzeExpression(exp *node.Node, fa *Function) {
	analyzeAB := func() {
		a.analyzeExpression(exp.A, fa)
		a.analyzeExpression(exp.B, fa)
	}

	switch exp.Type {
	case node.NUMBER:
	case node.STRING:
	case node.COMPARE:
		analyzeAB()
	case node.NOT:
		a.analyzeExpression(exp.A, fa)
	case node.ADD:
		analyzeAB()
	case node.SUBTRACT:
		analyzeAB()
	case node.MULTIPLY:
		analyzeAB()
	case node.DIVIDE:
		analyzeAB()
	case node.MODULO:
		analyzeAB()
	case node.OR:
		analyzeAB()
	case node.AND:
		analyzeAB()
	case node.XOR:
		analyzeAB()
	case node.BIT_NOT:
		a.analyzeExpression(exp.A, fa)
	case node.SHIFT_LEFT:
		analyzeAB()
	case node.SHIFT_RIGHT:
		analyzeAB()
	case node.FUNCTION_CALL:
		fc := exp.Value.(function.FunctionCall)

		for i := range fc.Arguments {
			a.analyzeExpression(fc.Arguments[i], fa)
		}

		fa.FunctionCalls = append(fa.FunctionCalls, fc.Name)

	case node.VARIABLE_LOOKUP:
		fa.VariableUsed = append(fa.VariableUsed, exp.Value.(string))

	case node.VARIABLE_LOOKUP_ARRAY:
		a.analyzeExpression(exp.A, fa)
		fa.VariableUsed = append(fa.VariableUsed, exp.Value.(string))

	case node.MINUS:
		a.analyzeExpression(exp.A, fa)

	default:
		a.error("Unknown node type: "+strconv.Itoa(int(exp.Type)), exp.Pos, fa)
	}

}

func (a *Analyzer) analyzeCodeBlock(f function.Function, block []*node.Node, fa *Function) {
	for i := range block {
		switch block[i].Type {
		case node.VARIABLE_DECLARATION:
			fa.LocalVariables = append(fa.LocalVariables, block[i].Value.(datatype.NamedDatatype))
			if block[i].A != nil {
				a.analyzeExpression(block[i].A, fa)
			}
		case node.VARIABLE_ASSIGN:
			if block[i].A != nil {
				a.analyzeExpression(block[i].A, fa)
			}
			fa.VariableUsed = append(fa.VariableUsed, block[i].Value.(string))

		case node.VARIABLE_ASSIGN_ARRAY:
			a.analyzeExpression(block[i].A, fa)
			a.analyzeExpression(block[i].B, fa)
			fa.VariableUsed = append(fa.VariableUsed, block[i].Value.(string))

		case node.FUNCTION_CALL:
			fc := block[i].Value.(function.FunctionCall)

			for i := range fc.Arguments {
				a.analyzeExpression(fc.Arguments[i], fa)
			}

			fa.FunctionCalls = append(fa.FunctionCalls, fc.Name)

		case node.RETURN:
			if block[i].A != nil {
				a.analyzeExpression(block[i].A, fa)
			}

		case node.IF:
			a.analyzeExpression(block[i].A, fa)
			iff := block[i].Value.(parser.If)

			a.analyzeCodeBlock(f, iff.TrueBlock, fa)
			if iff.FalseBlock != nil {
				a.analyzeCodeBlock(f, iff.FalseBlock, fa)
			}

		case node.CONDITIONAL_LOOP:
			a.analyzeExpression(block[i].A, fa)
			a.analyzeCodeBlock(f, block[i].Value.([]*node.Node), fa)

		case node.UPDATE_CONDITIONAL_LOOP:
			a.analyzeExpression(block[i].A, fa)
			a.analyzeCodeBlock(f, block[i].Value.([]*node.Node), fa)
			a.analyzeCodeBlock(f, []*node.Node{block[i].B}, fa)

		case node.POST_CONDITIONAL_LOOP:
			a.analyzeCodeBlock(f, block[i].Value.([]*node.Node), fa)
			a.analyzeExpression(block[i].A, fa)

		case node.LOOP:
			a.analyzeCodeBlock(f, block[i].Value.([]*node.Node), fa)

		case node.CONTINUE:

		case node.BREAK:

		default:
			a.error("Unknown "+strconv.Itoa(int(block[i].Type)), block[i].Pos, fa)

		}
	}
}

func (a *Analyzer) analyzeFunction(f function.Function) (string, *Function) {
	fa := &Function{
		Name:           f.Name,
		FunctionCalls:  make([]string, 0),
		LocalVariables: make([]datatype.NamedDatatype, 0),
		VariableUsed:   make([]string, 0),
		Attributes:     f.Attributes,
	}

	if utils.IndexOf(f.Attributes, function.Assembly) != -1 {
		return f.Name, fa
	}

	if utils.IndexOf(f.Attributes, function.External) != -1 {
		return f.Name, fa
	}

	if utils.IndexOf(f.Attributes, function.Global) != -1 || utils.IndexOf(f.Attributes, function.Keep) != -1 {
		a.functionKeep = append(a.functionKeep, f.Name)
	}

	a.analyzeCodeBlock(f, f.Entry, fa)
	a.analyzeCodeBlock(f, f.Body, fa)
	a.analyzeCodeBlock(f, f.Exit, fa)

	if utils.IndexOf(f.Attributes, function.NoReturn) != -1 {
		fa.FunctionCalls = append(fa.FunctionCalls, "unreachable")
	}

	return f.Name, fa
}

func (a *Analyzer) analyzeOffset(offset parser.Offset) {
	for _, entry := range offset.Entries {
		name := offset.Name + "_" + entry.Name
		a.globalUsage[name] = false
	}

	name := offset.Name + "_size"
	a.globalUsage[name] = false
}

func (a *Analyzer) attributeToString(attribute function.FunctionAttribute) string {
	switch attribute {
	case function.Assembly:
		return "assembly"
	case function.External:
		return "external"
	case function.Keep:
		return "keep"
	case function.NoReturn:
		return "noreturn"
	case function.Global:
		return "global"
	default:
		return fmt.Sprintf("%v", attribute)
	}
}

func (a *Analyzer) BuildGraphvizCallgraph(entry string) string {
	edges := make(map[string]map[string]bool)
	nodes := make(map[string]bool)

	var buildEdges func(name string, visited map[string]bool)
	buildEdges = func(name string, visited map[string]bool) {
		fun := a.analyzedFunctions[name]
		visited[name] = true
		nodes[name] = true
		if edges[name] == nil {
			edges[name] = make(map[string]bool)
		}
		for i := range fun.FunctionCalls {
			callee := fun.FunctionCalls[i]
			edges[name][callee] = true
			if !visited[callee] {
				buildEdges(callee, visited)
			}
		}
	}

	buildEdges(entry, make(map[string]bool))

	out := "digraph CallGraph {\n"

	for name := range nodes {
		fun := a.analyzedFunctions[name]
		attrLabel := ""
		if len(fun.Attributes) > 0 {
			attrs := make([]string, len(fun.Attributes))
			for i, attr := range fun.Attributes {
				attrs[i] = a.attributeToString(attr)
			}
			attrLabel = "\\n[" + strings.Join(attrs, ", ") + "]"
			out += fmt.Sprintf("    %s [label=\"%s%s\"];\n", name, name, attrLabel)
		} else {
			out += fmt.Sprintf("    %s [label=\"%s\"];\n", name, name)
		}
	}

	for caller, callees := range edges {
		for callee := range callees {
			out += fmt.Sprintf("    %s -> %s;\n", caller, callee)
		}
	}

	out += "}\n"

	return out
}

func (a *Analyzer) analyzeCallgraph(entry string) {
	visited := make(map[string]bool)
	var visit func(name string)
	visit = func(name string) {
		if visited[name] {
			return
		}
		visited[name] = true
		fun := a.analyzedFunctions[name]
		for i := range fun.FunctionCalls {
			visit(fun.FunctionCalls[i])
		}
	}

	visit(entry)

	for name := range a.functionUsage {
		if visited[name] {
			slog.Debug("Keeping function " + name)
			a.functionUsage[name] = true
		}
	}
}

func (a *Analyzer) analyzeGlobalUsage() {
	for i := range a.functionUsage {
		if a.functionUsage[i] {
			fun := a.analyzedFunctions[i]
			for j := range fun.VariableUsed {
				if _, ok := a.globalUsage[fun.VariableUsed[j]]; ok {
					a.globalUsage[fun.VariableUsed[j]] = true
					slog.Debug("Keeping global variable " + fun.VariableUsed[j] + " because it is used in function " + i)
				}
			}
		}
	}
}

func (a *Analyzer) Analyze() {
	nodes := a.global.Value.([]*node.Node)
	for i := range nodes {
		switch nodes[i].Type {
		case node.VARIABLE_DECLARATION:
			nd := nodes[i].Value.(datatype.NamedDatatype)
			a.globalUsage[nd.Name] = false

		case node.OFFSET:

		case node.FUNCTION:
			a.functionUsage[nodes[i].Value.(function.Function).Name] = false
		}
	}

	for i := range nodes {

		switch nodes[i].Type {
		case node.FUNCTION:
			name, analyzed := a.analyzeFunction(nodes[i].Value.(function.Function))
			a.analyzedFunctions[name] = analyzed
		}
	}

	a.analyzeCallgraph("main")

	for i := range a.functionKeep {
		name := a.functionKeep[i]
		slog.Debug("Analyzing callgraph for keep function " + name)
		a.analyzeCallgraph(name)
	}

	a.analyzeGlobalUsage()
}
