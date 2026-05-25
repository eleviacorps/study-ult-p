import QuestionsClient from "./questions-client";

export default function QuestionsPage() {
  return <QuestionsClient />;
}

export async function generateStaticParams() {
  return [
    { chapter: "Electric Charges and Fields" },
    { chapter: "Units and Measurement" },
    { chapter: "Units Dimensions and Error Analysis" },
  ];
}
