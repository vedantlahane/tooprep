/***
 * Admin — Service Layer
 *
 * Feature domain : System Observability & Comprehensive Platform Management
 * Architecture   : Service (telemetry aggregation + curriculum analysis)
 *
 * Provides aggregated observability data, real-time platform metrics,
 * infrastructure diagnostics, and syllabus coverage intelligence.
 ***/

import { supabaseAdmin } from '../../lib/supabase.js';
import { getMongoDb } from '../../lib/mongodb.js';

export const adminService = {
  /**
   * Aggregate complete real-time system observability & telemetry.
   */
  async getSystemObservability() {
    const timestamp = new Date().toISOString();

    // 1. Fetch Students count
    const { count: studentCount, error: studentErr } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    if (studentErr) console.warn('Observability: failed to count profiles', studentErr.message);

    // 2. Fetch Questions data
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select(`
        id, canonical_question_id, topic_id, difficulty, source_type, verified, publication_status, exam_year, created_at,
        topics ( id, name, chapters ( id, name, subjects ( id, name ) ) )
      `)
      .order('created_at', { ascending: false });

    if (qErr) console.warn('Observability: failed to fetch questions', qErr.message);

    const questionsList = questions || [];
    const totalQuestions = questionsList.length;

    // Aggregations
    const bySubject = { Physics: 0, Chemistry: 0, Mathematics: 0, Other: 0 };
    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    const bySource = { PYQ: 0, ORIGINAL: 0, LICENSED: 0, OTHER: 0 };
    let verifiedCount = 0;
    let unverifiedCount = 0;
    const byPublication = { PUBLISHED: 0, DRAFT: 0, ARCHIVED: 0 };

    for (const q of questionsList) {
      const subj = q.topics?.chapters?.subjects?.name || 'Other';
      bySubject[subj] = (bySubject[subj] || 0) + 1;

      const diff = (q.difficulty || 'medium').toLowerCase();
      if (byDifficulty[diff] !== undefined) byDifficulty[diff]++;

      const src = q.source_type || 'OTHER';
      bySource[src] = (bySource[src] || 0) + 1;

      if (q.verified) verifiedCount++;
      else unverifiedCount++;

      const pub = q.publication_status || 'PUBLISHED';
      byPublication[pub] = (byPublication[pub] || 0) + 1;
    }

    // 3. Evaluations telemetry
    const { data: evals, error: evalErr } = await supabaseAdmin
      .from('evaluations')
      .select(`
        id, user_id, topic_id, eval_type, started_at, ended_at, duration_seconds,
        topics ( id, name ),
        evaluation_attempts ( id, correct, time_spent_seconds, mistake_type )
      `)
      .order('started_at', { ascending: false });

    if (evalErr) console.warn('Observability: failed to fetch evaluations', evalErr.message);

    const evalList = evals || [];
    const totalEvals = evalList.length;
    let totalAttempts = 0;
    let totalCorrect = 0;

    const recentEvals = evalList.slice(0, 10).map(ev => {
      const attempts = ev.evaluation_attempts || [];
      const correct = attempts.filter(a => a.correct).length;
      const acc = attempts.length > 0 ? Math.round((correct / attempts.length) * 100) : 0;
      return {
        id: ev.id,
        user_id: ev.user_id,
        topic_name: ev.topics?.name || 'Curriculum Evaluation',
        total_questions: attempts.length,
        correct_count: correct,
        accuracy: acc,
        started_at: ev.started_at,
        duration_seconds: ev.duration_seconds
      };
    });

    for (const ev of evalList) {
      const attempts = ev.evaluation_attempts || [];
      totalAttempts += attempts.length;
      totalCorrect += attempts.filter(a => a.correct).length;
    }

    const platformAccuracy = totalAttempts > 0
      ? Math.round((totalCorrect / totalAttempts) * 100)
      : 0;

    // 4. Practice telemetry
    const { count: practiceSessionsCount } = await supabaseAdmin
      .from('practice_sessions')
      .select('*', { count: 'exact', head: true });

    const { count: practiceAttemptsCount } = await supabaseAdmin
      .from('practice_attempts')
      .select('*', { count: 'exact', head: true });

    // 5. Confidence telemetry
    const { count: confidenceCount } = await supabaseAdmin
      .from('confidence_assessments')
      .select('*', { count: 'exact', head: true });

    // 6. MongoDB Content pipeline telemetry (safe fallback)
    let contentPipeline = {
      status: 'offline',
      total_jobs: 0,
      jobs_by_status: {},
      unreviewed_candidates: 0,
      total_content_questions: 0
    };

    try {
      const dbPromise = getMongoDb();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 1500)
      );
      const db = await Promise.race([dbPromise, timeoutPromise]);
      contentPipeline.status = 'connected';

      const jobsColl = db.collection('ingestion_jobs');
      const questionsColl = db.collection('content_questions');

      const jobs = await Promise.race([
        jobsColl.find({}).toArray(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 1500))
      ]);
      contentPipeline.total_jobs = jobs.length;

      for (const j of jobs) {
        const st = j.stage || 'UNKNOWN';
        contentPipeline.jobs_by_status[st] = (contentPipeline.jobs_by_status[st] || 0) + 1;
      }

      contentPipeline.total_content_questions = await questionsColl.countDocuments();
      contentPipeline.unreviewed_candidates = await questionsColl.countDocuments({
        'lifecycle.status': { $in: ['REVIEW_REQUIRED', 'STRUCTURING', 'DRAFT'] }
      });
    } catch (mErr) {
      contentPipeline.status = 'not_configured_or_offline';
      contentPipeline.error = mErr.message;
    }

    // 7. Recent Questions added
    const recentQuestions = questionsList.slice(0, 10).map(q => ({
      id: q.id,
      canonical_id: q.canonical_question_id,
      topic_name: q.topics?.name || 'Topic',
      subject: q.topics?.chapters?.subjects?.name || 'Subject',
      difficulty: q.difficulty,
      source_type: q.source_type,
      verified: q.verified,
      publication_status: q.publication_status,
      created_at: q.created_at
    }));

    // 8. Runtime & Infrastructure
    const memory = process.memoryUsage();
    const runtime = {
      uptime_seconds: Math.floor(process.uptime()),
      node_version: process.version,
      platform: process.platform,
      memory: {
        rss_mb: Math.round(memory.rss / (1024 * 1024)),
        heap_used_mb: Math.round(memory.heapUsed / (1024 * 1024)),
        heap_total_mb: Math.round(memory.heapTotal / (1024 * 1024))
      }
    };

    return {
      timestamp,
      students: {
        total_profiles: studentCount || 0
      },
      questions: {
        total: totalQuestions,
        verified: verifiedCount,
        unverified: unverifiedCount,
        by_subject: bySubject,
        by_difficulty: byDifficulty,
        by_source: bySource,
        by_publication: byPublication
      },
      evaluations: {
        total_evaluations: totalEvals,
        total_attempts: totalAttempts,
        platform_accuracy: platformAccuracy,
        recent_evaluations: recentEvals
      },
      practice: {
        total_sessions: practiceSessionsCount || 0,
        total_attempts: practiceAttemptsCount || 0
      },
      confidence: {
        total_ratings: confidenceCount || 0
      },
      content_pipeline: contentPipeline,
      runtime,
      recent_questions: recentQuestions
    };
  },

  /**
   * Get complete hierarchical syllabus annotated with question counts,
   * verification stats, and coverage gap alerts.
   */
  async getCurriculumCoverage() {
    // 1. Fetch entire subject -> chapter -> topic tree
    const { data: subjects, error: subjErr } = await supabaseAdmin
      .from('subjects')
      .select(`
        id, name,
        chapters (
          id, name,
          topics ( id, name )
        )
      `)
      .order('name');

    if (subjErr) throw new Error(subjErr.message);

    // 2. Fetch all questions with topic_id
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('id, topic_id, difficulty, verified, publication_status, source_type');

    if (qErr) throw new Error(qErr.message);

    // Map question statistics per topic
    const topicStats = {};
    for (const q of (questions || [])) {
      if (!topicStats[q.topic_id]) {
        topicStats[q.topic_id] = {
          total: 0,
          verified: 0,
          pyq: 0,
          easy: 0,
          medium: 0,
          hard: 0
        };
      }
      const st = topicStats[q.topic_id];
      st.total++;
      if (q.verified) st.verified++;
      if (q.source_type === 'PYQ') st.pyq++;
      const diff = (q.difficulty || 'medium').toLowerCase();
      if (st[diff] !== undefined) st[diff]++;
    }

    // Annotate hierarchy
    let totalTopicsCount = 0;
    let lowCoverageCount = 0;
    let zeroCoverageCount = 0;

    const annotatedSubjects = (subjects || []).map(s => {
      const chapters = (s.chapters || []).map(c => {
        const topics = (c.topics || []).map(t => {
          totalTopicsCount++;
          const stats = topicStats[t.id] || {
            total: 0,
            verified: 0,
            pyq: 0,
            easy: 0,
            medium: 0,
            hard: 0
          };

          const isZero = stats.total === 0;
          const isLow = stats.total < 5;
          if (isZero) zeroCoverageCount++;
          else if (isLow) lowCoverageCount++;

          return {
            ...t,
            stats,
            is_zero_coverage: isZero,
            is_low_coverage: isLow
          };
        });

        const chapterQuestionCount = topics.reduce((sum, t) => sum + t.stats.total, 0);
        return {
          ...c,
          topics,
          total_questions: chapterQuestionCount
        };
      });

      const subjectQuestionCount = chapters.reduce((sum, c) => sum + c.total_questions, 0);
      return {
        ...s,
        chapters,
        total_questions: subjectQuestionCount
      };
    });

    return {
      summary: {
        total_topics: totalTopicsCount,
        zero_coverage_topics: zeroCoverageCount,
        low_coverage_topics: lowCoverageCount,
        total_questions: (questions || []).length
      },
      subjects: annotatedSubjects
    };
  }
};
