import { createHash } from 'node:crypto';

// Conservative by design: only unmistakable numbered blocks become review
// candidates. Everything else remains in the parse artifact for human review.
const QUESTION_START = /(?:^|\n)\s*(?:question\s*)?(\d{1,3})\s*[).:-]\s*/gim;

export function extractQuestionCandidates(jobId, pages) {
  const candidates = [];
  for (const page of pages) {
    if (!page.success || !page.markdown) continue;
    const matches = [...page.markdown.matchAll(QUESTION_START)];
    for (let index = 0; index < matches.length; index += 1) {
      const start = matches[index].index + matches[index][0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index : page.markdown.length;
      const rawText = page.markdown.slice(start, end).trim();
      if (rawText.length < 15) continue;
      const questionNumber = Number(matches[index][1]);
      const fingerprint = createHash('sha256').update(`${jobId}:${page.page_number}:${questionNumber}:${rawText}`).digest('hex');
      candidates.push({
        candidate_key: fingerprint,
        job_id: jobId,
        source_pages: [page.page_number],
        source_question_number: questionNumber,
        raw_text: rawText,
        extraction_method: 'NUMBERED_MARKDOWN_V1',
        status: 'REVIEW_REQUIRED'
      });
    }
  }
  return candidates;
}
