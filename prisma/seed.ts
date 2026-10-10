import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

const adminTelegramId = BigInt(process.env.ADMIN_TELEGRAM_ID || '1840817356');

const tests = [
  {
    title: 'EKUB va EKUK',
    description: 'Eng katta umumiy bo’luvchi va eng kichik umumiy karrali topshiriqlar.',
    code: 'EKUB-7K29',
    isActive: true,
    durationSeconds: 900,
    questions: [
      { questionText: '12 va 18 sonlarining EKUBi nimaga teng?', optionA: '2', optionB: '3', optionC: '6', optionD: '12', correctAnswer: 'C', explanation: '12 va 18 ning umumiy bo’luvchilari 1, 2, 3, 6. Eng kattasi 6.' },
      { questionText: '24 va 36 sonlarining EKUKi nimaga teng?', optionA: '48', optionB: '60', optionC: '72', optionD: '96', correctAnswer: 'C', explanation: '24=2^3·3, 36=2^2·3^2, EKUK=2^3·3^2=72.' },
      { questionText: '15 va 20 sonlarining EKUBi qanday?', optionA: '5', optionB: '10', optionC: '15', optionD: '60', correctAnswer: 'A', explanation: '15 va 20 ning umumiy bo’luvchisi faqat 1 va 5.' },
      { questionText: '8 va 12 sonlarining EKUKi qanday?', optionA: '16', optionB: '24', optionC: '32', optionD: '48', correctAnswer: 'B', explanation: '8=2^3, 12=2^2·3. EKUK=2^3·3=24.' },
      { questionText: '30 va 45 sonlarining EKUBi nima?', optionA: '5', optionB: '10', optionC: '15', optionD: '30', correctAnswer: 'C', explanation: '30=2·3·5, 45=3^2·5. Umumiy bo’luvchi eng kattasi 15.' },
      { questionText: '18 va 27 sonlarining EKUKi nimaga teng?', optionA: '36', optionB: '54', optionC: '72', optionD: '90', correctAnswer: 'B', explanation: '18=2·3^2, 27=3^3. EKUK=2·3^3=54.' },
      { questionText: '14 va 21 sonlarining EKUBi qanday?', optionA: '1', optionB: '2', optionC: '3', optionD: '7', correctAnswer: 'D', explanation: '14=2·7, 21=3·7. EKUB=7.' },
      { questionText: '16 va 24 sonlarining EKUKi nima?', optionA: '32', optionB: '48', optionC: '64', optionD: '96', correctAnswer: 'B', explanation: '16=2^4, 24=2^3·3. EKUK=2^4·3=48.' },
      { questionText: '9 va 15 sonlarining EKUBi qancha?', optionA: '1', optionB: '3', optionC: '5', optionD: '9', correctAnswer: 'B', explanation: '9=3^2, 15=3·5. EKUB=3.' },
      { questionText: '10 va 25 sonlarining EKUKi nimaga teng?', optionA: '25', optionB: '50', optionC: '75', optionD: '100', correctAnswer: 'B', explanation: '10=2·5, 25=5^2. EKUK=2·5^2=50.' },
      { questionText: '21 va 35 sonlarining EKUBi nima?', optionA: '3', optionB: '5', optionC: '7', optionD: '21', correctAnswer: 'C', explanation: '21=3·7, 35=5·7. EKUB=7.' },
      { questionText: '28 va 42 sonlarining EKUKi qanday?', optionA: '42', optionB: '56', optionC: '84', optionD: '126', correctAnswer: 'C', explanation: '28=2^2·7, 42=2·3·7. EKUK=2^2·3·7=84.' },
      { questionText: '6 va 15 sonlarining EKUBi qancha?', optionA: '1', optionB: '2', optionC: '3', optionD: '5', correctAnswer: 'C', explanation: '6=2·3, 15=3·5. Umumiy eng katta bo’luvchi 3.' },
      { questionText: '32 va 40 sonlarining EKUBi nimaga teng?', optionA: '4', optionB: '8', optionC: '16', optionD: '20', correctAnswer: 'B', explanation: '32=2^5, 40=2^3·5. EKUB=2^3=8.' },
      { questionText: '27 va 45 sonlarining EKUKi nima?', optionA: '45', optionB: '54', optionC: '81', optionD: '135', correctAnswer: 'D', explanation: '27=3^3, 45=3^2·5. EKUK=3^3·5=135.' }
    ]
  },
  {
    title: 'Kasrlarni qo\'shish va ayirish',
    description: 'Kasrlarni umumiy maxrajga keltirish va qo’shish, ayirish.',
    code: 'KASR-82LM',
    isActive: true,
    durationSeconds: 900,
    questions: [
      { questionText: '1/3 + 1/6 = ?', optionA: '1/2', optionB: '2/3', optionC: '1/6', optionD: '1/3', correctAnswer: 'A', explanation: '1/3 = 2/6, 2/6 + 1/6 = 3/6 = 1/2.' },
      { questionText: '3/4 - 1/8 = ?', optionA: '1/2', optionB: '5/8', optionC: '7/8', optionD: '1/4', correctAnswer: 'B', explanation: '3/4 = 6/8, 6/8 - 1/8 = 5/8.' },
      { questionText: '2/5 + 1/10 = ?', optionA: '3/10', optionB: '1/2', optionC: '2/10', optionD: '5/10', correctAnswer: 'B', explanation: '2/5 = 4/10, 4/10 + 1/10 = 5/10 = 1/2.' },
      { questionText: '5/6 - 1/3 = ?', optionA: '1/2', optionB: '1/3', optionC: '2/3', optionD: '1/6', correctAnswer: 'A', explanation: '1/3 = 2/6, 5/6 - 2/6 = 3/6 = 1/2.' },
      { questionText: '7/12 + 1/6 = ?', optionA: '3/4', optionB: '5/6', optionC: '7/6', optionD: '2/3', correctAnswer: 'A', explanation: '1/6 = 2/12, 7/12 + 2/12 = 9/12 = 3/4.' },
      { questionText: '5/8 - 1/4 = ?', optionA: '3/8', optionB: '1/2', optionC: '1/4', optionD: '7/8', correctAnswer: 'A', explanation: '1/4 = 2/8, 5/8 - 2/8 = 3/8.' },
      { questionText: '1/2 + 3/8 = ?', optionA: '5/8', optionB: '7/8', optionC: '1/4', optionD: '9/8', correctAnswer: 'B', explanation: '1/2 = 4/8, 4/8 + 3/8 = 7/8.' },
      { questionText: '9/10 - 2/5 = ?', optionA: '1/2', optionB: '3/10', optionC: '1/10', optionD: '4/5', correctAnswer: 'A', explanation: '2/5 = 4/10, 9/10 - 4/10 = 5/10 = 1/2.' },
      { questionText: '3/5 + 2/15 = ?', optionA: '11/15', optionB: '5/15', optionC: '6/15', optionD: '13/15', correctAnswer: 'A', explanation: '3/5 = 9/15, 9/15 + 2/15 = 11/15.' },
      { questionText: '7/9 - 1/3 = ?', optionA: '4/9', optionB: '2/3', optionC: '5/9', optionD: '8/9', correctAnswer: 'A', explanation: '1/3 = 3/9, 7/9 - 3/9 = 4/9.' },
      { questionText: '2/3 + 1/9 = ?', optionA: '5/9', optionB: '7/9', optionC: '8/9', optionD: '4/9', correctAnswer: 'B', explanation: '2/3 = 6/9, 6/9 + 1/9 = 7/9.' },
      { questionText: '11/12 - 1/4 = ?', optionA: '2/3', optionB: '7/12', optionC: '3/4', optionD: '5/6', correctAnswer: 'A', explanation: '1/4 = 3/12, 11/12 - 3/12 = 8/12 = 2/3.' },
      { questionText: '1/4 + 1/3 = ?', optionA: '7/12', optionB: '5/12', optionC: '1/2', optionD: '2/3', correctAnswer: 'A', explanation: '1/4 = 3/12, 1/3 = 4/12; total 7/12.' },
      { questionText: '5/6 - 1/2 = ?', optionA: '1/3', optionB: '2/3', optionC: '1/6', optionD: '3/6', correctAnswer: 'A', explanation: '1/2 = 3/6, 5/6 - 3/6 = 2/6 = 1/3.' },
      { questionText: '3/4 + 1/12 = ?', optionA: '5/6', optionB: '2/3', optionC: '7/12', optionD: '1/2', correctAnswer: 'A', explanation: '3/4 = 9/12, 9/12 + 1/12 = 10/12 = 5/6.' }
    ]
  },
  {
    title: 'Kasrlarni ko\'paytirish va bo\'lish',
    description: 'Kasrlarni ko’paytirish va bo’lish amallari.',
    code: 'KASR2-X72P',
    isActive: true,
    durationSeconds: 900,
    questions: [
      { questionText: '2/3 × 3/4 = ?', optionA: '1/2', optionB: '1/3', optionC: '3/4', optionD: '2/5', correctAnswer: 'A', explanation: '2/3 × 3/4 = 6/12 = 1/2.' },
      { questionText: '5/6 ÷ 1/3 = ?', optionA: '2/5', optionB: '5/2', optionC: '1/2', optionD: '3/10', correctAnswer: 'B', explanation: '5/6 ÷ 1/3 = 5/6 × 3 = 15/6 = 5/2.' },
      { questionText: '3/5 × 5/9 = ?', optionA: '1/3', optionB: '3/9', optionC: '1/2', optionD: '2/3', correctAnswer: 'A', explanation: '15/45 = 1/3.' },
      { questionText: '7/8 ÷ 7/4 = ?', optionA: '1/2', optionB: '1/4', optionC: '2', optionD: '4', correctAnswer: 'A', explanation: '7/8 × 4/7 = 4/8 = 1/2.' },
      { questionText: '4/7 × 14/15 = ?', optionA: '8/15', optionB: '2/3', optionC: '1/2', optionD: '7/15', correctAnswer: 'A', explanation: '56/105 = 8/15.' },
      { questionText: '9/10 ÷ 3/5 = ?', optionA: '1/2', optionB: '3/2', optionC: '5/6', optionD: '2/3', correctAnswer: 'B', explanation: '9/10 × 5/3 = 45/30 = 3/2.' },
      { questionText: '2/5 × 10/3 = ?', optionA: '4/3', optionB: '3/4', optionC: '2/3', optionD: '1/3', correctAnswer: 'A', explanation: '20/15 = 4/3.' },
      { questionText: '3/4 ÷ 1/2 = ?', optionA: '3/2', optionB: '3/4', optionC: '1/2', optionD: '2/3', correctAnswer: 'A', explanation: '3/4 × 2 = 6/4 = 3/2.' },
      { questionText: '1/6 × 3/5 = ?', optionA: '1/10', optionB: '1/5', optionC: '1/3', optionD: '3/10', correctAnswer: 'A', explanation: '3/30 = 1/10.' },
      { questionText: '8/9 ÷ 2/3 = ?', optionA: '4/3', optionB: '3/4', optionC: '1/2', optionD: '4/9', correctAnswer: 'A', explanation: '8/9 × 3/2 = 24/18 = 4/3.' },
      { questionText: '5/8 × 4/5 = ?', optionA: '1/2', optionB: '1/3', optionC: '2/3', optionD: '3/4', correctAnswer: 'A', explanation: '20/40 = 1/2.' },
      { questionText: '9/14 ÷ 3/7 = ?', optionA: '3/2', optionB: '2/3', optionC: '1/2', optionD: '3/4', correctAnswer: 'A', explanation: '9/14 × 7/3 = 63/42 = 3/2.' },
      { questionText: '4/9 × 3/2 = ?', optionA: '2/3', optionB: '4/3', optionC: '1/2', optionD: '5/3', correctAnswer: 'A', explanation: '12/18 = 2/3.' },
      { questionText: '15/16 ÷ 5/8 = ?', optionA: '3/2', optionB: '5/4', optionC: '1/2', optionD: '2/3', correctAnswer: 'A', explanation: '15/16 × 8/5 = 120/80 = 3/2.' },
      { questionText: '7/10 × 5/14 = ?', optionA: '1/4', optionB: '1/2', optionC: '3/4', optionD: '2/3', correctAnswer: 'A', explanation: '35/140 = 1/4.' }
    ]
  }
];

