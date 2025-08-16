package firepack

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
)

func GetBaseUrl() string {

	baseUrl := "https://firepack.toxicfox.de"

	if h, ok := os.LookupEnv("PACK_URL"); ok {
		baseUrl = h
	}

	return baseUrl
}

func ApiGet(path string, headers map[string]string, query map[string]string, out interface{}) error {
	base := GetBaseUrl()
	u, err := url.Parse(base + path)
	if err != nil {
		return err
	}

	slog.Debug("API Call", "url", u, "headers", headers, "query", query)

	q := u.Query()
	for k, v := range query {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()

	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		return err
	}

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode != 200 {
		var apiErr ErrorResponse
		if err := json.Unmarshal(body, &apiErr); err == nil && apiErr.Error != "" {
			return fmt.Errorf("api error: %s", apiErr.Error)
		}
		return fmt.Errorf("http error: %s", resp.Status)
	}

	if out != nil {
		if err := json.Unmarshal(body, out); err != nil {
			return err
		}
	}

	return nil
}

type Config struct {
	Token string `json:"token"`
}

func getConfigPath() (string, error) {
	if custom := os.Getenv("PACK_CONFIG"); custom != "" {
		fmt.Println("Using custom config path:", custom)
		return custom, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".pack.json"), nil
}

func LoadConfig() (*Config, error) {
	path, err := getConfigPath()
	if err != nil {
		return nil, err
	}
	file, err := os.ReadFile(path)
	if err != nil {
		return &Config{}, nil
	}
	var cfg Config
	if err := json.Unmarshal(file, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func SaveConfig(cfg *Config) error {
	path, err := getConfigPath()
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0600)
}
