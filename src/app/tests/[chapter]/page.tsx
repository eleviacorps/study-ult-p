import TestsClient from "./tests-client";

export default function TestsPage() {
  return <TestsClient />;
}

export async function generateStaticParams() {
  return [
    { chapter: "Electric Charges and Fields" },
    { chapter: "Units and Measurement" },
    { chapter: "Units Dimensions and Error Analysis" },
  ];
}
