export function register() {
  // No-op: reserved for future monitoring SDK initialisation (e.g. Sentry, OpenTelemetry).
}

/**
 * Called by Next.js 15 for every unhandled error that occurs during a request.
 * Unlike process.on('uncaughtException'), this receives the REAL error object
 * before Next.js replaces it with the opaque `[Error: R] { digest: '...' }`
 * form that appears in PM2 logs.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export function onRequestError(
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string>;
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
    renderSource?: string;
    revalidateReason?: "on-demand" | "stale" | "build";
  },
) {
  const message =
    err instanceof Error ? `${err.name}: ${err.message}` : String(err);

  const stack =
    err instanceof Error && err.stack
      ? "\n" + err.stack.split("\n").slice(1, 5).join("\n")
      : "";

  console.error(
    `[NextError] ${context.routeType.toUpperCase()} ${request.method} ${request.path} (${context.routePath}) — ${message}${stack}`,
  );
}
