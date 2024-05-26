package modules

import (
	"context"
	"fire/client"
	"fmt"
	"strconv"
)

type Module struct {
	Package string
	Version string
	Files   map[string]string
}

func NewPackage(name string, version string) Module {
	fmt.Println("Loading " + name + "@" + version)

	c, err := client.Get()
	if err != nil {
		panic(err)
	}

	files, err := c.Remote.ListFiles(context.Background(), name, client.RemoteListFilesProps{Version: version})
	if err != nil {
		panic(err)
	}

	loaded := make(map[string]string)
	for i, file := range files.Files {
		fmt.Println("[" + strconv.Itoa(i+1) + "/" + strconv.Itoa(len(files.Files)) + "] Loading " + file)

		content, err := c.Remote.LoadFile(context.Background(), name, client.RemoteLoadFileProps{Version: version, Name: file})
		if err != nil {
			panic(err)
		}
		loaded[file] = content.Content
	}
	return Module{
		Package: name,
		Version: version,
		Files:   loaded,
	}
}
