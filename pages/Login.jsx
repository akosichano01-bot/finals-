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
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Ancheta Apartment
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="input-label">
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
            <label className="input-label">
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

          <button type="submit" className="btn-primary mt-4 w-full">
            Sign in
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <p className="text-center text-xs text-slate-400 font-medium">
            Secure access for managers, staff, and tenants.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
