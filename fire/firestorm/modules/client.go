package modules

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
)

func getBaseUrl() string {

	baseUrl := "https://firepack.glowman554.de"

	if h, ok := os.LookupEnv("PACK_URL"); ok {
		baseUrl = h
	}

	return baseUrl
}

func fetchFileList(name string, version string) []ListEntry {
	url := getBaseUrl() + "/list/" + name + "/" + version

	resp, err := http.Get(url)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}

	if resp.StatusCode == 500 {
		panic(string(body))
	}

	var items []ListEntry
	err = json.Unmarshal(body, &items)
	if err != nil {
		panic(err)
	}

	return items
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
