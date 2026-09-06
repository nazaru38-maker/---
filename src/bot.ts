import { Telegraf, Markup, Context } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

// ========================================
// НАЛАШТУВАННЯ
// ========================================

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

// Створюємо константу, перевірену на undefined для TypeScript
const REQUIRED_MANAGER_CHAT_ID: string = MANAGER_CHAT_ID;
const REQUIRED_CHANNEL_URL: string = CHANNEL_URL;

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

  date?: string;

  name?: string;
  phone?: string;
}

// ========================================
// ЗАЯВКА
// ========================================

interface ManagerRequest {
  id: string;

  type: "order" | "future";

  userId: number;
  username?: string;

  name?: string;
  phone?: string;

  car?: string;
  year?: string;
  budget?: string;
  date?: string;

  status: "new" | "taken";

  managerId?: number;
  managerName?: string;

  messageId?: number;
}

// ========================================
// СХОВИЩЕ
// ========================================

const users = new Map<number, UserData>();

const requests = new Map<string, ManagerRequest>();

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
// ГЕНЕРАЦІЯ ID ЗАЯВКИ
// ========================================

function generateRequestId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ========================================
// ІМ'Я МЕНЕДЖЕРА
// ========================================

function getManagerName(ctx: Context): string {
  const user = ctx.from;

  if (!user) {
    return "Менеджер";
  }

  const fullName =
    `${user.first_name || ""} ${user.last_name || ""}`.trim();

  if (fullName) {
    return fullName;
  }

  if (user.username) {
    return `@${user.username}`;
  }

  return `ID ${user.id}`;
}

// ========================================
// ПОСИЛАННЯ НА КЛІЄНТА
// ========================================

function getClientUrl(request: ManagerRequest): string | null {
  if (!request.username) {
    return null;
  }

  return `https://t.me/${request.username}`;
}

// ========================================
// ФОРМУВАННЯ ЗАЯВКИ
// ========================================

function buildManagerMessage(request: ManagerRequest): string {
  const typeText =
    request.type === "order"
      ? "🚗 ЗАМОВЛЕННЯ АВТО"
      : "📅 ПЛАНУЄ ЗАМОВИТИ";

  const statusText =
    request.status === "new"
      ? "🟢 НОВА"
      : `🟡 В РОБОТІ — ${request.managerName}`;

  return `
━━━━━━━━━━━━━━━━━━━━
🚘 SOVBEZAUTOIMPORT
━━━━━━━━━━━━━━━━━━━━

${typeText}

${statusText}

🆔 Заявка: #${request.id}

👤 Клієнт:
${request.name || "Не вказано"}

📞 Телефон:
${request.phone || "Не вказано"}

🚘 Автомобіль:
${request.car || "Не вказано"}

${request.year ? `📅 Рік:\n${request.year}\n` : ""}

${request.date ? `📆 Планує замовити:\n${request.date}\n` : ""}

💰 Бюджет:
${request.budget || "Не вказано"}

💬 Telegram:
${request.username ? `@${request.username}` : "немає username"}

🆔 Telegram ID:
${request.userId}

━━━━━━━━━━━━━━━━━━━━
`;
}

// ========================================
// КНОПКИ ЗАЯВКИ
// ========================================

function requestButtons(request: ManagerRequest) {
  const buttons = [];

  const clientUrl = getClientUrl(request);

  if (clientUrl) {
    buttons.push(
      Markup.button.url(
        "💬 Написати клієнту",
        clientUrl
      )
    );
  }

  if (request.status === "new") {
    buttons.push(
      Markup.button.callback(
        "✅ Взяти заявку",
        `take_request:${request.id}`
      )
    );
  } else {
    buttons.push(
      Markup.button.callback(
        `👨‍💼 В роботі: ${request.managerName || "Менеджер"}`,
        `request_taken:${request.id}`
      )
    );
  }

  return Markup.inlineKeyboard(
    buttons.length === 2
      ? [[buttons[0]], [buttons[1]]]
      : [[buttons[0]]]
  );
}

// ========================================
// ВІДПРАВКА ЗАЯВКИ МЕНЕДЖЕРАМ
// ========================================

async function sendRequestToManagers(
  request: ManagerRequest
) {
  const message = buildManagerMessage(request);

  // ВИПРАВЛЕНО: Використовується REQUIRED_MANAGER_CHAT_ID (тип string)
  const sentMessage = await bot.telegram.sendMessage(
    REQUIRED_MANAGER_CHAT_ID,
    message,
    requestButtons(request)
  );

  request.messageId = sentMessage.message_id;

  requests.set(request.id, request);

  console.log(
    `📩 Заявка #${request.id} відправлена в групу`
  );
}

