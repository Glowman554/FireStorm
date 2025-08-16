package authentication

type StatusResponse struct {
	Administrator bool   `json:"administrator,omitempty"`
	Username      string `json:"username,omitempty"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

type RegisterResponse struct {
	Token string `json:"token"`
}

type ChangePasswordResponse struct {
}
