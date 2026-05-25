import Razorpay from 'razorpay';
import crypto from 'crypto';

class PaymentService {
  private razorpay: Razorpay | null = null;
  private isSandbox: boolean = true;
  private webhookSecret: string = '';

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'paisatap_secret';

    if (keyId && keySecret) {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      this.isSandbox = false;
      console.log('Razorpay payment service initialized in LIVE/TEST mode.');
    } else {
      console.log('Razorpay credentials missing. Operating in SANDBOX SIMULATOR mode.');
    }
  }

  /**
   * Calculates the withdrawal fee (5% to 8%).
   * For this implementation, we use a flat 5% fee with a minimum of ₹5 and a maximum of ₹100.
   */
  public calculateFee(amount: number): number {
    const rate = 0.05; // 5% fee
    const calculated = amount * rate;
    return Math.max(5, Math.min(100, Math.round(calculated * 100) / 100));
  }

  /**
   * Initiates a withdrawal payout request.
   * If credentials are not present, it simulates a successful payout creation.
   */
  public async createPayout(params: {
    telegramId: string;
    upiId: string;
    amount: number;
    fee: number;
    netAmount: number;
    withdrawalId: string;
  }) {
    if (this.isSandbox || !this.razorpay) {
      // Simulate Razorpay processing delay and generate a dummy payout ID
      const mockPayoutId = `pout_sim_${crypto.randomBytes(8).toString('hex')}`;
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
      const contactResponse = await (this.razorpay as any).resources.contact.create({
        name: `User ${params.telegramId}`,
        email: `${params.telegramId}@paisatap.com`,
        contact: '9999999999',
        type: 'customer',
        reference_id: params.telegramId,
      });

      // Create the Fund Account.
      const fundAccountResponse = await (this.razorpay as any).resources.fundAccount.create({
        contact_id: contactResponse.id,
        account_type: 'vpa',
        vpa: {
          address: params.upiId,
        },
      });

      // Create the Payout.
      // Amounts in Razorpay are represented in paise (1 INR = 100 paise)
      const amountInPaise = Math.round(params.netAmount * 100);

      const payoutResponse = await (this.razorpay as any).resources.payout.create({
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
    } catch (error: any) {
      console.error('Razorpay Payout Error:', error);
      throw new Error(error.description || error.message || 'Razorpay Payout initiation failed');
    }
  }

  /**
   * Verifies Razorpay Webhook Signatures.
   */
  public verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (this.isSandbox) {
      return signature === 'sandbox_secret_signature';
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Error verifying Razorpay webhook signature:', error);
      return false;
    }
  }
}

export const paymentService = new PaymentService();
