package client

import "os"

var Target BaseURL = Environment("production")

func init() {
	if h, ok := os.LookupEnv("TARGET"); ok {
		if h == "local" {
			Target = Local
		} else {
			Target = Environment(h)
		}
	}
}

func Get(options ...Option) (*Client, error) {
	return New(Target, options...)
}
