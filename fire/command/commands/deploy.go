package commands

import (
	"fire/arguments"
	"fire/client"
	"fire/project"
	"fire/storage"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Deploy struct{}

func (Deploy) PopulateParser(parser *arguments.Parser) {
	parser.Allow("init")
}

func (Deploy) Execute(parser *arguments.Parser) error {
	token, err := storage.LoadToken()
	if err != nil {
		return err
	}

	proj, err := project.Load()
	if err != nil {
		return err
	}

	if parser.Has("init") {
		fmt.Println("Creating remote repository...")
		err = client.CreatePackage(*token, proj.Name)
		if err != nil {
			return err
		}
	}

	fmt.Println("Deploying " + proj.Name + "@" + proj.Version + "...")

	err = filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err == nil {
			path = strings.ReplaceAll(path, "\\", "/")
			if !strings.HasSuffix(path, ".fl") {
				return nil
			}

			fmt.Println("Uploading: " + path)
			data, err := os.ReadFile(path)
			if err != nil {
				return err
			}

			return client.UploadFile(*token, proj.Name, &client.UploadFileProps{
				Name:    path,
				Version: proj.Version,
				Content: string(data),
			})
		}
		return nil
	})
	if err != nil {
		return err
	}

	return nil
}
