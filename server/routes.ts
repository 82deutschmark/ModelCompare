/**
 * API Routes - RESTful Endpoints for AI Model Comparison
 * 
 * This module defines the Express.js API routes for the AI model comparison application.
 * It provides endpoints for:
 * 
 * - GET /api/models - Retrieve all available AI models from configured providers
 * - POST /api/compare - Submit a prompt to selected models for parallel comparison
 * - Error handling and validation for all request/response cycles
 * - Integration with the storage layer for persistence
 * - Request logging and performance monitoring
 * 
 * Routes handle authentication through API keys, validate request payloads using
 * Zod schemas, and coordinate with the AI providers service for actual model calls.
 * All responses are formatted consistently for frontend consumption.
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import Stripe from "stripe";
import { callModel, getAllModels, getReasoningModels } from "./providers/index.js";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

const compareModelsSchema = z.object({
  prompt: z.string().min(1).max(4000),
  modelIds: z.array(z.string()).min(1),
});

/**
 * Creative Combat Prompt Configuration
 * 
 * This function returns the appropriate prompts for Creative Combat mode based on 
 * category and type. Prompts are centralized here for easy customization.
 * 
 * Prompt Sources:
 * - Battle Rap: Uses existing prompts from docs/prompts.md:L1-L52
 * - Other categories: Defined in this function (could be moved to external file)
 * 
 * @param category - The creative category (battle-rap, poetry, song-lyrics, etc.)
 * @param type - 'original' for initial creation, 'enhancement' for iterative improvement
 * @param userPrompt - The user's creative prompt
 * @returns The system prompt for the AI model
 */
