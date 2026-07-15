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
Follow these rules:
- Each anecdote must be a direct story, account, or analogy mentioned in the text — do not add, infer, or bring in outside knowledge.
- Format each description with a short, bold title followed by a colon and a 2-4 sentence narrative (e.g. "**The Burunda Bird**: A bird in the Himalayas that imitates everything it hears but doesn't implement it, showing the danger of theoretical knowledge without practice.").
- DO NOT start the descriptions with repetitive phrases like "The speaker tells...", "The speaker recounts...", "The speaker mentions...", or "This is a story of...". Narrate the story/analogy directly.

Return ONLY a JSON array of strings, no other text.

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

/**
 * Extract scripture verses or citations referenced in the transcript
 */
export async function extractVerses(transcript: string): Promise<string[]> {
  const genAI = initializeGemini()
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  })

  const prompt = `Extract a list of specific scripture verses or citations (like "SB 10.14.5" or "BG 18.66") referred to or quoted by the speaker in the following transcript.
Only extract actual references explicitly mentioned in the text.
Format them cleanly (e.g., "SB 10.14.5").

Return ONLY a JSON array of strings, no other text. Example: ["SB 10.14.5", "BG 18.66"]

Transcript:
${transcript}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('Failed to parse verses JSON:', e)
      return []
    }
  }
  return []
}

/**
 * Extract key scriptural or historical personalities mentioned in the transcript
 */
export async function extractPersonalities(transcript: string): Promise<string[]> {
  const genAI = initializeGemini()
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  })

  const prompt = `Extract key scriptural or historical personalities, deities, or saints mentioned by the speaker in the following transcript (e.g., "Lord Brahma", "Srila Prabhupada", "Jiva Goswami").
Do not include generic terms, or the speaker's own name.
Ensure names are spelled correctly according to common English transliteration.

Return ONLY a JSON array of strings, no other text. Example: ["Lord Brahma", "Srila Prabhupada"]

Transcript:
${transcript}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('Failed to parse personalities JSON:', e)
      return []
    }
  }
  return []
}

/**
 * Extract practical actionable advice (Sadhana Tips) from the transcript
 */
export async function extractSadhanaTips(transcript: string): Promise<string[]> {
  const genAI = initializeGemini()
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  })

  const prompt = `Extract practical, actionable sadhana tips, spiritual advice, or guidelines on how to apply the lecture's teachings to daily devotional practice.
Follow these strict rules:
- Focus on long-term spiritual growth, internal attitude changes, daily chanting/hearing advice, and practical devotion (sadhana) discussed by the speaker.
- STRICTLY EXCLUDE all housekeeping rules, meeting logistics, Zoom/class setup guidelines, and technical reminders (such as keeping notebooks/pens/lamps ready, turning videos on/off, staying on mute, Zoom screen reading, etc.).
- Each tip must be a substantive, inspiring action item derived directly from the speaker's core teachings in the text.
- Do not add outside knowledge.

Return ONLY a JSON array of strings, no other text. Example: ["Develop positive thoughts about others to guard your mind from negativity", "Remain fully occupied in devotional service to prevent the mind from wandering"]

Transcript:
${transcript}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('Failed to parse sadhana tips JSON:', e)
      return []
    }
  }
  return []
}

/**
 * Extract direct memorable quotes from the transcript
 */
export async function extractQuotes(transcript: string): Promise<string[]> {
  const genAI = initializeGemini()
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  })

  const prompt = `Extract 3-5 of the most impactful, profound, and memorable quotes spoken by the speaker in the following transcript.
Follow these strict rules:
- Quotes can be of any length — ranging from a single punchy sentence to a full, rich paragraph containing multiple sentences of profound spiritual realization or guidance.
- Focus on deeply inspirational realizations, strong spiritual warnings, or beautiful comparisons (e.g. "The greatest psychic weapon anyone can have in this material world is loving people.", "If you share the Lord's load, He will take care of your load.").
- STRICTLY AVOID simple factual sentences, dry philosophical axioms, or generic statements (such as "If you don't surrender, you are not a devotee" or "Bhakti is superior to all other practices").
- The quotes must represent the highest points of emotional or intellectual realization in the lecture.
- Only extract direct statements from the text — do not fabricate or alter the speaker's words significantly.

Return ONLY a JSON array of strings, no other text.

Transcript:
${transcript}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('Failed to parse quotes JSON:', e)
      return []
    }
  }
  return []
}

/**
 * Extract audience questions and corresponding speaker answers from the transcript
 */
export async function extractQA(transcript: string): Promise<{ question: string; answer: string }[]> {
  const genAI = initializeGemini()
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  })

  const prompt = `Identify and extract actual audience questions (or questions addressed by the speaker) and the corresponding answers given by the speaker in the following transcript.
Do not invent questions or answers. Only extract actual exchanges present in the text.
If no questions were asked, return an empty array.

Return ONLY a JSON array of objects with "question" and "answer" keys. No other text. Example: [{"question": "How do we overcome lust?", "answer": "By keeping ourselves busy in devotional service."}]

Transcript:
${transcript}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('Failed to parse QA JSON:', e)
      return []
    }
  }
  return []
}


