/**
 * AdsgramService wrapper for rewarded video ads.
 * Handles live Adsgram integration and falls back to a sandbox mock ad player
 * in local development or if the script is blocked/failed to load.
 */

// Interface for Adsgram script
interface AdsgramInitParams {
  blockId: string;
  debug?: boolean;
  debugBannerType?: string;
}

interface AdsgramController {
  show: () => Promise<any>;
}

declare global {
  interface Window {
    Adsgram?: {
      init: (params: AdsgramInitParams) => AdsgramController;
    };
  }
}

// Fallback Mock Ad player overlay
function showMockAdModal(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create elements
    const overlay = document.createElement('div');
    overlay.id = 'mock-ad-overlay';
    
    // Style overlay
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(7, 10, 19, 0.96)',
      backdropFilter: 'blur(12px)',
      webkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '999999',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      opacity: '0',
      transition: 'opacity 0.3s ease',
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '24px',
      padding: '32px 24px',
      textAlign: 'center',
      maxWidth: '340px',
      width: '85%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      position: 'relative',
      transform: 'scale(0.9)',
      transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    });

    // Close button (Skip Ad)
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '12px',
      right: '16px',
      background: 'none',
      border: 'none',
      color: 'rgba(255, 255, 255, 0.4)',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '4px 8px',
      lineHeight: '1',
      transition: 'color 0.2s',
      outline: 'none',
    });
    closeBtn.onmouseover = () => { closeBtn.style.color = '#ff4a4a'; };
    closeBtn.onmouseout = () => { closeBtn.style.color = 'rgba(255, 255, 255, 0.4)'; };

    // Ad Icon
    const adIcon = document.createElement('div');
    adIcon.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #10b981;">
        <rect x="2" y="2" width="20" height="20" rx="4" />
        <path d="m9 8 6 4-6 4V8z" fill="#10b981" />
      </svg>
    `;
    
    // Header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.flexDirection = 'column';
    header.style.gap = '6px';
    
    const title = document.createElement('h3');
    title.textContent = 'PaisaTap Sponsor Video';
    Object.assign(title.style, {
      margin: '0',
      fontSize: '18px',
      fontWeight: '600',
      letterSpacing: '0.5px',
    });

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Sandbox Mock Ad Mode';
    Object.assign(subtitle.style, {
      margin: '0',
      fontSize: '12px',
      color: '#10b981',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      fontWeight: '700',
    });

    header.appendChild(title);
    header.appendChild(subtitle);

    // Animated countdown timer circle
    const timerContainer = document.createElement('div');
    Object.assign(timerContainer.style, {
      position: 'relative',
      width: '80px',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '10px 0',
    });

    const circleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    circleSvg.setAttribute('width', '80');
    circleSvg.setAttribute('height', '80');
    circleSvg.style.transform = 'rotate(-90deg)';

    const trackCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    trackCircle.setAttribute('cx', '40');
    trackCircle.setAttribute('cy', '40');
    trackCircle.setAttribute('r', '34');
    trackCircle.setAttribute('stroke', 'rgba(255, 255, 255, 0.05)');
    trackCircle.setAttribute('stroke-width', '6');
    trackCircle.setAttribute('fill', 'transparent');

    const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    progressCircle.setAttribute('cx', '40');
    progressCircle.setAttribute('cy', '40');
    progressCircle.setAttribute('r', '34');
    progressCircle.setAttribute('stroke', '#10b981');
    progressCircle.setAttribute('stroke-width', '6');
    progressCircle.setAttribute('fill', 'transparent');
    const circumference = 2 * Math.PI * 34;
    progressCircle.setAttribute('stroke-dasharray', `${circumference}`);
    progressCircle.setAttribute('stroke-dashoffset', '0');
    progressCircle.style.transition = 'stroke-dashoffset 0.1s linear';

    circleSvg.appendChild(trackCircle);
    circleSvg.appendChild(progressCircle);

    const timerText = document.createElement('span');
    timerText.textContent = '3';
    Object.assign(timerText.style, {
      position: 'absolute',
      fontSize: '24px',
      fontWeight: '700',
      color: '#ffffff',
    });

    timerContainer.appendChild(circleSvg);
    timerContainer.appendChild(timerText);

    // Tip Info
    const tipText = document.createElement('span');
    tipText.textContent = 'Do not close the video to claim your reward.';
    Object.assign(tipText.style, {
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.5)',
      lineHeight: '1.4',
    });

    // Assemble card
    card.appendChild(closeBtn);
    card.appendChild(adIcon);
    card.appendChild(header);
    card.appendChild(timerContainer);
    card.appendChild(tipText);
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Fade in
    setTimeout(() => {
      overlay.style.opacity = '1';
      card.style.transform = 'scale(1)';
    }, 10);

    // Start countdown
    let secondsLeft = 3;
    const totalDuration = 3000; // 3 seconds
    let startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      const dashOffset = circumference * (1 - progress);
      progressCircle.setAttribute('stroke-dashoffset', `${dashOffset}`);

      const currentSeconds = Math.ceil(3 - progress * 3);
      if (currentSeconds !== secondsLeft && currentSeconds >= 0) {
        secondsLeft = currentSeconds;
        timerText.textContent = secondsLeft > 0 ? secondsLeft.toString() : '✓';
        if (secondsLeft === 0) {
          timerText.style.color = '#10b981';
        }
      }

      if (progress >= 1) {
        clearInterval(interval);
        
        // Success completion
        setTimeout(() => {
          cleanup(true);
        }, 300);
      }
    }, 50);

    // Close/Cancel action
    const handleCancel = () => {
      clearInterval(interval);
      cleanup(false);
    };

    closeBtn.onclick = handleCancel;

    function cleanup(isSuccess: boolean) {
      overlay.style.opacity = '0';
      card.style.transform = 'scale(0.9)';
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        if (isSuccess) {
          resolve();
        } else {
          reject(new Error('User skipped the ad.'));
        }
      }, 300);
    }
  });
}

// Global caching for Ad controllers to prevent duplicate init
const controllersMap = new Map<string, AdsgramController>();

export const AdsgramService = {
  /**
   * Triggers a rewarded video ad.
   * If in development/dev-mode or if Adsgram fails, it plays the Mock player overlay.
   * @param blockId The ad block ID to request.
   */
  showAd: async (blockId: string): Promise<void> => {
    const isDevMode = localStorage.getItem('is_dev_mode') === 'true';
    
    // Resolve block ID: if a dummy placeholder is passed, map it to your live block ID '32937'
    // or read it dynamically from the Vite environment variable VITE_ADSGRAM_BLOCK_ID.
    let targetBlockId = blockId;
    const isValidFormat = /^\d+$/.test(blockId) || /^int-\d+$/.test(blockId);
    
    if (!isValidFormat) {
      const envBlockId = import.meta.env.VITE_ADSGRAM_BLOCK_ID;
      if (envBlockId && (/^\d+$/.test(envBlockId) || /^int-\d+$/.test(envBlockId))) {
        targetBlockId = envBlockId;
      } else {
        targetBlockId = '32937';
      }
      console.log(`Adsgram: Mapping dummy blockId '${blockId}' to live blockId '${targetBlockId}'`);
    }

    // If in dev mode, immediately fallback to our gorgeous mock player
    if (isDevMode) {
      console.log(`Adsgram: Dev mode active. Playing mock rewarded video for blockId: ${targetBlockId}...`);
      return showMockAdModal();
    }

    // 2. If Adsgram script loaded successfully in production
    if (window.Adsgram) {
      try {
        let controller = controllersMap.get(targetBlockId);
        if (!controller) {
          controller = window.Adsgram.init({ blockId: targetBlockId });
          controllersMap.set(targetBlockId, controller);
        }
        
        console.log(`Adsgram: Invoking live ad block: ${blockId}`);
        await controller.show();
        console.log('Adsgram: Live ad watched completely!');
        return;
      } catch (err) {
        console.warn('Adsgram: Live ad failed or was skipped. Details:', err);
        // If the error indicates a genuine loading failure (e.g. ad blocker, network),
        // we can fallback to the mock player so the app is still functional for testing/review.
        // If it's a manual user close, we rethrow to prevent rewarding skipped ads.
        const errMsg = String(err);
        if (
          errMsg.includes('block') || 
          errMsg.includes('Network') || 
          errMsg.includes('load') || 
          errMsg.includes('fail') ||
          (err && typeof err === 'object' && ('error' in err || 'exception' in err))
        ) {
          console.log('Adsgram: Ad block detected or script failed. Falling back to sandbox mock.');
          return showMockAdModal();
        }
        
        // Rethrow user skip errors or explicit rejections
        throw err;
      }
    } else {
      // 3. Script not loaded (e.g. offline, blocked, or not added)
      console.warn('Adsgram: SDK not found on window. Falling back to sandbox mock...');
      return showMockAdModal();
    }
  }
};
