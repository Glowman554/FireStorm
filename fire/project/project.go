package project

import (
	"encoding/json"
	"os"
)

type Compiler struct {
	Includes []string `json:"includes"`
	Target   *string  `json:"target"`
	Input    string   `json:"input"`
	Output   string   `json:"output"`
}

type Project struct {
	Name     string    `json:"name"`
	Version  string    `json:"version"`
	Compiler *Compiler `json:"compiler"`
}

var projectFile = "fire.json"

func NewProject(name string, shouldIncludeCompiler bool) *Project {
	var compiler *Compiler = nil
	if shouldIncludeCompiler {
		compiler = &Compiler{
			Includes: []string{},
			Input:    "main.fl",
			Output:   "main.elf",
		}
	}
	return &Project{
		Name:     name,
		Version:  "1.0.0",
		Compiler: compiler,
	}
}

func Save(project *Project) error {
	data, err := json.MarshalIndent(project, "", "\t")
	if err != nil {
		return err
	}
	return os.WriteFile(projectFile, data, os.ModePerm)
}

func Load() (*Project, error) {
	data, err := os.ReadFile(projectFile)
	if err != nil {
		return nil, err
	}
	var proj *Project
	err = json.Unmarshal(data, &proj)
	if err != nil {
		return nil, err
	}
	return proj, nil
}
