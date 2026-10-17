import type { Metadata } from "next";
import { AppearanceScope } from "@/components/AppearanceProvider";
import { RecipientView } from "@/components/recipient/RecipientView";
import { READING_DEFAULTS } from "@/lib/model";
import { SAMPLE_POSTCARD } from "@/lib/sample";

export const metadata: Metadata = {
  title: "Sample postcard, one page at a time · snailpost",
  description: "The fictional sample as a grandparent sees it with the default reading setup.",
};

export default function SimpleDemoPage() {
  return (
    <>
      <AppearanceScope scope="reader" />
      <RecipientView content={{ ...SAMPLE_POSTCARD, id: `${SAMPLE_POSTCARD.id}-simple`, reading: READING_DEFAULTS }} />
    </>
  );
}
