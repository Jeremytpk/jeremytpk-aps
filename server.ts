import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const PORT = 3000;

// Lazy initialization of the Gemini Client to prevent server startup crashes
let aiInstance: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': "aistudio-build",
        }
      }
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Route: AI Communication Assistant for Guests
  app.post("/api/chat-assistant", async (req, res) => {
    try {
      const { prompt, guestName, apartmentName, dates, bookingStatus, additionalNotes } = req.body;

      if (!prompt) {
         res.status(400).json({ error: "Missing required parameter 'prompt'." });
         return;
      }

      // Safeguard key inspection
      if (!process.env.GEMINI_API_KEY) {
         res.status(503).json({
          error: "Gemini API Key is not configured in this workspace. Please add GEMINI_API_KEY to your Secrets panel or .env."
        });
        return;
      }

      const client = getAIClient();

      const contextPrompt = `
Vous êtes un hôte expert de "L'Auberge Paul Sungani" (APS), des logements de prestige et de charme.
Votre objectif est de rédiger un message extrêmement chaleureux, professionnel, poli, accueillant et précis à l'attention d'un voyageur.
Le message doit être rédigé entièrement en français.

Voici les détails de la réservation en cours :
- Nom du voyageur : ${guestName || "Client"}
- Nom de l'hébergement : ${apartmentName || "Hébergement"}
- Dates du séjour : ${dates || "N/A"}
- Statut de la réservation : ${bookingStatus || "Confirmé"}
- Instructions / Notes additionnelles : ${additionalNotes || "Aucune"}

L'hôte souhaite rédiger un message pour l'objectif de communication suivant :
"${prompt}"

Veuillez rédiger un message soigné, professionnel et convivial, prêt à être envoyé par copier-coller. Conservez toujours un ton très respectueux, accueillant et digne de l'Auberge Paul Sungani. N'incluez pas de crochets ou de balises de texte à remplacer (comme [Votre Nom]), utilisez des alternatives pertinentes ou signez "L'équipe de l'Auberge Paul Sungani" ou "Paul". Utilisez un formatage clair et aéré (paragraphes, listes si nécessaire) pour rendre la lecture agréable.
      `.trim();

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contextPrompt,
      });

      const text = response.text || "Failed to generate message text.";
      res.json({ text });
    } catch (error: any) {
      console.error("AI Communication Assistant error:", error);
      res.status(500).json({ error: error.message || "An unexpected error occurred." });
    }
  });

  // API Route: Get status of Gemini Configuration
  app.get("/api/ai-status", (req, res) => {
    res.json({
      configured: !!process.env.GEMINI_API_KEY,
    });
  });

  // Vite middleware for development or Static Asset serving for production
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Airbnb Booking and Cleaning Manager server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
