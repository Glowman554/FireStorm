package modules

import (
	"fire/client"
	"fmt"
)

type Module struct {
	Package string
	Version string
	Files   map[string]string
}

func NewPackage(name string, version string) Module {
	fmt.Println("Loading " + name + "@" + version)

	files, err := client.ListFiles(name, version)
	if err != nil {
		panic(err)
	}

	loaded := make(map[string]string)
	for i := range files {
		content, err := client.LoadFile(name, version, files[i])
		if err != nil {
			panic(err)
		}
		loaded[files[i]] = *content
	}
	return Module{
		Package: name,
		Version: version,
		Files:   loaded,
	}
}
