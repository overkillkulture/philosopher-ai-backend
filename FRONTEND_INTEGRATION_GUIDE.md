# Frontend Integration Guide

**API Base URL**: `https://cloud-funnel-production.up.railway.app/api/v1`
**Version**: 1.0.0
**Last Updated**: November 7, 2025

This guide provides practical examples for integrating the Philosopher AI backend into your frontend application.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication Flow](#authentication-flow)
3. [Making API Requests](#making-api-requests)
4. [Common Use Cases](#common-use-cases)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)
7. [Code Examples](#code-examples)

---

## Quick Start

### 1. Install HTTP Client

```bash
npm install axios
# or
npm install @tanstack/react-query axios
```

### 2. Create API Client

```javascript
// api/client.js
import axios from 'axios';

const API_BASE_URL = 'https://cloud-funnel-production.up.railway.app/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookie-based auth
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 3. First API Call

```javascript
import apiClient from './api/client';

// Check if API is healthy
async function checkHealth() {
  try {
    const data = await apiClient.get('/health');
    console.log('API Status:', data.status); // "healthy"
  } catch (error) {
    console.error('API is down:', error);
  }
}
```

---

## Authentication Flow

### Registration → Login → Authenticated Requests

```javascript
// auth.js
import apiClient from './api/client';

export const authService = {
  // Register new user
  async register(email, password, username) {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      username,
      signupSource: 'web',
    });

    // Store token
    localStorage.setItem('auth_token', response.token);

    // Welcome email sent automatically by backend
    return response.user;
  },

  // Login existing user
  async login(email, password) {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });

    // Store token
    localStorage.setItem('auth_token', response.token);

    return response.user;
  },

  // Logout
  async logout() {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  },

  // Get current user
  async getCurrentUser() {
    return await apiClient.get('/auth/me');
  },

  // Check if token is valid
  async verifyToken() {
    try {
      const response = await apiClient.get('/auth/verify');
      return response.valid;
    } catch {
      return false;
    }
  },
};
```

### React Hook Example

```javascript
// hooks/useAuth.js
import { useState, useEffect } from 'react';
import { authService } from '../api/auth';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const isValid = await authService.verifyToken();
      if (isValid) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    setLoading(true);
    setError(null);
    try {
      const user = await authService.login(email, password);
      setUser(user);
      return user;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function register(email, password, username) {
    setLoading(true);
    setError(null);
    try {
      const user = await authService.register(email, password, username);
      setUser(user);
      return user;
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  return { user, loading, error, login, register, logout };
}
```

---

## Making API Requests

### GET Request

```javascript
// Fetch user profile
async function getProfile() {
  const profile = await apiClient.get('/profile/me');
  return profile;
}
```

### POST Request

```javascript
// Ask a question
async function askQuestion(questionText) {
  const response = await apiClient.post('/questions/ask', {
    question: questionText,
    category: 'philosophy',
  });
  return response;
}
```

### PUT Request

```javascript
// Update profile
async function updateProfile(updates) {
  const profile = await apiClient.put('/profile/me', {
    displayName: updates.displayName,
    bio: updates.bio,
    avatarUrl: updates.avatarUrl,
  });
  return profile;
}
```

### PATCH Request

```javascript
// Update preferences
async function updatePreferences(prefs) {
  const response = await apiClient.patch('/profile/me/preferences', {
    preferences: prefs,
  });
  return response;
}
```

### DELETE Request

```javascript
// Delete account
async function deleteAccount(password) {
  await apiClient.delete('/profile/me', {
    data: { confirmPassword: password },
  });
}
```

---

## Common Use Cases

### 1. User Registration & Login

```javascript
// components/RegisterForm.jsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await register(email, password, username);
      navigate('/dashboard'); // Redirect after successful registration
    } catch (err) {
      // Error already handled by useAuth
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (min 8 chars)"
        required
        minLength={8}
      />
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

### 2. Password Reset Flow

```javascript
// api/passwordReset.js
import apiClient from './client';

export const passwordResetService = {
  // Step 1: Request reset email
  async requestReset(email) {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response;
  },

  // Step 2: Verify reset token (optional - check before showing reset form)
  async verifyResetToken(token) {
    const response = await apiClient.get(`/auth/verify-reset-token/${token}`);
    return response;
  },

  // Step 3: Complete password reset
  async resetPassword(token, newPassword) {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response;
  },
};

// components/ForgotPasswordForm.jsx
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    await passwordResetService.requestReset(email);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div>
        <h2>Check Your Email</h2>
        <p>If an account exists for {email}, you'll receive a password reset link.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Reset Password</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit">Send Reset Link</button>
    </form>
  );
}

// components/ResetPasswordForm.jsx
import { useSearchParams, useNavigate } from 'react-router-dom';

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      await passwordResetService.resetPassword(token, newPassword);
      alert('Password reset successfully!');
      navigate('/login');
    } catch (error) {
      alert('Reset failed. Link may be expired.');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Set New Password</h2>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password (min 8 chars)"
        required
        minLength={8}
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
        required
      />
      <button type="submit">Reset Password</button>
    </form>
  );
}
```

### 3. Asking Questions

```javascript
// api/questions.js
import apiClient from './client';

export const questionService = {
  async ask(question, category = 'philosophy') {
    const response = await apiClient.post('/questions/ask', {
      question,
      category,
      context: '', // Optional: previous conversation context
    });
    return response;
  },

  async getHistory(limit = 50, offset = 0) {
    const response = await apiClient.get('/questions/history', {
      params: { limit, offset },
    });
    return response;
  },

  async getUsageStats() {
    const response = await apiClient.get('/usage/stats');
    return response;
  },
};

// components/QuestionBox.jsx
import { useState } from 'react';
import { questionService } from '../api/questions';

export function QuestionBox() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usageStats, setUsageStats] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await questionService.ask(question);
      setAnswer(response.answer);

      // Update usage stats
      const stats = await questionService.getUsageStats();
      setUsageStats(stats);

      setQuestion(''); // Clear input
    } catch (error) {
      if (error.response?.status === 429) {
        alert('Question limit reached for this month. Please upgrade or wait until next month.');
      } else {
        alert('Failed to get answer. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a philosophical question..."
          rows={4}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Thinking...' : 'Ask Question'}
        </button>
      </form>

      {usageStats && (
        <div className="usage-info">
          Questions used: {usageStats.questionsUsed} / {usageStats.questionsLimit}
        </div>
      )}

      {answer && (
        <div className="answer">
          <h3>Answer:</h3>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}
```

### 4. Profile Management

```javascript
// api/profile.js
import apiClient from './client';

export const profileService = {
  async getProfile() {
    return await apiClient.get('/profile/me');
  },

  async updateProfile(updates) {
    return await apiClient.put('/profile/me', updates);
  },

  async updatePreferences(preferences) {
    return await apiClient.patch('/profile/me/preferences', { preferences });
  },

  async getPublicProfile(username) {
    return await apiClient.get(`/profile/user/${username}`);
  },

  async deleteAccount(password) {
    return await apiClient.delete('/profile/me', {
      data: { confirmPassword: password },
    });
  },
};

// components/ProfileEditor.jsx
import { useState, useEffect } from 'react';
import { profileService } from '../api/profile';

export function ProfileEditor() {
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const data = await profileService.getProfile();
    setProfile(data);
    setDisplayName(data.displayName || '');
    setBio(data.bio || '');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const updated = await profileService.updateProfile({
        displayName,
        bio,
      });
      setProfile(updated);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <div>Loading...</div>;

  return (
    <form onSubmit={handleSave}>
      <h2>Edit Profile</h2>

      <div>
        <label>Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your display name"
        />
      </div>

      <div>
        <label>Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          rows={4}
        />
      </div>

      <div className="stats">
        <p>Tier: {profile.tier}</p>
        <p>Consciousness Level: {profile.consciousnessLevel}</p>
        <p>Total Questions: {profile.totalQuestions}</p>
      </div>

      <button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
```

### 5. Subscription Management

```javascript
// api/subscriptions.js
import apiClient from './client';

export const subscriptionService = {
  async createCheckoutSession(tier, billingPeriod = 'monthly') {
    const response = await apiClient.post('/subscriptions/create-checkout', {
      tier,
      billing_period: billingPeriod,
    });
    return response;
  },

  async getCurrentSubscription() {
    return await apiClient.get('/subscriptions/current');
  },
};

// components/UpgradeButton.jsx
import { subscriptionService } from '../api/subscriptions';

export function UpgradeButton({ tier = 'pro' }) {
  async function handleUpgrade() {
    try {
      const { url } = await subscriptionService.createCheckoutSession(tier, 'monthly');

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      alert('Failed to start checkout');
    }
  }

  const prices = {
    student: '$9.99/mo',
    teacher: '$19.99/mo',
    pro: '$29.99/mo',
    philosopher: '$49.99/mo',
  };

  return (
    <button onClick={handleUpgrade}>
      Upgrade to {tier} - {prices[tier]}
    </button>
  );
}
```

### 6. Workspace & Conversations

```javascript
// api/workspace.js
import apiClient from './client';

export const workspaceService = {
  // Conversations
  async getConversations(limit = 50, offset = 0) {
    return await apiClient.get('/workspace/conversations', {
      params: { limit, offset },
    });
  },

  async getConversation(id) {
    return await apiClient.get(`/workspace/conversations/${id}`);
  },

  async createConversation(title, initialMessage) {
    return await apiClient.post('/workspace/conversations', {
      title,
      initial_message: initialMessage,
    });
  },

  async updateConversation(id, updates) {
    return await apiClient.patch(`/workspace/conversations/${id}`, updates);
  },

  async deleteConversation(id) {
    return await apiClient.delete(`/workspace/conversations/${id}`);
  },

  // Chat
  async sendMessage(conversationId, message) {
    return await apiClient.post('/workspace/chat', {
      conversation_id: conversationId,
      message,
      stream: false,
    });
  },

  // Search
  async search(query, limit = 20) {
    return await apiClient.get('/workspace/search', {
      params: { q: query, limit },
    });
  },
};

// components/ConversationList.jsx
import { useState, useEffect } from 'react';
import { workspaceService } from '../api/workspace';

export function ConversationList() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const data = await workspaceService.getConversations();
      setConversations(data.conversations);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    const title = prompt('Conversation title:');
    if (title) {
      const conv = await workspaceService.createConversation(title, '');
      setConversations([conv, ...conversations]);
    }
  }

  async function handleDelete(id) {
    if (confirm('Delete this conversation?')) {
      await workspaceService.deleteConversation(id);
      setConversations(conversations.filter(c => c.id !== id));
    }
  }

  if (loading) return <div>Loading conversations...</div>;

  return (
    <div>
      <button onClick={handleCreate}>New Conversation</button>

      <ul>
        {conversations.map(conv => (
          <li key={conv.id}>
            <a href={`/conversation/${conv.id}`}>
              {conv.title}
            </a>
            <span>{conv.message_count} messages</span>
            <button onClick={() => handleDelete(conv.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Error Handling

### Global Error Handler

```javascript
// utils/errorHandler.js

export class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'APIError';
  }
}

