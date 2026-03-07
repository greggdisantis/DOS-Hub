import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAuth, logout as logoutUser, type User } from '@/lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const currentUser = await checkAuth();
        setUser(currentUser);
        if (!currentUser) {
          navigate('/login', { replace: true });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auth check failed');
        navigate('/login', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [navigate]);

  const logout = async () => {
    try {
      await logoutUser();
      setUser(null);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    logout,
  };
};
