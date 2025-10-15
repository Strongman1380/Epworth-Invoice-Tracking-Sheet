import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Activity, Mail, Lock, User, LogIn, Sparkles, Shield, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    if (user) {
      navigate('/plans');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        }
      } else {
        const { error } = await signUp(email, password, firstName, lastName);
        if (error) {
          setError(error.message);
        } else {
          setError('Please check your email to confirm your account');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToLogin = () => {
    setIsLogin(true);
    setError('');
    // Keep the email if it was already entered
  };

  const handleAdminAccess = () => {
    navigate('/admin');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl animate-bounce"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-purple-400/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 right-10 w-16 h-16 bg-teal-400/30 rounded-full blur-lg animate-bounce delay-500"></div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-purple-600/5"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Enhanced Header with Animation */}
          <div className={`text-center space-y-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex items-center justify-center relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-white/20">
                <Activity className="h-12 w-12 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-primary to-blue-600 bg-clip-text text-transparent">
                PulsePoint
              </h1>
              <p className="text-lg text-slate-600 font-medium">Track trauma. Strengthen support.</p>
              <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
                <Shield className="h-4 w-4" />
                <span>Secure</span>
                <span>•</span>
                <Heart className="h-4 w-4" />
                <span>Compassionate</span>
                <span>•</span>
                <Sparkles className="h-4 w-4" />
                <span>Professional</span>
              </div>
            </div>
          </div>

          {/* Enhanced Auth Form */}
          <Card className={`w-full backdrop-blur-xl bg-white/80 border-white/20 shadow-2xl transition-all duration-700 hover:shadow-3xl ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-slate-900 flex items-center justify-center space-x-2">
                <div className="flex items-center space-x-2">
                  {isLogin ? (
                    <>
                      <LogIn className="h-6 w-6 text-primary" />
                      <span>Welcome Back</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-6 w-6 text-primary" />
                      <span>Join PulsePoint</span>
                    </>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Login Button for Sign Up page */}
              {!isLogin && (
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSwitchToLogin}
                    className="w-full border-primary/30 text-primary hover:bg-primary hover:text-white transition-all duration-300 transform hover:scale-105"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Login with Existing Account
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gradient-to-r from-transparent via-slate-300 to-transparent" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white/80 px-3 py-1 text-slate-500 rounded-full">Or create new account</span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">First Name</Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="pl-10 border-slate-200 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">Last Name</Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="pl-10 border-slate-200 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 border-slate-200 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 border-slate-200 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50/80 backdrop-blur-sm border border-red-200 p-3 rounded-lg animate-fade-in">
                    {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      {isLogin ? <LogIn className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                      <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                    </div>
                  )}
                </Button>
              </form>

              <div className="text-center space-y-3">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-primary hover:text-primary/80 hover:underline transition-all duration-300 font-medium"
                >
                  {isLogin 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"
                  }
                </button>

                {/* Admin Access Link */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white/80 px-2 text-slate-400">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAdminAccess}
                  className="flex items-center justify-center space-x-2 text-sm text-red-600 hover:text-red-700 hover:underline transition-all duration-300 font-medium w-full py-2 rounded-lg hover:bg-red-50/50"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin Access</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
