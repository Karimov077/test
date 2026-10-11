# TestGennis - Matematika Testlari va Mashq Portali

Loyiha oddiy kasrlar ustida amallar (qo‘shish, ayirish, ko‘paytirish, bo‘lish), aralash sonlar va kasrli sodda matnli masalalarni o‘rganuvchi 5-6 sinf o‘quvchilari uchun maxsus ishlab chiqilgan.
Sayt to‘liq **mobil telefonlarga moslashtirilgan** (Mobile-First responsive dizayn).

## Asosiy imkoniyatlar

1. **8 ta to‘liq sinov va mashg‘ulot to‘plami (Jami 160 ta savol)**:
   - ➕➖ **Oddiy kasrlarni qo‘shish va ayirish** (20 ta savol)
   - ✖️➗ **Kasrlarni ko‘paytirish va bo‘lish** (20 ta savol)
   - 🍰 **Aralash sonlar ustida amallar** (20 ta savol)
   - 📖 **Matnli masalalar: Sonning kasrini topish** (20 ta savol)
   - 🔍 **Matnli masalalar: Qoldiq va ayirmani topish** (20 ta savol)
   - 🎯 **Matnli masalalar: Kasriga ko‘ra butun sonni topish** (20 ta savol)
   - 🛒 **Matnli masalalar: Amaliy hayotiy hisoblar** (20 ta savol)
   - 🔢 **EKUB va EKUK** (Kasr maxraji asosi, 20 ta savol)

2. **Telefonlar uchun qulay UI (Mobile UX)**:
   - Maxsus stacked math fraction renderlash (masalan $\frac{1}{4} + \frac{2}{4}$ ko‘rinishida o‘qish juda qulay).
   - O‘quvchi ismi bir marta kiritilsa brauzerda avtomatik eslab qolinadi.
   - Test jarayonida tepada yopishqoq taymer va savollarga tez o‘tish tugmalari (1 dan 20 gacha).
   - Pastda doim ko‘rinib turuvchi "Oldingi", "Keyingi" va "Yakunlash" tugmalari.
   - Natija chiqqandan so‘ng har bir savol bo‘yicha to‘liq yechim va tushuntirish ko‘rsatiladi.

3. **Reyting va Admin boshqaruvi**:
   - `Reyting` sahifasida eng yuqori natijalar (1, 2, 3-o‘rinlar oltin, kumush, bronza medallari bilan).
   - Admin panel (`/admin`) orqali testlarni yoqish/o‘chirish, muddat belgilash, zaxira nusxa (JSON) olish va tiklash.

## Ishga tushirish

```powershell
npm install
npm run dev
```

Brauzerda `http://localhost:3000` manzilini oching.

## Tekshirish va build

```powershell
npm run typecheck
npm run build
```
