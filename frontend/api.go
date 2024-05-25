package frontend

import (
	"context"
	"io"
	"net/http"
	"time"

	"encore.app/authentication"
	"encore.app/frontend/templates"
	"encore.dev/beta/auth"
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

	mux.HandleFunc("/frontend/", renderedLayout(templates.LayoutProps{Title: "Index"}, nofail(templates.Index)))
	mux.HandleFunc("/frontend/authentication", renderedLayout(templates.LayoutProps{Title: "Account"}, nofail(templates.AccountPage)))
	mux.HandleFunc("/frontend/authentication/create", wrap(CreateAccount))
	mux.HandleFunc("/frontend/authentication/login", wrap(LoginAccount))
	mux.HandleFunc("/frontend/authentication/delete", wrap(DeleteAccount))

	mux.HandleFunc("/frontend/package", renderedLayout(templates.LayoutProps{Title: "Package"}, nofail(templates.PackagesPage)))
	mux.HandleFunc("/frontend/package/create", wrap(CreatePackage))
	mux.HandleFunc("/frontend/package/list", wrap(ListPackage))
	mux.HandleFunc("/frontend/package/show", renderedLayout(templates.LayoutProps{Title: "Package"}, PackagePage))
	//frontend/package/show/version
	mux.HandleFunc("/frontend/package/show/version", renderedLayout(templates.LayoutProps{Title: "Package"}, PackageVersionPage))

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

func nofail(component func(*authentication.User, *http.Request) templ.Component) func(*authentication.User, *http.Request) (templ.Component, error) {
	return func(u *authentication.User, r *http.Request) (templ.Component, error) {
		return component(u, r), nil
	}
}

func render(component templ.Component, ctx context.Context, w http.ResponseWriter) error {
	return component.Render(ctx, w)
}

func renderedLayout(props templates.LayoutProps, component func(*authentication.User, *http.Request) (templ.Component, error)) func(w http.ResponseWriter, r *http.Request) {
	return wrap(func(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
		user, _ := auth.Data().(*authentication.User)
		c, err := component(user, r)
		if err != nil {
			return err
		}
		return render(templates.Layout(props, c), ctx, w)
	})

}

func rendered(component func(*authentication.User) templ.Component) func(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	return func(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
		user, _ := auth.Data().(*authentication.User)
		return render(component(user), ctx, w)
	}
}

//encore:api public raw path=/frontend/*endpoint
func (service *Service) Serve(w http.ResponseWriter, req *http.Request) {
	service.mux.ServeHTTP(w, req)
}
