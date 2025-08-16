package modules

import (
	"fire/firepack"
	"io"
	"net/http"
)

func fetchFileList(name string, version string) []ListEntry {
	var entries []ListEntry
	err := firepack.ApiGet("/list/"+name+"/"+version, nil, nil, &entries)
	if err != nil {
		panic(err)
	}

	return entries
}

func fetchFile(url string) string {
	resp, err := http.Get(url)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}

	return string(body)
}
