//triage.js

import dotenv from "dotenv";
dotenv.config();

import { Router } from "express";
import { pool } from "../db.js";
import { OpenAI } from "openai";

const router = Router();

// Initialize OpenAI client (env is now loaded)
const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
});



/**
 * Triage a support message using OpenAI Chat Completions
 */
async function triageRouter(text) {
  const prompt = `You are an expert customer support AI assistant. Analyze the following support message and provide a structured triage assessment.

SUPPORT MESSAGE:
"""
${text}
"""

INSTRUCTIONS:
1. Create a brief, descriptive title (max 100 characters)
2. Categorize into ONE of these categories:
   - "billing" - Payment issues, invoices, refunds, charges
   - "technical" - Login problems, bugs, errors, performance issues
   - "account" - Account access, settings, profile, permissions
   - "other" - Everything else (feature requests, general questions, feedback)

3. Assign priority:
   - "high" - Service is down, data loss, security issues, payment failures
   - "medium" - Feature not working, significant inconvenience, account issues
   - "low" - Questions, minor issues, feature requests, general feedback

4. Write a 2-3 sentence summary of the issue

5. Draft a professional, empathetic suggested response (2-4 sentences):
   - Acknowledge the issue
   - Provide next steps or solution if obvious
   - Maintain friendly, helpful tone

6. Rate your confidence (0.0 to 1.0):
   - 1.0 = Very clear, straightforward issue
   - 0.8-0.9 = Clear but slightly ambiguous
   - 0.6-0.7 = Somewhat unclear or multiple possible interpretations
   - Below 0.6 = Confusing, incomplete, or nonsensical message

RESPONSE FORMAT:
Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "title": "Brief descriptive title",
  "category": "billing|technical|account|other",
  "priority": "low|medium|high",
  "summary": "2-3 sentence summary of the issue",
  "suggested_response": "Professional response to the customer",
  "confidence": 0.0
}`;

 
try {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 1000
  });

  const responseText = response.choices[0].message.content;

  // Parse JSON response
  let triageResult;
  try {
    // Remove any markdown code blocks if present
    const cleanedResponse = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    triageResult = JSON.parse(cleanedResponse);
  } catch (parseError) {
    console.error('Failed to parse AI response:', responseText);
    throw new Error('AI returned invalid JSON format');
  }

  // Validate the response structure
  const requiredFields = ['title', 'category', 'priority', 'summary', 'suggested_response', 'confidence'];
  for (const field of requiredFields) {
    if (!(field in triageResult)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate category
  const validCategories = ['billing', 'technical', 'account', 'other'];
  if (!validCategories.includes(triageResult.category)) {
    console.warn(`Invalid category "${triageResult.category}", defaulting to "other"`);
    triageResult.category = 'other';
  }

  // Validate priority
  const validPriorities = ['low', 'medium', 'high'];
  if (!validPriorities.includes(triageResult.priority)) {
    console.warn(`Invalid priority "${triageResult.priority}", defaulting to "medium"`);
    triageResult.priority = 'medium';
  }

  // Ensure confidence is a number between 0 and 1
  triageResult.confidence = Math.max(0, Math.min(1, parseFloat(triageResult.confidence) || 0.5));

  return triageResult;

} catch (error) {
  console.error('AI Triage failed:', error.message);
  
  // Return a fallback response if AI fails
  return {
    title: 'Support Request',
    category: 'other',
    priority: 'medium',
    summary: 'Unable to automatically triage this message. Manual review required.',
    suggested_response: 'Thank you for contacting support. We have received your message and will review it shortly.',
    confidence: 0.0
  };
}
}
/**
 * POST /triage
 *
 * TODO (candidate):
 * - Validate input
 *   - reject empty text
 *   - reject text > 4000 chars
 * - Design prompt and call LLM
 * - Parse and validate LLM response
 * - Apply confidence guardrail (< 0.6)
 * - Store input and result in PostgreSQL
 * - Return structured JSON response
 */



