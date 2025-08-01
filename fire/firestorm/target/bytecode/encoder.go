package bytecode

import (
	"fire/firestorm/utils"
	"fmt"
	"log/slog"
	"strings"
)

// interface SectionInfo {
// 	name: string | undefined;
// 	body: string[];
// 	type: "function" | "global";
// }

type SectionType int

const (
	Function SectionType = iota
	Global
)

type SectionInfo struct {
	Name string
	Body []string
	Type SectionType
}

func stringToSectionType(s string) SectionType {
	switch s {
	case "function":
		return Function
	case "global":
		return Global
	default:
		panic("?")
	}
}

type BYTECODEEncoder struct {
	instructions []string
	datatypes    []string
	natives      []string
	globals      []string
	functions    []string
}

func NewBYTECODEEncoder() *BYTECODEEncoder {
	return &BYTECODEEncoder{
		instructions: []string{
			"global_reserve",

			"assign",
			"assign_indexed",
			"load",
			"load_indexed",

			"number",
			"string",

			"goto",
			"goto_true",
			"goto_false",
			"invoke",
			"invoke_native",
			"return",

			"variable",

			"increase",
			"decrease",
			"add",
			"sub",
			"mul",
			"div",
			"mod",

			"less",
			"less_equals",
			"more",
			"more_equals",
			"equals",
			"not_equals",

			"invert",

			"shift_left",
			"shift_right",
			"or",
			"and",
			"xor",
			"not",

			"noreturn",
			"delete",

			"change_sign",
		},
		datatypes: []string{"int", "chr", "str", "ptr", "i16", "i32"},
		natives: []string{
			"exit",
			"putchar", "puts",
			"malloc", "free",
			"fopen", "fclose", "fseek", "fread", "fwrite", "ftell",
		},
		globals:   []string{},
		functions: []string{},
	}
}

func (b *BYTECODEEncoder) parseCode(lines []string) []*SectionInfo {
	sections := []*SectionInfo{}
	var currentSection *SectionInfo = nil

	for i := range lines {
		line := lines[i]
		if _, ok := strings.CutPrefix(line, "@"); ok {
			pis := strings.Split(line, " ")
			switch pis[0] {
			case "@begin":
				currentSection = &SectionInfo{
					Name: pis[2],
					Body: []string{},
					Type: stringToSectionType(pis[1]),
				}
			case "@end":
				sections = append(sections, currentSection)
				currentSection = nil
			}
		} else if currentSection != nil {
			currentSection.Body = append(currentSection.Body, line)
		}
	}

	return sections
}

func (b *BYTECODEEncoder) translateFunction(f *SectionInfo) string {
	bin := ""
	locales := []string{}

	varID := func(name string) int {
		if utils.IndexOf(locales, name) != -1 {
			return utils.IndexOf(locales, name)
		} else if utils.IndexOf(b.globals, name) != -1 {
			return utils.IndexOf(b.globals, name) + 256
		} else {
			panic(name + " not found!")
		}
	}

	for _, is := range f.Body {
		if is == "" {
			continue
		}

		if strings.HasSuffix(is, ":") {
			bin += "_" + is + "\n"
			continue
		}

		instruction := strings.Split(is, " ")
		instructionID := utils.IndexOf(b.instructions, instruction[0])
		if instructionID == -1 {
			panic("Unknown instruction " + instruction[0])
		}

		if instruction[0] == "load" && utils.IndexOf(b.functions, instruction[1]) != -1 {
			bin += "\tdb " + fmt.Sprint(instructionID) + " ; " + is + " (function pointer)\n"
		} else {
			bin += "\tdb " + fmt.Sprint(instructionID) + " ; " + is + "\n"
		}

		switch instruction[0] {
		case "global_reserve":
			fallthrough
		case "variable":
			if instruction[0] == "variable" {
				locales = append(locales, instruction[1])
			}
			dt := utils.IndexOf(b.datatypes, instruction[2])
			if dt == -1 {
				panic("Unknown datatype " + instruction[2])
			}

			array := 1
			if instruction[3] == "false" {
				array = 0
			}

			bin += "\t\tdq " + fmt.Sprint(varID(instruction[1])) + "\n\t\tdb " + fmt.Sprint(dt) + ", " + fmt.Sprint(array) + "\n"

		case "load":
			if utils.IndexOf(b.functions, instruction[1]) != -1 {
				bin += "\t\tdq _" + instruction[1] + "\n"
			} else {
				bin += "\t\tdq " + fmt.Sprint(varID(instruction[1])) + "\n"
			}

		case "load_indexed":
			fallthrough
		case "assign":
			fallthrough
		case "assign_indexed":
			bin += "\t\tdq " + fmt.Sprint(varID(instruction[1])) + "\n"

		case "number":
			bin += "\t\tdq " + instruction[1] + "\n"

		case "invoke":
			fallthrough
		case "goto":
			fallthrough
		case "goto_false":
			fallthrough
		case "goto_true":
			bin += "\t\tdq _" + instruction[1] + "\n"

		case "invoke_native":
			if utils.IndexOf(b.natives, instruction[1]) == -1 {
				panic("Native " + instruction[1] + " not found!")
			}
			bin += "\t\tdq " + fmt.Sprint(utils.IndexOf(b.natives, instruction[1])) + "\n"

		case "string":
			s := is[strings.Index(is, "\"")+1 : strings.LastIndex(is, "\"")]
			bin += "\t\tdq " + fmt.Sprint(len(s)) + "\n"
			bin += "\t\tdb \"" + s + "\", 0\n"

		case "return":
		case "noreturn":
		case "delete":

		case "add":
		case "sub":
		case "mul":
		case "div":
		case "mod":

		case "less":
		case "less_equals":
		case "more":
		case "more_equals":
		case "equals":
		case "not_equals":

		case "invert":

		case "shift_left":
		case "shift_right":
		case "or":
		case "and":
		case "xor":
		case "not":

		case "change_sign":

		default:
			panic("Invalid instruction " + instruction[0])
		}

	}

	for _, l := range locales {
		slog.Debug("found local variable "+l, "function", f.Name)
	}

	return bin
}

