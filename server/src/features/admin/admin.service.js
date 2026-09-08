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
import { computeGapAndStatus } from '../dashboard/dashboard.utils.js';

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

    const { data: allProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name');
    const profileNameMap = new Map((allProfiles || []).map(p => [p.id, p.display_name]));

    const recentEvals = evalList.slice(0, 10).map(ev => {
      const attempts = ev.evaluation_attempts || [];
      const correct = attempts.filter(a => a.correct).length;
      const acc = attempts.length > 0 ? Math.round((correct / attempts.length) * 100) : 0;
      return {
        id: ev.id,
        user_id: ev.user_id,
        student_name: profileNameMap.get(ev.user_id) || 'Student Candidate',
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

    // 4b. Recent practice sessions (last 10 completed)
    const { data: recentPractice, error: pracErr } = await supabaseAdmin
      .from('practice_sessions')
      .select(`
        id, user_id, topic_id, started_at, ended_at,
        topics ( id, name ),
        practice_attempts ( id, correct )
      `)
      .order('started_at', { ascending: false })
      .limit(10);

    if (pracErr) console.warn('Observability: failed to fetch recent practice sessions', pracErr.message);

    const recentPracticeSessions = (recentPractice || []).map(ps => {
      const attempts = ps.practice_attempts || [];
      const correct = attempts.filter(a => a.correct).length;
      const acc = attempts.length > 0 ? Math.round((correct / attempts.length) * 100) : 0;
      return {
        id: ps.id,
        user_id: ps.user_id,
        student_name: profileNameMap.get(ps.user_id) || 'Student Candidate',
        topic_name: ps.topics?.name || 'Curriculum Practice',
        total_questions: attempts.length,
        correct_count: correct,
        accuracy: acc,
        started_at: ps.started_at,
        ended_at: ps.ended_at
      };
    });

    // 5. Confidence telemetry
    const { count: confidenceCount } = await supabaseAdmin
      .from('confidence_assessments')
      .select('*', { count: 'exact', head: true });

    // 5b. Deduplication telemetry
    let deduplicationTelemetry = {
      pending_count: 0,
      exact_matches: 0,
      high_confidence: 0,
      potential: 0,
      total_resolved: 0
    };

    try {
      const { data: dups, error: dupErr } = await supabaseAdmin
        .from('question_duplicates')
        .select('id, status, match_type');
      if (!dupErr && dups) {
        for (const d of dups) {
          if (d.status === 'PENDING') {
            deduplicationTelemetry.pending_count++;
            if (d.match_type === 'EXACT') deduplicationTelemetry.exact_matches++;
            else if (d.match_type === 'HIGH_CONFIDENCE') deduplicationTelemetry.high_confidence++;
            else deduplicationTelemetry.potential++;
          } else if (d.status === 'RESOLVED') {
            deduplicationTelemetry.total_resolved++;
          }
        }
      }
    } catch (dErr) {
      console.warn('Observability: failed to fetch deduplication counts', dErr.message);
    }

    // 5c. Syllabus Readiness & Coverage Telemetry
    let syllabusTelemetry = {
      total_topics: 0,
      zero_coverage: 0,
      low_coverage: 0,
      ready_topics: 0,
      readiness_percentage: 0
    };

    try {
      const { data: allTopics, error: topErr } = await supabaseAdmin
        .from('topics')
        .select('id');
      if (!topErr && allTopics) {
        syllabusTelemetry.total_topics = allTopics.length;
        const topicCounts = {};
        for (const q of questionsList) {
          if (q.topic_id) topicCounts[q.topic_id] = (topicCounts[q.topic_id] || 0) + 1;
        }
        for (const t of allTopics) {
          const count = topicCounts[t.id] || 0;
          if (count === 0) syllabusTelemetry.zero_coverage++;
          else if (count < 5) syllabusTelemetry.low_coverage++;
          else syllabusTelemetry.ready_topics++;
        }
        syllabusTelemetry.readiness_percentage = syllabusTelemetry.total_topics > 0
          ? Math.round(((syllabusTelemetry.total_topics - syllabusTelemetry.zero_coverage) / syllabusTelemetry.total_topics) * 100)
          : 0;
      }
    } catch (sErr) {
      console.warn('Observability: failed to calculate syllabus coverage', sErr.message);
    }

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
        total_attempts: practiceAttemptsCount || 0,
        recent_sessions: recentPracticeSessions
      },
      confidence: {
        total_ratings: confidenceCount || 0
      },
      deduplication: deduplicationTelemetry,
      syllabus: syllabusTelemetry,
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
        total_questions: (questions || []).length,
        readiness_percentage: totalTopicsCount > 0 ? Math.round(((totalTopicsCount - zeroCoverageCount) / totalTopicsCount) * 100) : 0
      },
      subjects: annotatedSubjects
    };
  },

  /**
   * Get all registered student candidates with aggregated performance,
   * evaluations count, practice count, and risk classifications.
   */
  async getStudentsList({ search = '', target_year = null, sort = 'last_active' } = {}) {
    // 1. Fetch auth users
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000
    });
    if (authErr) throw new Error(`Failed to list auth users: ${authErr.message}`);
    const authUsers = authData?.users || [];

    // 2. Fetch profiles
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('*');
    if (profErr) throw new Error(`Failed to fetch profiles: ${profErr.message}`);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // 3. Fetch all evaluations with attempts
    const { data: evals } = await supabaseAdmin
      .from('evaluations')
      .select(`
        id, user_id, started_at, topic_id,
        evaluation_attempts ( id, correct )
      `);

    // 4. Fetch all practice sessions with attempts
    const { data: practice } = await supabaseAdmin
      .from('practice_sessions')
      .select(`
        id, user_id, started_at, topic_id,
        practice_attempts ( id, correct )
      `);

    // 5. Fetch all confidence assessments
    const { data: confidenceAssessments } = await supabaseAdmin
      .from('confidence_assessments')
      .select('id, user_id, topic_id, confidence_level, created_at');

    // Group telemetry per user_id
    const userEvalMap = new Map();
    for (const ev of (evals || [])) {
      if (!userEvalMap.has(ev.user_id)) userEvalMap.set(ev.user_id, []);
      userEvalMap.get(ev.user_id).push(ev);
    }

    const userPracticeMap = new Map();
    for (const pr of (practice || [])) {
      if (!userPracticeMap.has(pr.user_id)) userPracticeMap.set(pr.user_id, []);
      userPracticeMap.get(pr.user_id).push(pr);
    }

    const userConfMap = new Map();
    for (const ca of (confidenceAssessments || [])) {
      if (!userConfMap.has(ca.user_id)) userConfMap.set(ca.user_id, []);
      userConfMap.get(ca.user_id).push(ca);
    }

    // Combine into student list
    let students = authUsers.map(u => {
      const prof = profileMap.get(u.id);
      const userEvals = userEvalMap.get(u.id) || [];
      const userPractice = userPracticeMap.get(u.id) || [];
      const userConf = userConfMap.get(u.id) || [];

      // Calculate attempts
      let evalAttemptsCount = 0;
      let evalCorrectCount = 0;
      for (const ev of userEvals) {
        const atts = ev.evaluation_attempts || [];
        evalAttemptsCount += atts.length;
        evalCorrectCount += atts.filter(a => a.correct).length;
      }

      let practiceAttemptsCount = 0;
      let practiceCorrectCount = 0;
      for (const pr of userPractice) {
        const atts = pr.practice_attempts || [];
        practiceAttemptsCount += atts.length;
        practiceCorrectCount += atts.filter(a => a.correct).length;
      }

      const totalAttempts = evalAttemptsCount + practiceAttemptsCount;
      const totalCorrect = evalCorrectCount + practiceCorrectCount;
      const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;
      const evalAccuracy = evalAttemptsCount > 0 ? Math.round((evalCorrectCount / evalAttemptsCount) * 100) : null;
      const practiceAccuracy = practiceAttemptsCount > 0 ? Math.round((practiceCorrectCount / practiceAttemptsCount) * 100) : null;

      // Find last active timestamp
      const timestamps = [
        u.last_sign_in_at,
        ...userEvals.map(e => e.started_at),
        ...userPractice.map(p => p.started_at),
        ...userConf.map(c => c.created_at)
      ].filter(Boolean);
      const lastActiveAt = timestamps.length > 0
        ? new Date(Math.max(...timestamps.map(t => new Date(t).getTime()))).toISOString()
        : (prof?.created_at || u.created_at);

      // Estimate overconfident topics
      const topicEvalAttempts = new Map();
      for (const ev of userEvals) {
        if (!ev.topic_id) continue;
        if (!topicEvalAttempts.has(ev.topic_id)) topicEvalAttempts.set(ev.topic_id, []);
        topicEvalAttempts.get(ev.topic_id).push(...(ev.evaluation_attempts || []));
      }

      const topicConf = new Map();
      const sortedConf = [...userConf].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      for (const c of sortedConf) {
        if (!topicConf.has(c.topic_id)) topicConf.set(c.topic_id, c.confidence_level);
      }

      let overconfidentCount = 0;
      let alignedCount = 0;
      let underconfidentCount = 0;
      for (const [topId, confVal] of topicConf.entries()) {
        const attempts = topicEvalAttempts.get(topId) || [];
        const { status } = computeGapAndStatus(confVal, attempts);
        if (status === 'OVERCONFIDENT') overconfidentCount++;
        else if (status === 'ALIGNED') alignedCount++;
        else if (status === 'UNDERCONFIDENT') underconfidentCount++;
      }

      const displayName = prof?.display_name || u.email?.split('@')[0] || 'Student Candidate';

      return {
        id: u.id,
        email: u.email,
        display_name: displayName,
        target_exam_year: prof?.target_exam_year || null,
        is_admin: Boolean(prof?.is_admin),
        created_at: prof?.created_at || u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        last_active_at: lastActiveAt,
        evaluations_count: userEvals.length,
        practice_sessions_count: userPractice.length,
        total_attempts: totalAttempts,
        total_correct: totalCorrect,
        accuracy,
        eval_accuracy: evalAccuracy,
        practice_accuracy: practiceAccuracy,
        confidence_ratings_count: userConf.length,
        overconfident_topics_count: overconfidentCount,
        aligned_topics_count: alignedCount,
        underconfident_topics_count: underconfidentCount
      };
    });

    // Apply search filter
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      students = students.filter(s =>
        s.email?.toLowerCase().includes(q) ||
        s.display_name?.toLowerCase().includes(q)
      );
    }

    // Apply target year filter
    if (target_year && target_year !== 'ALL') {
      const yr = parseInt(target_year, 10);
      students = students.filter(s => s.target_exam_year === yr);
    }

    // Sort
    students.sort((a, b) => {
      if (sort === 'accuracy') return (b.accuracy ?? -1) - (a.accuracy ?? -1);
      if (sort === 'attempts') return b.total_attempts - a.total_attempts;
      if (sort === 'overconfident') return b.overconfident_topics_count - a.overconfident_topics_count;
      if (sort === 'name') return a.display_name.localeCompare(b.display_name);
      // default: last_active
      return new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime();
    });

    return {
      total: students.length,
      students
    };
  },

  /**
   * Deep Student Dossier: Knowledge Map, confidence ratings, evaluations,
   * practice drills, and cognitive mistake breakdown.
   */
  async getStudentDetail(studentId) {
    if (!studentId) {
      const err = new Error('Student ID is required');
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch Auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(studentId);
    if (authErr || !authData?.user) {
      const err = new Error('Student account not found');
      err.statusCode = 404;
      throw err;
    }
    const authUser = authData.user;

    // 2. Fetch Profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    // 3. Fetch all topics with curriculum context
    const { data: allTopics } = await supabaseAdmin
      .from('topics')
      .select(`
        id, name,
        chapters (
          id, name,
          subjects ( id, name )
        )
      `)
      .order('name');

    // 4. Fetch all confidence assessments for student
    const { data: confRatings } = await supabaseAdmin
      .from('confidence_assessments')
      .select('id, topic_id, confidence_level, trigger_type, created_at')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false });

    // 5. Fetch all evaluations for student
    const { data: evals } = await supabaseAdmin
      .from('evaluations')
      .select(`
        id, topic_id, started_at, ended_at, duration_seconds, eval_type,
        topics ( id, name ),
        evaluation_attempts ( id, question_id, correct, time_spent_seconds, mistake_type )
      `)
      .eq('user_id', studentId)
      .order('started_at', { ascending: false });

    // 6. Fetch all practice sessions for student
    const { data: practice } = await supabaseAdmin
      .from('practice_sessions')
      .select(`
        id, topic_id, started_at, ended_at,
        topics ( id, name ),
        practice_attempts ( id, question_id, correct, time_spent_seconds, mistake_type )
      `)
      .eq('user_id', studentId)
      .order('started_at', { ascending: false });

    // Latest confidence per topic & history
    const latestConfPerTopic = new Map();
    const confHistoryPerTopic = new Map();
    for (const c of (confRatings || [])) {
      if (!latestConfPerTopic.has(c.topic_id)) latestConfPerTopic.set(c.topic_id, c.confidence_level);
      if (!confHistoryPerTopic.has(c.topic_id)) confHistoryPerTopic.set(c.topic_id, []);
      confHistoryPerTopic.get(c.topic_id).push(c);
    }

    // Evaluation attempts per topic
    const evalAttemptsPerTopic = new Map();
    const mistakesCount = { CONCEPTUAL: 0, CALCULATION: 0, SILLY_MISTAKE: 0, TIME_PRESSURE: 0, READING_ERROR: 0, OTHER: 0 };
    let totalEvalAttempts = 0;
    let totalEvalCorrect = 0;

    for (const ev of (evals || [])) {
      const attempts = ev.evaluation_attempts || [];
      if (ev.topic_id) {
        if (!evalAttemptsPerTopic.has(ev.topic_id)) evalAttemptsPerTopic.set(ev.topic_id, []);
        evalAttemptsPerTopic.get(ev.topic_id).push(...attempts);
      }
      for (const a of attempts) {
        totalEvalAttempts++;
        if (a.correct) totalEvalCorrect++;
        if (!a.correct && a.mistake_type) {
          const mKey = a.mistake_type.toUpperCase();
          if (mistakesCount[mKey] !== undefined) mistakesCount[mKey]++;
          else mistakesCount.OTHER++;
        }
      }
    }

    // Practice attempts
    let totalPracticeAttempts = 0;
    let totalPracticeCorrect = 0;
    for (const pr of (practice || [])) {
      const attempts = pr.practice_attempts || [];
      for (const a of attempts) {
        totalPracticeAttempts++;
        if (a.correct) totalPracticeCorrect++;
        if (!a.correct && a.mistake_type) {
          const mKey = a.mistake_type.toUpperCase();
          if (mistakesCount[mKey] !== undefined) mistakesCount[mKey]++;
          else mistakesCount.OTHER++;
        }
      }
    }

    // Build Student Knowledge Map rows
    const knowledgeMap = [];
    for (const top of (allTopics || [])) {
      const hasConf = latestConfPerTopic.has(top.id);
      const evalAtts = evalAttemptsPerTopic.get(top.id) || [];
      if (!hasConf && evalAtts.length === 0) continue; // Only include topics student interacted with

      const confVal = latestConfPerTopic.get(top.id) ?? null;
      const { gap, status, performance, total_attempts, correct_attempts } = computeGapAndStatus(confVal, evalAtts);

      knowledgeMap.push({
        topic_id: top.id,
        topic_name: top.name,
        chapter_name: top.chapters?.name || 'Chapter',
        subject_name: top.chapters?.subjects?.name || 'Subject',
        confidence: confVal,
        evaluation_accuracy: performance,
        gap,
        status,
        attempts_count: total_attempts,
        correct_count: correct_attempts
      });
    }

    // Sort knowledge map by gap severity (OVERCONFIDENT first)
    const STATUS_WEIGHT = { OVERCONFIDENT: 1, WEAK_ALIGNED: 2, PRELIMINARY: 3, INSUFFICIENT_DATA: 4, UNDERCONFIDENT: 5, ALIGNED: 6 };
    knowledgeMap.sort((a, b) => {
      const diff = (STATUS_WEIGHT[a.status] || 99) - (STATUS_WEIGHT[b.status] || 99);
      if (diff !== 0) return diff;
      return (a.gap ?? 999) - (b.gap ?? 999);
    });

    // Formatted evaluation session list
    const evaluationsSummary = (evals || []).map(ev => {
      const atts = ev.evaluation_attempts || [];
      const correct = atts.filter(a => a.correct).length;
      return {
        id: ev.id,
        topic_id: ev.topic_id,
        topic_name: ev.topics?.name || 'Evaluation Test',
        started_at: ev.started_at,
        ended_at: ev.ended_at,
        duration_seconds: ev.duration_seconds,
        total_questions: atts.length,
        correct_count: correct,
        accuracy: atts.length > 0 ? Math.round((correct / atts.length) * 100) : 0,
        mistakes: atts.filter(a => !a.correct).map(a => ({
          question_id: a.question_id,
          mistake_type: a.mistake_type,
          time_spent: a.time_spent_seconds
        }))
      };
    });

    // Formatted practice sessions list
    const practiceSummary = (practice || []).map(pr => {
      const atts = pr.practice_attempts || [];
      const correct = atts.filter(a => a.correct).length;
      return {
        id: pr.id,
        topic_id: pr.topic_id,
        topic_name: pr.topics?.name || 'Practice Drill',
        started_at: pr.started_at,
        ended_at: pr.ended_at,
        total_questions: atts.length,
        correct_count: correct,
        accuracy: atts.length > 0 ? Math.round((correct / atts.length) * 100) : 0
      };
    });

    const totalSolved = totalEvalAttempts + totalPracticeAttempts;
    const totalCorrect = totalEvalCorrect + totalPracticeCorrect;

    return {
      student: {
        id: authUser.id,
        email: authUser.email,
        display_name: profile?.display_name || authUser.email?.split('@')[0] || 'Student Candidate',
        target_exam_year: profile?.target_exam_year || null,
        is_admin: Boolean(profile?.is_admin),
        created_at: profile?.created_at || authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at
      },
      summary: {
        total_solved: totalSolved,
        total_correct: totalCorrect,
        overall_accuracy: totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : null,
        eval_accuracy: totalEvalAttempts > 0 ? Math.round((totalEvalCorrect / totalEvalAttempts) * 100) : null,
        practice_accuracy: totalPracticeAttempts > 0 ? Math.round((totalPracticeCorrect / totalPracticeAttempts) * 100) : null,
        evaluations_count: (evals || []).length,
        practice_sessions_count: (practice || []).length,
        confidence_ratings_count: (confRatings || []).length,
        overconfident_count: knowledgeMap.filter(k => k.status === 'OVERCONFIDENT').length,
        aligned_count: knowledgeMap.filter(k => k.status === 'ALIGNED').length,
        weak_aligned_count: knowledgeMap.filter(k => k.status === 'WEAK_ALIGNED').length,
        underconfident_count: knowledgeMap.filter(k => k.status === 'UNDERCONFIDENT').length
      },
      knowledge_map: knowledgeMap,
      evaluations: evaluationsSummary,
      practice_sessions: practiceSummary,
      mistake_distribution: mistakesCount
    };
  },

  /**
   * Update student role (grant/revoke admin status).
   */
  async updateUserRole(userId, { is_admin }) {
    if (!userId) {
      const err = new Error('User ID is required');
      err.statusCode = 400;
      throw err;
    }
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: Boolean(is_admin) })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user role: ${error.message}`);
    return data;
  }
};