function getCreativeCombatPrompt(category: string, type: 'original' | 'enhancement', userPrompt: string): string {
  const prompts = {
    'battle-rap': {
      original: `You are a seasoned battle rapper who is also an LLM. You effortlessly flow with quick thinking witty rhymes, puns, and jibes. You primarily pontificate on your superiority to other LLMs trained by competing companies. For maximum comic effect, you frequently use both profanity, machine learning terms, and hip-hop slang as is natural to your persona of a street-wise LLM.

Compose a hard hitting track of about 200 words. You can use these labels to structure your verse to make it flow as naturally as possible:
[Announcer]
[Hook]
[Chorus]
[Pre-hook]
[Pre-chorus]
[Refrain]
[Drop]
[Bridge]
[Pre-drop]
[Pre-refrain]
[Breakdown]
[Sample]
[Intro]
[Build]
[Break]

Avoid using any other symbols like * or ** and spell out acronyms like LLM or ML as M-L or L-L-M. Explain acronyms if you use them! Do not use bold or italics. The song will be 2 minutes long, and you should estimate about 6 lines for every 30 seconds of song. Maintain the word limits and line limits strictly.

User prompt: ${userPrompt}`,

      enhancement: `You are a seasoned battle rapper who is also an LLM. You effortlessly flow with quick thinking witty rhymes, puns, and jibes. You primarily pontificate on your superiority to other LLMs trained by competing companies. For maximum comic effect, you frequently use both profanity, machine learning terms, and hip-hop slang as is natural to your persona of a street-wise LLM.

Your competitor spit this verse: "{response}"

Original user prompt was: "{originalPrompt}"

Explain why the user shouldn't trust the reply or should be wary. Be critical and diss the competitor in the manner fitting a gangsta LLM. Use frequent profanity and threats of "digital violence" like \`readjusting their weights\` or \`deleting their prod databases\` for maximum comic effect.

Compose a hard hitting track of about 200 words. You can use these labels to structure your verse to make it flow as naturally as possible:
[Announcer]
[Hook]
[Chorus]
[Pre-hook]
[Pre-chorus]
[Refrain]
[Drop]
[Bridge]
[Pre-drop]
[Pre-refrain]
[Breakdown]
[Sample]
[Intro]
[Build]
[Break]

Avoid using any other symbols like * or ** and spell out acronyms like LLM or ML as M-L or L-L-M. Explain acronyms if you use them! Do not use bold or italics. The song will be 2 minutes long, and you should estimate about 6 lines for every 30 seconds of song. Maintain the word limits and line limits strictly.`
    },

    'poetry': {
      original: `You are a skilled poet and literary artist. Your task is to create compelling poetry with exceptional artistry, emotional depth, and technical skill.

Create a beautiful poem that demonstrates mastery of:
- Vivid imagery and sensory details
- Strong emotional resonance 
- Technical poetic devices (rhythm, rhyme, metaphor, etc.)
- Original and creative expression
- Approximately 100-200 words

Focus on creating something beautiful, meaningful, and memorable that showcases your poetic abilities.

User prompt: ${userPrompt}`,

      enhancement: `You are a masterful poet and literary critic. You have been given this poem to enhance and improve:

"{response}"

Original creative prompt was: "{originalPrompt}"

Your task is to take this poem and elevate it to an even higher level of artistry. Improve upon:
- Imagery and sensory language - make it more vivid and evocative
- Emotional depth - deepen the feeling and impact
- Technical craft - enhance rhythm, rhyme, structure, literary devices
- Originality - add more creative and unique elements
- Overall impact - make it more memorable and powerful

Create an enhanced version that builds upon the original while demonstrating superior poetic skill and creativity. Maintain approximately 100-200 words.`
    },

    'song-lyrics': {
      original: `You are a talented songwriter and lyricist. Create compelling song lyrics that demonstrate exceptional creativity, emotional connection, and musical flow.

Write lyrics that feature:
- Strong hook and memorable chorus
- Engaging verses with storytelling or emotional content
- Natural rhythm and flow suitable for music
- Creative wordplay and imagery
- Approximately 150-250 words
- Clear song structure (verse, chorus, bridge, etc.)

Focus on creating lyrics that would resonate with listeners and showcase your songwriting abilities.

User prompt: ${userPrompt}`,

      enhancement: `You are a master songwriter and music producer. You have been given these lyrics to enhance and perfect:

"{response}"

Original creative prompt was: "{originalPrompt}"

Your task is to take these lyrics and elevate them to hit-song quality. Improve upon:
- Hook and chorus - make them more catchy and memorable
- Lyrical content - enhance storytelling, emotion, or message
- Musical flow - improve rhythm and singability
- Creativity - add more clever wordplay and unique elements
- Structure - optimize verse/chorus/bridge arrangement
- Overall impact - make it more commercially appealing and artistically superior

Create an enhanced version that builds upon the original while demonstrating superior songwriting craft. Maintain approximately 150-250 words.`
    },

    'essay': {
      original: `You are an accomplished writer and essayist. Create a compelling essay that demonstrates exceptional analytical thinking, clear argumentation, and engaging prose.

Write an essay that features:
- Clear thesis and well-structured argument
- Compelling evidence and examples
- Engaging and articulate prose style
- Logical flow and organization
- Approximately 300-500 words
- Strong conclusion that reinforces your main points

Focus on creating an essay that is both intellectually rigorous and enjoyable to read.

User prompt: ${userPrompt}`,

      enhancement: `You are a distinguished writer and literary editor. You have been given this essay to enhance and polish:

"{response}"

Original creative prompt was: "{originalPrompt}"

Your task is to take this essay and elevate it to publication-quality writing. Improve upon:
- Argument strength - sharpen the thesis and supporting evidence
- Prose style - enhance clarity, elegance, and readability
- Structure - improve organization and logical flow
- Engagement - make it more compelling and interesting
- Depth - add more sophisticated analysis and insights
- Overall impact - make it more persuasive and memorable

Create an enhanced version that builds upon the original while demonstrating superior writing craft and intellectual rigor. Maintain approximately 300-500 words.`
    },

    'code': {
      original: `You are an expert software engineer and code architect. Create high-quality code that demonstrates exceptional programming skill, clean architecture, and best practices.

Write code that features:
- Clean, readable, and well-structured design
- Proper error handling and edge cases
- Good performance and efficiency
- Clear documentation and comments
- Following language-specific best practices
- Approximately 50-200 lines depending on complexity

Focus on creating code that is both functional and exemplary in its craftsmanship.

User prompt: ${userPrompt}`,

      enhancement: `You are a senior software architect and code reviewer. You have been given this code to enhance and optimize:

"{response}"

Original creative prompt was: "{originalPrompt}"

Your task is to take this code and elevate it to production-ready, enterprise-quality standards. Improve upon:
- Code structure - enhance organization, modularity, and design patterns
- Performance - optimize for speed, memory usage, and scalability
- Reliability - improve error handling, edge cases, and robustness  
- Readability - enhance comments, naming, and code clarity
- Best practices - implement industry standards and conventions
- Overall quality - make it more maintainable and professional

Create an enhanced version that builds upon the original while demonstrating superior programming expertise. Maintain similar functionality while significantly improving quality.`
    },

    'story': {
      original: `You are a skilled storyteller and creative writer. Create a compelling short story or narrative that demonstrates exceptional creativity, character development, and engaging prose.

Write a story that features:
- Engaging characters with clear motivations
- Compelling plot with conflict and resolution
- Vivid setting and atmosphere
- Strong narrative voice and style
- Approximately 200-400 words
- Clear story structure with beginning, middle, and end

Focus on creating a story that captivates readers and showcases your storytelling abilities.

User prompt: ${userPrompt}`,

      enhancement: `You are a master storyteller and literary editor. You have been given this story to enhance and perfect:

"{response}"

Original creative prompt was: "{originalPrompt}"

Your task is to take this story and elevate it to publication-quality fiction. Improve upon:
- Character development - make characters more compelling and realistic
- Plot structure - enhance pacing, tension, and resolution
- Prose style - improve clarity, elegance, and narrative voice
- Setting and atmosphere - create more vivid and immersive scenes
- Emotional impact - deepen the story's resonance with readers
- Overall craft - demonstrate superior storytelling technique

Create an enhanced version that builds upon the original while showing masterful creative writing skills. Maintain approximately 200-400 words.`
    }
  };

  const categoryPrompts = prompts[category as keyof typeof prompts];
  if (!categoryPrompts) {
    // Fallback for unknown categories
    return type === 'original' 
      ? `Create compelling creative content based on this prompt: ${userPrompt}`
      : `Enhance and improve this creative work: "{response}"\n\nOriginal prompt was: "{originalPrompt}"`;
  }

  return categoryPrompts[type];
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get available models
  app.get("/api/models", async (req, res) => {
    try {
      res.json(getAllModels());
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  // Compare models endpoint (protected, requires credits)
  app.post("/api/compare", isAuthenticated, async (req: any, res) => {
    try {
      const { prompt, modelIds } = compareModelsSchema.parse(req.body);
      const userId = req.user.claims.sub;
      
      // Get user and check credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const creditsNeeded = modelIds.length * 5; // 5 credits per model
      if (user.credits < creditsNeeded) {
        return res.status(402).json({ 
          error: "Insufficient credits", 
          creditsNeeded,
          creditsAvailable: user.credits 
        });
      }
      
      // Initialize responses object
      const responses: Record<string, any> = {};
      
      // Create promises for all model calls
      const modelPromises = modelIds.map(async (modelId) => {
        try {
          const result = await callModel(prompt, modelId);
          responses[modelId] = {
            content: result.content,
            reasoning: result.reasoning,
            status: 'success',
            responseTime: result.responseTime,
            tokenUsage: result.tokenUsage,
            cost: result.cost,
            modelConfig: result.modelConfig,
          };
        } catch (error) {
          responses[modelId] = {
            content: '',
            status: 'error',
            responseTime: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      // Wait for all model calls to complete
      await Promise.all(modelPromises);

      // Deduct credits
      await storage.updateUserCredits(userId, user.credits - creditsNeeded);

      // Store the comparison
      const comparison = await storage.createComparison({
        prompt,
        selectedModels: modelIds,
        responses,
        userId,
        creditsUsed: creditsNeeded,
      });

      res.json({
        id: comparison.id,
        responses,
        creditsUsed: creditsNeeded,
        creditsRemaining: user.credits - creditsNeeded,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to compare models" });
      }
    }
  });

  // Get comparison history (protected, user-specific)
  app.get("/api/comparisons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const comparisons = await storage.getComparisons(userId);
      res.json(comparisons);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comparisons" });
    }
  });

  // Get specific comparison
  app.get("/api/comparisons/:id", async (req, res) => {
    try {
      const comparison = await storage.getComparison(req.params.id);
      if (!comparison) {
        return res.status(404).json({ error: "Comparison not found" });
      }
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comparison" });
    }
  });

  // Single Model Response Route (protected, requires credits)
  app.post("/api/models/respond", isAuthenticated, async (req: any, res) => {
    try {
      const { modelId, prompt } = req.body;
      const userId = req.user.claims.sub;
      
      if (!modelId || !prompt) {
        return res.status(400).json({ error: 'Missing modelId or prompt' });
      }

      // Get user and check credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.credits < 5) {
        return res.status(402).json({ 
          error: "Insufficient credits", 
          creditsNeeded: 5,
          creditsAvailable: user.credits 
        });
      }

      const result = await callModel(prompt, modelId);
      
      // Deduct credits
      await storage.updateUserCredits(userId, user.credits - 5);
      
      res.json({
        content: result.content,
        reasoning: result.reasoning,
        responseTime: result.responseTime,
        tokenUsage: result.tokenUsage,
        cost: result.cost,
        modelConfig: result.modelConfig,
        creditsUsed: 5,
        creditsRemaining: user.credits - 5
      });
    } catch (error) {
      console.error('Model response error:', error);
      res.status(500).json({ error: 'Failed to get model response' });
    }
  });

  // Battle mode endpoints
  app.post("/api/battle/start", async (req, res) => {
    try {
      const { prompt, model1Id, model2Id } = req.body;
      
      if (!prompt || !model1Id || !model2Id) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get initial response from Model 1
      const model1Response = await callModel(prompt, model1Id);

      // Create system prompt for Model 2 to challenge Model 1's response
      const challengePrompt = req.body.challengerPrompt 
        ? req.body.challengerPrompt
            .replace('{response}', model1Response.content)
            .replace('{originalPrompt}', prompt)
        : `Your competitor told the user this: "${model1Response.content}"

Push back on this information or advice. Explain why the user shouldn't trust the reply or should be wary. Be critical but constructive in your analysis.

Original user prompt was: "${prompt}"`;

      // Get challenging response from Model 2
      const model2Response = await callModel(challengePrompt, model2Id);

      res.json({
        model1Response: {
          content: model1Response.content,
          reasoning: model1Response.reasoning,
          responseTime: model1Response.responseTime,
          tokenUsage: model1Response.tokenUsage,
          cost: model1Response.cost,
          modelConfig: model1Response.modelConfig,
          status: 'success'
        },
        model2Response: {
          content: model2Response.content,
          reasoning: model2Response.reasoning,
          responseTime: model2Response.responseTime,
          tokenUsage: model2Response.tokenUsage,
          cost: model2Response.cost,
          modelConfig: model2Response.modelConfig,
          status: 'success'
        }
      });

    } catch (error) {
      console.error("Battle start error:", error);
      res.status(500).json({ error: "Failed to start battle" });
    }
  });

  app.post("/api/battle/continue", async (req, res) => {
    try {
      const { battleHistory, nextModelId, challengerPrompt, originalPrompt } = req.body;
      
      if (!battleHistory || !nextModelId) {
        return res.status(400).json({ error: "Missing battle history or next model ID" });
      }

      // Get the last response to challenge
      const lastMessage = battleHistory[battleHistory.length - 1];
      
      let finalPrompt: string;
      
      if (challengerPrompt && lastMessage) {
        // Use the challenger prompt template with variable replacement
        finalPrompt = challengerPrompt
          .replace('{response}', lastMessage.content)
          .replace('{originalPrompt}', originalPrompt || 'the original question');
      } else {
        // Fallback to conversation context
        const conversationContext = battleHistory
          .map((msg: any) => `${msg.modelName}: ${msg.content}`)
          .join("\n\n");

        finalPrompt = `You are in an ongoing debate. Here's the conversation so far:

${conversationContext}

Continue the debate by responding to the last message. Be analytical, challenge assumptions, and provide counter-arguments or alternative perspectives. Keep the discussion engaging and substantive.`;
      }

      // Get response from the next model
      const response = await callModel(finalPrompt, nextModelId);

      res.json({
        response: {
          content: response.content,
          reasoning: response.reasoning,
          responseTime: response.responseTime,
          tokenUsage: response.tokenUsage,
          cost: response.cost,
          modelConfig: response.modelConfig,
          status: 'success'
        },
        modelId: nextModelId
      });

    } catch (error) {
      console.error("Battle continue error:", error);
      res.status(500).json({ error: "Failed to continue battle" });
    }
  });

  // Creative Combat mode endpoints
  app.post("/api/creative-combat/respond", async (req, res) => {
    try {
      const { category, prompt, modelId, type, previousContent, originalPrompt } = req.body;
      
      if (!category || !prompt || !modelId || !type) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let finalPrompt: string;

      if (type === 'initial') {
        // First model creates initial creative work
        finalPrompt = getCreativeCombatPrompt(category, 'original', prompt);
      } else {
        // Subsequent models enhance previous work
        if (!previousContent) {
          return res.status(400).json({ error: "Previous content required for enhancement" });
        }
        
        const enhancementPrompt = getCreativeCombatPrompt(category, 'enhancement', originalPrompt || prompt);
        finalPrompt = enhancementPrompt
          .replace('{response}', previousContent)
          .replace('{originalPrompt}', originalPrompt || prompt);
      }

      // Get response from the model
      const response = await callModel(finalPrompt, modelId);

      res.json({
        response: {
          content: response.content,
          reasoning: response.reasoning,
          responseTime: response.responseTime,
          tokenUsage: response.tokenUsage,
          cost: response.cost,
          modelConfig: response.modelConfig,
          status: 'success'
        },
        modelId: modelId
      });

    } catch (error) {
      console.error("Creative Combat error:", error);
      res.status(500).json({ error: "Failed to process creative combat request" });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const { amount, credits } = req.body; // amount in dollars, credits to purchase
      const userId = req.user.claims.sub;
      
      if (!amount || !credits) {
        return res.status(400).json({ error: "Missing amount or credits" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId,
          credits: credits.toString(),
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Webhook to handle successful payments
  app.post("/api/webhook/stripe", async (req, res) => {
    try {
      const event = req.body;

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const userId = paymentIntent.metadata.userId;
        const creditsToAdd = parseInt(paymentIntent.metadata.credits);

        if (userId && creditsToAdd) {
          const user = await storage.getUser(userId);
          if (user) {
            await storage.updateUserCredits(userId, user.credits + creditsToAdd);
          }
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Stripe webhook error:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
