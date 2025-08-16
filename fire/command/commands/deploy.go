package commands

import (
	"bytes"
	"fire/arguments"
	"fire/firepack"
	"fire/firepack/projects"
	"fire/firepack/versions"
	"fire/project"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type Deploy struct{}

func readDirectoryRecursive(directory string) ([]string, error) {
	var result []string
	err := filepath.WalkDir(directory, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			result = append(result, path)
		}
		return nil
	})
	return result, err
}

func upload(file string, url string, token string) error {
	data, err := os.ReadFile(file)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authentication", token)

	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("failed to upload file, status: %s", res.Status)
	}

	return nil
}

func (Deploy) PopulateParser(parser *arguments.Parser) {
	parser.Allow("create", "Create project on remote server")
}

func (Deploy) Execute(parser *arguments.Parser) error {
	config, err := firepack.LoadConfig()
	if err != nil {
		return err
	}

	proj, err := project.Load()
	if err != nil {
		return err
	}

	fmt.Printf("Deploying %s@%s\n", proj.Name, proj.Version)

	if parser.Has("create") {
		_, err := projects.Create(config.Token, proj.Name)
		if err != nil {
			return err
		}
	}

	files, err := readDirectoryRecursive(".")
	if err != nil {
		return err
	}

	var filtered []string
	for _, file := range files {
		if !strings.Contains(file, ".fire") {
			filtered = append(filtered, file)
			slog.Debug("Found file " + file)
		}
	}

	fmt.Printf("Uploading %d files\n", len(filtered))

	uploadFiles, err := versions.Create(config.Token, proj.Name, proj.Version, filtered)
	if err != nil {
		return err
	}

	for file, u := range *uploadFiles {
		fmt.Printf("Uploading %s\n", file)
		err := upload(file, u.Url, u.UploadToken)
		if err != nil {
			return err
		}
	}

	return nil
}

func (Deploy) Description() string {
	return "[FirePack] Upload a version of a project"
}
