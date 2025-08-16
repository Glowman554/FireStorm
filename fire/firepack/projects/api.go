package projects

import "fire/firepack"

func Create(token string, name string) (*CreateResponse, error) {
	var res CreateResponse
	err := firepack.ApiGet("/projects/create/"+name, map[string]string{
		"authentication": token,
	}, nil, &res)
	return &res, err
}

func Delete(token string, name string) (*DeleteResponse, error) {
	var res DeleteResponse
	err := firepack.ApiGet("/projects/delete/"+name, map[string]string{
		"authentication": token,
	}, nil, &res)
	return &res, err
}
