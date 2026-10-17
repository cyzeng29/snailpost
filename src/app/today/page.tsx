import type { Metadata } from "next";
import { TodayClient } from "./TodayClient";

export const metadata: Metadata = { title: "Today · snailpost" };

export default function TodayPage() {
  return <TodayClient />;
}
