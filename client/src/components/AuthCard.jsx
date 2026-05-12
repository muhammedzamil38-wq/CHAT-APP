import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Sun, Moon } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = loginSchema.extend({
  username: z.string().min(3),
});

export function AuthCard() {
  const [isLogin, setIsLogin] = useState(true);
  const [showOTP, setShowOTP] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema),
    defaultValues: { email: '', password: '', username: '' },
  });

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const onSubmit = async (data) => {
    try {
      if (isLogin) {
        if (!showOTP) {
          // Step 1: Request Login (2FA)
          await api.post('/api/auth/login-request', data);
          setShowOTP(true);
          toast.info('2FA Required', { description: 'Please check your email for the login code.' });
        } else {
          // Step 2: Verify Login OTP
          const res = await api.post('/api/auth/login-verify', { ...data, otp: otpValue });
          login(res.data.user);
          toast.success('Welcome back', { description: 'Successfully signed into Gossip.' });
          navigate('/dashboard');
        }
      } else if (!showOTP) {
        // Step 1: Request Registration
        await api.post('/api/auth/register-request', data);
        setShowOTP(true);
        toast.info('Verification Required', { description: 'Please check your email for the 6-digit code.' });
      } else {
        // Step 2: Verify Registration OTP
        const res = await api.post('/api/auth/register-verify', { ...data, otp: otpValue });
        login(res.data.user);
        toast.success('Account Activated', { description: 'Welcome to the Gossip crew.' });
        navigate('/dashboard');
      }
    } catch (error) {
      const serverMessage = error.response?.data?.message;
      toast.error('Mission Blocked', { description: serverMessage || 'Authentication failed.' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="glass relative overflow-hidden shadow-2xl border-border/40">
        <CardHeader className="text-center pb-6 pt-8 relative">
          <div className="absolute top-4 right-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight mb-1">Gossip</CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLogin ? 'Sign in to sync your conversations.' : 'Create an account to start chatting.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <AnimatePresence mode="wait">
              {showOTP ? (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4 py-4"
                >
                  <div className="text-center space-y-2">
                    <Label className="text-lg font-bold">Enter Verification Code</Label>
                    <p className="text-xs text-muted-foreground">You may check your spam folder too.</p>
                    <p className="text-xs text-muted-foreground">Sent to {form.getValues('email')}</p>
                  </div>
                  <Input
                    placeholder="000000"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-3xl tracking-[0.5em] font-bold h-16 bg-background/40 border-primary/30"
                  />
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-xs"
                    onClick={() => setShowOTP(false)}
                  >
                    Change Email
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="fields"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="johndoe"
                        {...form.register('username')}
                        className="bg-background/40 border-border/50"
                      />
                      {form.formState.errors.username && (
                        <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      {...form.register('email')}
                      className="bg-background/40 border-border/50"
                    />
                    {form.formState.errors.email && (
                      <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      {...form.register('password')}
                      className="bg-background/40 border-border/50"
                    />
                    {form.formState.errors.password && (
                      <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              className="w-full !mt-8 transition-all hover:scale-[1.02]"
              disabled={form.formState.isSubmitting || (showOTP && otpValue.length !== 6)}
            >
              {isLogin ? (showOTP ? 'Verify Login' : 'Sign In') : (showOTP ? 'Activate Account' : 'Initialize Uplink')}
            </Button>

            {!showOTP && (
              <>
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/40"></span>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-white/5 border-border/40 hover:bg-white/10 hover:text-foreground transition-all flex items-center justify-center gap-3"
                  onClick={() => {
                    const apiBase = import.meta.env.VITE_API_URL || '';
                    window.location.href = `${apiBase}/api/auth/google`;
                  }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
              </>
            )}
          </form>
        </CardContent>

        <CardFooter className="justify-center pt-2 pb-8">
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setShowOTP(false);
                setOtpValue('');
                form.reset();
              }}
              className="text-primary font-medium hover:text-primary/80 transition-colors"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
