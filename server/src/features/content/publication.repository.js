import { supabaseAdmin } from '../../lib/supabase.js';

export async function upsertPublishedQuestion(question) {
  const topicId = question.curriculum?.topic_id;
  if (!topicId) {
    const error = new Error('A verified question needs curriculum.topic_id before publication');
    error.statusCode = 400;
    throw error;
  }
  const { data, error } = await supabaseAdmin
    .from('questions')
    .upsert({
      canonical_question_id: question.question_id,
      topic_id: topicId,
      source_type: question.provenance.source_type || 'PYQ',
      provider: question.provenance.provider || 'LLAMA_PARSE',
      exam_year: question.provenance.year,
      exam_session: question.provenance.session,
      exam_shift: question.provenance.shift,
      question_type: question.content.question_type,
      question_text: question.content.question_text,
      options: question.content.options,
      correct_answer: question.content.correct_answer,
      solution_text: question.content.solution_text,
      difficulty: question.curriculum.difficulty || 'medium',
      verified: true,
      publication_status: 'PUBLISHED',
      content_version: question.version,
      source_pages: question.provenance.source_pages,
      published_at: new Date().toISOString()
    }, { onConflict: 'canonical_question_id' })
    .select()
    .single();
  if (error) throw new Error(`Unable to publish question projection: ${error.message}`);
  return data;
}

export async function markSupabaseSync(questionId, version, status, error = null) {
  const { error: syncError } = await supabaseAdmin
    .from('content_sync_events')
    .upsert({
      sync_key: `${questionId}:v${version}:SUPABASE`,
      canonical_question_id: questionId,
      content_version: version,
      destination: 'SUPABASE',
      status,
      attempt_count: status === 'SYNCED' ? 1 : 0,
      last_error_code: error?.code || null,
      last_error_message: error?.message || null
    }, { onConflict: 'sync_key' });
  if (syncError) throw new Error(`Unable to record publication sync: ${syncError.message}`);
}

export async function listFailedSupabaseSyncs() {
  const { data, error } = await supabaseAdmin
    .from('content_sync_events')
    .select('*')
    .eq('status', 'FAILED')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Unable to fetch failed syncs: ${error.message}`);
  return data;
}

export async function retrySupabaseSync(syncKey) {
  const { data, error } = await supabaseAdmin
    .from('content_sync_events')
    .update({ status: 'PENDING', next_attempt_at: new Date().toISOString() })
    .eq('sync_key', syncKey)
    .select()
    .single();
  if (error) throw new Error(`Unable to retry sync: ${error.message}`);
  return data;
}
