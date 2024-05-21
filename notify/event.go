package notify

import (
	"context"
	"time"

	"encore.app/remote"
	"encore.dev/pubsub"
)

var _ = pubsub.NewSubscription(remote.PackageCreation, "notify-user", pubsub.SubscriptionConfig[*remote.Package]{
	Handler: ProcessPackageCreation,
})

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
