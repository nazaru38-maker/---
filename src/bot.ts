import { Telegraf, Markup, Context } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const MANAGER_CHAT_ID = process.env.MANAGER_CHAT_ID;
const CHANNEL_URL = process.env.CHANNEL_URL;
const MANAGER_USERNAME = process.env.MANAGER_USERNAME;

if (!BOT_TOKEN) {
  throw new Error("❌ BOT_TOKEN не знайдено у файлі .env");
}

if (!MANAGER_CHAT_ID) {
  throw new Error("❌ MANAGER_CHAT_ID не знайдено у файлі .env");
}

if (!CHANNEL_URL) {
  throw new Error("❌ CHANNEL_URL не знайдено у файлі .env");
}

const bot = new Telegraf(BOT_TOKEN);

// ========================================
// ТИПИ
// ========================================

type RequestType =
  | "order"
  | "future"
  | "manager"
  | null;

interface UserData {
  type: RequestType;
  step: number;

  car?: string;
  year?: string;
  budget?: string;
  fuel?: string;
  damage?: string;

  date?: string;

  name?: string;
  phone?: string;
}

// Тимчасове зберігання заявок
const users = new Map<number, UserData>();

// ========================================
// ГОЛОВНЕ МЕНЮ
// ========================================

function mainMenu() {
  return Markup.keyboard([
    ["🚗 Замовити машину з США"],
    ["📅 Планую замовити машину з США"],
    ["🚘 Машини в продажі"],
    ["👨‍💼 Зв'язок з менеджером"]
  ]).resize();
}

// ========================================
// КНОПКА СКАСУВАННЯ
// ========================================

function cancelMenu() {
  return Markup.keyboard([
    ["❌ Скасувати"]
  ]).resize();
}

// ========================================
// /START
// ========================================

bot.start(async (ctx) => {
  users.delete(ctx.from.id);

  await ctx.reply(
    `🇺🇸 Вітаємо!

Допоможемо придбати та доставити якісний автомобіль з аукціонів США(Copart, IAAI)"під ключ".


Оберіть потрібний розділ 👇`,
    mainMenu()
  );
});

// ========================================
// 1. ЗАМОВИТИ МАШИНУ З США
// ========================================

bot.hears("🚗 Замовити машину з США", async (ctx) => {
  users.set(ctx.from.id, {
    type: "order",
    step: 1
  });

  await ctx.reply(
    `🚗 Замовлення машини з США

Напишіть, яку машину ви хочете придбати.

`,
    cancelMenu()
  );
});

// ========================================
// 1.1 ОБРОБКА ЗАМОВЛЕННЯ
// ========================================

async function handleOrder(
  ctx: Context,
  data: UserData,
  text: string
) {
  const userId = ctx.from!.id;

  // Автомобіль
  if (data.step === 1) {
    data.car = text;
    data.step = 2;

    await ctx.reply(
      `📅 Який рік автомобіля вас цікавить?

`,
      cancelMenu()
    );

    return;
  }

  // Рік
  if (data.step === 2) {
    data.year = text;
    data.step = 3;

    await ctx.reply(
      `💰 Який орієнтовний бюджет?
`,
      cancelMenu()
    );

    return;
  }

  // Бюджет
  if (data.step === 3) {
    data.budget = text;
    data.step = 4;

    await ctx.reply(
      `⛽ Який тип пального вас цікавить?

`,
      cancelMenu()
    );

    return;
  }

  // Ім'я
  if (data.step === 6) {
    data.name = text;
    data.step = 7;

    await ctx.reply(
      `📞 Вкажіть номер телефону:

Наприклад:
+380XXXXXXXXX`,
      cancelMenu()
    );

    return;
  }

  // Телефон
  if (data.step === 7) {
    data.phone = text;

    const user = ctx.from!;

    const managerMessage = `
🚗 НОВА ЗАЯВКА — ЗАМОВЛЕННЯ АВТО З США

👤 Ім'я: ${data.name}
📞 Телефон: ${data.phone}

🚘 Автомобіль: ${data.car}
📅 Рік: ${data.year}
💰 Бюджет: ${data.budget}
⛽ Паливо: ${data.fuel}
🛠️ Пошкодження: ${data.damage}

💬 Telegram:
@${user.username || "немає username"}

🆔 Telegram ID:
${user.id}
`;

    await bot.telegram.sendMessage(
      MANAGER_CHAT_ID!,
      managerMessage
    );

    users.delete(userId);

    await ctx.reply(
      `✅ Дякуємо!

Вашу заявку отримано.

Менеджер зв'яжеться з вами найближчим часом.`,
      mainMenu()
    );
  }
}

// ========================================
// 2. ПЛАНУЮ ЗАМОВИТИ
// ========================================

bot.hears(
  "📅 Планую замовити машину з США",
  async (ctx) => {
    users.set(ctx.from.id, {
      type: "future",
      step: 1
    });

    await ctx.reply(
      `📅 Плануєте замовити машину з США?

Напишіть, приблизно коли плануєте покупку.
`,
      cancelMenu()
    );
  }
);

// ========================================
// 2.1 ОБРОБКА МАЙБУТНЬОЇ ЗАЯВКИ
// ========================================

