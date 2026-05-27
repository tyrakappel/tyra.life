import { Suspense } from "react";
import { signIn } from "@/lib/auth";
import { Sparkles, Mail } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "Kunde inte starta inloggningen. Försök igen.",
  OAuthCallback: "Något gick fel vid återkomsten från Google. Försök igen.",
  OAuthAccountNotLinked:
    "Den här e-postadressen finns redan kopplad till ett annat inloggningssätt.",
  AccessDenied: "Åtkomst nekad.",
  Verification: "Verifieringslänken är ogiltig eller har gått ut.",
  Configuration: "Serverkonfiguration saknas. Kontakta admin.",
  Default: "Något gick fel vid inloggningen. Försök igen.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    check?: string;
    callbackUrl?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const hasResend = !!process.env.AUTH_RESEND_KEY;
  const hasGoogle = !!process.env.AUTH_GOOGLE_ID;
  const errorMsg = params.error
    ? ERROR_MESSAGES[params.error] ?? ERROR_MESSAGES.Default
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <Suspense fallback={null}>
        <div className="w-full max-w-sm">
          {/* Wordmark */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-accent shadow-xl shadow-accent/50 ring-1 ring-accent/30 mb-4">
              <Sparkles className="size-8 text-accent-fg" strokeWidth={2.4} />
            </div>
            <div className="text-5xl tracking-tight select-none leading-none font-bold">
              <span className="text-fg">Tyra</span>
              <span className="text-accent">Life</span>
            </div>
            <p
              className="text-fg-muted text-sm mt-2 select-none italic"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                letterSpacing: "0.02em",
              }}
            >
              Din livsplan, på ett ställe
            </p>
          </div>

          {/* Card */}
          <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm">
            {params.check === "email" ? (
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center size-12 rounded-full bg-accent/15 mb-4">
                  <Mail className="size-6 text-accent" />
                </div>
                <h1 className="font-bold text-2xl mb-2">Kolla din mail</h1>
                <p className="text-fg-muted text-sm">
                  Vi har skickat en magic link till dig. Klicka på länken för
                  att logga in.
                </p>
              </div>
            ) : (
              <>
                <h1 className="font-bold text-2xl mb-2">Välkommen</h1>
                <p className="text-fg-muted text-sm mb-8">
                  Logga in med Google för att fortsätta
                </p>

                {errorMsg && (
                  <div className="mb-6 px-4 py-3 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm">
                    {errorMsg}
                  </div>
                )}

                {hasGoogle && (
                  <form
                    action={async () => {
                      "use server";
                      await signIn("google", {
                        redirectTo: params.callbackUrl || "/",
                      });
                    }}
                  >
                    <button
                      type="submit"
                      className="flex items-center justify-center gap-3 w-full bg-accent hover:bg-accent/90 active:bg-accent/80 text-accent-fg font-bold text-base py-4 px-5 rounded-full shadow-lg shadow-accent/40 hover:shadow-xl hover:shadow-accent/50 transition-all duration-150 ease-snap"
                    >
                      <GoogleIcon />
                      Fortsätt med Google
                    </button>
                  </form>
                )}

                {hasResend && (
                  <>
                    {hasGoogle && (
                      <div className="my-6 flex items-center gap-3 text-xs text-fg-muted/70">
                        <div className="flex-1 h-px bg-border" />
                        <span className="uppercase tracking-wider">eller</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <form
                      action={async (formData) => {
                        "use server";
                        await signIn("resend", {
                          email: formData.get("email") as string,
                          redirectTo: params.callbackUrl || "/",
                        });
                      }}
                      className="space-y-2.5"
                    >
                      <input
                        name="email"
                        type="email"
                        required
                        placeholder="din@email.se"
                        className="w-full bg-muted/50 border border-border rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                      />
                      <button
                        type="submit"
                        className="flex items-center justify-center w-full border border-border hover:border-fg-muted/40 text-fg-muted hover:text-fg py-3 px-5 rounded-full text-sm font-medium transition-colors duration-150"
                      >
                        Skicka magic link
                      </button>
                    </form>
                  </>
                )}

                {!hasGoogle && !hasResend && (
                  <div className="rounded-xl bg-muted p-4 text-sm text-fg-muted">
                    Ingen auth-provider är konfigurerad. Sätt{" "}
                    <code className="px-1 py-0.5 bg-bg rounded">
                      AUTH_GOOGLE_ID
                    </code>{" "}
                    eller{" "}
                    <code className="px-1 py-0.5 bg-bg rounded">
                      AUTH_RESEND_KEY
                    </code>{" "}
                    i .env.
                  </div>
                )}

                <p className="text-center text-xs text-fg-muted/70 mt-8">
                  Personligt utrymme
                </p>
              </>
            )}
          </div>

          {/* Version */}
          <p className="text-center text-fg-muted/50 text-xs mt-8 select-none">
            v{APP_VERSION}
          </p>
        </div>
      </Suspense>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
