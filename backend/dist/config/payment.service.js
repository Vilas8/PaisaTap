"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
class PaymentService {
    razorpay = null;
    isSandbox = true;
    webhookSecret = '';
    constructor() {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'paisatap_secret';
        if (keyId && keySecret) {
            this.razorpay = new razorpay_1.default({
                key_id: keyId,
                key_secret: keySecret,
            });
            this.isSandbox = false;
            console.log('Razorpay payment service initialized in LIVE/TEST mode.');
        }
        else {
            console.log('Razorpay credentials missing. Operating in SANDBOX SIMULATOR mode.');
        }
    }
    /**
     * Calculates the withdrawal fee (5% to 8%).
     * For this implementation, we use a flat 5% fee with a minimum of ₹5 and a maximum of ₹100.
     */
    calculateFee(amount) {
        const rate = 0.05; // 5% fee
        const calculated = amount * rate;
        return Math.max(5, Math.min(100, Math.round(calculated * 100) / 100));
    }
    /**
     * Initiates a withdrawal payout request.
     * If credentials are not present, it simulates a successful payout creation.
     */
    async createPayout(params) {
        if (this.isSandbox || !this.razorpay) {
            // Simulate Razorpay processing delay and generate a dummy payout ID
            const mockPayoutId = `pout_sim_${crypto_1.default.randomBytes(8).toString('hex')}`;
            return {
                success: true,
                payoutId: mockPayoutId,
                status: 'processing', // Will transition to 'completed' via mock callback or task
                mode: 'SIMULATOR',
            };
        }
        try {
            // Create Razorpay Payout.
            // Note: Real Razorpay Payouts require:
            // 1. Creating a Contact for the user
            // 2. Creating a Fund Account (VPA/UPI type) linked to the contact
            // 3. Creating the Payout itself.
            // Let's create the Contact first.
            const contactResponse = await this.razorpay.resources.contact.create({
                name: `User ${params.telegramId}`,
                email: `${params.telegramId}@paisatap.com`,
                contact: '9999999999',
                type: 'customer',
                reference_id: params.telegramId,
            });
            // Create the Fund Account.
            const fundAccountResponse = await this.razorpay.resources.fundAccount.create({
                contact_id: contactResponse.id,
                account_type: 'vpa',
                vpa: {
                    address: params.upiId,
                },
            });
            // Create the Payout.
            // Amounts in Razorpay are represented in paise (1 INR = 100 paise)
            const amountInPaise = Math.round(params.netAmount * 100);
            const payoutResponse = await this.razorpay.resources.payout.create({
                account_number: process.env.RAZORPAY_X_ACCOUNT_NUMBER || '456456782342345',
                fund_account_id: fundAccountResponse.id,
                amount: amountInPaise,
                currency: 'INR',
                mode: 'UPI',
                purpose: 'payout',
                queue_if_low_balance: true,
                reference_id: params.withdrawalId,
            });
            return {
                success: true,
                payoutId: payoutResponse.id,
                status: payoutResponse.status || 'processing',
                mode: 'LIVE',
            };
        }
        catch (error) {
            console.error('Razorpay Payout Error:', error);
            throw new Error(error.description || error.message || 'Razorpay Payout initiation failed');
        }
    }
    /**
     * Verifies Razorpay Webhook Signatures.
     */
    verifyWebhookSignature(rawBody, signature) {
        if (this.isSandbox) {
            return signature === 'sandbox_secret_signature';
        }
        try {
            const expectedSignature = crypto_1.default
                .createHmac('sha256', this.webhookSecret)
                .update(rawBody)
                .digest('hex');
            return expectedSignature === signature;
        }
        catch (error) {
            console.error('Error verifying Razorpay webhook signature:', error);
            return false;
        }
    }
}
exports.paymentService = new PaymentService();
