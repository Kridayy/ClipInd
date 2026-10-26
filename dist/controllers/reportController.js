"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReport = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
const reportSchema = zod_1.z.object({
    targetId: zod_1.z.number().optional(),
    targetType: zod_1.z.nativeEnum(client_1.ReportType),
    reason: zod_1.z.string().min(1, 'Reason is required')
});
const createReport = async (req, res) => {
    try {
        const userId = req.user.userId;
        const validatedData = reportSchema.parse(req.body);
        const report = await prisma.report.create({
            data: {
                reporterId: userId,
                targetId: validatedData.targetId,
                targetType: validatedData.targetType,
                reason: validatedData.reason
            }
        });
        res.status(201).json(report);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createReport = createReport;
