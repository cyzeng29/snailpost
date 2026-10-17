import type { Metadata } from "next";
import { Suspense } from "react";
import { EditClient } from "./EditClient";

export const metadata: Metadata = { title: "Compose · snailpost" };

export default function Page() {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-center" role="status">Opening your postcard…</p>}>
      <EditClient />
    </Suspense>
  );
}
