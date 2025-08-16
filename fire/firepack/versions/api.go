package versions

import (
	"fire/firepack"
	"strings"
)

func Create(token string, project string, version string, files []string) (*CreateResponse, error) {
	var res CreateResponse
	err := firepack.ApiGet("/versions/create/"+project+"/"+version, map[string]string{
		"authentication": token,
	}, map[string]string{
		"files": strings.Join(files, ";"),
	}, &res)
	return &res, err
}

func Delete(token string, project string, version string) (*DeleteResponse, error) {
	var res DeleteResponse
	err := firepack.ApiGet("/versions/delete/"+project+"/"+version, map[string]string{
		"authentication": token,
	}, nil, &res)
	return &res, err
}
