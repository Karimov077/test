import TelegramBot from 'node-telegram-bot-api';
import { prisma } from './prisma';
import { hashSync, compareSync } from 'bcryptjs';

const chatSessions = new Map<number, number>();
const loginStates = new Map<number, { step: 'username' | 'password' }>();
const activeTestStates = new Map<number, { attemptId: number; testId: number; currentIndex: number; questions: Array<{ id: number; questionText: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string }> }>();

const optionLetters = ['A', 'B', 'C', 'D'];

function buildQuestionKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'A', callback_data: 'answer:A' },
          { text: 'B', callback_data: 'answer:B' },
          { text: 'C', callback_data: 'answer:C' },
          { text: 'D', callback_data: 'answer:D' }
        ]
      ]
    }
  };
}

function getStudentFromChat(chatId: number) {
  const studentId = chatSessions.get(chatId);
  if (!studentId) return null;
  return prisma.student.findUnique({ where: { id: studentId } });
}

async function sendMainMenu(bot: TelegramBot, chatId: number) {
  await bot.sendMessage(chatId, 'Assalomu alaykum. Test ishlash uchun tanlang:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📝 Test ishlash', callback_data: 'menu_test' }],
        [{ text: '📊 Natijalarim', callback_data: 'menu_results' }],
        [{ text: '🚪 Chiqish', callback_data: 'menu_logout' }]
      ]
    }
  });
}

async function showResults(bot: TelegramBot, chatId: number, studentId: number) {
  const attempts: Array<{ test: { title: string }; score: number; totalQuestions: number; percentage: number }> = await prisma.testAttempt.findMany({
    where: { studentId, status: 'COMPLETED' },
    include: { test: true },
    orderBy: { completedAt: 'desc' }
  }) as Array<{ test: { title: string }; score: number; totalQuestions: number; percentage: number }>;

  if (!attempts.length) {
    await bot.sendMessage(chatId, '📊 Sizning natijalar mavjud emas.');
    return;
  }

  const lines = attempts.map((attempt: { test: { title: string }; score: number; totalQuestions: number; percentage: number }, index: number) => `${index + 1}. ${attempt.test.title} — ${attempt.score}/${attempt.totalQuestions} (${attempt.percentage}%)`);
  await bot.sendMessage(chatId, `📊 NATIJALARIM\n\n${lines.join('\n')}`);
}

async function showQuestion(bot: TelegramBot, chatId: number, attemptId: number, testId: number, currentIndex: number, questions: Array<{ id: number; questionText: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string }>) {
  const question = questions[currentIndex];
  if (!question) return;

  const text = `${currentIndex + 1}/${questions.length}\n\n${question.questionText}\n\nA) ${question.optionA}\nB) ${question.optionB}\nC) ${question.optionC}\nD) ${question.optionD}`;

  await bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'A) ' + question.optionA, callback_data: `answer:${attemptId}:${question.id}:A` },
          { text: 'B) ' + question.optionB, callback_data: `answer:${attemptId}:${question.id}:B` }
        ],
        [
          { text: 'C) ' + question.optionC, callback_data: `answer:${attemptId}:${question.id}:C` },
          { text: 'D) ' + question.optionD, callback_data: `answer:${attemptId}:${question.id}:D` }
        ]
      ]
    }
  });

  activeTestStates.set(chatId, { attemptId, testId, currentIndex, questions });
}

async function finalizeAttempt(bot: TelegramBot, chatId: number, attemptId: number) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: true,
      answers: { include: { question: true } }
    }
  });

  if (!attempt) return;

  const wrongAnswers = attempt.answers.filter((answer: (typeof attempt.answers)[number]) => !answer.isCorrect);
  const message = [
    '🎉 TEST YAKUNLANDI',
    '',
    `Test: ${attempt.test.title}`,
    '',
    `Natija: ${attempt.score} / ${attempt.totalQuestions}`,
    `Foiz: ${attempt.percentage}%`,
    `✅ To\'g\'ri: ${attempt.correctAnswers}`,
    `❌ Noto\'g\'ri: ${attempt.wrongAnswers}`
  ].join('\n');

  await bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [[{ text: '📊 Natijani ko\'rish', callback_data: 'show_results' }]]
    }
  });

  if (wrongAnswers.length === 0) {
    await bot.sendMessage(chatId, '🎉 Barcha savollar to\'g\'ri!');
    return;
  }

  const detailed = wrongAnswers
    .map((answer: (typeof wrongAnswers)[number]) => {
      return `\n❌ ${answer.question.questionText}\nSizning javobingiz: ${answer.selectedAnswer}\nTo\'g\'ri javob: ${answer.question.correctAnswer}`;
    })
    .join('\n\n');

  await bot.sendMessage(chatId, `❌ XATOLAR\n${detailed}`);
  activeTestStates.delete(chatId);
}