export function handleAPIError(error) {
  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return new APIError(
          data.error || 'Invalid request',
          400,
          'BAD_REQUEST'
        );

      case 401:
        return new APIError(
          'You must be logged in to do that',
          401,
          'UNAUTHORIZED'
        );

      case 403:
        return new APIError(
          'You don\'t have permission to do that',
          403,
          'FORBIDDEN'
        );

      case 404:
        return new APIError(
          'Resource not found',
          404,
          'NOT_FOUND'
        );

      case 409:
        return new APIError(
          data.error || 'Resource already exists',
          409,
          'CONFLICT'
        );

      case 429:
        return new APIError(
          'Too many requests. Please try again later',
          429,
          'RATE_LIMITED'
        );

      case 500:
        return new APIError(
          'Server error. Please try again',
          500,
          'SERVER_ERROR'
        );

      default:
        return new APIError(
          data.error || 'Something went wrong',
          status,
          'UNKNOWN_ERROR'
        );
    }
  } else if (error.request) {
    // Request made but no response
    return new APIError(
      'No response from server. Check your connection',
      0,
      'NO_RESPONSE'
    );
  } else {
    // Something else went wrong
    return new APIError(
      error.message,
      0,
      'REQUEST_ERROR'
    );
  }
}

// Use in components
try {
  await apiClient.post('/auth/login', { email, password });
} catch (error) {
  const apiError = handleAPIError(error);
  console.error(apiError.message, apiError.code);

  if (apiError.code === 'RATE_LIMITED') {
    // Show rate limit message
  }
}
```

### React Error Boundary

```javascript
// components/ErrorBoundary.jsx
import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page">
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Best Practices

