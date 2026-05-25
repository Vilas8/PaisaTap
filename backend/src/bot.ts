import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import { User, IUser } from './models/user.model';
import { Referral } from './models/referral.model';
import { Task } from './models/task.model';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'http://localhost:5173'; // Default Vite dev port

// Telegram strictly requires HTTPS for WebApp inline keyboard buttons.
// We use a secure dummy fallback if the user is running locally with http:// to prevent Telegram 400 Bad Request crash.
const rawWebAppUrl = WEBAPP_URL.startsWith('https://') 
  ? WEBAPP_URL 
  : 'https://google.com';

const webAppUrlForTelegram = rawWebAppUrl.endsWith('/') 
  ? rawWebAppUrl.slice(0, -1) 
  : rawWebAppUrl;

if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN') {
  console.warn('Telegram Bot Token not configured. Bot engine will remain offline.');
} else {
  const bot = new Telegraf(BOT_TOKEN);

  /**
   * Helper to ensure user is registered in MongoDB when they interact with the bot.
   * Handles referral deep-links during user onboarding.
   */
  async function ensureUserExists(ctx: any, referrerId?: string): Promise<IUser> {
    const tgUser = ctx.from;
    if (!tgUser) throw new Error('No user context found');

    let user = await User.findOne({ telegramId: tgUser.id.toString() });

    if (!user) {
      console.log(`Bot registering new user: ${tgUser.username || tgUser.id}`);
      
      // Prevent self-referral
      const validReferrerId = referrerId && referrerId !== tgUser.id.toString() ? referrerId : undefined;

      user = new User({
        telegramId: tgUser.id.toString(),
        username: tgUser.username,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        referredBy: validReferrerId,
        balance: 0,
        totalEarned: 0,
        streak: 0,
        energy: 1000,
        maxEnergy: 1000,
      });

      await user.save();

      // Log the referral link
      if (validReferrerId) {
        const referrer = await User.findOne({ telegramId: validReferrerId });
        if (referrer) {
          const referral = new Referral({
            referrerId: validReferrerId,
            referredId: tgUser.id.toString(),
            rewardDistributed: false,
          });
          await referral.save();

          referrer.referralCount += 1;
          await referrer.save();

          // Notify the referrer in Telegram
          try {
            await bot.telegram.sendMessage(
              validReferrerId,
              `🎉 *New Invite!* @${tgUser.username || tgUser.first_name} joined using your link.\n\nThey need to complete their first earning task to release your *₹40* and their *₹20* bonus!`,
              { parse_mode: 'Markdown' }
            );
          } catch (e) {
            console.warn(`Could not send telegram message to referrer: ${validReferrerId}`);
          }
        }
      }
    }

    return user;
  }

  // Command: /start (onboarding & referrals)
  bot.start(async (ctx) => {
    try {
      const payload = ctx.payload; // e.g. ref_12345
      let referrerId: string | undefined;

      if (payload && payload.startsWith('ref_')) {
        referrerId = payload.substring(4);
      }

      const user = await ensureUserExists(ctx, referrerId);

      const welcomeMsg = 
        `👋 *Welcome to PaisaTap, ${ctx.from.first_name}!*\n\n` +
        `Tap the screen, complete simple tasks, play mini games, and withdraw real cash directly to your *UPI* account! 💸\n\n` +
        `🔥 *Multiplier Level:* ${user.level}\n` +
        `⚡ *Energy:* ${user.energy}/${user.maxEnergy}\n` +
        `💰 *Current Balance:* ₹${user.balance.toFixed(2)}\n\n` +
        `Click the button below to launch the Mini App and start earning! 👇`;

      // Inline Keyboard to open the webapp
      const inlineKeyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Open PaisaTap App', webAppUrlForTelegram)],
        [
          Markup.button.callback('💰 Check Balance', 'check_balance'),
          Markup.button.callback('👥 Refer Friends', 'refer_friends')
        ]
      ]);

      await ctx.replyWithMarkdown(welcomeMsg, inlineKeyboard);
    } catch (error) {
      console.error('Error in /start:', error);
      await ctx.reply('Oops, something went wrong initializing your profile. Please try again!');
    }
  });

  // Command: /balance
  bot.command('balance', async (ctx) => {
    try {
      const user = await ensureUserExists(ctx);
      const msg = 
        `💸 *PaisaTap Balance Log*\n\n` +
        `👤 *User:* ${ctx.from.first_name} (@${ctx.from.username || ''})\n` +
        `💰 *Wallet Balance:* ₹${user.balance.toFixed(2)}\n` +
        `📈 *Accumulated Earnings:* ₹${user.totalEarned.toFixed(2)}\n` +
        `⭐️ *Current Level:* ${user.level} (Bonus: +${(user.level - 1) * 5}%)\n\n` +
        `Use the Mini App to withdraw your funds!`;

      const inlineKeyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('💸 Open Wallet & Cashout', `${webAppUrlForTelegram}/#/wallet`)]
      ]);

      await ctx.replyWithMarkdown(msg, inlineKeyboard);
    } catch (error) {
      console.error(error);
    }
  });

  // Command: /tasks
  bot.command('tasks', async (ctx) => {
    try {
      await ensureUserExists(ctx);
      const activeTasks = await Task.find({ isActive: true }).limit(3);
      
      let msg = `📋 *Available Tasks* (Complete in App for cash)\n\n`;
      activeTasks.forEach((t, index) => {
        msg += `${index + 1}. *${t.title}* — Reward: *₹${t.rewardAmount}*\n_${t.description}_\n\n`;
      });

      msg += `Tap below to see all tasks and claim rewards!`;

      const inlineKeyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('📋 Open Tasks Section', `${webAppUrlForTelegram}/#/tasks`)]
      ]);

      await ctx.replyWithMarkdown(msg, inlineKeyboard);
    } catch (error) {
      console.error(error);
    }
  });

  // Command: /refer
  bot.command('refer', async (ctx) => {
    try {
      const user = await ensureUserExists(ctx);
      const refLink = `https://t.me/${ctx.botInfo.username}?start=ref_${ctx.from.id}`;
      
      const msg = 
        `👥 *Invite Friends & Earn Cash!* 🎁\n\n` +
        `Share your link. You get *₹40* and your friend gets *₹20* when they register and complete their first task!\n\n` +
        `🔗 *Your Invite Link:*\n\`${refLink}\`\n\n` +
        `📊 *Your Stats:*\n` +
        `• Total invited: *${user.referralCount}*\n` +
        `• Earnings from referrals: *₹${user.referralCount * 40}*`;

      const inlineKeyboard = Markup.inlineKeyboard([
        [Markup.button.switchToChat('✉️ Share Link', refLink)],
        [Markup.button.webApp('👥 Leaderboard', `${webAppUrlForTelegram}/#/refer`)]
      ]);

      await ctx.replyWithMarkdown(msg, inlineKeyboard);
    } catch (error) {
      console.error(error);
    }
  });

  // Command: /leaderboard
  bot.command('leaderboard', async (ctx) => {
    try {
      const topEarners = await User.find({ totalEarned: { $gt: 0 } })
        .sort({ totalEarned: -1 })
        .limit(10);

      let msg = `🏆 *PaisaTap Global Leaderboard* 🏆\n\n`;
      
      topEarners.forEach((u, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•';
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Anonymous';
        msg += `${medal} *${name}* — ₹${u.totalEarned.toFixed(0)} (${u.referralCount} referrals)\n`;
      });

      await ctx.replyWithMarkdown(msg, Markup.inlineKeyboard([
        [Markup.button.webApp('🎮 Open App & Play', webAppUrlForTelegram)]
      ]));
    } catch (error) {
      console.error(error);
    }
  });

  // Command: /help
  bot.command('help', async (ctx) => {
    const msg = 
      `❔ *PaisaTap Support Guide*\n\n` +
      `Here are the commands you can use:\n` +
      `• /start - Reload app link and greetings\n` +
      `• /balance - Verify your current money balance\n` +
      `• /tasks - View tasks list\n` +
      `• /refer - Fetch your viral referral invite link\n` +
      `• /leaderboard - View top earners\n` +
      `• /help - Display this documentation\n\n` +
      `💡 *Tips:* Maintain a daily streak. Missed days will reset your calendar claim!`;

    await ctx.replyWithMarkdown(msg);
  });

  // Callback Handlers (Inline Buttons)
  bot.action('check_balance', async (ctx) => {
    try {
      const user = await ensureUserExists(ctx);
      await ctx.answerCbQuery();
      await ctx.replyWithMarkdown(`💰 *Your Balance:* ₹${user.balance.toFixed(2)} (Total Earned: ₹${user.totalEarned.toFixed(2)})`);
    } catch (e) {
      console.error(e);
    }
  });

  bot.action('refer_friends', async (ctx) => {
    try {
      const refLink = `https://t.me/${ctx.botInfo.username}?start=ref_${ctx.from.id}`;
      await ctx.answerCbQuery();
      await ctx.replyWithMarkdown(
        `🔗 *Your Referral Link:*\n\`${refLink}\`\n\n` +
        `Give ₹20 to a friend and claim ₹40 for yourself!`
      );
    } catch (e) {
      console.error(e);
    }
  });

  // Start Telegram Bot Long Polling
  bot.launch()
    .then(() => console.log('Telegram Bot engine active and listening.'))
    .catch((err) => console.error('Failed to launch bot engine:', err));

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
