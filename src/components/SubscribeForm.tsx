export function SubscribeForm() {
  const subscribeUrl = process.env.NEXT_PUBLIC_NEWSLETTER_SUBSCRIBE_URL;

  if (!subscribeUrl) {
    return (
      <p className="text-sm text-ink/60">
        Newsletter signup is temporarily unavailable.
      </p>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <form
        action={subscribeUrl}
        method="post"
        target="_blank"
      rel="noopener noreferrer"
      data-analytics-event="newsletter_signup"
      data-placement="footer"
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          className="min-w-0 flex-1 rounded-lg border border-rule bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-r from-accent to-violet px-4 py-2 text-sm font-semibold text-white transition-shadow hover:shadow-prism"
        >
          Subscribe
        </button>
      </form>
    </div>
  );
}
