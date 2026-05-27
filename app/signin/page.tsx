import { signIn } from "@/lib/auth";
import { Sparkles, Mail } from "lucide-react";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const hasResend = !!process.env.AUTH_RESEND_KEY;
  const hasGoogle = !!process.env.AUTH_GOOGLE_ID;

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="card w-full max-w-sm p-8">
        <div className="flex items-center gap-2 mb-1 text-accent">
          <Sparkles className="size-5" />
          <span className="text-sm font-medium">Tyra Life</span>
        </div>
        <h1 className="text-2xl font-semibold mb-1">Logga in</h1>
        <p className="text-sm text-fg-muted mb-6">
          Din livsplan, på ett ställe.
        </p>

        {params.check === "email" ? (
          <div className="rounded-lg bg-muted p-4 text-sm">
            <Mail className="size-4 inline-block mr-2" />
            Kolla din mail för en magic link.
          </div>
        ) : (
          <div className="space-y-3">
            {hasResend && (
              <form
                action={async (formData) => {
                  "use server";
                  await signIn("resend", {
                    email: formData.get("email") as string,
                    redirectTo: params.callbackUrl || "/",
                  });
                }}
                className="space-y-2"
              >
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="din@email.se"
                  className="card input px-3 py-2"
                />
                <button type="submit" className="btn-primary w-full">
                  Skicka magic link
                </button>
              </form>
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
                <button type="submit" className="btn-outline w-full">
                  Fortsätt med Google
                </button>
              </form>
            )}

            {!hasResend && !hasGoogle && (
              <div className="rounded-lg bg-muted p-4 text-sm text-fg-muted">
                Ingen auth-provider konfigurerad. Lägg till
                <code className="mx-1 px-1 py-0.5 bg-bg rounded">AUTH_RESEND_KEY</code>
                eller
                <code className="mx-1 px-1 py-0.5 bg-bg rounded">AUTH_GOOGLE_ID</code>
                i .env.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
