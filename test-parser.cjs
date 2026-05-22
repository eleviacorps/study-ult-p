const fs = require("fs");

const content = fs.readFileSync(
  "D:/Programming/Web/StudyUlt2/PhysicsCh1/Physics/Electric_Charges_and_Fields/flashcards/100_flashcards.md",
  "utf-8"
);

const parseBlockByHeadings = (block) => {
  const result = new Map();
  const lines = block.split("\n");
  let currentKey = "";
  let currentValue = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hMatch = line.match(/^#{1,4}\s+([A-Za-z][A-Za-z\s]*?):?\s*$/);
    const boldHMatch = line.match(/^\*\*([A-Z][A-Za-z\s]*?):?\*\*\s*$/);

    if (hMatch) {
      if (currentKey) {
        result.set(currentKey.toLowerCase(), currentValue.join("\n"));
      }
      currentKey = hMatch[1].trim();
      currentValue = [];
      continue;
    }

    if (boldHMatch) {
      if (currentKey) {
        result.set(currentKey.toLowerCase(), currentValue.join("\n"));
      }
      currentKey = boldHMatch[1].trim();
      currentValue = [];
      continue;
    }

    const boldInlineMatch = line.match(/^\*\*([A-Z][A-Za-z\s]*?):\*\*\s+(.+)$/);
    if (boldInlineMatch) {
      if (currentKey) {
        result.set(currentKey.toLowerCase(), currentValue.join("\n"));
      }
      currentKey = boldInlineMatch[1].trim();
      currentValue = [boldInlineMatch[2]];
      continue;
    }

    if (currentKey) {
      currentValue.push(line);
    }
  }

  if (currentKey) {
    result.set(currentKey.toLowerCase(), currentValue.join("\n"));
  }

  return result;
};

const blocks = content.split(/^##\s+FC\d+/m);
const fc1 = blocks[1];

console.log("BLOCK LENGTH:", fc1.length);
console.log("FIRST LINE:", JSON.stringify(fc1.split("\n")[0]));
console.log("SECOND LINE:", JSON.stringify(fc1.split("\n")[1]));

const parsed = parseBlockByHeadings(fc1);
console.log("\nPARSED KEYS:");
for (const [k, v] of parsed) {
  console.log(`  "${k}": "${v.substring(0, 60)}"`);
}

console.log("\nQUESTION:", parsed.get("question")?.substring(0, 60));
console.log("ANSWER:", parsed.get("answer")?.substring(0, 60));

const cleanMdText = (text) => text
  .replace(/^>\s*/gm, "")
  .replace(/\[\[([^\]]+)\]\]/g, "$1")
  .replace(/\*\*(.*?)\*\*/g, "$1")
  .replace(/\*(.*?)\*/g, "$1")
  .replace(/#+\s*/g, "")
  .replace(/^\s*✅\s*/gm, "")
  .replace(/^\s*⚠️\s*/gm, "")
  .trim();

console.log("\nCLEAN QUESTION:", cleanMdText(parsed.get("question") || ""));
console.log("CLEAN ANSWER:", cleanMdText(parsed.get("answer") || ""));
