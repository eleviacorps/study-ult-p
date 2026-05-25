import FlashcardsClient from "./flashcards-client";

export default function FlashcardsPage() {
  return <FlashcardsClient />;
}

export async function generateStaticParams() {
  return [
    { chapter: "Electric Charges and Fields" },
    { chapter: "Units and Measurement" },
    { chapter: "Units Dimensions and Error Analysis" },
  ];
}
