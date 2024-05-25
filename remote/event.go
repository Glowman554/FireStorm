package remote

import (
	"context"

	"encore.app/authentication"
	"encore.dev/pubsub"
)

var _ = pubsub.NewSubscription(
	authentication.UserDeletion, "delete-user-packages",
	pubsub.SubscriptionConfig[*authentication.User]{
		Handler: DeleteUserPackages,
	},
)

var PackageCreation = pubsub.NewTopic[*Package]("create-package", pubsub.TopicConfig{
	DeliveryGuarantee: pubsub.AtLeastOnce,
})

var PackageDeletion = pubsub.NewTopic[*Package]("delete-package", pubsub.TopicConfig{
	DeliveryGuarantee: pubsub.AtLeastOnce,
})

func DeleteUserPackages(ctx context.Context, event *authentication.User) error {
	return deletePackagesFrom(ctx, event.Username)
}
