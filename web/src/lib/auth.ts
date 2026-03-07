export interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  approved: boolean;
  openId: string;
  loginMethod: string;
  lastSignedIn: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Check if user is authenticated by making a request to the auth endpoint
export const checkAuth = async (): Promise<User | null> => {
  try {
    const response = await fetch('/api/trpc/auth.me?batch=1', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data[0]?.result?.data) {
      return data[0].result.data;
    }

    return null;
  } catch (error) {
    console.error('Auth check failed:', error);
    return null;
  }
};

// Login user
export const login = async (email: string, password: string): Promise<User> => {
  const response = await fetch('/api/trpc/auth.login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      0: {
        json: {
          email,
          password,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  const data = await response.json();
  if (Array.isArray(data) && data[0]?.result?.data?.user) {
    return data[0].result.data.user;
  }

  throw new Error('Invalid response from server');
};

// Logout user
export const logout = async (): Promise<void> => {
  try {
    await fetch('/api/trpc/auth.logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Logout failed:', error);
  }
};