### 1. Token Management

```javascript
// Store tokens securely
localStorage.setItem('auth_token', token);

// Always include token in requests
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Remove token on logout
localStorage.removeItem('auth_token');

// Refresh token before it expires (if implementing refresh tokens)
```

### 2. Rate Limiting

```javascript
// Implement client-side debouncing
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (query) => {
  const results = await apiClient.get('/workspace/search', {
    params: { q: query },
  });
  setResults(results);
}, 500); // Wait 500ms after user stops typing
```

### 3. Loading States

```javascript
function QuestionForm() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.post('/questions/ask', data);
    } finally {
      setLoading(false); // Always reset loading state
    }
  }

  return (
    <button type="submit" disabled={loading}>
      {loading ? 'Loading...' : 'Submit'}
    </button>
  );
}
```

### 4. Caching with React Query

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './api/client';

// Fetch user profile with caching
function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.get('/profile/me'),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
}

// Update profile with cache invalidation
function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates) => apiClient.put('/profile/me', updates),
    onSuccess: () => {
      // Invalidate profile cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// Usage in component
function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{profile.displayName}</h1>
      <button onClick={() => updateProfile.mutate({ bio: 'New bio' })}>
        Update Bio
      </button>
    </div>
  );
}
```

### 5. Environment Variables

```bash
# .env
VITE_API_BASE_URL=https://cloud-funnel-production.up.railway.app/api/v1
VITE_APP_NAME=Philosopher AI
```

```javascript
// config.js
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  appName: import.meta.env.VITE_APP_NAME,
};

