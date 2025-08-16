package versions

type UploadResult struct {
	Id          string `json:"id"`
	Url         string `json:"url"`
	UploadToken string `json:"uploadToken"`
}

type CreateResponse map[string]UploadResult

type DeleteResponse struct {
}
