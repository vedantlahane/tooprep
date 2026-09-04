import { useState, useRef } from 'react';
import { practiceService } from '../services/practiceService';
import QuestionCard from '@/features/questions/components/QuestionCard';
import { confidenceService } from '@/features/confidence/services/confidenceService';
import { X, Zap, Check, ArrowRight, Award } from 'lucide-react';

export default function QuickDrillModal({ topicId, topicName, isOpen, onClose, onComplete }) {
  const [step, setStep] = useState('ready'); // ready, drilling, summary
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const startTimeRef = useRef(null);

  const startDrill = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await practiceService.startPractice(topicId, 5); // 5 quick questions
      setSession(result.session);
      setQuestions(result.questions);
      setCurrentIndex(0);
      setAnswers({});
      setAttempts([]);
      setStep('drilling');
      startTimeRef.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (optionId) => {
    const qId = questions[currentIndex].id;
    setAnswers(prev => ({ ...prev, [qId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!answers[questions[currentIndex].id]) return;
    
    setLoading(true);
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const result = await practiceService.submitPracticeAttempt(session.id, {
        question_id: questions[currentIndex].id,
        selected_answer: answers[questions[currentIndex].id],
        time_spent_seconds: timeSpent,
        mistake_type: null
      });

      setAttempts(prev => [...prev, { ...result, question: questions[currentIndex] }]);
      setSubmitted(true);
      questions[currentIndex].correct_answer = result.correct_answer;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnswers(prev => ({ ...prev }));
      setSubmitted(false);
      startTimeRef.current = Date.now();
    } else {
      // Complete drill
      try {
        const result = await practiceService.completePractice(session.id);
        setSummary(result.summary);
        setStep('summary');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleFinish = async () => {
    if (onComplete) onComplete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-surface-container rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-surface-container-high border-b border-outline-variant px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-label-sm-mono text-primary uppercase tracking-widest">Quick Drill</div>
            <div className="text-headline-md text-on-surface mt-1">{topicName}</div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {step === 'ready' && (
            <div className="text-center space-y-6">
              <Zap className="w-14 h-14 text-primary mx-auto mb-2 opacity-80" />
              <div>
                <h3 className="text-headline-lg text-on-surface mb-2">Fast Focus Practice</h3>
                <p className="text-body-lg text-on-surface-variant">5 quick questions • untimed • instant feedback</p>
              </div>
              <div className="space-y-3 text-body-md text-on-surface-variant text-left max-w-sm mx-auto">
                <div className="flex gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5" />
                  <span>No timer—work at your own pace</span>
                </div>
                <div className="flex gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5" />
                  <span>Solutions shown after each answer</span>
                </div>
                <div className="flex gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5" />
                  <span>Takes ~5-10 minutes</span>
                </div>
              </div>
              {error && (
                <div className="p-3 bg-error/10 border border-error text-error rounded-lg text-body-sm">
                  {error}
                </div>
              )}
              <button
                onClick={startDrill}
                disabled={loading}
                className="w-full py-3 bg-primary text-on-primary text-body-md font-semibold uppercase tracking-widest rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? 'Starting...' : 'Start Drill'}
              </button>
            </div>
          )}

          {step === 'drilling' && questions.length > 0 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center text-label-sm-mono uppercase tracking-widest text-on-surface-variant">
                <span>Question {currentIndex + 1} of {questions.length}</span>
                <span className="text-primary font-bold">{Math.round((currentIndex + 1) / questions.length * 100)}%</span>
              </div>

              <div className="w-full h-1.5 bg-surface-dim rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              <QuestionCard
                question={questions[currentIndex]}
                selectedAnswer={answers[questions[currentIndex]?.id]}
                onSelectAnswer={handleSelectAnswer}
                showHint={false}
              />

              {submitted && questions[currentIndex]?.correct_answer && (
                <div className="p-4 bg-status-aligned/10 border-l-4 border-status-aligned rounded-r-lg">
                  <div className="text-label-sm-mono text-status-aligned uppercase tracking-widest mb-2">Correct Answer</div>
                  <div className="text-body-md text-on-surface font-mono">
                    {questions[currentIndex].correct_answer}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {!submitted ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!answers[questions[currentIndex]?.id] || loading}
                    className="flex-1 py-3 bg-primary text-on-primary text-body-md font-semibold uppercase tracking-widest rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Checking...' : 'Check Answer'}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="flex-1 py-3 bg-primary text-on-primary text-body-md font-semibold uppercase tracking-widest rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
                  >
                    {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Drill'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 'summary' && summary && (
            <div className="text-center space-y-6">
              <Award className="w-14 h-14 text-status-aligned mx-auto mb-2 opacity-80" />

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-surface-dim rounded-lg border border-outline-variant">
                  <div className="text-headline-lg text-primary font-bold">{summary.correct}/{summary.total_questions}</div>
                  <div className="text-label-sm-mono text-on-surface-variant mt-1 uppercase tracking-widest">Correct</div>
                </div>
                <div className="p-4 bg-surface-dim rounded-lg border border-outline-variant">
                  <div className={`text-headline-lg font-bold ${summary.accuracy >= 70 ? 'text-status-aligned' : summary.accuracy >= 40 ? 'text-status-weak' : 'text-error'}`}>
                    {summary.accuracy}%
                  </div>
                  <div className="text-label-sm-mono text-on-surface-variant mt-1 uppercase tracking-widest">Accuracy</div>
                </div>
              </div>

              <div className="p-4 bg-primary/10 border-l-4 border-primary rounded-r-lg text-left">
                <div className="text-label-sm-mono text-primary uppercase tracking-widest mb-2">Next Step</div>
                {summary.accuracy >= 70 ? (
                  <p className="text-body-md text-on-surface">
                    Great practice session! Your grasp is solid. Move on to the next topic or do a full timed evaluation to measure under pressure.
                  </p>
                ) : (
                  <p className="text-body-md text-on-surface">
                    Review the missed concepts and do another quick drill in 30 minutes to reinforce learning.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'summary' && (
          <div className="border-t border-outline-variant bg-surface-container-high px-6 py-4 flex gap-3">
            <button
              onClick={handleFinish}
              className="flex-1 py-3 bg-primary text-on-primary text-body-md font-semibold uppercase tracking-widest rounded-lg hover:brightness-110 transition-all"
            >
              Done
            </button>
            {topicId && (
              <button
                onClick={() => {
                  setStep('ready');
                  setSubmitted(false);
                  setQuestions([]);
                  setAnswers({});
                }}
                className="flex-1 py-3 border border-primary text-primary text-body-md font-semibold uppercase tracking-widest rounded-lg hover:bg-primary/10 transition-all"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