async function main() {
  await prisma.admin.upsert({
    where: { telegramId: adminTelegramId },
    update: { username: 'admin' },
    create: {
      telegramId: adminTelegramId,
      username: 'admin'
    }
  });

  for (const test of tests) {
    const created = await prisma.test.upsert({
      where: { code: test.code },
      update: {
        title: test.title,
        description: test.description,
        isActive: test.isActive,
        durationSeconds: test.durationSeconds
      },
      create: {
        title: test.title,
        description: test.description,
        code: test.code,
        isActive: test.isActive,
        durationSeconds: test.durationSeconds
      }
    });

    const existingQuestions = await prisma.question.findMany({
      where: { testId: created.id },
      select: { id: true }
    });

    if (existingQuestions.length === 0) {
      await prisma.question.createMany({
        data: test.questions.map((q, index) => ({
          testId: created.id,
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          order: index + 1
        }))
      });
    }
  }

  const studentSeed = [
    { firstName: 'Ali', lastName: 'Valiyev', username: 'student_001', password: 'K7mP29xQ' },
    { firstName: 'Zarina', lastName: 'Nazarova', username: 'student_002', password: 'M4qT71sP' },
    { firstName: 'Javlon', lastName: 'Karimov', username: 'student_003', password: 'P9xL32wN' }
  ];

  for (const student of studentSeed) {
    await prisma.student.upsert({
      where: { username: student.username },
      update: { firstName: student.firstName, lastName: student.lastName, isActive: true },
      create: {
        firstName: student.firstName,
        lastName: student.lastName,
        username: student.username,
        passwordHash: hashSync(student.password, 12)
      }
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
