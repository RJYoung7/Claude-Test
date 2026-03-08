import express, { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import cors from "cors";
import multer from "multer";

const app = express();
const client = new Anthropic();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// POST /api/analyze-image — takes a photo, returns detected ingredients
app.post(
  "/api/analyze-image",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image provided" });
        return;
      }

      const base64Image = req.file.buffer.toString("base64");
      const mediaType = (req.file.mimetype ||
        "image/jpeg") as Anthropic.Base64ImageSource["media_type"];

      const response = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: `Analyze this image and identify all visible food ingredients, produce, pantry items, or grocery items.
Return ONLY a comma-separated list of the ingredients you can identify, with no extra explanation.
For example: "chicken breast, garlic, olive oil, cherry tomatoes, fresh basil"
If you cannot identify any food items, return "No ingredients detected".`,
              },
            ],
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      res.json({ ingredients: text.trim() });
    } catch (error) {
      console.error("Image analysis error:", error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  }
);

// POST /api/generate-recipe — streams a recipe back via SSE
app.post("/api/generate-recipe", async (req: Request, res: Response) => {
  try {
    const {
      ingredients,
      dietaryRestrictions,
    }: { ingredients: string; dietaryRestrictions: string[] } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const restrictionsText =
      dietaryRestrictions && dietaryRestrictions.length > 0
        ? `Dietary requirements (MUST follow strictly): ${dietaryRestrictions.join(", ")}.`
        : "";

    const ingredientsText =
      ingredients && ingredients.trim()
        ? `Use some or all of these available ingredients: ${ingredients.trim()}.`
        : "Create a recipe with common pantry staples.";

    const prompt = `You are a creative chef. Generate a delicious and complete dinner recipe.

${restrictionsText}
${ingredientsText}

Format your response exactly like this:

# [Creative Recipe Name]

*[One sentence appetizing description]*

**Prep time:** X minutes | **Cook time:** X minutes | **Serves:** X

---

## Ingredients

- [ingredient with amount]
- [ingredient with amount]
...

## Instructions

1. [Step]
2. [Step]
...

## Chef's Tips

[1-2 helpful tips for this recipe]

Make the recipe practical, delicious, and clearly written. Be specific with amounts and temperatures.`;

    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      thinking: { type: "adaptive" } as any,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(
          `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
        );
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Recipe generation error:", error);
    res.write(`data: ${JSON.stringify({ error: "Failed to generate recipe" })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🍽️  What's for Dinner? server running on http://localhost:${PORT}`);
});
