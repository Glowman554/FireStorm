package client

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

func CreatePackage(token string, name string) error {
	req, err := withToken(token, "GET", "/package/create/"+name, nil)
	if err != nil {
		return err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	if res.StatusCode != http.StatusOK {
		str, err := readResponse(res)
		if err != nil {
			return err
		}
		return errors.New(*str)
	}
	return nil
}

type UploadFileProps struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Content string `json:"content"`
}

func UploadFile(token string, pkg string, props *UploadFileProps) error {
	data, err := json.Marshal(props)
	if err != nil {
		return err
	}
	reader := bytes.NewReader(data)
	req, err := withToken(token, "POST", "/file/upload/"+pkg, reader)
	if err != nil {
		return err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	if res.StatusCode != http.StatusOK {
		str, err := readResponse(res)
		if err != nil {
			return err
		}
		return errors.New(*str)
	}
	return nil
}

type ListFilesResponse struct {
	Files []string `json:"files"`
}

func ListFiles(pkg string, version string) ([]string, error) {
	res, err := http.Get(host + "/package/list/" + pkg + "?version=" + version)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	if res.StatusCode != http.StatusOK {
		return nil, errors.New(string(body))
	}

	var response *ListFilesResponse
	err = json.Unmarshal(body, &response)
	if err != nil {
		return nil, err
	}

	return response.Files, nil
}

type LoadFileResponse struct {
	Content string `json:"content"`
}

func LoadFile(pkg string, version string, file string) (*string, error) {
	res, err := http.Get(host + "/package/load/file/" + pkg + "?version=" + version + "&name=" + file)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	if res.StatusCode != http.StatusOK {
		return nil, errors.New(string(body))
	}

	var response *LoadFileResponse
	err = json.Unmarshal(body, &response)
	if err != nil {
		return nil, err
	}
	return &response.Content, nil
}

func DeletePackage(token string, pkg string) error {
	req, err := withToken(token, "GET", "/package/delete/full/"+pkg, nil)
	if err != nil {
		return err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	if res.StatusCode != http.StatusOK {
		str, err := readResponse(res)
		if err != nil {
			return err
		}
		return errors.New(*str)
	}
	return nil
}

func DeletePackageVersion(token string, pkg string, version string) error {
	req, err := withToken(token, "GET", "/package/delete/version/"+pkg+"?version="+version, nil)
	if err != nil {
		return err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	if res.StatusCode != http.StatusOK {
		str, err := readResponse(res)
		if err != nil {
			return err
		}
		return errors.New(*str)
	}
	return nil
}
