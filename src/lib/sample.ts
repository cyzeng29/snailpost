import type { PostcardContent } from "./model";

/**
 * The single, clearly labelled fictional demo. Alex and Grandma are not real
 * people; the pictures are original illustrations and the narration is
 * computer-generated speech (macOS `say`), not a family recording.
 */
export const SAMPLE_NOTICE =
  "Alex and Grandma are fictional, the pictures are illustrations, and the voice is computer-generated.";

export const SAMPLE_TRANSCRIPT =
  "Hi Grandma. Nothing big happened today. I made your eggs this morning, and they still weren't as good as yours. " +
  "The leaves finally started turning on the walk to class. I stayed a little late at practice, and we all ate dinner together. " +
  "I saved you a story. I just wanted you to be in it.";

export const SAMPLE_POSTCARD: PostcardContent = {
  id: "sample-alex-thursday",
  title: "Four little things from Thursday",
  note: "Nothing big happened today. I just wanted you to be in it.",
  senderName: "Alex",
  recipientName: "Grandma",
  fromPlace: "Boston",
  toPlace: "Shanghai",
  day: "2026-10-15",
  timeZone: "America/New_York",
  stamp: "breakfast-club",
  moments: [
    {
      id: "s1",
      caption: "Tried your eggs. Still not as good as yours.",
      capturedAt: "2026-10-15T08:12:00-04:00",
      src: "/sample/breakfast.jpg",
      width: 1600,
      height: 1200,
    },
    {
      id: "s2",
      caption: "The leaves finally started turning.",
      capturedAt: "2026-10-15T09:40:00-04:00",
      src: "/sample/walk.jpg",
      width: 1600,
      height: 1200,
    },
    {
      id: "s3",
      caption: "Stayed a little late. Felt good to be outside.",
      capturedAt: "2026-10-15T17:55:00-04:00",
      src: "/sample/practice.jpg",
      width: 1600,
      height: 1200,
    },
    {
      id: "s4",
      caption: "We ate together. I saved you a story.",
      capturedAt: "2026-10-15T19:30:00-04:00",
      src: "/sample/dinner.jpg",
      width: 1600,
      height: 1200,
    },
  ],
  voice: { src: "/sample/narration.m4a", mimeType: "audio/mp4", durationSec: 16 },
  written: { kind: "transcript", text: SAMPLE_TRANSCRIPT },
  isSample: true,
  sampleNotice: SAMPLE_NOTICE,
};
