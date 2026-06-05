import { writeFileSync } from "fs";

async function testJee() {
  const url = "https://questions.examside.com/past-years/jee/jee-main/physics/units-and-measurement/__data.json";
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; StudyUltBot/1.0; +https://evstudy.app)" },
    signal: AbortSignal.timeout(20000),
  });
  const rawJson = await res.text();
  const parsed = JSON.parse(rawJson);
  console.log("Top type:", parsed.type);
  console.log("Nodes length:", parsed.nodes?.length);
  if (parsed.nodes) {
    for (let i = 0; i < Math.min(5, parsed.nodes.length); i++) {
      console.log(`  Node ${i}: type=${parsed.nodes[i].type}, data length=${parsed.nodes[i].data?.length}`);
    }
  }
  // Also try JEE Advanced
  const url2 = "https://questions.examside.com/past-years/jee/jee-advanced/physics/__data.json";
  console.log("\nFetching JEE Advanced:", url2);
  const res2 = await fetch(url2, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; StudyUltBot/1.0; +https://evstudy.app)" },
    signal: AbortSignal.timeout(20000),
  });
  console.log("Status:", res2.status);
  if (res2.ok) {
    const raw2 = await res2.text();
    console.log("Length:", raw2.length);
    const parsed2 = JSON.parse(raw2);
    console.log("Top type:", parsed2.type);
    console.log("Nodes length:", parsed2.nodes?.length);
    if (parsed2.nodes) {
      for (let i = 0; i < Math.min(5, parsed2.nodes.length); i++) {
        console.log(`  Node ${i}: type=${parsed2.nodes[i].type}, data length=${parsed2.nodes[i].data?.length}`);
      }
    }
  }
}

testJee().catch(console.error);
