"use client";
import dynamic from "next/dynamic";

const VoiceTutorButton = dynamic(
  () => import("@/components/voice-tutor/voice-tutor-button").then((m) => ({ default: m.VoiceTutorButton })),
  { ssr: false }
);

export function VoiceTutorWrapper() {
  return <VoiceTutorButton />;
}