// Use in API client
const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
});
```

---

## Code Examples

### Complete Authentication Setup (React + TypeScript)

```typescript
// types/auth.ts
export interface User {
  id: string;
  email: string;
  username: string;
  tier: 'free' | 'student' | 'teacher' | 'pro' | 'philosopher';
  questionsUsed: number;
  questionsLimit: number;
  consciousnessLevel: number;
}

export interface AuthResponse {
  success: true;
  user: User;
  token: string;
}

// api/auth.ts
import axios from 'axios';
import type { User, AuthResponse } from '../types/auth';

const API_BASE_URL = 'https://cloud-funnel-production.up.railway.app/api/v1';

class AuthService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  async register(email: string, password: string, username?: string): Promise<User> {
    const response = await axios.post<AuthResponse>(
      `${API_BASE_URL}/auth/register`,
      { email, password, username }
    );

    this.setToken(response.data.token);
    return response.data.user;
  }

  async login(email: string, password: string): Promise<User> {
    const response = await axios.post<AuthResponse>(
      `${API_BASE_URL}/auth/login`,
      { email, password }
    );

    this.setToken(response.data.token);
    return response.data.user;
  }

  async logout(): Promise<void> {
    await axios.post(`${API_BASE_URL}/auth/logout`);
    this.removeToken();
  }

  async getCurrentUser(): Promise<User> {
    const response = await axios.get<User>(
      `${API_BASE_URL}/auth/me`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  private setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  private removeToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private getHeaders(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  getToken(): string | null {
    return this.token;
  }
}

export const authService = new AuthService();

// context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../api/auth';
import type { User } from '../types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      if (authService.getToken()) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      authService.logout();
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const user = await authService.login(email, password);
    setUser(user);
  }

  async function register(email: string, password: string, username?: string) {
    const user = await authService.register(email, password, username);
    setUser(user);
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

## Testing API Integration

### Manual Testing with Postman/Bruno

1. **Health Check**
   - Method: GET
   - URL: `https://cloud-funnel-production.up.railway.app/api/v1/health`
   - Expected: 200 OK with `{"status": "healthy"}`

2. **Register**
   - Method: POST
   - URL: `https://cloud-funnel-production.up.railway.app/api/v1/auth/register`
   - Body:
     ```json
     {
       "email": "test@example.com",
       "password": "TestPassword123!",
       "username": "testuser"
     }
     ```
   - Expected: 201 Created with user object and token

3. **Login**
   - Method: POST
   - URL: `https://cloud-funnel-production.up.railway.app/api/v1/auth/login`
   - Body:
     ```json
     {
       "email": "test@example.com",
       "password": "TestPassword123!"
     }
     ```
   - Expected: 200 OK with user object and token

4. **Get Profile** (Authenticated)
   - Method: GET
   - URL: `https://cloud-funnel-production.up.railway.app/api/v1/profile/me`
   - Headers:
     ```
     Authorization: Bearer YOUR_TOKEN_HERE
     ```
   - Expected: 200 OK with profile data

---

## Support

**API Documentation**: See `API_DOCUMENTATION.md` for complete endpoint reference

**Issues**: Report integration issues on GitHub

**Backend URL**: https://cloud-funnel-production.up.railway.app

**Health Check**: https://cloud-funnel-production.up.railway.app/api/v1/health

---

**Generated by**: C1 Mechanic - Autonomous Production Mode
**Last Updated**: November 7, 2025
**Status**: Production Ready
