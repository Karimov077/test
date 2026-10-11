'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  isTestAvailable,
  loadLocalData,
  parseLocalData,
  saveLocalData,
  type LocalData,
  type Question,
  type TestItem,
  type TestResult
} from './lib/localStore';

// -------------------------------------------------------------
// Matematik ifodalar va kasrlarni stacked render qilish
// -------------------------------------------------------------
function MathText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\b\d+\s+\d+\/\d+\b|\b\d+\/\d+\b)/g);
  return (
    <span>
      {parts.map((part, index) => {
        const mixedMatch = part.match(/^(\d+)\s+(\d+)\/(\d+)$/);
        if (mixedMatch) {
          return (
            <span key={index} className="mx-0.5 inline-flex items-center font-semibold">
              <span className="mr-0.5 text-blue-700">{mixedMatch[1]}</span>
              <span className="math-frac">
                <span className="math-frac-num">{mixedMatch[2]}</span>
                <span className="math-frac-den">{mixedMatch[3]}</span>
              </span>
            </span>
          );
        }
        const fracMatch = part.match(/^(\d+)\/(\d+)$/);
        if (fracMatch) {
          return (
            <span key={index} className="math-frac mx-0.5">
              <span className="math-frac-num">{fracMatch[1]}</span>
              <span className="math-frac-den">{fracMatch[2]}</span>
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds >= 3600 && totalSeconds % 3600 === 0) return `${totalSeconds / 3600} soat`;
  if (totalSeconds >= 3600) return `${Math.floor(totalSeconds / 3600)} soat ${Math.floor((totalSeconds % 3600) / 60)} daqiqa`;
  return `${Math.ceil(totalSeconds / 60)} daqiqa`;
}

function formatRemainingTime(deadlineAt: string | null) {
  if (!deadlineAt) return '';
  const diff = Date.parse(deadlineAt) - Date.now();
  if (diff <= 0) return 'Muddati tugagan';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours} soat ${minutes} daqiqa qoldi`;
  return `${Math.max(1, minutes)} daqiqa qoldi`;
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// -------------------------------------------------------------
// Bayramona Konfetti animatsiyasi
// -------------------------------------------------------------
function ConfettiOverlay() {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
  const pieces = Array.from({ length: 42 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    color: colors[i % colors.length],
    size: `${6 + Math.random() * 8}px`,
    duration: `${2 + Math.random() * 2}s`
  }));

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration
          }}
        />
      ))}
    </div>
  );
}

// -------------------------------------------------------------
// Umumiy Navigatsiya paneli (Mobil-moslashuvchan)
// -------------------------------------------------------------
function NavigationHeader({ adminToken, onLogout }: { adminToken: string | null; onLogout?: () => void }) {
  const location = useLocation();

  const isHome = location.pathname === '/' || location.pathname === '/take-test';
  const isRanking = location.pathname === '/ranking' || location.pathname === '/admin/ranking';
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xs">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2.5 sm:px-6">
        {/* Tepada chap tomonda: Ko‘zdan pana nozik admin tugmasi va Brand Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/admin"
            title="Tizim boshqaruvi"
            aria-label="Tizim boshqaruvi"
            className="group flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 active:scale-95"
          >
            <svg
              className="h-3.5 w-3.5 opacity-30 transition-opacity group-hover:opacity-100"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </Link>

          <Link to="/" className="math-brand">
            <span className="math-brand-symbol">∑</span>
            <div>
              <div className="text-base font-extrabold leading-tight tracking-tight text-slate-900 sm:text-lg">
                Test<span className="text-blue-600">Gennis</span>
              </div>
              <div className="text-[10px] font-semibold text-blue-600 sm:text-xs">
                Matematika Portali
              </div>
            </div>
          </Link>
        </div>

        {/* O‘ng tomonda: O‘quvchi menyusi */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/"
            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition sm:px-4 sm:py-2 sm:text-sm active:scale-95 ${
              isHome && !isAdmin
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>📝</span>
            <span>Testlar</span>
          </Link>
          <Link
            to="/ranking"
            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition sm:px-4 sm:py-2 sm:text-sm active:scale-95 ${
              isRanking
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>🏆</span>
            <span>Reyting</span>
          </Link>

          {/* Faqat admin kirganida boshqaruv paneli */}
          {adminToken && (
            <>
              <Link
                to="/admin"
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition sm:px-3 sm:py-2 sm:text-sm ${
                  isAdmin
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>⚙️</span>
                <span>Boshqaruv</span>
              </Link>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 active:scale-95"
                >
                  Chiqish
                </button>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

// -------------------------------------------------------------
// Admin Login
// -------------------------------------------------------------
async function adminLogin(password: string) {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const result = (await response.json().catch(() => null)) as { error?: string; token?: string } | null;
  if (!response.ok || !result?.token) throw new Error(result?.error || 'Kirish amalga oshmadi.');
  return result.token;
}

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = await adminLogin(password);
      sessionStorage.setItem('testgennis-admin', token);
      onLogin(token);
      navigate('/admin');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kirish amalga oshmadi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center p-4">
      <section className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl sm:p-8 animate-page">
        <div className="math-brand">
          <span className="math-brand-symbol">∑</span>
          <div>
            <span className="text-xl font-extrabold text-slate-900">TestGennis</span>
            <span className="block text-xs font-semibold text-blue-600">Administrator</span>
          </div>
        </div>

        <h1 className="mt-5 text-2xl font-black text-slate-900 tracking-tight">Matematika nazorat paneli</h1>
        <p className="mt-1 text-sm text-slate-500">
          Testlarni boshqarish, o‘quvchilar uchun vaqt belgilash va natijalarni tahlil qilish.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Admin paroli
            <input
              required
              autoFocus
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parolni kiriting..."
              className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600 animate-shake">{error}</p>}
          <button
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-3.5 font-bold text-white shadow-lg shadow-blue-500/30 transition hover:shadow-blue-500/40 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Tekshirilmoqda…' : 'Tizimga kirish 🚀'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link to="/" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
            ← O‘quvchi sifatida test topshirish
          </Link>
        </div>
      </section>
    </div>
  );
}

// -------------------------------------------------------------
// O‘quvchi Portali va Test Topshirish (Mobile-First)
// -------------------------------------------------------------
const CATEGORY_TABS = [
  { id: 'all', label: 'Barchasi' },
  { id: 'fractions-add-sub', label: '➕➖ Qo‘shish & Ayirish' },
  { id: 'fractions-mul-div', label: '✖️➗ Ko‘paytirish & Bo‘lish' },
  { id: 'mixed-numbers', label: '🍰 Aralash sonlar' },
  { id: 'word-part', label: '📖 Qismini topish' },
  { id: 'word-remaining', label: '🔍 Qoldiq va ayirma' },
  { id: 'word-find-whole', label: '🎯 Butunni topish' },
  { id: 'word-practical', label: '🛒 Amaliy hisoblar' },
  { id: 'gcd-lcm', label: '🔢 EKUB va EKUK' }
];

function StudentPortal({
  data,
  onSaveResult,
  storageError
}: {
  data: LocalData;
  onSaveResult: (result: TestResult) => boolean;
  storageError: string;
}) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [quiz, setQuiz] = useState<{
    test: TestItem;
    name: string;
    answers: Record<number, string>;
    index: number;
    deadline: number;
  } | null>(null);

  const [completed, setCompleted] = useState<TestResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const quizRef = useRef(quiz);
  quizRef.current = quiz;
  const completeRef = useRef<() => void>(() => undefined);

  // O‘quvchi ismini eslab qolish
  useEffect(() => {
    try {
      const saved = localStorage.getItem('testgennis-student-name');
      if (saved) {
        const [f, ...l] = saved.split(' ');
        if (f) setFirstName(f);
        if (l.length) setLastName(l.join(' '));
      }
    } catch {
      // Ignore
    }
  }, []);

  const availableTests = data.tests.filter((test) => isTestAvailable(test));
  const filteredTests = activeCategory === 'all'
    ? availableTests
    : availableTests.filter((test) => test.category === activeCategory);

  function finishQuiz() {
    const current = quizRef.current;
    if (!current) return;

    const score = current.test.questions.reduce(
      (count, question) => count + (current.answers[question.id] === question.correctAnswer ? 1 : 0),
      0
    );

    const result: TestResult = {
      id: Date.now(),
      studentName: current.name,
      testId: current.test.id,
      testTitle: current.test.title,
      testCode: current.test.code,
      score,
      totalQuestions: current.test.questions.length,
      percentage: Math.round((score / current.test.questions.length) * 100),
      completedAt: new Date().toISOString(),
      answers: { ...current.answers }
    };

    quizRef.current = null;
    setQuiz(null);
    setShowConfirmModal(false);
    setCompleted(result);
    setShowReview(true);
    onSaveResult(result);
  }
  completeRef.current = finishQuiz;

  useEffect(() => {
    if (!quiz) return;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((quiz.deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) completeRef.current();
    };
    updateTimer();
    const timer = window.setInterval(updateTimer, 500);
    return () => window.clearInterval(timer);
  }, [quiz?.deadline]);

  function startTest(test: TestItem) {
    if (!firstName.trim() || !lastName.trim()) {
      alert('Iltimos, avval ism va familiyangizni kiriting!');
      nameInputRef.current?.focus();
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    try {
      localStorage.setItem('testgennis-student-name', fullName);
    } catch {
      // Ignore
    }

    const now = Date.now();
    const testDeadline = test.deadlineAt ? Date.parse(test.deadlineAt) : now + test.durationSeconds * 1000;
    const attemptDeadline = now + test.durationSeconds * 1000;
    const finalDeadline = Math.min(testDeadline, attemptDeadline);

    const nextQuiz = {
      test,
      name: fullName,
      answers: {} as Record<number, string>,
      index: 0,
      deadline: finalDeadline
    };

    quizRef.current = nextQuiz;
    setQuiz(nextQuiz);
    setCompleted(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function chooseAnswer(answer: string) {
    setQuiz((current) => {
      if (!current) return current;
      const questionId = current.test.questions[current.index].id;
      const next = {
        ...current,
        answers: { ...current.answers, [questionId]: answer }
      };
      quizRef.current = next;
      return next;
    });
  }

  // -------------------------------------------------------------
  // Test yakunlangan holat (Natija va Yechimlar tahlili)
  // -------------------------------------------------------------
  if (completed) {
    const questions = data.tests.find((t) => t.id === completed.testId)?.questions || [];
    const isHighScore = completed.percentage >= 70;

    const gradeInfo =
      completed.percentage >= 90
        ? { badge: '🏆 A’lo natija! Barakalla!', msg: 'Barcha masalalarni mahorat bilan bajardingiz.', color: 'text-emerald-800 bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20' }
        : completed.percentage >= 70
        ? { badge: '🌟 Yaxshi natija!', msg: 'Juda yaxshi! Kichik xatolarni tahlil qilib, bilimlarni mustahkamlang.', color: 'text-blue-800 bg-blue-50 border-blue-300 ring-2 ring-blue-400/20' }
        : completed.percentage >= 50
        ? { badge: '💡 Qoniqarli', msg: 'Yomon emas! Kasrlar qoidasini yana bir bor takrorlab chiqing.', color: 'text-amber-800 bg-amber-50 border-amber-300 ring-2 ring-amber-400/20' }
        : { badge: '📚 Mashq qilish kerak', msg: 'Xavotir olmang! Yechimlarni ko‘rib chiqing va qayta urinib ko‘ring.', color: 'text-rose-800 bg-rose-50 border-rose-300 ring-2 ring-rose-400/20' };

    return (
      <main className="relative mx-auto min-h-[calc(100vh-60px)] max-w-2xl px-4 py-6 animate-page">
        {isHighScore && <ConfettiOverlay />}

        <section className="glass-panel relative rounded-3xl p-6 text-center shadow-xl sm:p-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-4xl shadow-lg shadow-blue-500/30 float-badge">
            {completed.percentage >= 90 ? '👑' : completed.percentage >= 70 ? '🎉' : '📖'}
          </div>

          <h1 className="mt-4 text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">{completed.studentName}</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">{completed.testTitle}</p>

          <div className="mt-6 rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50/60 to-white p-5 shadow-xs">
            <div className="text-5xl font-black text-blue-600 sm:text-6xl tracking-tight">
              {completed.score} <span className="text-2xl font-bold text-slate-400">/ {completed.totalQuestions}</span>
            </div>
            <div className="mt-1 text-sm font-extrabold uppercase tracking-wider text-slate-700">
              To‘plangan natija: <span className="text-blue-600">{completed.percentage}%</span>
            </div>
          </div>

          <div className={`mt-5 rounded-2xl border p-4 text-sm ${gradeInfo.color}`}>
            <div className="font-extrabold text-base">{gradeInfo.badge}</div>
            <div className="mt-0.5 text-xs sm:text-sm font-medium">{gradeInfo.msg}</div>
          </div>

          {storageError && <p className="mt-3 text-xs text-red-500 font-bold">Saqlash xatosi: {storageError}</p>}

          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <button
              onClick={() => {
                const targetTest = data.tests.find((t) => t.id === completed.testId);
                if (targetTest && isTestAvailable(targetTest)) {
                  startTest(targetTest);
                } else {
                  alert('Bu testning topshirish muddati yakunlangan.');
                  setCompleted(null);
                }
              }}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 active:scale-95"
            >
              🔄 Qayta topshirish
            </button>
            <button
              onClick={() => {
                setCompleted(null);
                setShowReview(false);
              }}
              className="rounded-2xl border border-slate-300 bg-white/90 px-6 py-3 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95"
            >
              📋 Boshqa test tanlash
            </button>
            <button
              onClick={() => navigate('/ranking')}
              className="rounded-2xl border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-bold text-blue-700 shadow-xs transition hover:bg-blue-100 active:scale-95"
            >
              🏆 Reytingni ko‘rish
            </button>
          </div>
        </section>

        {/* Xatolar ustida ishlash / Yechimlar tahlili */}
        <section className="mt-8">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Yechimlar va xatolar tahlili</h2>
            <button
              onClick={() => setShowReview(!showReview)}
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition active:scale-95"
            >
              {showReview ? 'Yashirish ▲' : 'Ko‘rsatish ▼'}
            </button>
          </div>

          {showReview && (
            <div className="mt-4 space-y-3.5">
              {questions.map((q, idx) => {
                const studentAns = completed.answers?.[q.id];
                const isCorrect = studentAns === q.correctAnswer;
                const answered = Boolean(studentAns);

                return (
                  <article
                    key={q.id}
                    className={`rounded-2xl border p-4.5 transition-all shadow-xs ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                        : 'border-rose-200 bg-rose-50/40 hover:border-rose-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black shadow-xs ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                          {isCorrect ? 'To‘g‘ri' : answered ? 'Xato' : 'Javob berilmadi'}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-600">
                        {isCorrect ? '✅ +1 ball' : '❌ 0 ball'}
                      </span>
                    </div>

                    <div className="mt-3 text-base font-bold text-slate-900 leading-snug">
                      <MathText text={q.questionText} />
                    </div>

                    <div className="mt-3.5 grid gap-2 text-xs sm:grid-cols-2">
                      {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                        const optText = q[`option${letter}`];
                        const isChosen = studentAns === letter;
                        const isRight = q.correctAnswer === letter;

                        let optClasses = 'border-slate-200 bg-white/90 text-slate-700';
                        if (isRight) optClasses = 'border-emerald-500 bg-emerald-100/90 font-bold text-emerald-950 ring-1 ring-emerald-500';
                        else if (isChosen && !isRight) optClasses = 'border-rose-500 bg-rose-100/90 font-bold text-rose-950 line-through';

                        return (
                          <div key={letter} className={`flex items-center gap-2 rounded-xl border p-2.5 shadow-2xs ${optClasses}`}>
                            <span className="font-extrabold text-xs">{letter})</span>
                            <MathText text={optText} />
                            {isRight && <span className="ml-auto font-bold text-emerald-700">✓ To‘g‘ri</span>}
                            {isChosen && !isRight && <span className="ml-auto font-bold text-rose-700">Siz tanlagan</span>}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="mt-3 rounded-xl bg-white/95 p-3 text-xs text-slate-700 border border-slate-200/80 shadow-xs">
                        <span className="font-bold text-blue-700">💡 Tushuntirish: </span>
                        <MathText text={q.explanation} />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    );
  }

  // -------------------------------------------------------------
  // Test Topshirish Jarayoni (Mobile Quiz Screen)
  // -------------------------------------------------------------
  if (quiz) {
    const question = quiz.test.questions[quiz.index];
    const totalQ = quiz.test.questions.length;
    const answeredCount = Object.keys(quiz.answers).length;

    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    const seconds = String(secondsLeft % 60).padStart(2, '0');
    const timerText = hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
    const isUrgent = secondsLeft < 180;

    return (
      <main className="mx-auto min-h-[calc(100vh-60px)] max-w-2xl px-3 py-3 sm:px-4 sm:py-6 animate-page">
        {/* Yuqori yopishqoq info va taymer paneli */}
        <div className="sticky top-[53px] z-20 -mx-3 mb-4 border-b border-slate-200/80 bg-white/95 px-3 py-3 shadow-md backdrop-blur-xl sm:-mx-4 sm:px-4 sm:rounded-b-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-bold uppercase tracking-wider text-blue-600">{quiz.name}</div>
              <div className="truncate text-sm font-extrabold text-slate-900 sm:text-base">{quiz.test.title}</div>
            </div>

            <div className={`math-timer rounded-xl px-3 py-1.5 text-sm sm:text-base ${isUrgent ? 'warning' : ''}`}>
              <span className="animate-spin" style={{ animationDuration: '6s' }}>⏱️</span>
              <span>{timerText}</span>
            </div>
          </div>

          {/* Shimmer progress bar */}
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
            <div
              className="h-full shimmer-progress transition-all duration-300"
              style={{ width: `${((quiz.index + 1) / totalQ) * 100}%` }}
            />
          </div>

          {/* Savollar raqamlari tezkor paneli (Horizontal mini-selector) */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {quiz.test.questions.map((q, idx) => {
              const isAnswered = Boolean(quiz.answers[q.id]);
              const isCurrent = idx === quiz.index;

              let btnClass = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
              if (isCurrent) {
                btnClass = 'bg-blue-600 text-white font-extrabold ring-4 ring-blue-300/40 shadow-sm scale-105';
              } else if (isAnswered) {
                btnClass = 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setQuiz((cur) => (cur ? { ...cur, index: idx } : cur))}
                  className={`flex h-7.5 w-7.5 flex-shrink-0 items-center justify-center rounded-xl text-xs transition active:scale-95 ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Savol kartochkasi */}
        <section className="glass-panel rounded-3xl p-5 shadow-lg sm:p-7">
          <div className="flex items-center justify-between text-xs">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-extrabold uppercase tracking-wider text-blue-700 border border-blue-200">
              Savol {String(quiz.index + 1).padStart(2, '0')} / {String(totalQ).padStart(2, '0')}
            </span>
            <span className="font-semibold text-slate-500">
              Belgilangan: <b className="text-blue-700 font-extrabold">{answeredCount}</b>/{totalQ}
            </span>
          </div>

          <h2 className="math-question mt-4">
            <MathText text={question.questionText} />
          </h2>

          {/* Javob variantlari (katta sensor kartochkalar) */}
          <div className="mt-6 space-y-3">
            {(['A', 'B', 'C', 'D'] as const).map((letter) => {
              const optText = question[`option${letter}`];
              const isSelected = quiz.answers[question.id] === letter;

              return (
                <button
                  type="button"
                  key={`${question.id}-${letter}`}
                  onClick={() => chooseAnswer(letter)}
                  className={`touch-card flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition sm:p-4.5 ${
                    isSelected
                      ? 'border-blue-600 bg-gradient-to-r from-blue-50/90 to-indigo-50/50 shadow-md shadow-blue-500/10 ring-2 ring-blue-600 scale-[1.01]'
                      : 'border-slate-200/90 bg-white/90 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'border border-slate-300 bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isSelected ? '✓' : letter}
                  </div>
                  <div className="text-base font-bold text-slate-900 sm:text-lg">
                    <MathText text={optText} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Pastki suzuvchi boshqaruv paneli (Floating Mobile Bottom Dock) */}
        <div className="mobile-bottom-bar mt-6 flex items-center justify-between gap-2">
          <button
            disabled={quiz.index === 0}
            onClick={() => setQuiz((cur) => (cur ? { ...cur, index: cur.index - 1 } : cur))}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition active:scale-95 disabled:opacity-30 sm:text-sm"
          >
            ← Oldingi
          </button>

          <div className="text-center text-xs font-bold text-slate-500">
            {quiz.index + 1}-savol
          </div>

          {quiz.index < totalQ - 1 ? (
            <button
              onClick={() => setQuiz((cur) => (cur ? { ...cur, index: cur.index + 1 } : cur))}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition active:scale-95 hover:shadow-blue-500/30 sm:text-sm"
            >
              Keyingi →
            </button>
          ) : (
            <button
              onClick={() => {
                if (answeredCount < totalQ) {
                  setShowConfirmModal(true);
                } else {
                  finishQuiz();
                }
              }}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition active:scale-95 hover:shadow-emerald-500/30 sm:text-sm"
            >
              Yakunlash ✅
            </button>
          )}
        </div>

        {/* Yakunlash tasdiq modal oynasi */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-page">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
              <div className="text-4xl text-amber-500">⚠️</div>
              <h3 className="mt-2 text-lg font-black text-slate-900">Testni yakunlaysizmi?</h3>
              <p className="mt-1 text-sm text-slate-600">
                Siz <b>{totalQ}</b> ta savoldan <b>{answeredCount}</b> tasiga javob berdingiz.
                {totalQ - answeredCount > 0 && (
                  <span className="block mt-1.5 font-bold text-rose-600">
                    {totalQ - answeredCount} ta savol belgilanmagan!
                  </span>
                )}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 rounded-2xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Davom etish
                </button>
                <button
                  onClick={finishQuiz}
                  className="flex-1 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700"
                >
                  Ha, yakunlash
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // -------------------------------------------------------------
  // Bosh Sahifa: O‘quvchi ko‘radigan oyna
  // -------------------------------------------------------------
  return (
    <main className="mx-auto min-h-[calc(100vh-60px)] max-w-4xl px-3 py-5 sm:px-6 sm:py-8 animate-page">
      {/* O‘quvchi profili / Kirish kartochkasi */}
      <section className="glass-panel rounded-3xl p-5 shadow-lg sm:p-7 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 h-36 w-36 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="math-overline flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              O‘quvchi Mashg‘ulot Portali
            </span>
            <h1 className="mt-1 text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
              Kasrlar va Matnli Masalalar
            </h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm font-medium">
              Oddiy kasrlar ustida amallar, sonning kasri va qiziqarli kundalik hisob-kitoblar.
            </p>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl bg-white/90 p-2.5 border border-slate-200/80 shadow-xs">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-lg font-black text-white shadow-md shadow-blue-500/25">
              {firstName ? firstName[0].toUpperCase() : '👤'}
            </div>
            <div className="text-xs">
              <div className="font-extrabold text-slate-900">{firstName ? `${firstName} ${lastName}` : 'Ismingizni kiriting'}</div>
              <div className="text-slate-500 text-[11px] font-medium">{firstName ? 'Tayyormisiz? Testni tanlang' : 'Natijangiz saqlanadi'}</div>
            </div>
          </div>
        </div>

        {/* Ism va Familiya kiritish */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Ismingiz:
              <input
                ref={nameInputRef}
                required
                placeholder="Masalan: Nodir"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white/95 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Familiyangiz:
              <input
                required
                placeholder="Masalan: Karimov"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white/95 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Mavzular bo‘yicha toifalar (Horizontal Scrollable Tabs) */}
      <div className="mt-7">
        <div className="category-scroller">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`flex-shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition active:scale-95 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40'
                    : 'border border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Testlar ro‘yxati */}
      <section className="mt-6">
        <div className="mb-3.5 flex items-center justify-between text-xs text-slate-500 px-1 font-semibold">
          <span>Ochiq testlar: <b className="text-blue-700 font-extrabold">{filteredTests.length}</b> ta</span>
          <span>Daraja: <b className="text-slate-800 font-extrabold">5-6 sinf</b></span>
        </div>

        {/* Agar o‘qituvchi hali test ochmagan bo‘lsa yoki muddati tugagan bo‘lsa */}
        {filteredTests.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 text-center sm:p-14 shadow-lg animate-spring-card">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-3xl shadow-inner border border-amber-200/80 float-badge">
              🔒
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900 sm:text-xl tracking-tight">
              Hozircha o‘quvchilar uchun ochiq testlar yo‘q
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-500 sm:text-sm leading-relaxed">
              Testlar faqat o‘qituvchi tomonidan belgilangan vaqtda (masalan, 5 soatlik muddat bilan yoki soat 10:00 dan 15:00 gacha) ochiladi. Belgilangan muddat o‘tgach, test avtomatik yopiladi.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredTests.map((test, index) => {
              const deadlineDate = test.deadlineAt ? new Date(test.deadlineAt) : null;
              const deadlineTimeText = deadlineDate
                ? deadlineDate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <article
                  key={test.id}
                  className="glass-card animate-spring-card flex flex-col justify-between rounded-3xl p-5 shadow-md"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-xl bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-700 border border-blue-200">
                        {test.category ? test.category.toUpperCase() : 'MATEMATIKA'}
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200/80 shadow-2xs">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Ochiq
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-extrabold text-slate-900 tracking-tight">
                      {test.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {test.description}
                    </p>

                    {/* Vaqt va muddat ko‘rsatkichi */}
                    {test.deadlineAt && (
                      <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1 font-bold text-amber-900 border border-amber-200 shadow-2xs">
                          <span>⏳</span>
                          <span>{formatRemainingTime(test.deadlineAt)}</span>
                        </span>
                        <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-slate-600 font-semibold">
                          Yopilish: {deadlineTimeText}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-3.5">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3 font-semibold">
                      <span>📝 {test.questions.length} ta savol</span>
                      <span>⏱️ {formatDuration(test.durationSeconds)}</span>
                    </div>

                    <button
                      onClick={() => startTest(test)}
                      className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-3 text-center text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 active:scale-[0.98]"
                    >
                      Boshlash 🚀
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

// -------------------------------------------------------------
// Reyting Sahifasi (Mobile First)
// -------------------------------------------------------------
function RankingView({ data }: { data: LocalData }) {
  const [selectedTestId, setSelectedTestId] = useState('all');

  const bestByLearner = new Map<string, TestResult>();
  for (const result of data.results) {
    if (selectedTestId !== 'all' && result.testId !== Number(selectedTestId)) continue;
    const key = `${result.testId}:${result.studentName.trim().toLocaleLowerCase()}`;
    const current = bestByLearner.get(key);
    if (!current || result.percentage > current.percentage || (result.percentage === current.percentage && result.score > current.score)) {
      bestByLearner.set(key, result);
    }
  }

  const ranking = [...bestByLearner.values()].sort((a, b) =>
    b.percentage - a.percentage || b.score - a.score || a.completedAt.localeCompare(b.completedAt)
  );

  return (
    <main className="mx-auto min-h-[calc(100vh-60px)] max-w-4xl px-3 py-5 sm:px-6 sm:py-8 animate-page">
      <section className="glass-panel rounded-3xl p-5 shadow-xl sm:p-7">
        <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">🏆 O‘quvchilar Reytingi</h1>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm font-medium">
              Eng yuqori natija ko‘rsatgan o‘quvchilar peshqadamlar jadvali.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Reyting uchun test"
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              className="rounded-2xl border border-slate-300 bg-white/95 px-3.5 py-2 text-xs font-bold text-slate-700 outline-none sm:text-sm shadow-2xs"
            >
              <option value="all">Barcha testlar bo‘yicha</option>
              {data.tests.map((test) => (
                <option key={test.id} value={test.id}>
                  {test.title}
                </option>
              ))}
            </select>

            <button
              onClick={() => window.print()}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition active:scale-95 sm:text-sm"
            >
              🖨️ Chop etish
            </button>
          </div>
        </div>

        {/* 3D-styled Shohsupa (Podium top 3) */}
        {ranking.length >= 3 && (
          <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-4 border-b border-slate-100 pb-8 text-center items-end">
            {/* 2-o'rin (Kumush) */}
            <div className="glass-card rounded-2xl p-3 sm:p-4 border-slate-200">
              <div className="text-2xl sm:text-3xl float-badge" style={{ animationDelay: '0.4s' }}>🥈</div>
              <div className="mt-2 truncate text-xs font-black text-slate-900 sm:text-sm">{ranking[1].studentName}</div>
              <div className="text-xs font-extrabold text-blue-600 mt-0.5">{ranking[1].percentage}%</div>
              <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">2-o‘rin</span>
            </div>
            {/* 1-o'rin (Oltin) */}
            <div className="glass-panel rounded-3xl p-4 sm:p-5 border-amber-300 bg-gradient-to-b from-amber-50/90 to-white shadow-lg ring-2 ring-amber-300 transform -translate-y-2">
              <div className="text-3xl sm:text-4xl float-badge">🥇</div>
              <div className="mt-2 truncate text-xs font-black text-slate-900 sm:text-base">{ranking[0].studentName}</div>
              <div className="text-sm sm:text-lg font-black text-amber-600 mt-0.5">{ranking[0].percentage}%</div>
              <span className="mt-1 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-black text-amber-800">1-o‘rin 👑</span>
            </div>
            {/* 3-o'rin (Bronza) */}
            <div className="glass-card rounded-2xl p-3 sm:p-4 border-slate-200">
              <div className="text-2xl sm:text-3xl float-badge" style={{ animationDelay: '0.8s' }}>🥉</div>
              <div className="mt-2 truncate text-xs font-black text-slate-900 sm:text-sm">{ranking[2].studentName}</div>
              <div className="text-xs font-extrabold text-blue-600 mt-0.5">{ranking[2].percentage}%</div>
              <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">3-o‘rin</span>
            </div>
          </div>
        )}

        {/* Ro‘yxat */}
        <div className="mt-5 overflow-x-auto">
          {ranking.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400 font-medium">Hozircha natijalar mavjud emas.</p>
          ) : (
            <div className="space-y-2.5">
              {ranking.map((res, index) => (
                <div
                  key={res.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 text-xs sm:text-sm shadow-2xs hover:border-blue-200 transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black shadow-2xs ${
                        index === 0
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : index === 1
                          ? 'bg-slate-300 text-slate-800 font-bold'
                          : index === 2
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 font-bold'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-extrabold text-slate-900">{res.studentName}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{res.testTitle}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-blue-600 text-sm">{res.percentage}%</div>
                    <div className="text-[10px] text-slate-400 font-semibold">{res.score}/{res.totalQuestions} ball</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

// -------------------------------------------------------------
// Admin Boshqaruv Paneli
// -------------------------------------------------------------
function AdminDashboard({
  data,
  save,
  storageError,
  onLogout
}: {
  data: LocalData;
  save: (next: LocalData) => boolean;
  storageError: string;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'tests' | 'results' | 'create'>('tests');
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  // Muddat belgilash modal oynasi
  const [schedulingTest, setSchedulingTest] = useState<TestItem | null>(null);
  const [startsAtInput, setStartsAtInput] = useState('');
  const [deadlineAtInput, setDeadlineAtInput] = useState('');

  // Yangi test yaratish
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCode, setNewCode] = useState('');
  const [createDeadlineHours, setCreateDeadlineHours] = useState('5');
  const [createError, setCreateError] = useState('');

  const completedResults = data.results;
  const activeTestsCount = data.tests.filter((t) => isTestAvailable(t)).length;
  const averageScore = completedResults.length
    ? Math.round(completedResults.reduce((sum, r) => sum + r.percentage, 0) / completedResults.length)
    : 0;

  function closeTestImmediately(testId: number) {
    const updated = data.tests.map((item) =>
      item.id === testId
        ? { ...item, isActive: false, startsAt: null, openedAt: null, deadlineAt: null }
        : item
    );
    save({ ...data, tests: updated });
    setMessage('Test o‘quvchilardan yopildi.');
  }

  function openWithHours(testId: number, hours: number) {
    const now = Date.now();
    const startsAt = new Date(now).toISOString();
    const deadlineAt = new Date(now + hours * 3600 * 1000).toISOString();

    const updated = data.tests.map((item) =>
      item.id === testId
        ? {
            ...item,
            isActive: true,
            durationSeconds: hours * 3600,
            startsAt,
            openedAt: startsAt,
            deadlineAt
          }
        : item
    );
    save({ ...data, tests: updated });
    setSchedulingTest(null);
    setMessage(`Test ${hours} soatga muvaffaqiyatli ochildi! Yopilish vaqti: ${new Date(deadlineAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`);
  }

  function openWithCustomRange(e: FormEvent) {
    e.preventDefault();
    if (!schedulingTest) return;

    const startMs = startsAtInput ? new Date(startsAtInput).getTime() : Date.now();
    const endMs = deadlineAtInput ? new Date(deadlineAtInput).getTime() : 0;

    if (!endMs || endMs <= startMs) {
      alert('Yopilish vaqti boshlanish vaqtidan keyin bo‘lishi shart!');
      return;
    }

    const durationSeconds = Math.round((endMs - startMs) / 1000);
    const startsAt = new Date(startMs).toISOString();
    const deadlineAt = new Date(endMs).toISOString();

    const updated = data.tests.map((item) =>
      item.id === schedulingTest.id
        ? {
            ...item,
            isActive: true,
            durationSeconds,
            startsAt,
            openedAt: new Date(startMs).toISOString(),
            deadlineAt
          }
        : item
    );

    save({ ...data, tests: updated });
    setSchedulingTest(null);
    setStartsAtInput('');
    setDeadlineAtInput('');
    setMessage(`Test belgilangan vaqt oralig‘ida faollashtirildi (${new Date(startsAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} - ${new Date(deadlineAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}).`);
  }

  function handleCreateTest(e: FormEvent) {
    e.preventDefault();
    if (data.tests.some((t) => t.code.toLowerCase() === newCode.trim().toLowerCase())) {
      setCreateError('Bu test kodi avval ishlatilgan.');
      return;
    }

    const durationSeconds = Number(createDeadlineHours) * 3600;

    const newTest: TestItem = {
      id: Date.now(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      code: newCode.trim().toUpperCase(),
      category: 'custom',
      durationSeconds,
      isActive: false,
      startsAt: null,
      openedAt: null,
      deadlineAt: null,
      questions: []
    };

    save({ ...data, tests: [newTest, ...data.tests] });
    setNewTitle('');
    setNewDesc('');
    setNewCode('');
    setCreateError('');
    setActiveTab('tests');
    setMessage('Yangi test yaratildi! Uni istalgan vaqtda o‘quvchilarga ochishingiz mumkin.');
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `testgennis-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseLocalData(await file.text());
      if (save(parsed)) setMessage('Zaxira nusxasi tiklandi!');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Faylni o‘qib bo‘lmadi.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-60px)] max-w-5xl px-3 py-5 sm:px-6 sm:py-8 animate-page">
      {/* Statistika kartochkalari */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="glass-panel rounded-3xl p-3.5 shadow-sm sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Faol testlar</p>
          <p className="mt-1 text-2xl font-black text-blue-600 sm:text-4xl">{activeTestsCount}</p>
        </div>
        <div className="glass-panel rounded-3xl p-3.5 shadow-sm sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Topshirishlar</p>
          <p className="mt-1 text-2xl font-black text-emerald-600 sm:text-4xl">{completedResults.length}</p>
        </div>
        <div className="glass-panel rounded-3xl p-3.5 shadow-sm sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">O‘rtacha ball</p>
          <p className="mt-1 text-2xl font-black text-amber-600 sm:text-4xl">{averageScore}%</p>
        </div>
      </div>

      {message && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/90 p-3.5 text-xs font-bold text-blue-800 shadow-xs">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="underline">Yopish</button>
        </div>
      )}

      {storageError && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700">
          Xotira xatosi: {storageError}
        </div>
      )}

      {/* Admin amallar paneli */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3.5">
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveTab('tests')}
            className={`rounded-2xl px-4 py-2 text-xs font-extrabold transition active:scale-95 ${
              activeTab === 'tests' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Barcha testlar ({data.tests.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`rounded-2xl px-4 py-2 text-xs font-extrabold transition active:scale-95 ${
              activeTab === 'create' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ➕ Yangi test
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`rounded-2xl px-4 py-2 text-xs font-extrabold transition active:scale-95 ${
              activeTab === 'results' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Natijalar jurnali
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportData}
            className="rounded-2xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 shadow-2xs"
          >
            📥 Zaxira olish
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-2xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 shadow-2xs"
          >
            📤 Zaxirani yuklash
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" onChange={importData} className="hidden" />
        </div>
      </div>

      {/* Tab: Testlar ro‘yxati (Admin to‘liq ko‘radi) */}
      {activeTab === 'tests' && (
        <section className="mt-5 space-y-3.5">
          <div className="rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/50 p-4 text-xs font-medium text-slate-700 border border-blue-100">
            ℹ️ <b>Barcha testlar faqat sizga (admin) ko‘rinadi.</b> O‘quvchilarga faqat siz "O‘quvchilarga ochish" orqali vaqt belgilagan testlar ko‘rinadi. Muddat o‘tgach, test o‘quvchilar ekranidan avtomatik yo‘qoladi.
          </div>

          {data.tests.map((test) => {
            const isAvail = isTestAvailable(test);
            const isScheduled = test.startsAt && Date.parse(test.startsAt) > Date.now();
            const isExpired = test.deadlineAt && Date.parse(test.deadlineAt) <= Date.now();

            return (
              <article key={test.id} className="glass-panel rounded-3xl p-5 shadow-xs transition hover:shadow-md">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">{test.title}</h3>
                      {isAvail ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          O‘quvchilarga ko‘rinmoqda (Ochiq)
                        </span>
                      ) : isScheduled ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          Rejalashtirilgan
                        </span>
                      ) : isExpired ? (
                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                          Muddati tugagan (Yopiq)
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                          Yopiq (O‘quvchilarga ko‘rinmaydi)
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{test.description}</p>
                    <div className="mt-1.5 text-[11px] text-slate-400 font-semibold">
                      Kod: <b className="text-slate-700">{test.code}</b> · Savollar: <b>{test.questions.length} ta</b>
                    </div>

                    {/* Muddat tafsiloti */}
                    {isAvail && test.deadlineAt && (
                      <div className="mt-2 text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                        <span>⏳</span>
                        <span>Yopilish: {new Date(test.deadlineAt).toLocaleString('uz-UZ', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}</span>
                        <span className="text-amber-700">({formatRemainingTime(test.deadlineAt)})</span>
                      </div>
                    )}
                    {isScheduled && test.startsAt && test.deadlineAt && (
                      <div className="mt-2 text-xs font-bold text-amber-700">
                        🗓️ Reja: {new Date(test.startsAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} dan {new Date(test.deadlineAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} gacha
                      </div>
                    )}
                  </div>

                  {/* Boshqaruv tugmalari */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-0">
                    {isAvail ? (
                      <>
                        <button
                          onClick={() => closeTestImmediately(test.id)}
                          className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 active:scale-95"
                        >
                          🔴 O‘quvchilardan yopish
                        </button>
                        <button
                          onClick={() => {
                            setSchedulingTest(test);
                            setStartsAtInput(toLocalDateTimeInput(test.startsAt));
                            setDeadlineAtInput(toLocalDateTimeInput(test.deadlineAt));
                          }}
                          className="rounded-2xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95"
                        >
                          ⏱️ Muddatni o‘zgartirish
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setSchedulingTest(test);
                          const now = new Date();
                          setStartsAtInput(toLocalDateTimeInput(now.toISOString()));
                          setDeadlineAtInput(toLocalDateTimeInput(new Date(now.getTime() + 5 * 3600 * 1000).toISOString()));
                        }}
                        className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95"
                      >
                        🟢 O‘quvchilarga ochish (Vaqt qo‘yish)
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (window.confirm(`"${test.title}" testini o‘chirishni xohlaysizmi?`)) {
                          save({ ...data, tests: data.tests.filter((t) => t.id !== test.id) });
                        }
                      }}
                      className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-400 hover:bg-red-50 hover:text-red-600 active:scale-95"
                    >
                      O‘chirish
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Muddat belgilash Modal oynasi */}
      {schedulingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-page">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">⏰ O‘quvchilarga ochish va muddat belgilash</h3>
                <p className="mt-0.5 text-xs font-bold text-blue-600">{schedulingTest.title}</p>
              </div>
              <button
                onClick={() => setSchedulingTest(null)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* 1-variant: Tezkor muddatlar */}
            <div className="mt-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                ⚡ 1-usul: Tezkor muddat (hozirdan boshlab):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 5, 12, 24].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => openWithHours(schedulingTest.id, h)}
                    className={`rounded-2xl border p-3 text-xs font-extrabold transition active:scale-95 ${
                      h === 5
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-600/30'
                        : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {h} soat {h === 5 && '🌟 Tavsiya'}
                  </button>
                ))}
              </div>
            </div>

            <div className="my-5 border-t border-slate-100" />

            {/* 2-variant: Aniq soat oralig'i (masalan soat 10:00 dan 15:00 gacha) */}
            <form onSubmit={openWithCustomRange}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                📅 2-usul: Aniq vaqt oralig‘i (masalan 10:00 dan 15:00 gacha):
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">Boshlanish vaqti:</span>
                  <input
                    type="datetime-local"
                    value={startsAtInput}
                    onChange={(e) => setStartsAtInput(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 p-2.5 text-xs font-semibold outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">Yopilish vaqti:</span>
                  <input
                    required
                    type="datetime-local"
                    value={deadlineAtInput}
                    onChange={(e) => setDeadlineAtInput(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 p-2.5 text-xs font-semibold outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSchedulingTest(null)}
                  className="rounded-2xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
                >
                  Shu vaqt oralig‘ida ochish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Yangi test yaratish */}
      {activeTab === 'create' && (
        <section className="glass-panel mt-5 rounded-3xl p-6 shadow-sm sm:p-7">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Yangi test yaratish</h2>
          <p className="text-xs text-slate-500 mt-0.5">Test yaratilgach, uni admin panel orqali o‘zingiz xohlagan vaqtda ochasiz.</p>
          <form onSubmit={handleCreateTest} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Test nomi
                <input required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Masalan: Kasrlarni taqqoslash" className="mt-1.5 w-full rounded-2xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600" />
              </label>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Tavsif
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Qisqacha tavsif..." className="mt-1.5 w-full rounded-2xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600" />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Test kodi
                <input required value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="TAQQOS-01" className="mt-1.5 w-full rounded-2xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600" />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Boshlang‘ich muddat (soat)
                <input required type="number" min={1} max={720} value={createDeadlineHours} onChange={(e) => setCreateDeadlineHours(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600" />
              </label>
            </div>

            {createError && <p className="text-xs text-red-600 font-bold">{createError}</p>}
            <button className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-blue-500/35 active:scale-95">
              Testni saqlash 💾
            </button>
          </form>
        </section>
      )}

      {/* Tab: Natijalar jurnali */}
      {activeTab === 'results' && (
        <section className="glass-panel mt-5 rounded-3xl p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Topshirilgan testlar jurnali</h2>
          <div className="mt-4 space-y-2.5">
            {completedResults.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400 font-semibold">Natijalar mavjud emas.</p>
            ) : (
              [...completedResults].reverse().map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 text-xs sm:text-sm shadow-2xs">
                  <div>
                    <span className="font-extrabold text-slate-900">{r.studentName}</span>
                    <span className="ml-2 text-slate-500 font-medium">· {r.testTitle}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-blue-600">{r.score}/{r.totalQuestions} ({r.percentage}%)</span>
                    <div className="text-[10px] text-slate-400 font-semibold">{new Date(r.completedAt).toLocaleString('uz-UZ')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </main>
  );
}

// -------------------------------------------------------------
// Asosiy Ilova Marshrutlari (App Routing)
// -------------------------------------------------------------
function AppRoutes() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [data, setData] = useState<LocalData | null>(null);
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    setAdminToken(sessionStorage.getItem('testgennis-admin'));
    try {
      setData(loadLocalData());
    } catch (cause) {
      setStorageError(cause instanceof Error ? cause.message : 'Brauzer xotirasini o‘qib bo‘lmadi.');
      setData({ tests: [], results: [] });
    }
  }, []);

  function save(next: LocalData): boolean {
    try {
      saveLocalData(next);
      setData(next);
      setStorageError('');
      return true;
    } catch (cause) {
      setStorageError(cause instanceof Error ? cause.message : 'Brauzer xotirasiga yozib bo‘lmadi.');
      return false;
    }
  }

  function saveResult(result: TestResult) {
    return data ? save({ ...data, results: [...data.results, result] }) : false;
  }

  function logout() {
    sessionStorage.removeItem('testgennis-admin');
    setAdminToken(null);
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-slate-500">
        <div className="text-center animate-page">
          <div className="text-4xl animate-bounce">✨</div>
          <div className="mt-3 text-sm font-extrabold text-slate-800">TestGennis yuklanmoqda…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900">
      <NavigationHeader adminToken={adminToken} onLogout={logout} />
      <Routes>
        <Route path="/" element={<StudentPortal data={data} onSaveResult={saveResult} storageError={storageError} />} />
        <Route path="/take-test" element={<StudentPortal data={data} onSaveResult={saveResult} storageError={storageError} />} />
        <Route path="/ranking" element={<RankingView data={data} />} />
        <Route path="/admin/ranking" element={<RankingView data={data} />} />
        <Route
          path="/admin/*"
          element={
            adminToken ? (
              <AdminDashboard data={data} save={save} storageError={storageError} onLogout={logout} />
            ) : (
              <AdminLogin onLogin={setAdminToken} />
            )
          }
        />
        <Route path="*" element={<StudentPortal data={data} onSaveResult={saveResult} storageError={storageError} />} />
      </Routes>
    </div>
  );
}

export default function AppShell() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
