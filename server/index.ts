import "dotenv/config";
import express, { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import cors from "cors";
import multer from "multer";
import sharp from "sharp";

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

      // Resize and compress image to stay under Claude's 5MB base64 limit
      const compressedBuffer = await sharp(req.file.buffer)
        .resize(1568, 1568, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      const base64Image = compressedBuffer.toString("base64");
      const mediaType = "image/jpeg" as Anthropic.Base64ImageSource["media_type"];

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
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

// POST /api/refine-recipe — streams a refined recipe based on user feedback
app.post("/api/refine-recipe", async (req: Request, res: Response) => {
  try {
    const {
      recipe,
      feedback,
      dietaryRestrictions,
    }: { recipe: string; feedback: string; dietaryRestrictions: string[] } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const restrictionsText =
      dietaryRestrictions && dietaryRestrictions.length > 0
        ? ` Remember to keep the recipe strictly ${dietaryRestrictions.join(", ")}.`
        : "";

    const stream = client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a creative chef. Generate a delicious and complete dinner recipe using the exact formatting structure shown below.`,
        },
        {
          role: "assistant",
          content: recipe,
        },
        {
          role: "user",
          content: `Please modify this recipe based on my feedback: "${feedback}"${restrictionsText}\n\nKeep the exact same markdown format as before.`,
        },
      ],
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
    console.error("Recipe refinement error:", error);
    res.write(`data: ${JSON.stringify({ error: "Failed to refine recipe" })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🍽️  What's for Dinner? server running on http://localhost:${PORT}`);
});
