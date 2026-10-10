'use client';

import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';

type Student = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  telegramUserId?: number | null;
  isActive: boolean;
};

type TestItem = {
  id: number;
  title: string;
  description?: string | null;
  code: string;
  isActive: boolean;
  questions: { id: number }[];
};

type ResultItem = {
  id: number;
  student: { firstName: string; lastName: string; username: string };
  test: { title: string; code: string };
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  percentage: number;
  status: string;
  startedAt: string;
};

const API_BASE = '/api';

async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }

  return (await response.json()) as T;
}

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [telegramId, setTelegramId] = useState('1840817356');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch<{ token: string }>('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ telegramId, password })
      });
      localStorage.setItem('adminToken', response.token);
      onLogin(response.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">Admin panel</p>
          <h1 className="mt-3 text-3xl font-bold">TestGennis</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Telegram ID</label>
            <input
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Parol</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
            />
          </div>

          {error ? <p className="rounded-lg border border-rose-500 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Kirish...' : 'Kirish'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({ token }: { token: string }) {
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [studentForm, setStudentForm] = useState({ firstName: '', lastName: '', username: '', password: '' });
  const [testForm, setTestForm] = useState({ title: '', description: '', code: '', isActive: true, durationSeconds: '900' });

  const loadData = async () => {
    try {
      const [dashboard, studentList, testList, resultList] = await Promise.all([
        apiFetch<any>('/admin/dashboard', {}, token),
        apiFetch<Student[]>('/admin/students', {}, token),
        apiFetch<TestItem[]>('/admin/tests', {}, token),
        apiFetch<ResultItem[]>('/admin/results', {}, token)
      ]);
      setStats(dashboard);
      setStudents(studentList);
      setTests(testList);
      setResults(resultList);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreateStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiFetch('/admin/students', {
      method: 'POST',
      body: JSON.stringify(studentForm)
    }, token);
    setStudentForm({ firstName: '', lastName: '', username: '', password: '' });
    await loadData();
  };

  const handleCreateTest = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiFetch('/admin/tests', {
      method: 'POST',
      body: JSON.stringify({
        title: testForm.title,
        description: testForm.description,
        code: testForm.code,
        isActive: testForm.isActive,
        durationSeconds: Number(testForm.durationSeconds)
      })
    }, token);
    setTestForm({ title: '', description: '', code: '', isActive: true, durationSeconds: '900' });
    await loadData();
  };

  return (
    <div className="min-h-screen bg-slate-950 p-5 text-slate-100">
      <aside className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <div className="text-xl font-bold text-cyan-400">TestGennis</div>
        <nav className="ml-auto flex flex-wrap gap-3 text-sm">
          <Link className="rounded-lg bg-slate-800 px-3 py-2" to="/">Bosh sahifa</Link>
          <Link className="rounded-lg bg-slate-800 px-3 py-2" to="/students">O‘quvchilar</Link>
          <Link className="rounded-lg bg-slate-800 px-3 py-2" to="/tests">Testlar</Link>
          <Link className="rounded-lg bg-slate-800 px-3 py-2" to="/results">Natijalar</Link>
          <button
            className="rounded-lg border border-slate-600 px-3 py-2"
            onClick={() => {
              localStorage.removeItem('adminToken');
              window.location.reload();
            }}
          >
            Chiqish
          </button>
        </nav>
      </aside>

      <Routes>
        <Route
          path="/"
          element={
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                {[
                  ['Total Students', stats?.totalStudents ?? 0],
                  ['Active Students', stats?.activeStudents ?? 0],
                  ['Total Tests', stats?.totalTests ?? 0],
                  ['Completed Attempts', stats?.completedAttempts ?? 0],
                  ['Average Score', `${stats?.averageScore ?? 0}%`],
                  ['Recent Results', stats?.recentResults ?? 0]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-sm text-slate-400">{label}</p>
                    <h2 className="mt-3 text-3xl font-bold text-white">{value}</h2>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-4 text-lg font-semibold">Recent results</h3>
                <div className="space-y-3"> 
                  {(results ?? []).slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3 text-sm">
                      <span>{item.student.firstName} {item.student.lastName}</span>
                      <span>{item.test.title}</span>
                      <span>{item.score}/{item.totalQuestions}</span>
                      <span>{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }
        />

        <Route
          path="/students"
          element={
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-4 text-xl font-semibold">O‘quvchilar</h3>
                <div className="space-y-3">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between rounded-xl bg-slate-800 p-3">
                      <div>
                        <p className="font-medium">{student.firstName} {student.lastName}</p>
                        <p className="text-sm text-slate-400">{student.username}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${student.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {student.isActive ? 'Faol' : 'Nofaol'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-4 text-xl font-semibold">O‘quvchi qo‘shish</h3>
                <form className="space-y-4" onSubmit={handleCreateStudent}>
                  <input value={studentForm.firstName} onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })} placeholder="Ism" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                  <input value={studentForm.lastName} onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })} placeholder="Familiya" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                  <input value={studentForm.username} onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })} placeholder="Username" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                  <input value={studentForm.password} onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })} placeholder="Parol" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                  <button type="submit" className="w-full rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950">Saqlash</button>
                </form>
              </div>
            </div>
          }
        />

        <Route
          path="/tests"
          element={
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-4 text-xl font-semibold">Testlar</h3>
                <div className="space-y-3">
                  {tests.map((test) => (
                    <div key={test.id} className="rounded-xl bg-slate-800 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{test.title}</p>
                          <p className="text-sm text-slate-400">{test.code}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs ${test.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {test.isActive ? 'Faol' : 'Nofaol'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-4 text-xl font-semibold">Test yaratish</h3>
                <form className="space-y-4" onSubmit={handleCreateTest}>
                  <input value={testForm.title} onChange={(e) => setTestForm({ ...testForm, title: e.target.value })} placeholder="Test nomi" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                  <textarea value={testForm.description} onChange={(e) => setTestForm({ ...testForm, description: e.target.value })} placeholder="Tavsif" className="min-h-28 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                  <input value={testForm.code} onChange={(e) => setTestForm({ ...testForm, code: e.target.value })} placeholder="Maxfiy kod" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                  <input value={testForm.durationSeconds} onChange={(e) => setTestForm({ ...testForm, durationSeconds: e.target.value })} placeholder="Vaqt limiti (soniya)" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                  <button type="submit" className="w-full rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950">Saqlash</button>
                </form>
              </div>
            </div>
          }
        />

        <Route
          path="/results"
          element={
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <h3 className="mb-4 text-xl font-semibold">Natijalar</h3>
              <div className="space-y-3">
                {results.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-800 p-3 text-sm">
                    <span>{item.student.firstName} {item.student.lastName}</span>
                    <span>{item.test.title}</span>
                    <span>{item.score}/{item.totalQuestions}</span>
                    <span>{item.percentage}%</span>
                    <span>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default function AppShell() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('adminToken'));

  if (!token) return <AdminLogin onLogin={setToken} />;

  return <Dashboard token={token} />;
}
