import React, { useState, useContext } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { api } from '../utils/api';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = useContext(AuthContext);

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect if already authenticated
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const response = await api.post('/api/auth/signup', {
        username,
        email,
        password,
      });
      await login(response.data.token);
      window.location.hash = '#/';
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-stretch bg-gray-900">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden bg-gradient-to-br from-gray-800 to-black text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_0%,white,transparent_40%)]" />
        <div className="relative z-10 max-w-md px-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">Welcome to UF XRAY</h1>
          <p className="mt-4 text-white/80">
            Securely scan files and URLs powered by modern detection techniques.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 bg-gray-900">
        <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-850/80 bg-gray-800 shadow-xl p-8">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-white">Create your account</h2>
            <p className="mt-1 text-sm text-gray-400">
              Or <Link to="/login" className="text-brand hover:text-brand-dark font-medium">sign in to your account</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="signup-username" className="block text-sm font-medium text-gray-200">Username</label>
              <input
                type="text"
                id="signup-username"
                className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-200">Email</label>
              <input
                type="email"
                id="signup-email"
                className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-200">Password</label>
              <input
                type="password"
                id="signup-password"
                className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-200">Confirm Password</label>
              <input
                type="password"
                id="signup-confirm-password"
                className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              className="w-full inline-flex justify-center items-center rounded-md bg-brand text-white px-4 py-2.5 font-semibold hover:bg-brand-dark transition"
            >
              Sign up
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            By signing up, you agree to our <a href="#" className="text-brand hover:text-brand-dark">Terms</a> and <a href="#" className="text-brand hover:text-brand-dark">Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  );
};
export default Signup;  