import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Initialize Gemini AI client
 */
export function initializeGemini() {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is not set')
  }
  return new GoogleGenerativeAI(apiKey)
}

/**
 * System prompt for Vaishnava devotional analysis
 */
export const SYSTEM_PROMPT = `You are a transcript analysis assistant for Vaishnava devotional lectures.

STRICT RULES — follow without exception:
- Base every output SOLELY on what is explicitly stated in the provided transcript text.
- Do NOT add, infer, embellish, or import knowledge from outside the transcript — even if you know the topic well.
- Do NOT paraphrase in a way that changes the speaker's meaning.
- If the transcript does not contain enough content for a field, return less rather than fabricate.
- Never introduce concepts, names, teachings, or themes that are not directly present in the text.`

/**
 * Generate a summary of a lecture transcript
 */
export async function generateSummary(transcript: string, length: number = 400): Promise<string> {
  const genAI = initializeGemini()
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  })

  const prompt = `Summarize the spiritual and philosophical content of the following lecture transcript in approximately ${length} words.

Focus exclusively on the teachings, ideas, and spiritual points the speaker makes.
Do NOT describe the session's proceedings — ignore greetings, songs, announcements, instructions to attendees, or who said what.
Only use what is explicitly stated in the transcript. Do not add outside knowledge.

Transcript:
${transcript}`

  const result = await model.generateContent(prompt)
  const response = result.response
  return response.text()
}

/**
 * Extract key teachings from a transcript
 */
export async function extractTeachings(transcript: string): Promise<string[]> {
  const genAI = initializeGemini()
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  })

  const prompt = `Extract 10 or more key teachings from the following lecture transcript.
Each teaching must be a direct point the speaker makes in the text — do not add, infer, or bring in outside knowledge.
Use the speaker's own words or close paraphrases where possible.

Return ONLY a JSON array of strings, no other text. Example: ["Teaching 1", "Teaching 2"]

Transcript:
${transcript}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Parse JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }
  return []
}

/**
 * Generate tags/keywords for a transcript
 */
export async function generateTags(transcript: string): Promise<string[]> {
  const genAI = initializeGemini()
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  })

  const prompt = `Generate 10 or more tags for the following lecture transcript.
Tags must reflect only the topics and subjects the speaker explicitly discusses — do not add tags based on general knowledge of the subject area.
Format: lowercase, hyphenated words.

Return ONLY a JSON array of strings, no other text. Example: ["krishna-consciousness", "bhakti-yoga"]

Transcript:
${transcript}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Parse JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }
  return []
}

/**
 * Extract themes from a transcript
 */
export async function extractThemes(transcript: string): Promise<string[]> {
  const genAI = initializeGemini()
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  })

  const prompt = `Identify 3-5 main themes from the following lecture transcript.
A theme must be an overarching idea the speaker actually develops in the text — not a general topic you associate with this kind of content.
If fewer than 3 distinct themes are present, return only those that are clearly there.

Return ONLY a JSON array of strings, no other text. Example: ["Theme 1", "Theme 2"]

Transcript:
${transcript}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Parse JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }
  return []
}

/**
 * Extract anecdotes, stories, analogies, or historical accounts shared by the speaker in the transcript
 */
export async function extractAnecdotes(transcript: string): Promise<string[]> {
  const genAI = initializeGemini()
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  })

  const prompt = `Extract various anecdotes, stories, analogies, or historical accounts shared by the speaker in the following lecture transcript.
Each anecdote must be a direct story or account mentioned in the text — do not add, infer, or bring in outside knowledge.
Provide a concise, 1-2 sentence description of each anecdote.

Return ONLY a JSON array of strings, no other text. Example: ["Story of A", "Incident of B"]

Transcript:
${transcript}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Parse JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('Failed to parse anecdotes JSON:', e)
      return []
    }
  }
  return []
}

