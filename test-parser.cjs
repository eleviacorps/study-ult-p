const fs = require("fs");

const content = fs.readFileSync(
  "D:/Programming/Web/StudyUlt2/PhysicsCh1/Units and Measurement/flashcards/100_flashcards.md",
  "utf-8"
);
const blocks = content.split(/##\s+FC\d+/);
const fc1 = blocks[1];

console.log("RAW FC1 (first 400):");
console.log(fc1.substring(0, 400));
console.log("\n---");

const q1 = fc1.match(/###\s+Question:?\s*\n([\s\S]*?)\n###\s+/i);
console.log("Q PATTERN 1:", q1 ? "YES: [" + q1[1] + "]" : "NO");

const q2 = fc1.match(/#{1,4}\s+Question:?\s*\n([\s\S]*?)\n#{1,4}\s+/i);
console.log("Q PATTERN 2:", q2 ? "YES: [" + q2[1] + "]" : "NO");
