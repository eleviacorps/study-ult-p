import ReaderChapterClient from "./reader-chapter-client";

export default function ReaderChapterPage() {
  return <ReaderChapterClient />;
}

export function generateStaticParams() {
  return [
    { chapter: "Electric Charges and Fields" },
    { chapter: "Units and Measurement" },
    { chapter: "Units Dimensions and Error Analysis" },
  ];
}
