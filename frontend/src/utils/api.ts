const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${text.substring(0, 100) || response.statusText}`);
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `HTTP Error ${response.status}`);
  }

  return data;
}
