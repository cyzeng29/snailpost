// The recipient's link. Works in a fresh browser with no account.
// Bearer-link page: no-store, noindex and no-referrer are set in next.config.ts,
// and the link preview is generic so private photos never appear in chat previews.
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppearanceScope } from "@/components/AppearanceProvider";
import { Wordmark } from "@/components/brand";
import { RecipientView } from "@/components/recipient/RecipientView";
import { readShared, serverConfigured } from "@/lib/publish/server";

export const metadata: Metadata = {
  title: "A postcard for you · snailpost",
  description: "Someone sent you a little piece of their day.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  openGraph: { title: "A postcard for you", description: "Someone sent you a little piece of their day.", images: [] },
};

async function Shared({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const content = serverConfigured() ? await readShared(token).catch(() => null) : null;
  if (!content) return <Unavailable />;
  const origin = process.env.PUBLIC_SITE_URL;
  return <RecipientView content={content} shareUrl={origin ? `${origin}/p/${token}` : undefined} />;
}

function Unavailable() {
  return (
    <main className="mx-auto max-w-[36rem] px-4 py-10">
      <Wordmark />
      <h1 className="display mt-10 text-[2rem] font-[600] leading-tight">This postcard is no longer available.</h1>
      <p className="mt-3 text-[1.1rem]">The link may have been turned off by the person who sent it, or it may be incomplete. If you were expecting a postcard, ask them to send the link again.</p>
    </main>
  );
}

export default function SharedPostcardPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <>
      <AppearanceScope scope="reader" />
      <Suspense fallback={<p className="px-4 py-10 text-center" role="status">Opening the postcard…</p>}>
        <Shared params={params} />
      </Suspense>
    </>
  );
}
