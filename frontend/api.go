package frontend

import (
	"context"
	"io"
	"net/http"
	"time"

	"encore.app/frontend/templates"
	"encore.dev/rlog"
	"github.com/a-h/templ"
)

// //go:embed dist
// var dist embed.FS

//encore:service
type Service struct {
	mux *http.ServeMux
}

func initService() (*Service, error) {
	mux := http.NewServeMux()

	// mux.HandleFunc("/frontend/authentication/create", wrap(create))
	// mux.HandleFunc("/frontend/monitor/pages", wrap(pages))

	mux.HandleFunc("/frontend/", wrap(rendered(templates.LayoutProps{Title: "Index"}, templates.Index())))
	mux.HandleFunc("/frontend/authentication", wrap(rendered(templates.LayoutProps{Title: "Account"}, templates.AccountPage())))
	mux.HandleFunc("/frontend/authentication/create", wrap(CreateAccount))
	mux.HandleFunc("/frontend/authentication/login", wrap(LoginAccount))

	// assets, err := fs.Sub(dist, "dist")
	// if err != nil {
	// 	return nil, err
	// }

	// mux.Handle("/frontend/", http.StripPrefix("/frontend/", http.FileServer(http.FS(assets))))

	return &Service{
		mux: mux,
	}, nil
}

func withContext(f func(context.Context) error) error {
	context, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	return f(context)
}

func withBody(r *http.Request, f func([]byte) error) error {
	defer r.Body.Close()

	data, err := io.ReadAll(r.Body)
	if err != nil {
		return err
	}

	return f(data)
}

func wrap(f func(ctx context.Context, w http.ResponseWriter, r *http.Request) error) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		err := withContext(func(ctx context.Context) error {
			return f(ctx, w, r)
		})

		if err != nil {
			rlog.Error(err.Error())
			w.Write([]byte(err.Error()))
		}
	}
}

func render(component templ.Component, ctx context.Context, w http.ResponseWriter) error {
	return component.Render(ctx, w)
}

func rendered(props templates.LayoutProps, component templ.Component) func(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	return func(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
		return render(templates.Layout(props, component), ctx, w)
	}
}

//encore:api public raw path=/frontend/*path
func (service *Service) Serve(w http.ResponseWriter, req *http.Request) {
	service.mux.ServeHTTP(w, req)
}
