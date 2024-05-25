package notify

import (
	"context"
	"time"

	"encore.app/authentication"
	"encore.app/remote"
	"encore.dev/pubsub"
)

var _ = pubsub.NewSubscription(remote.PackageCreation, "notify-package-creation", pubsub.SubscriptionConfig[*remote.Package]{
	Handler: ProcessPackageCreation,
})

var _ = pubsub.NewSubscription(remote.PackageDeletion, "notify-package-deletion", pubsub.SubscriptionConfig[*remote.Package]{
	Handler: ProccessPackageDeletion,
})

var _ = pubsub.NewSubscription(authentication.UserCreation, "notify-user-creation", pubsub.SubscriptionConfig[*authentication.User]{
	Handler: ProccessUserCreation,
})

var _ = pubsub.NewSubscription(authentication.UserDeletion, "notify-user-deletion", pubsub.SubscriptionConfig[*authentication.User]{
	Handler: ProccessUserDeletion,
})

func send(ctx context.Context, embeds []Embed) error {
	hook := Hook{
		Username: "FireStorm package registry",
		Embeds:   embeds,
	}
	return SendEmbed(ctx, secrets.Webhook, hook)
}

func packageFields(pkg *remote.Package) []Field {
	return []Field{
		{
			Name:   "Name",
			Value:  pkg.Package,
			Inline: false,
		},
		{
			Name:   "Owner",
			Value:  pkg.Owner,
			Inline: false,
		},
	}
}

func userFields(user *authentication.User) []Field {
	return []Field{
		{
			Name:   "Username",
			Value:  user.Username,
			Inline: false,
		},
	}
}

//encore:api private
func ProccessUserCreation(ctx context.Context, event *authentication.User) error {
	return send(ctx, []Embed{
		{
			Title:     "User created",
			Timestamp: time.Now(),
			Fields:    userFields(event),
		},
	})
}

//encore:api private
func ProccessUserDeletion(ctx context.Context, event *authentication.User) error {
	return send(ctx, []Embed{
		{
			Title:     "User deleted",
			Timestamp: time.Now(),
			Fields:    userFields(event),
		},
	})
}

//encore:api private
func ProccessPackageDeletion(ctx context.Context, event *remote.Package) error {
	return send(ctx, []Embed{
		{
			Title:     "Package deleted",
			Timestamp: time.Now(),
			Fields:    packageFields(event),
		},
	})
}

//encore:api private
func ProcessPackageCreation(ctx context.Context, event *remote.Package) error {
	return send(ctx, []Embed{
		{
			Title:     "New package created",
			Timestamp: time.Now(),
			Fields:    packageFields(event),
		},
	})
}
