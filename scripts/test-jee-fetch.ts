import { writeFileSync } from "fs";
import { extractChapterQuestions } from "./decode-sveltekit";

async function testJee() {
  const url = "https://questions.examside.com/past-years/jee/jee-main/physics/units-and-measurement/__data.json";
  console.log("Fetching:", url);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; StudyUltBot/1.0; +https://evstudy.app)" },
    signal: AbortSignal.timeout(20000),
  });
  console.log("Status:", res.status);
  if (!res.ok) {
    console.log("FAIL");
    return;
  }
  const rawJson = await res.text();
  console.log("Length:", rawJson.length);

  const questions = extractChapterQuestions(
    rawJson,
    "Physics",
    "Units & Measurement",
    "https://questions.examside.com/past-years/jee/jee-main"
  );
  console.log("Questions extracted:", questions.length);
  if (questions.length > 0) {
    console.log("Sample Q1 id:", questions[0].id);
    console.log("Sample Q1 year:", questions[0].year);
    console.log("Sample Q1 type:", questions[0].type);
    console.log("Sample Q1 difficulty:", questions[0].difficulty);
    console.log("Sample Q1 has correct:", questions[0].correctAnswer);
    console.log("Sample Q1 text:", questions[0].questionText.substring(0, 200));
  }
}

testJee().catch(console.error);
