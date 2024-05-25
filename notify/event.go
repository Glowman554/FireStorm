package notify

import (
	"context"
	"errors"
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

//encore:api private
func ProccessUserCreation(ctx context.Context, event *authentication.User) error {
	return errors.New("not implemented")
}

//encore:api private
func ProccessUserDeletion(ctx context.Context, event *authentication.User) error {
	return errors.New("not implemented")
}

//encore:api private
func ProccessPackageDeletion(ctx context.Context, event *remote.Package) error {
	return errors.New("not implemented")
}

//encore:api private
func ProcessPackageCreation(ctx context.Context, event *remote.Package) error {
	var webhookurl = "https://discord.com/api/webhooks/1202728708876537856/8p6hvo5SkRrOVrwnhqF2fwjWQFyuWud1stgkXvHV4QXDOvApan0Wprc_t2uyyo5KLWyT"

	embed := Embed{
		Title:     "New package created",
		Timestamp: time.Now(),
		Fields: []Field{
			{
				Name:   "Name",
				Value:  event.Package,
				Inline: false,
			},
			{
				Name:   "Owner",
				Value:  event.Owner,
				Inline: false,
			},
		},
	}

	return SendEmbed(ctx, webhookurl, embed)
}
