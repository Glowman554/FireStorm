package commands

import (
	"context"
	"fire/arguments"
	"fire/client"
	"fire/project"
	"os"
	"strings"
)

type Get struct{}

func (Get) PopulateParser(parser *arguments.Parser) {
	parser.Allow("package")
	parser.Allow("version")
}

func (Get) Execute(parser *arguments.Parser) error {
	pkg, err := parser.Consume("package", nil)
	if err != nil {
		return err
	}
	version, err := parser.Consume("version", nil)
	if err != nil {
		return err
	}

	c, err := client.Get()
	if err != nil {
		return err
	}

	files, err := c.Remote.ListFiles(context.Background(), *pkg, client.RemoteListFilesProps{Version: *version})
	if err != nil {
		return err
	}

	output := *pkg + "@" + *version + "/"

	for _, file := range files.Files {
		content, err := c.Remote.LoadFile(context.Background(), *pkg, client.RemoteLoadFileProps{Version: *version, Name: file})
		if err != nil {
			return err
		}

		directoryPath := strings.Split(output+file, "/")
		directoryPath = directoryPath[:len(directoryPath)-1]

		if err = os.MkdirAll(strings.Join(directoryPath, "/"), os.ModePerm); err != nil {
			return err
		}

		if err = os.WriteFile(output+file, []byte(content.Content), os.ModePerm); err != nil {
			return err
		}
	}

	project.SavePath(output+project.ProjectFile, &project.Project{
		Name:    *pkg,
		Version: *version,
	})

	return nil
}
