package main

import (
	"fire/arguments"
	"fire/command"
	"fire/command/commands"
	"fmt"
	"os"
)

var AvailableCommands = map[string]command.Command{
	"create":   commands.Create{},
	"login":    commands.Login{},
	"delete":   commands.Delete{},
	"init":     commands.Init{},
	"deploy":   commands.Deploy{},
	"build":    commands.Build{},
	"validate": commands.Validate{},
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Expected at least 2 arguments")
		return
	}

	subcommand := os.Args[1]
	if subcommand == "help" {
		fmt.Println("Available commands:")
		for key := range AvailableCommands {
			fmt.Println("> " + key)
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
			return
		}
	} else {
		fmt.Println("Subcommand " + subcommand + " not found")
	}
}
