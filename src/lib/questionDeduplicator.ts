const sigCache = new Map<string, string>();
const cleanTextCache = new Map<string, string>();

/**
 * Strips HTML tags, entities, question numbers, set prefixes/suffixes, and exam tags.
 */
export function cleanQuestionText(text: any): string {
  if (!text || typeof text !== 'string') return '';
  const cached = cleanTextCache.get(text);
  if (cached !== undefined) return cached;

  let cleaned = text;

  // 1. Strip HTML tags & decode common entities
  cleaned = cleaned
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  // 2. Normalize smart quotes, dashes, unicode subscripts/superscripts
  cleaned = cleaned
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/₀/g, '0').replace(/₁/g, '1').replace(/₂/g, '2').replace(/₃/g, '3').replace(/₄/g, '4')
    .replace(/₅/g, '5').replace(/₆/g, '6').replace(/₇/g, '7').replace(/₈/g, '8').replace(/₉/g, '9');

  // 3. Remove trailing exam / set / year metadata:
  // e.g., (NEET 2021), [JEE Main 2022], (CBSE 2019), (Set 2, item 18), [Set A], (Item 12), (2020), (Shift 1)
  cleaned = cleaned
    .replace(/\s*[\(\[\{]\s*(?:neet|jee|aipmt|aiims|cbse|icse|upsc|nda|ssc|cuet|wbjee|bitsat|gate|set|item|shift|phase|slot|paper|year)?\s*[\w\d\s\-_,;:\.]*[\)\]\}]\s*$/gi, '')
    .replace(/\s*[\(\[\{]\s*\d{4}\s*[\)\]\}]\s*$/gi, '')
    .replace(/\s*[\(\[\{]\s*set\s*[\w\d]+(?:\s*[,;:\-_]\s*(?:item|iteam|q|ques|question|no|sr|s\.no)\s*[\w\d]+)?\s*[\)\]\}]\s*$/gi, '')
    .replace(/\s*[\(\[\{]\s*(?:item|iteam|q|ques|question|no|sr|s\.no)\s*[\w\d]+(?:\s*[,;:\-_]\s*set\s*[\w\d]+)?\s*[\)\]\}]\s*$/gi, '')
    .replace(/\s*[\(\[\{]\s*set\s*[\w\d]+\s*[\)\]\}]\s*$/gi, '')
    .replace(/\s*[\(\[\{]\s*(?:item|iteam)\s*[\w\d]+\s*[\)\]\}]\s*$/gi, '');

  // 4. Remove leading prefixes:
  // e.g., Q1., Q.1, Question 1:, (1), [1], 1., 1), 1:, 1-, (a), (i), (Set 1, item 5):
  cleaned = cleaned
    .replace(/^[\(\[\{]\s*(?:set\s*[\w\d]+|item\s*[\w\d]+|q\s*\d+|\d+|[a-d]|[ivx]+)\s*(?:[,;:\-_]\s*[\w\d]+)?\s*[\)\]\}]\s*[:\.\-_]?\s*/gi, '')
    .replace(/^(?:q(?:uestion)?[\s\.\:\-]*\d*[\s\.\:\-]+|\d+[\s\.\:\-]+)/gi, '')
    .replace(/^[\(\[\{]?\s*(?:[a-d]|[ivx]+)\s*[\)\]\}]\s*[:\.\-_]?\s*/gi, '')
    .replace(/^[\s\.\:\-_]+/, '');

  const result = cleaned.trim();
  cleanTextCache.set(text, result);
  return result;
}

/**
 * Returns a robust, stripped alphanumeric signature of the question text.
 */
export function normalizeQuestionSignature(qText: string): string {
  if (!qText || typeof qText !== 'string') return '';
  const cached = sigCache.get(qText);
  if (cached !== undefined) return cached;

  const cleaned = cleanQuestionText(qText);
  const sig = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '')
    .trim();

  sigCache.set(qText, sig);
  return sig;
}

/**
 * Generates an options fingerprint from options array
 */
export function getOptionsSignature(options: any): string {
  if (!Array.isArray(options) || options.length === 0) return '';
  return options
    .map((o) => String(o || '').toLowerCase().replace(/[^a-z0-9]/gi, '').trim())
    .filter(Boolean)
    .sort()
    .join('|');
}

/**
 * Robust question deduplicator that checks:
 * 1. Question ID (stringified, handling MongoDB ObjectId)
 * 2. Question Text Signature (normalized alphanumeric without prefixes/suffixes)
 * 3. Question Text + Options Composite Signature
 * 4. Fuzzy / Significant Prefix Match (first 60 alphanumeric characters)
 */
export function deduplicateQuestions<T = any>(list: T[]): T[] {
  if (!list || !Array.isArray(list) || list.length === 0) return [];
  const seenIds = new Set<string>();
  const seenSigs = new Set<string>();
  const seenPrefixes = new Set<string>();
  const seenComposite = new Set<string>();
  const uniqueList: T[] = [];

  for (let i = 0; i < list.length; i++) {
    const q: any = list[i];
    if (!q || typeof q !== 'object') continue;

    // Extract ID
    const rawId = q._id || q.id;
    const qId = rawId ? (typeof rawId === 'object' && rawId.$oid ? String(rawId.$oid) : String(rawId)) : '';

    if (qId && seenIds.has(qId)) continue;

    // Extract Text & Signatures
    const qText = q.question_text || q.question || q.text || q.prompt || '';
    const sig = normalizeQuestionSignature(qText);
    const optSig = getOptionsSignature(q.options);

    // If we have a text signature
    if (sig) {
      if (seenSigs.has(sig)) continue;

      // Check composite if option signature exists
      if (optSig) {
        const compSig = `${sig}:::${optSig}`;
        if (seenComposite.has(compSig)) continue;
        seenComposite.add(compSig);
      }

      // Check significant prefix (for questions >= 40 chars) to catch minor trailing typos
      if (sig.length >= 40) {
        const prefix60 = sig.slice(0, 60);
        if (optSig && seenPrefixes.has(`${prefix60}:::${optSig}`)) continue;
        seenPrefixes.add(`${prefix60}:::${optSig}`);
      }

      seenSigs.add(sig);
    }

    if (qId) seenIds.add(qId);
    uniqueList.push(q);
  }

  return uniqueList;
}
