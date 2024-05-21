package authentication

import (
	"context"

	"encore.dev/cron"
)

var _ = cron.NewJob("cleanup-tokens", cron.JobConfig{
	Title:    "Cleanup expired tokens",
	Every:    1 * cron.Hour,
	Endpoint: CleanupTokens,
})

//encore:api private
func CleanupTokens(ctx context.Context) error {
	return cleanup(ctx)
}
