const resolveApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const trimmed = envUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    // Only use envUrl directly if it looks like a valid domain/IP (contains a dot)
    if (trimmed.includes('.')) {
      return `https://${trimmed}`;
    }
  }
  
  // Resolve URL dynamically if running on Render static hosting
  const hostname = window.location.hostname;
  if (hostname.endsWith('.onrender.com')) {
    if (hostname.includes('-frontend')) {
      return `https://${hostname.replace('-frontend', '-backend')}`;
    }
  }
  
  // Local development default fallback
  return 'http://localhost:5000';
};

const API_URL = resolveApiUrl();

interface RequestOptions extends RequestInit {
  body?: any;
}

export async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const initData = localStorage.getItem('tg_init_data') || '';
  const isDevMode = localStorage.getItem('is_dev_mode') === 'true';
  const devUserId = localStorage.getItem('dev_user_id') || '';
  const devUserName = localStorage.getItem('dev_user_name') || '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Attach Telegram initialization signature
  if (initData) {
    headers['x-telegram-init-data'] = initData;
    headers['Authorization'] = `Bearer ${initData}`;
  }

  // Attach developer headers if operating outside the Telegram client
  if (isDevMode && devUserId) {
    headers['x-dev-user-id'] = devUserId;
    headers['x-dev-username'] = devUserName;
    headers['x-dev-first-name'] = 'Dev';
    headers['x-dev-last-name'] = 'PaisaTap';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get('content-type');
  let data: any = {};

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    // If the endpoint failed or returned non-JSON content (e.g. index.html rewrite fallback)
    throw new Error(`Invalid Response: Expected JSON but received ${contentType || 'plain text'}. Status: ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(data.error || `HTTP Error ${response.status}`);
  }

  return data;
}