// ========================================
// /START
// ========================================

bot.start(async (ctx) => {
  if (ctx.from) {
    users.delete(ctx.from.id);
  }

  await ctx.reply(
    `🇺🇸 Вітаємо у SOVBEZAUTOIMPORT!

Допоможемо придбати та доставити автомобіль з аукціонів США 🇺🇸

Copart • IAAI

Автомобіль під ключ.

Оберіть потрібний розділ 👇`,
    mainMenu()
  );
});

// ========================================
// 1. ЗАМОВИТИ МАШИНУ
// ========================================

bot.hears(
  "🚗 Замовити машину з США",
  async (ctx) => {
    if (ctx.from) {
      users.set(ctx.from.id, {
        type: "order",
        step: 1
      });
    }

    await ctx.reply(
      `🚗 Замовлення автомобіля з США

Напишіть, яку машину ви хочете придбати.`,
      cancelMenu()
    );
  }
);

// ========================================
// ОБРОБКА ЗАМОВЛЕННЯ
// ========================================

async function handleOrder(
  ctx: Context,
  data: UserData,
  text: string
) {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  // Автомобіль
  if (data.step === 1) {
    data.car = text;
    data.step = 2;

    await ctx.reply(
      `📅 Який рік автомобіля вас цікавить?`,
      cancelMenu()
    );

    return;
  }

  // Рік
  if (data.step === 2) {
    data.year = text;
    data.step = 3;

    await ctx.reply(
      `💰 Який орієнтовний бюджет?`,
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
      `📞 Вкажіть номер телефону:`,
      cancelMenu()
    );

    return;
  }

  // Телефон
  if (data.step === 5) {
    data.phone = text;

    const user = ctx.from;

    const request: ManagerRequest = {
      id: generateRequestId(),

      type: "order",

      userId: user.id,
      username: user.username,

      name: data.name,
      phone: data.phone,

      car: data.car,
      year: data.year,
      budget: data.budget,

      status: "new"
    };

    await sendRequestToManagers(request);

    users.delete(userId);

    await ctx.reply(
      `✅ Дякуємо!

Вашу заявку успішно отримано.

Менеджер SOVBEZAUTOIMPORT зв'яжеться з вами найближчим часом.`,
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
    if (ctx.from) {
      users.set(ctx.from.id, {
        type: "future",
        step: 1
      });
    }

    await ctx.reply(
      `📅 Плануєте замовити машину з США?

Напишіть, приблизно коли плануєте покупку.`,
      cancelMenu()
    );
  }
);

// ========================================
// ОБРОБКА МАЙБУТНЬОЇ ЗАЯВКИ
// ========================================

async function handleFuture(
  ctx: Context,
  data: UserData,
  text: string
) {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  // Термін
  if (data.step === 1) {
    data.date = text;
    data.step = 2;

    await ctx.reply(
      `🚘 Яку машину плануєте придбати?`,
      cancelMenu()
    );

    return;
  }

  // Автомобіль
  if (data.step === 2) {
    data.car = text;
    data.step = 3;

    await ctx.reply(
      `💰 Який приблизно бюджет плануєте?`,
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
      `📞 Вкажіть номер телефону:`,
      cancelMenu()
    );

    return;
  }

  // Телефон
  if (data.step === 5) {
    data.phone = text;

    const user = ctx.from;

    const request: ManagerRequest = {
      id: generateRequestId(),

      type: "future",

      userId: user.id,
      username: user.username,

      name: data.name,
      phone: data.phone,

      car: data.car,
      budget: data.budget,
      date: data.date,

      status: "new"
    };

    await sendRequestToManagers(request);

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
// ВЗЯТИ ЗАЯВКУ
// ========================================

bot.action(
  /^take_request:(.+)$/,
  async (ctx) => {
    if (!ctx.match) return;
    const requestId = ctx.match[1];

    const request = requests.get(requestId);

    if (!request) {
      await ctx.answerCbQuery(
        "❌ Заявку не знайдено",
        { show_alert: true }
      );

      return;
    }

    // Якщо заявку вже взяв інший менеджер
    if (request.status === "taken") {
      await ctx.answerCbQuery(
        `❌ Заявку вже взяв ${request.managerName}`,
        { show_alert: true }
      );

      return;
    }

    const managerId = ctx.from.id;
    const managerName = getManagerName(ctx);

    request.status = "taken";
    request.managerId = managerId;
    request.managerName = managerName;

    requests.set(requestId, request);

    // Оновлюємо повідомлення в групі
    try {
      await ctx.editMessageText(
        buildManagerMessage(request),
        requestButtons(request)
      );
    } catch (error) {
      console.error(
        "Помилка оновлення заявки:",
        error
      );
    }

    await ctx.answerCbQuery(
      `✅ Ви взяли заявку #${requestId}`,
      { show_alert: true }
    );
  }
);

// ========================================
// КНОПКА "В РОБОТІ"
// ========================================

bot.action(
  /^request_taken:(.+)$/,
  async (ctx) => {
    if (!ctx.match) return;
    const requestId = ctx.match[1];

    const request = requests.get(requestId);

    if (!request) {
      await ctx.answerCbQuery(
        "❌ Заявку не знайдено",
        { show_alert: true }
      );

      return;
    }

    await ctx.answerCbQuery(
      `👨‍💼 Заявку взяв: ${request.managerName}`,
      { show_alert: true }
    );
  }
);

// ========================================
// МАШИНИ В ПРОДАЖІ
// ========================================

bot.hears(
  "🚘 Машини в продажі",
  async (ctx) => {
    await ctx.reply(
      `🚘 Машини в продажі

Актуальні автомобілі ми публікуємо в нашому Telegram-каналі.

Переходьте за посиланням нижче 👇`,
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "🚘 Переглянути машини",
            REQUIRED_CHANNEL_URL
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
  }
);

// ========================================
// ЗВ'ЯЗОК З МЕНЕДЖЕРОМ
// ========================================

bot.hears(
  "👨‍💼 Зв'язок з менеджером",
  async (ctx) => {
    await ctx.reply(
      "👨‍💼 Оберіть менеджера:",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "Влад",
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
  }
);

// ========================================
// СКАСУВАННЯ
// ========================================

bot.hears(
  "❌ Скасувати",
  async (ctx) => {
    if (ctx.from) {
      users.delete(ctx.from.id);
    }

    await ctx.reply(
      `❌ Заявку скасовано.

Головне меню 👇`,
      mainMenu()
    );
  }
);

// ========================================
// ГОЛОВНЕ МЕНЮ
// ========================================

bot.action(
  "main_menu",
  async (ctx) => {
    await ctx.answerCbQuery();

    if (ctx.from) {
      users.delete(ctx.from.id);
    }

    await ctx.reply(
      "Головне меню 👇",
      mainMenu()
    );
  }
);

// ========================================
// ОБРОБКА ТЕКСТОВИХ ПОВІДОМЛЕНЬ
// ========================================

bot.on(
  "text",
  async (ctx) => {
    if (!ctx.from || !ctx.message) return;

    const text =
      ctx.message.text.trim();

    // Кнопки меню
    if (
      text === "🚗 Замовити машину з США" ||
      text === "📅 Планую замовити машину з США" ||
      text === "🚘 Машини в продажі" ||
      text === "👨‍💼 Зв'язок з менеджером" ||
      text === "❌ Скасувати"
    ) {
      return;
    }

    const data =
      users.get(ctx.from.id);

    if (!data || !data.type) {
      await ctx.reply(
        `Оберіть потрібний розділ 👇`,
        mainMenu()
      );

      return;
    }

    if (data.type === "order") {
      await handleOrder(
        ctx,
        data,
        text
      );

      return;
    }

    if (data.type === "future") {
      await handleFuture(
        ctx,
        data,
        text
      );

      return;
    }
  }
);

// ========================================
// ПОМИЛКИ
// ========================================

bot.catch((error) => {
  console.error(
    "❌ Помилка бота:",
    error
  );
});

// ========================================
// ЗАПУСК
// ========================================

bot.launch();

console.log(
  "================================"
);

console.log(
  "🚗 SOVBEZAUTOIMPORT BOT ЗАПУЩЕНИЙ"
);

console.log(
  "📩 Заявки → група менеджерів"
);

console.log(
  "================================"
);

// ========================================
// ЗУПИНКА
// ========================================

process.once(
  "SIGINT",
  () => {
    bot.stop("SIGINT");
  }
);

process.once(
  "SIGTERM",
  () => {
    bot.stop("SIGTERM");
  }
);
