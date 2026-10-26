"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const campaignRoutes_1 = __importDefault(require("./routes/campaignRoutes"));
const submissionRoutes_1 = __importDefault(require("./routes/submissionRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes"));
const analyticsRoutes_1 = __importDefault(require("./routes/analyticsRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const socialRoutes_1 = __importDefault(require("./routes/socialRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Static frontend
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/campaigns', campaignRoutes_1.default);
app.use('/api/submissions', submissionRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/wallet', walletRoutes_1.default);
app.use('/api/analytics', analyticsRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
app.use('/api/social', socialRoutes_1.default);
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
exports.default = app;