export function createTelegramBot() {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return null;
  }

  const bot = new TelegramBot(botToken);

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const student = await getStudentFromChat(chatId);
    if (!student) {
      await bot.sendMessage(chatId, 'Assalomu alaykum. Test ishlash uchun avval /login orqali tizimga kiring.');
      return;
    }

    await sendMainMenu(bot, chatId);
  });

  bot.onText(/\/login/, async (msg) => {
    const chatId = msg.chat.id;
    loginStates.set(chatId, { step: 'username' });
    await bot.sendMessage(chatId, 'Loginni kiriting:');
  });

  bot.onText(/\/test/, async (msg) => {
    const chatId = msg.chat.id;
    const student = await getStudentFromChat(chatId);
    if (!student) {
      await bot.sendMessage(chatId, 'Assalomu alaykum. Test ishlash uchun avval /login orqali tizimga kiring.');
      return;
    }

    await bot.sendMessage(chatId, 'Test kodini kiriting:');
  });

  bot.onText(/\/result/, async (msg) => {
    const chatId = msg.chat.id;
    const student = await getStudentFromChat(chatId);
    if (!student) {
      await bot.sendMessage(chatId, 'Assalomu alaykum. Test ishlash uchun avval /login orqali tizimga kiring.');
      return;
    }

    await showResults(bot, chatId, student.id);
  });

  bot.onText(/\/logout/, async (msg) => {
    const chatId = msg.chat.id;
    chatSessions.delete(chatId);
    loginStates.delete(chatId);
    activeTestStates.delete(chatId);
    await bot.sendMessage(chatId, '✅ Tizimdan chiqdingiz.');
  });

  bot.onText(/\/help/, async (msg) => {
    await bot.sendMessage(msg.chat.id, 'Mavjud buyruqlar:\n/start\n/login\n/test\n/result\n/help\n/logout');
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const data = query.data || '';
    if (!chatId) return;

    if (data === 'menu_test') {
      await bot.sendMessage(chatId, 'Test kodini kiriting:');
      return;
    }

    if (data === 'menu_results') {
      const student = await getStudentFromChat(chatId);
      if (!student) {
        await bot.sendMessage(chatId, 'Assalomu alaykum. Test ishlash uchun avval /login orqali tizimga kiring.');
        return;
      }
      await showResults(bot, chatId, student.id);
      return;
    }

    if (data === 'menu_logout') {
      chatSessions.delete(chatId);
      await bot.sendMessage(chatId, '✅ Tizimdan chiqdingiz.');
      return;
    }

    if (data === 'show_results') {
      const student = await getStudentFromChat(chatId);
      if (!student) return;
      await showResults(bot, chatId, student.id);
      return;
    }

    if (data.startsWith('answer:')) {
      const [, attemptIdText, questionIdText, selectedAnswer] = data.split(':');
      const attemptId = Number(attemptIdText);
      const questionId = Number(questionIdText);
      const currentState = activeTestStates.get(chatId);

      if (!currentState || !attemptId || !questionId || !selectedAnswer) {
        return;
      }

      const question = currentState.questions[currentState.currentIndex];
      if (!question || question.id !== questionId) {
        return;
      }

      const isCorrect = selectedAnswer === question.correctAnswer;
      await prisma.answer.upsert({
        where: {
          attemptId_questionId: { attemptId, questionId }
        },
        update: {
          selectedAnswer,
          isCorrect
        },
        create: {
          attemptId,
          questionId,
          selectedAnswer,
          isCorrect
        }
      });

      const attempt = await prisma.testAttempt.findUnique({
        where: { id: attemptId },
        include: { test: { include: { questions: { orderBy: { order: 'asc' } } } } }
      });

      if (!attempt) return;

      const answeredCount = await prisma.answer.count({ where: { attemptId } });
      const correctAnswers = await prisma.answer.count({ where: { attemptId, isCorrect: true } });
      const wrongAnswers = answeredCount - correctAnswers;
      const percentage = Math.round((correctAnswers / Math.max(attempt.totalQuestions, 1)) * 100);

      await prisma.testAttempt.update({
        where: { id: attemptId },
        data: {
          score: correctAnswers,
          correctAnswers,
          wrongAnswers,
          percentage,
          status: currentState.currentIndex + 1 >= currentState.questions.length ? 'COMPLETED' : 'IN_PROGRESS'
        }
      });

      const nextIndex = currentState.currentIndex + 1;
      if (nextIndex >= currentState.questions.length) {
        await prisma.testAttempt.update({
          where: { id: attemptId },
          data: {
            completedAt: new Date(),
            totalQuestions: currentState.questions.length,
            status: 'COMPLETED'
          }
        });

        await finalizeAttempt(bot, chatId, attemptId);
        return;
      }

      const nextState = { ...currentState, currentIndex: nextIndex };
      activeTestStates.set(chatId, nextState);
      await showQuestion(bot, chatId, attemptId, currentState.testId, nextIndex, currentState.questions);
      return;
    }

    if (data.startsWith('start_test:')) {
      const testId = Number(data.split(':')[1]);
      const student = await getStudentFromChat(chatId);
      if (!student) return;

      const existingAttempt = await prisma.testAttempt.findFirst({
        where: { studentId: student.id, testId, status: 'IN_PROGRESS' },
        include: { test: { include: { questions: { orderBy: { order: 'asc' } } } } }
      });

      const attempt = existingAttempt || (await prisma.testAttempt.create({
        data: {
          studentId: student.id,
          testId,
          totalQuestions: 0,
          score: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          percentage: 0,
          status: 'IN_PROGRESS'
        }
      }));

      const questions = await prisma.question.findMany({
        where: { testId },
        orderBy: { order: 'asc' }
      });

      await prisma.testAttempt.update({
        where: { id: attempt.id },
        data: {
          totalQuestions: questions.length,
          status: 'IN_PROGRESS'
        }
      });

      await showQuestion(bot, chatId, attempt.id, testId, 0, questions);
      return;
    }

    await bot.answerCallbackQuery(query.id, { text: 'Xatolik' });
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();
    if (!text) return;

    const loginStateData = loginStates.get(chatId);
    if (loginStateData?.step === 'username') {
      const student = await prisma.student.findUnique({ where: { username: text } });
      if (!student || !student.isActive) {
        await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi yoki faol emas.');
        loginStates.delete(chatId);
        return;
      }

      loginStates.set(chatId, { step: 'password' });
      // store temp username in state
      const nextState = loginStates.get(chatId) as { step: 'password'; username?: string };
      nextState.username = text;
      await bot.sendMessage(chatId, 'Parolni kiriting:');
      return;
    }

    if (loginStateData?.step === 'password') {
      const enteredUsername = (loginStates.get(chatId) as { username?: string } | undefined)?.username;
      if (!enteredUsername) {
        await bot.sendMessage(chatId, '❌ Login jarayoni bekor qilindi. /login qayta ishlatishingiz mumkin.');
        loginStates.delete(chatId);
        return;
      }

      const student = await prisma.student.findUnique({ where: { username: enteredUsername } });
      if (!student || !student.isActive) {
        await bot.sendMessage(chatId, '❌ Login yoki parol noto\'g\'ri.');
        loginStates.delete(chatId);
        return;
      }

      const validPassword = compareSync(text, student.passwordHash);
      if (!validPassword) {
        await bot.sendMessage(chatId, '❌ Login yoki parol noto\'g\'ri.');
        loginStates.delete(chatId);
        return;
      }

      chatSessions.set(chatId, student.id);
      await prisma.student.update({
        where: { id: student.id },
        data: { telegramUserId: BigInt(chatId) }
      });
      loginStates.delete(chatId);
      await bot.sendMessage(chatId, '✅ Muvaffaqiyatli kirdingiz.\n\nEndi test kodini yuboring.');
      return;
    }

    if (text.startsWith('/')) {
      return;
    }

    if (text && !loginStates.has(chatId)) {
      const currentState = activeTestStates.get(chatId);
      if (currentState) {
        return;
      }
    }

    if (text) {
      const student = await getStudentFromChat(chatId);
      if (!student) {
        await bot.sendMessage(chatId, 'Assalomu alaykum. Test ishlash uchun avval /login orqali tizimga kiring.');
        return;
      }

      const test = await prisma.test.findUnique({
        where: { code: text.trim() },
        include: { questions: { orderBy: { order: 'asc' } } }
      });

      if (!test) {
        await bot.sendMessage(chatId, '❌ Test kodi noto\'g\'ri yoki mavjud emas.');
        return;
      }

      if (!test.isActive) {
        await bot.sendMessage(chatId, '❌ Bu test hozir faol emas.');
        return;
      }

      await bot.sendMessage(chatId, `✅ Test topildi.\n\nTest: ${test.title}\nSavollar: ${test.questions.length}\n\nTestni boshlash uchun quyidagi tugmani bosing.`, {
        reply_markup: {
          inline_keyboard: [[{ text: '▶️ Testni boshlash', callback_data: `start_test:${test.id}` }]]
        }
      });
    }
  });

  return bot;
}

export async function validateStudentCredentials(username: string, password: string) {
  const student = await prisma.student.findUnique({ where: { username } });
  if (!student || !student.isActive) {
    return null;
  }

  const validPassword = compareSync(password, student.passwordHash);
  if (!validPassword) {
    return null;
  }

  return student;
}

export async function createStudentAccount(input: { firstName: string; lastName: string; username?: string; password?: string }) {
  const username = input.username || `student_${Math.floor(1000 + Math.random() * 9000)}`;
  const password = input.password || Array.from({ length: 8 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('');
  const student = await prisma.student.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      username,
      passwordHash: hashSync(password, 12)
    }
  });

  return { ...student, password };
}
