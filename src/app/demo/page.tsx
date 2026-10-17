import type { Metadata } from "next";
import { AppearanceScope } from "@/components/AppearanceProvider";
import { RecipientView } from "@/components/recipient/RecipientView";
import { SAMPLE_POSTCARD } from "@/lib/sample";

export const metadata: Metadata = {
  title: "Sample postcard · snailpost",
  description: "A fictional sample: Alex sends Grandma four little things from Thursday.",
};

export default function DemoPage() {
  return (
    <>
      <AppearanceScope scope="reader" />
      <RecipientView content={SAMPLE_POSTCARD} />
    </>
  );
}
