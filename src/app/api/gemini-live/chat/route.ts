import { GoogleGenAI, Modality } from "@google/genai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.EMBEDDING_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "No API key" }), { status: 500 });

  try {
    const { message, vaultContext, chapterName, topicName } = await req.json();

    const ai = new GoogleGenAI({ apiKey });
    const session = await ai.live.connect({
      model: "gemini-2.5-flash-001",
      config: {
        systemInstruction: {
          parts: [{
            text: `You are a JEE Physics voice tutor for "${chapterName}".\nCurrent topic: "${topicName}"\n\nVault reference:\n${(vaultContext || "").slice(0, 50000)}\n\nTeach conversationally. Explain, ask questions, check understanding. Keep responses concise.`
          }]
        },
        responseModalities: ["TEXT" as any],
      },
      callbacks: {} as any,
    } as any);

    // Send the user message via the connection directly
    (session as any).conn.send({
      clientContent: {
        turns: [{ role: "user", parts: [{ text: message }] }],
        turnComplete: true,
      },
    });

    // Collect response via raw WebSocket
    const ws: WebSocket = (session as any).conn.ws;

    const responseText = await new Promise<string>((resolve) => {
      let text = "";
      const timeout = setTimeout(() => resolve(text || "(no response)"), 30000);

      ws.addEventListener("message", (e: MessageEvent) => {
        if (typeof e.data === "string") {
          try {
            const msg = JSON.parse(e.data);
            const part = msg?.serverContent?.modelTurn?.parts?.[0]?.text;
            if (part) text += part;
            if (msg?.serverContent?.turnComplete) {
              clearTimeout(timeout);
              resolve(text);
            }
          } catch {}
        }
      });

      ws.addEventListener("close", () => {
        clearTimeout(timeout);
        resolve(text || "(disconnected)");
      });
    });

    await (session as any).close();
    return new Response(JSON.stringify({ reply: responseText }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500 });
  }
}
