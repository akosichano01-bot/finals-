import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      // Ito ang magtri-trigger ng red notification sa taas
      toast.error('Login failed'); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
      {/* White Card Container */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 transform transition-all">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Ancheta's Apartment
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
              Email
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="manager@ancheta.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
              Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary mt-4">
            Sign in
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-center text-xs text-slate-400 font-medium">
            Secure access for managers, staff, and tenants.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
