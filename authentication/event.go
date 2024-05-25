package authentication

import "encore.dev/pubsub"

var UserDeletion = pubsub.NewTopic[*User]("user-deletion", pubsub.TopicConfig{
	DeliveryGuarantee: pubsub.AtLeastOnce,
})

var UserCreation = pubsub.NewTopic[*User]("user-creation", pubsub.TopicConfig{
	DeliveryGuarantee: pubsub.AtLeastOnce,
})
