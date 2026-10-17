import type { Metadata } from "next";
import { Suspense } from "react";
import { PreviewClient } from "./PreviewClient";

export const metadata: Metadata = { title: "Preview · snailpost" };

export default function Page() {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-center" role="status">Opening your postcard…</p>}>
      <PreviewClient />
    </Suspense>
  );
}
