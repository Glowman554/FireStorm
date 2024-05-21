package parser

import (
	"fire/firestorm/utils"
	"strings"
)

type ErrorLine struct {
	Line int
	Char int
}

type ErrorLineFile struct {
	ErrorLine
	File       string
	LineString string
}

type File struct {
	BaseOffset int
	Name       *string
}

func FindErrorLine(code string, index int) ErrorLine {
	lines := strings.Split(code, "\n")
	totalChars := 0

	for i := range lines {
		lineLength := len(lines[i])
		totalChars += lineLength

		if totalChars >= index {
			lineIndex := i + 1
			charInLine := index - (totalChars - lineLength)
			return ErrorLine{
				Line: lineIndex,
				Char: charInLine,
			}
		}

		totalChars++
	}
	panic("?")
}

func FindErrorLineFile(code string, index int) ErrorLineFile {
	line := FindErrorLine(code, index)
	lines := strings.Split(code, "\n")

	beginningFile := "<input>"
	fileStack := []File{
		{
			BaseOffset: 0,
			Name:       &beginningFile,
		},
	}

	for i := 0; i < line.Line; i++ {
		if f, ok := strings.CutPrefix(lines[i], "//@file "); ok {
			fileStack = append(fileStack, File{
				BaseOffset: i + 1,
				Name:       &f,
			})
		} else if strings.HasPrefix(lines[i], "//@endfile") {
			fileStack, _ = utils.Pop(fileStack, 1)
		}
	}

	return ErrorLineFile{
		ErrorLine: ErrorLine{
			Line: line.Line - fileStack[len(fileStack)-1].BaseOffset,
			Char: line.Char,
		},
		File:       *fileStack[len(fileStack)-1].Name,
		LineString: lines[line.Line-1],
	}
}