async function handleFuture(
  ctx: Context,
  data: UserData,
  text: string
) {
  const userId = ctx.from!.id;

  // Термін
  if (data.step === 1) {
    data.date = text;
    data.step = 2;

    await ctx.reply(
      `🚘 Яку машину плануєте придбати?
`,
      cancelMenu()
    );

    return;
  }

  // Автомобіль
  if (data.step === 2) {
    data.car = text;
    data.step = 3;

    await ctx.reply(
      `💰 Який приблизно бюджет плануєте?
`,
      cancelMenu()
    );

    return;
  }

  // Бюджет
  if (data.step === 3) {
    data.budget = text;
    data.step = 4;

    await ctx.reply(
      `👤 Як вас звати?`,
      cancelMenu()
    );

    return;
  }

  // Ім'я
  if (data.step === 4) {
    data.name = text;
    data.step = 5;

    await ctx.reply(
      `📞 Вкажіть номер телефону:

Наприклад:
+380XXXXXXXXX`,
      cancelMenu()
    );

    return;
  }

  // Телефон
  if (data.step === 5) {
    data.phone = text;

    const user = ctx.from!;

    const managerMessage = `
📅 НОВА ЗАЯВКА — ПЛАНУЄ ЗАМОВИТИ АВТО

👤 Ім'я: ${data.name}
📞 Телефон: ${data.phone}

📆 Планує замовити: ${data.date}
🚘 Автомобіль: ${data.car}
💰 Бюджет: ${data.budget}

💬 Telegram:
@${user.username || "немає username"}

🆔 Telegram ID:
${user.id}
`;

    await bot.telegram.sendMessage(
      MANAGER_CHAT_ID!,
      managerMessage
    );

    users.delete(userId);

    await ctx.reply(
      `✅ Дякуємо!

Ваші дані передані менеджеру.

Ми зв'яжемося з вами та проконсультуємо щодо пригону автомобіля з США.`,
      mainMenu()
    );
  }
}

// ========================================
// 3. МАШИНИ В ПРОДАЖІ
// ========================================

bot.hears("🚘 Машини в продажі", async (ctx) => {
  await ctx.reply(
    `🚘 Машини в продажі

Актуальні автомобілі ми публікуємо в нашому Telegram-каналі.

Переходьте за посиланням нижче 👇`,
    Markup.inlineKeyboard([
      [
        Markup.button.url(
          "🚘 Переглянути машини",
          CHANNEL_URL!
        )
      ],
      [
        Markup.button.callback(
          "⬅️ Головне меню",
          "main_menu"
        )
      ]
    ])
  );
});

// ========================================
// 4. ЗВ'ЯЗОК З МЕНЕДЖЕРОМ
// ========================================
bot.hears("👨‍💼 Зв'язок з менеджером", async (ctx) => {
  await ctx.reply(
    "👨‍💼 Оберіть менеджера:",
    Markup.inlineKeyboard([
      [
        Markup.button.url(
          "Sovbez",
          "https://t.me/sovbezmazafaka"
        )
      ],
      [
        Markup.button.url(
          "Каріна",
          "https://t.me/karina_markova"
        )
      ],
      [
        Markup.button.url(
          "Назар",
          "https://t.me/autosovbez"
        )
      ]
    ])
  );
});

// ========================================
// СКАСУВАННЯ
// ========================================

bot.hears("❌ Скасувати", async (ctx) => {
  users.delete(ctx.from.id);

  await ctx.reply(
    `❌ Заявку скасовано.

Головне меню 👇`,
    mainMenu()
  );
});

// ========================================
// ГОЛОВНЕ МЕНЮ
// ========================================

bot.action("main_menu", async (ctx) => {
  await ctx.answerCbQuery();

  users.delete(ctx.from.id);

  await ctx.reply(
    "Головне меню 👇",
    mainMenu()
  );
});

// ========================================
// ОБРОБКА ТЕКСТОВИХ ПОВІДОМЛЕНЬ
// ========================================

bot.on("text", async (ctx) => {
  const text = ctx.message.text.trim();

  // Якщо це кнопка меню — її обробляють bot.hears
  if (
    text === "🚗 Замовити машину з США" ||
    text === "📅 Планую замовити машину з США" ||
    text === "🚘 Машини в продажі" ||
    text === "👨‍💼 Зв'язок з менеджером" ||
    text === "❌ Скасувати"
  ) {
    return;
  }

  const data = users.get(ctx.from.id);

  if (!data || !data.type) {
    await ctx.reply(
      `Оберіть потрібний розділ 👇`,
      mainMenu()
    );

    return;
  }

  if (data.type === "order") {
    await handleOrder(ctx, data, text);
    return;
  }

  if (data.type === "future") {
    await handleFuture(ctx, data, text);
    return;
  }

});

// ========================================
// ПОМИЛКИ
// ========================================

bot.catch((error) => {
  console.error("❌ Помилка бота:", error);
});

// ========================================
// ЗАПУСК
// ========================================

bot.launch();

console.log("================================");
console.log("🚗 USA CAR BOT ЗАПУЩЕНИЙ");
console.log("================================");

process.once("SIGINT", () => {
  bot.stop("SIGINT");
});

process.once("SIGTERM", () => {
  bot.stop("SIGTERM");
});
