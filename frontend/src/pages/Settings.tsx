import React, { useState } from 'react';
import { useTelegram } from '../contexts/TelegramContext';
import { 
  ArrowLeft, 
  ChevronRight, 
  HelpCircle, 
  ShieldAlert, 
  ExternalLink,
  Send,
  Lock,
  BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type SettingsView = 'menu' | 'support' | 'terms' | 'privacy';

export const Settings: React.FC = () => {
  const { user, triggerHaptic } = useTelegram();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<SettingsView>('menu');

  const handleBackToMenu = () => {
    triggerHaptic('light');
    setActiveView('menu');
  };

  const handleMenuClick = (view: SettingsView) => {
    triggerHaptic('light');
    setActiveView(view);
  };

  const handleBackToHome = () => {
    triggerHaptic('light');
    navigate('/home');
  };

  // Rendering FAQ & Help portal
  const renderSupportView = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={handleBackToMenu} className="btn btn-secondary" style={{ padding: '8px 12px', minHeight: 'fit-content', borderRadius: '10px' }}>
          <ArrowLeft size={16} />
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Help & Support</h2>
      </div>

      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '16px' }}>
        <h3 style={{ marginTop: 0, fontSize: '15px', color: 'var(--color-accent)' }}>Frequently Asked Questions</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
          <div>
            <strong style={{ fontSize: '13px', color: '#fff', display: 'block', marginBottom: '4px' }}>1. How do I earn Paisa?</strong>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
              You can earn Paisa by tapping the coin on the Home page, claiming your Daily Check-in rewards, watching sponsored ads on the Tasks tab, and playing Mini Games (Spin Wheel, Scratch Card, and Coin Catcher).
            </p>
          </div>

          <div>
            <strong style={{ fontSize: '13px', color: '#fff', display: 'block', marginBottom: '4px' }}>2. What are the UPI cashout rules?</strong>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
              Cashout requests can only be initiated on the <strong style={{ color: 'var(--color-accent)' }}>10th of each month</strong> (minimum ₹100). If you registered on the app within 15 days of the payout day, you must complete a 30-day session (account age &ge; 30 days) before your first withdrawal.
            </p>
          </div>

          <div>
            <strong style={{ fontSize: '13px', color: '#fff', display: 'block', marginBottom: '4px' }}>3. How is the level and tap bonus calculated?</strong>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
              Your level goes up by 1 for every ₹1,000 you earn (capped at Level 100). For every 10 levels you achieve, your tapping value increases by an additional flat <strong style={{ color: 'var(--color-primary)' }}>₹1.00 per tap</strong>.
            </p>
          </div>

          <div>
            <strong style={{ fontSize: '13px', color: '#fff', display: 'block', marginBottom: '4px' }}>4. Cheating & Anti-Abuse policy</strong>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
              Our platform uses automated request telemetry to detect autoclickers, API scripts, and multi-account emulators. Accounts violating these rules will be permanently banned and all pending cashout requests will be rejected.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '16px', textAlign: 'center' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Still need assistance?</h4>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>Reach out to our customer care team on Telegram.</p>
        <a 
          href="https://t.me/PaisaTapOfficial" 
          target="_blank" 
          rel="noreferrer"
          className="btn"
          style={{ width: '100%', textDecoration: 'none', display: 'inline-flex', gap: '8px', boxSizing: 'border-box' }}
        >
          <Send size={16} />
          Contact Support Bot
        </a>
      </div>
    </div>
  );

  // Rendering Terms of Service
  const renderTermsView = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={handleBackToMenu} className="btn btn-secondary" style={{ padding: '8px 12px', minHeight: 'fit-content', borderRadius: '10px' }}>
          <ArrowLeft size={16} />
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Terms of Service</h2>
      </div>

      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ marginTop: 0 }}><strong>Last Updated: May 2026</strong></p>
          
          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>1. Identification of Service Provider</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              This Telegram Mini App ("PaisaTap") is operated and offered to users by PaisaTap Technologies Private Limited, contact email: <strong>support@paisatap.com</strong>.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>2. Independent Third-Party Service</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              PaisaTap is an independent third-party software service. It is NOT operated, endorsed, sponsored, or guaranteed by Telegram FZ-LLC or its affiliates. Users acknowledge that contracting occurs solely between the user and PaisaTap.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>3. Service Scope & Acceptable Use</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              Users must be at least 18 years old to access cashout features. You agree not to abuse, exploit, or bypass the application interface using bots, automated scripts, macro-tappers, or emulators. Violation will lead to immediate account suspension and forfeiture of balances.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>4. Payments & Disputes</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              All withdrawal transactions and cashouts are routed through third-party UPI payment processors. Telegram is not responsible for processing, holding, or resolving any financial transactions, payments, or disputes arising from your use of PaisaTap.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>5. Disclaimers & Limitation of Liability</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              The application is provided on an "as is" and "as available" basis without any express or implied warranties. To the maximum extent permitted by law, PaisaTap is not liable for service interruptions, network failures, or lost earnings.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>6. Indemnity</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              You agree to indemnify and hold harmless PaisaTap and its developers from and against any claims, losses, or damages resulting from your misuse of the platform, unlawful conduct, or breach of these Terms.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>7. Governing Law & Dispute Resolution</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflicts of law principles. Any dispute arising out of these terms shall be subject to the exclusive jurisdiction of the courts located in Mumbai, India.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>8. Modifications to Terms</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              We reserve the right to modify these terms. Material updates will be communicated through our official Telegram announcements channel. Your continued use of the app signifies your agreement to updated terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Rendering Privacy Policy
  const renderPrivacyView = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={handleBackToMenu} className="btn btn-secondary" style={{ padding: '8px 12px', minHeight: 'fit-content', borderRadius: '10px' }}>
          <ArrowLeft size={16} />
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Privacy Policy</h2>
      </div>

      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ marginTop: 0 }}><strong>Last Updated: May 2026</strong></p>
          <p>
            This policy outlines how PaisaTap collects, processes, and protects your personal data in compliance with the **Digital Personal Data Protection (DPDP) Act, 2023** of India.
          </p>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>1. Data We Collect</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              * **Automatically collected via Telegram**: Telegram User ID, username, language, and display name.
              * **Actively provided by you**: UPI IDs entered during withdrawal requests.
              * **Log & Analytics Data**: IP addresses, server interaction telemetry, and energy logs.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>2. Purpose of Processing</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              We process your data strictly for specific purposes: user authentication, cheat prevention, in-app rewards tracking, customer support assistance, and processing withdrawal transfers.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>3. Consent & Legal Basis</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              By launching the Mini App and entering transaction details, you provide informed, affirmative consent for processing your personal data for the specified purposes in line with Section 6 of the DPDP Act, 2023.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>4. Data Retention</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              We retain account data and log credentials only as long as required to fulfill transactional bookkeeping. Withdrawal logs are archived for statutory tax auditing. You can request deletion of your account at any time by contacting our grievance team.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>5. Third-Party Sharing</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              Your personal details are not shared or sold to third parties. We share transaction-specific details only with our secure payment processing partner (Razorpay) and database host (MongoDB Atlas) to execute your withdrawal transfers.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>6. Security Controls</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              We apply industry-standard security controls including TLS/SSL encryption for all data in transit, strict database role-based access restrictions, and secure API credential storage.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>7. User Rights under DPDP Act</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              You possess the right to access summary details of data we store, request corrections, demand erasure of your personal data (where not legally restricted), and withdraw your consent.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>8. Grievance Officer Contact</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              In compliance with Section 10 of the DPDP Act, we have designated a Grievance Officer to handle user complaints and privacy queries. You may contact Vilas at: <strong>grievance@paisatap.com</strong>.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>9. Cross-Border Data Transfers</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              Your data is stored on secure cloud servers hosted globally (Render/MongoDB AWS regions). By using the service, you consent to secure trans-border processing necessary for transaction fulfillment.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>10. Protection of Minors</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              PaisaTap does not knowingly collect or target minors under 18. If a minor has registered, parents or guardians may contact us to request data erasure.
            </p>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: '13px' }}>11. Data Breach Response</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              In the event of any reportable security breach involving personal data, we will notify affected users and the Digital Personal Data Protection Board of India within 72 hours of detection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (activeView === 'support') return renderSupportView();
  if (activeView === 'terms') return renderTermsView();
  if (activeView === 'privacy') return renderPrivacyView();

  // Rendering Main Settings Menu
  return (
    <div style={{ padding: '0 20px 20px 20px' }}>
      
      {/* Settings Header with back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', marginBottom: '20px' }}>
        <button onClick={handleBackToHome} className="btn btn-secondary" style={{ padding: '8px 12px', minHeight: 'fit-content', borderRadius: '10px' }}>
          <ArrowLeft size={16} />
        </button>
        <h1 className="page-title" style={{ margin: 0 }}>App Settings</h1>
      </div>
      
      <p className="page-subtitle">View app guidelines, agreements, policies, and official resources.</p>

      {/* Account Info Preview */}
      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="user-avatar" style={{ width: '40px', height: '40px', fontSize: '16px', flexShrink: 0 }}>
            {user?.first_name?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>
              {user?.first_name || 'Earning Master'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              @{user?.username || 'paisatap_user'}
            </div>
          </div>
        </div>
      </div>

      {/* Menu Options */}
      <h3 style={{ margin: '20px 0 10px 0', fontSize: '14px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>Information & Agreements</h3>
      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '8px 16px' }}>
        
        {/* Help & Support */}
        <div 
          onClick={() => handleMenuClick('support')}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <HelpCircle size={18} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Help & Support</span>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </div>

        {/* Terms of Service */}
        <div 
          onClick={() => handleMenuClick('terms')}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <BookOpen size={18} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Terms of Service</span>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </div>

        {/* Privacy Policy */}
        <div 
          onClick={() => handleMenuClick('privacy')}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Lock size={18} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Privacy Policy</span>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </div>

        {/* Official Channel Link */}
        <a 
          href="https://t.me/PaisaTapOfficial" 
          target="_blank" 
          rel="noreferrer"
          onClick={() => triggerHaptic('light')}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', textDecoration: 'none', color: '#fff' }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <ShieldAlert size={18} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Official Channel</span>
          </div>
          <ExternalLink size={14} style={{ color: 'var(--color-text-secondary)' }} />
        </a>

      </div>

    </div>
  );
};