func (b *BYTECODEEncoder) mergeGlobals(s []*SectionInfo) []*SectionInfo {
	finalGlobal := &SectionInfo{
		Name: "global",
		Body: []string{},
		Type: Global,
	}

	otherSections := []*SectionInfo{}

	for i := range s {
		if s[i].Type == Global {
			finalGlobal.Body = append(finalGlobal.Body, s[i].Body...)
		} else {
			otherSections = append(otherSections, s[i])
		}
	}

	result := []*SectionInfo{finalGlobal}
	result = append(result, otherSections...)
	return result
}

func (b *BYTECODEEncoder) translateGlobal(f *SectionInfo) string {
	globalInitSection := &SectionInfo{
		Name: "global",
		Body: []string{},
		Type: Function,
	}

	globalInitSection.Body = append(globalInitSection.Body, "global:")

	for i := range f.Body {
		is := f.Body[i]
		if is == "" {
			continue
		}
		instruction := strings.Split(is, " ")

		switch instruction[0] {
		case "global":
			b.globals = append(b.globals, instruction[1])

			globalInitSection.Body = append(globalInitSection.Body, "global_reserve "+instruction[1]+" "+instruction[2]+" false")

			switch instruction[2] {
			case "int", "chr":
				globalInitSection.Body = append(globalInitSection.Body, "number "+instruction[3])
			case "str":
				start := strings.Index(is, "\"") + 1
				end := strings.LastIndex(is, "\"")

				globalInitSection.Body = append(globalInitSection.Body, "string \""+is[start:end]+"\"")
			default:
				panic("Invalid instruction " + is)
			}
			globalInitSection.Body = append(globalInitSection.Body, "assign "+instruction[1])

		case "global_reserve":
			b.globals = append(b.globals, instruction[1])
			globalInitSection.Body = append(globalInitSection.Body, is)

		default:
			if utils.IndexOf(b.instructions, instruction[0]) == -1 || len(instruction) != 1 {
				panic("Invalid instruction " + is)
			}
		}
	}

	globalInitSection.Body = append(globalInitSection.Body, "number 0")
	globalInitSection.Body = append(globalInitSection.Body, "return")

	for i := range b.globals {
		slog.Debug("added initializer for global " + b.globals[i])
	}

	return b.translateFunction(globalInitSection)
}

func (b *BYTECODEEncoder) Encode(code string) string {
	codeEnc := strings.Split(code, "\n")
	for i := range codeEnc {
		codeEnc[i] = strings.TrimSpace(codeEnc[i])
	}

	final := "[org 0]\ndq _spark\ndq _global\ndq _unreachable\n"
	sections := b.mergeGlobals(b.parseCode(codeEnc))
	for _, s := range sections {
		if s.Type == Function {
			b.functions = append(b.functions, s.Name)
			slog.Debug("added function " + s.Name)
		}
	}

	for _, s := range sections {
		if s.Type == Function {
			final += b.translateFunction(s)
		} else {
			final += b.translateGlobal(s)
		}
	}

	return final
}
