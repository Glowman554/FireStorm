package modules

import (
	"context"
	"fire/client"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type Module struct {
	Package string
	Version string
	Files   map[string]string
}

func writeToCache(cachePath string, file string, content string) {
	directoryPath := strings.Split(cachePath+file, "/")
	directoryPath = directoryPath[:len(directoryPath)-1]

	if err := os.MkdirAll(strings.Join(directoryPath, "/"), os.ModePerm); err != nil {
		panic(err)
	}
	if err := os.WriteFile(cachePath+file, []byte(content), os.ModePerm); err != nil {
		panic(err)
	}
}

func loadModuleFromCache(cachePath string, name string, version string) Module {
	files := map[string]string{}
	err := filepath.Walk(cachePath+".", func(path string, info os.FileInfo, err error) error {
		if err == nil {
			path = strings.ReplaceAll(path, "\\", "/")
			path = strings.TrimPrefix(path, cachePath)

			if !strings.HasSuffix(path, ".fl") {
				return nil
			}
			fmt.Println("(cache) Loading " + path)

			data, err := os.ReadFile(cachePath + path)
			if err != nil {
				return err
			}

			files[path] = string(data)

		}
		return nil
	})
	if err != nil {
		panic(err)
	}

	return Module{
		Package: name,
		Version: version,
		Files:   files,
	}
}

func loadModule(cachePath string, name string, version string) Module {
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

		writeToCache(cachePath, file, content.Content)
	}
	return Module{
		Package: name,
		Version: version,
		Files:   loaded,
	}
}

func NewPackage(name string, version string) Module {
	fmt.Println("Loading " + name + "@" + version)

	cachePath := ".fire/" + name + "@" + version + "/"
	if stat, err := os.Stat(cachePath); err != nil || !stat.IsDir() {
		return loadModule(cachePath, name, version)
	} else {
		return loadModuleFromCache(cachePath, name, version)
	}
}