router.post("/", async (req, res) => {
  try {
    const { text } = req.body;

    // Validation: Reject empty input
    if (!text || text.trim() === '') {
      return res.status(400).json({ 
        error: 'Text is required and cannot be empty' 
      });
    }

    // Validation: Reject text longer than 4000 chars
    if (text.length > 4000) {
      return res.status(400).json({ 
        error: 'Text must be 4000 characters or less' 
      });
    }

    // Check if database pool is available
    if (!pool) {
      console.error('Database pool is not initialized');
      return res.status(500).json({ 
        error: 'Database connection not available',
        details: 'Database pool has not been initialized. Please check your database configuration.'
      });
    }

    // Call AI triage service
    console.log('Triaging message:', text.substring(0, 100) + '...');
    let triageResult;
    try {
      triageResult = await triageRouter(text);
    } catch (triageError) {
      console.error('AI triage failed:', triageError);
      // Continue with fallback - triageRouter should return a fallback result
      triageResult = {
        title: 'Support Request',
        category: 'other',
        priority: 'medium',
        summary: 'Unable to automatically triage this message. Manual review required.',
        suggested_response: 'Thank you for contacting support. We have received your message and will review it shortly.',
        confidence: 0.0
      };
    }

    // Store in database
    try {
      const query = `
        INSERT INTO "TriageRequests" ("InputText", "ResultJson", "Model")
        VALUES ($1, $2, $3)
        RETURNING
          "TriageID"   AS "id",
          "InputText"  AS "text",
          "ResultJson" AS "result",
          "Model"      AS "model",
          "CreatedAt"  AS "created_at"
      `;

      const values = [
        text,
        JSON.stringify(triageResult),
        process.env.OPENAI_MODEL || "gpt-4o-mini",
      ];

      const result = await pool.query(query, values);
      const savedRecord = result.rows[0];
      const parsed = typeof savedRecord.result === "string"
        ? JSON.parse(savedRecord.result)
        : savedRecord.result;

      // Format response
      const response = {
        id: savedRecord.id,
        text: savedRecord.text,
        title: parsed.title,
        category: parsed.category,
        priority: parsed.priority,
        summary: parsed.summary,
        suggested_response: parsed.suggested_response,
        confidence: parseFloat(parsed.confidence),
        needs_human_review: parsed.confidence < 0.6,
        created_at: savedRecord.created_at,
      };

      console.log("Triage completed with confidence:", response.confidence);
      res.json(response);
    } catch (dbError) {
      console.error('Database error in POST /triage:', dbError);
      // Return the triage result even if database save fails
      const response = {
        title: triageResult.title,
        category: triageResult.category,
        priority: triageResult.priority,
        summary: triageResult.summary,
        suggested_response: triageResult.suggested_response,
        confidence: parseFloat(triageResult.confidence),
        needs_human_review: triageResult.confidence < 0.6,
        warning: 'Triage completed but failed to save to database: ' + dbError.message
      };
      res.status(500).json({ 
        error: 'Failed to save triage to database',
        details: dbError.message,
        triage_result: response
      });
    }

  } catch (error) {
    console.error('Error in POST /triage:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to triage message',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});





/**
 * GET /triage?limit=10
 *
 * IMPORTANT: This route MUST come before GET /triage/:id
 * because Express matches routes in order, and /:id would match /triage
 */
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Ensure limit is reasonable (max 100)
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const query = `
      SELECT
        "TriageID"   AS "id",
        "InputText"  AS "text",
        "ResultJson" AS "result",
        "Model"      AS "model",
        "CreatedAt"  AS "created_at"
      FROM "TriageRequests"
      ORDER BY "CreatedAt" DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [safeLimit]);

    const triages = result.rows.map((record) => {
      const parsed = typeof record.result === "string"
        ? JSON.parse(record.result)
        : record.result;

      return {
        id: record.id,
        text: record.text,
        title: parsed.title,
        category: parsed.category,
        priority: parsed.priority,
        summary: parsed.summary,
        suggested_response: parsed.suggested_response,
        confidence: parsed.confidence,
        needs_human_review: parsed.confidence < 0.6,
        created_at: record.created_at,
      };
    });

    res.json(triages);

  } catch (error) {
    console.error('Error in GET /triage:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve triage requests',
      details: error.message 
    });
  }
});

/**
 * GET /triage/:id
 * Get a specific triage record by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        "TriageID"   AS "id",
        "InputText"  AS "text",
        "ResultJson" AS "result",
        "Model"      AS "model",
        "CreatedAt"  AS "created_at"
      FROM "TriageRequests"
      WHERE "TriageID" = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Triage request not found",
      });
    }

    const record = result.rows[0];
    const parsed = typeof record.result === "string"
      ? JSON.parse(record.result)
      : record.result;

    const response = {
      id: record.id,
      text: record.text,
      title: parsed.title,
      category: parsed.category,
      priority: parsed.priority,
      summary: parsed.summary,
      suggested_response: parsed.suggested_response,
      confidence: parsed.confidence,
      needs_human_review: parsed.confidence < 0.6,
      created_at: record.created_at,
    };

    res.json(response);

  } catch (error) {
    console.error('Error in GET /triage/:id:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve triage request',
      details: error.message 
    });
  }
});

export default router;