import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">DOS Hub</h1>
            <p className="text-sm text-muted">Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{user?.name || user?.email}</p>
              <p className="text-xs text-muted capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 bg-error hover:opacity-90 disabled:opacity-50 text-background font-semibold rounded-lg transition-opacity"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Welcome Card */}
          <div className="lg:col-span-4 bg-surface rounded-lg shadow p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground mb-2">Welcome to DOS Hub</h2>
            <p className="text-muted">
              You are successfully logged in. More modules will be added soon.
            </p>
          </div>

          {/* Placeholder Module Cards */}
          <div className="bg-surface rounded-lg shadow p-6 border border-border hover:shadow-lg transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <span className="text-xl">📊</span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">Dashboard</h3>
            <p className="text-sm text-muted">View system overview</p>
          </div>

          <div className="bg-surface rounded-lg shadow p-6 border border-border hover:shadow-lg transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <span className="text-xl">📦</span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">Projects</h3>
            <p className="text-sm text-muted">Manage projects</p>
          </div>

          <div className="bg-surface rounded-lg shadow p-6 border border-border hover:shadow-lg transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <span className="text-xl">👥</span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">Team</h3>
            <p className="text-sm text-muted">Manage team members</p>
          </div>

          <div className="bg-surface rounded-lg shadow p-6 border border-border hover:shadow-lg transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <span className="text-xl">⚙️</span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">Settings</h3>
            <p className="text-sm text-muted">Configure system</p>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-surface rounded-lg shadow p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Your Account</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted">Email</p>
              <p className="text-foreground font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Name</p>
              <p className="text-foreground font-medium">{user?.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Role</p>
              <p className="text-foreground font-medium capitalize">{user?.role}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Account Status</p>
              <p className="text-foreground font-medium">
                {user?.approved ? 'Approved' : 'Pending Approval'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
