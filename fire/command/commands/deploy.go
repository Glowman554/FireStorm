package commands

import (
	"context"
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
	parser.Allow("init", "Set to remote init package")
}

func (Deploy) Execute(parser *arguments.Parser) error {
	c, err := client.Get(storage.TokenOption())
	if err != nil {
		return err
	}

	proj, err := project.Load()
	if err != nil {
		return err
	}

	if parser.Has("init") {
		fmt.Println("Creating remote repository...")
		err = c.Remote.CreatePackage(context.Background(), proj.Name)
		if err != nil {
			return err
		}
	}

	fmt.Println("Deploying " + proj.Name + "@" + proj.Version + "...")

	err = filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err == nil {
			path = strings.ReplaceAll(path, "\\", "/")
			if !strings.HasSuffix(path, ".fl") || strings.Contains(path, ".fire/") {
				return nil
			}

			fmt.Println("Uploading: " + path)
			data, err := os.ReadFile(path)
			if err != nil {
				return err
			}

			return c.Remote.UploadFile(context.Background(), proj.Name, client.RemoteUploadFileProps{
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

func (Deploy) Description() string {
	return "Deploy a project to the package registry"
}
