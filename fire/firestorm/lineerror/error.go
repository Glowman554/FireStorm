package lineerror

import (
	"fire/firestorm/utils"
	"fmt"
	"strconv"
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

func Error(code string, message string, pos int) {
	errorLine := FindErrorLineFile(code, pos)
	fmt.Println("error:", message, "(at", errorLine.File+":"+strconv.Itoa(errorLine.Line)+":"+strconv.Itoa(errorLine.Char)+")")

	fmt.Println(strings.ReplaceAll(strings.ReplaceAll(errorLine.LineString, "\t", " "), "\r", " "))

	for i := 0; i < errorLine.Char; i++ {
		fmt.Print(" ")
	}
	fmt.Println("^")

	panic("Compilation failed")
}
