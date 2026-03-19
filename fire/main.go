package main

import (
	"fire/arguments"
	"fire/command"
	"fire/command/commands"
	"fmt"
	"log/slog"
	"os"
)

var AvailableCommands = map[string]command.Command{
	"init":                  commands.Init{},
	"build":                 commands.Build{},
	"validate":              commands.Validate{},
	"validate_bytecode":     commands.ValidateBytecode{},
	"validate_bytecode_flc": commands.ValidateBytecodeFlc{},
	"validate_callgraph":    commands.ValidateCallgraph{},
	"executable":            commands.Executable{},
	"compile":               commands.Compile{},
	"status":                commands.Status{},
	"login":                 commands.Login{},
	"register":              commands.Register{},
	"delete":                commands.Delete{},
	"deploy":                commands.Deploy{},
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Expected at least one argument")
		fmt.Println("Use '" + os.Args[0] + " help' to get a list of supported commands.")
		return
	}

	if env, ok := os.LookupEnv("DEBUG"); ok && (env == "1" || env == "true") {
		slog.SetLogLoggerLevel(slog.LevelDebug)
	}

	subcommand := os.Args[1]
	if subcommand == "help" {
		maxLen := 0
		for key := range AvailableCommands {
			if len(key) > maxLen {
				maxLen = len(key)
			}
		}

		fmt.Println("Available commands:")
		for key := range AvailableCommands {
			paddingAmount := maxLen - len(key)
			padding := ""
			for range paddingAmount {
				padding += " "
			}

			fmt.Println("> " + key + padding + " - " + AvailableCommands[key].Description())
		}
		return
	}

	parser := arguments.NewParser()
	if cmd, ok := AvailableCommands[subcommand]; ok {
		cmd.PopulateParser(parser)
		err := parser.Parse(os.Args[2:])
		if err != nil {
			fmt.Println(err.Error())
			return
		}
		err = cmd.Execute(parser)
		if err != nil {
			fmt.Println(err.Error())
			os.Exit(1)
			return
		}
	} else {
		fmt.Println("Subcommand " + subcommand + " not found")
	}
}
