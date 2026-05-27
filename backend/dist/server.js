"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const referral_routes_1 = __importDefault(require("./routes/referral.routes"));
const wallet_routes_1 = __importDefault(require("./routes/wallet.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
// Import models for seeding
const task_model_1 = require("./models/task.model");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/paisatap';
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: '*', // For TG mini-apps, allowing requests from any web view is standard
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: [
        'content-type',
        'authorization',
        'x-telegram-init-data',
        'x-admin-password',
        'x-dev-user-id',
        'x-dev-username',
        'x-dev-first-name',
        'x-dev-last-name'
    ]
}));
app.use(express_1.default.json());
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/user', user_routes_1.default);
app.use('/api/tasks', task_routes_1.default);
app.use('/api/referral', referral_routes_1.default);
app.use('/api/wallet', wallet_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', time: new Date() });
});
// Seed default tasks if empty
async function seedDefaultTasks() {
    try {
        const count = await task_model_1.Task.countDocuments();
        if (count === 0) {
            console.log('Seeding default tasks...');
            const defaultTasks = [
                {
                    title: 'Join PaisaTap Telegram Channel',
                    description: 'Subscribe to our official Telegram channel for updates and announcements.',
                    rewardAmount: 15,
                    type: 'social',
                    link: 'https://t.me/PaisaTapOfficial',
                    verificationMethod: 'instant',
                    isActive: true
                },
                {
                    title: 'Solve Daily Code Word',
                    description: 'Find the hidden secret word inside the bot announcement and submit it here. Hint: the secret code is "GEMINI".',
                    rewardAmount: 25,
                    type: 'quiz',
                    link: 'https://t.me/PaisaTapOfficial',
                    verificationMethod: 'code',
                    verificationCode: 'GEMINI',
                    isActive: true
                },
                {
                    title: 'Post PaisaTap on Twitter/X',
                    description: 'Share a tweet showing off your PaisaTap balance with the hashtag #PaisaTap. Submit your tweet link for manual verification.',
                    rewardAmount: 50,
                    type: 'social',
                    link: 'https://x.com',
                    verificationMethod: 'manual',
                    isActive: true
                },
                {
                    title: 'Watch Earning Secrets video',
                    description: 'Watch our complete guide on how to maximize your PaisaTap daily streak and tapping bonus.',
                    rewardAmount: 10,
                    type: 'daily',
                    link: 'https://youtube.com',
                    verificationMethod: 'instant',
                    isActive: true
                }
            ];
            await task_model_1.Task.insertMany(defaultTasks);
            console.log('Successfully seeded default tasks!');
        }
    }
    catch (error) {
        console.error('Error seeding tasks:', error);
    }
}
// Database Connection and Server Boot
function sanitizeMongoUri(uri) {
    try {
        const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/);
        if (!match)
            return uri;
        const [, protocol, rest] = match;
        const slashIdx = rest.indexOf('/');
        const hostSegment = slashIdx !== -1 ? rest.substring(0, slashIdx) : rest;
        const dbAndOptions = slashIdx !== -1 ? rest.substring(slashIdx) : '';
        const lastAtIdx = hostSegment.lastIndexOf('@');
        if (lastAtIdx === -1)
            return uri;
        const credentials = hostSegment.substring(0, lastAtIdx);
        const host = hostSegment.substring(lastAtIdx + 1);
        const colonIdx = credentials.indexOf(':');
        if (colonIdx === -1)
            return uri;
        const username = credentials.substring(0, colonIdx);
        const password = credentials.substring(colonIdx + 1);
        const safeEncode = (str) => {
            try {
                const decoded = decodeURIComponent(str);
                return encodeURIComponent(decoded);
            }
            catch {
                return encodeURIComponent(str);
            }
        };
        return `${protocol}${safeEncode(username)}:${safeEncode(password)}@${host}${dbAndOptions}`;
    }
    catch (error) {
        console.error('Error sanitizing MongoDB URI:', error);
        return uri;
    }
}
const sanitizedUri = sanitizeMongoUri(MONGODB_URI);
mongoose_1.default
    .connect(sanitizedUri)
    .then(async () => {
    console.log('Connected to MongoDB.');
    // Correct and cap levels for any users whose level exceeds 100
    try {
        const result = await mongoose_1.default.connection.collection('users').updateMany({ level: { $gt: 100 } }, { $set: { level: 100 } });
        if (result.modifiedCount > 0) {
            console.log(`Successfully capped levels to 100 for ${result.modifiedCount} users.`);
        }
    }
    catch (err) {
        console.error('Error running level cap DB migration:', err);
    }
    await seedDefaultTasks();
    // Launch Telegram bot concurrently inside the same process
    if (process.env.DISABLE_BOT !== 'true') {
        require('./bot');
    }
    else {
        console.log('Telegram Bot engine disabled via DISABLE_BOT flag.');
    }
    app.listen(PORT, () => {
        console.log(`PaisaTap backend running on port ${PORT}`);
    });
})
    .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
});
