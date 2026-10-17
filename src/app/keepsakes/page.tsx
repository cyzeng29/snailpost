import type { Metadata } from "next";
import { KeepsakesClient } from "./KeepsakesClient";

export const metadata: Metadata = { title: "Keepsakes · snailpost" };

export default function KeepsakesPage() {
  return <KeepsakesClient />;
}
