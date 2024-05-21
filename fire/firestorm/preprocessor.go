package firestorm

import (
	"fire/firestorm/modules"
	"fire/firestorm/utils"
	"fmt"
	"os"
	"regexp"
	"strings"
)

type Preprocessor struct {
	includePaths  []string
	includedFiles []string
	usedPackages  []modules.Module
}

func NewPreprocessor(includePaths []string) Preprocessor {
	return Preprocessor{
		includePaths:  includePaths,
		includedFiles: []string{},
	}
}

func (preprocessor *Preprocessor) tryRead(file string) *string {
	code, err := os.ReadFile(file)
	if err != nil {
		return nil
	}
	result := string(code)
	return &result
}

func (preprocessor *Preprocessor) processUses(code string) string {
	expression := regexp.MustCompile(`\$use ?<(\w*@[\w\.]*)>`)
	matches := expression.FindAllString(code, -1)
	for i := range matches {
		match := matches[i]
		use := strings.Split(strings.Split(strings.Split(match, "<")[1], ">")[0], "@")
		name := use[0]
		version := use[1]

		shouldAppend := true

		for j := range preprocessor.usedPackages {
			if preprocessor.usedPackages[j].Package == name {
				if preprocessor.usedPackages[j].Version != version {
					fmt.Println("[WARNING] $use " + name + " version conflict! Trying to load " + version + " but " + preprocessor.usedPackages[j].Version + " is already loaded.")
				}
				shouldAppend = false
				continue
			}
		}

		if shouldAppend {
			preprocessor.usedPackages = append(preprocessor.usedPackages, modules.NewPackage(name, version))
		}
	}

	code = expression.ReplaceAllString(code, "")
	return code
}

func (preprocessor *Preprocessor) processIncludes(code string) string {
	expression := regexp.MustCompile(`\$include ?<([\w/\.]*.\w*)>`)

	matches := expression.FindAllString(code, -1)
	for i := range matches {
		match := matches[i]
		include := strings.Split(strings.Split(match, "<")[1], ">")[0]

		newCode := preprocessor.tryRead(include)
		for j := range preprocessor.includePaths {
			if newCode != nil {
				break
			}
			newCode = preprocessor.tryRead(preprocessor.includePaths[j] + include)
		}

		for j := range preprocessor.usedPackages {
			if code, ok := preprocessor.usedPackages[j].Files[include]; ok {
				newCode = &code
			}
		}

		if newCode == nil {
			panic("Include " + include + " not found!")
		}
		if utils.IndexOf(preprocessor.includedFiles, include) == -1 {
			preprocessor.includedFiles = append(preprocessor.includedFiles, include)

			code += "\n//@file " + include
			code += "\n" + preprocessor.processIncludes(preprocessor.processUses(*newCode))
			code += "\n//@endfile"
		}
	}

	code = expression.ReplaceAllString(code, "")
	return code
}

type Define struct {
	name  string
	value string
}

func (preprocessor Preprocessor) processDefines(code string) string {
	expression := regexp.MustCompile(`\$define ([^ ]*) (.*)`)

	defines := []Define{}

	matches := expression.FindAllString(code, -1)
	for i := range matches {
		match := matches[i]

		defineSplit := strings.Split(match, " ")

		defines = append(defines, Define{
			name:  defineSplit[1],
			value: strings.Join(defineSplit[2:], " "),
		})
	}

	code = expression.ReplaceAllString(code, "")

	for i := range defines {
		code = strings.ReplaceAll(code, defines[i].name, defines[i].value)
	}

	return code
}

func (preprocessor *Preprocessor) Process(code string) string {
	return preprocessor.processDefines(preprocessor.processIncludes(preprocessor.processUses(code)))
}
