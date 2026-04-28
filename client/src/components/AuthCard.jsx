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
        const res = await api.post('/api/auth/login', data);
        login(res.data.user);
        toast.success('Welcome back', { description: 'Successfully signed into Gossip.' });
        navigate('/dashboard');
      } else if (!showOTP) {
        // Step 1: Request Registration
        await api.post('/api/auth/register-request', data);
        setShowOTP(true);
        toast.info('Verification Required', { description: 'Please check your email for the 6-digit code.' });
      } else {
        // Step 2: Verify OTP
        const res = await api.post('/api/auth/register-verify', { ...data, otp: otpValue });
        login(res.data.user);
        toast.success('Account Activated', { description: 'Welcome to the Gossip crew.' });
        navigate('/dashboard');
      }
    } catch (error) {
      const serverMessage = error.response?.data?.message;
      toast.error('Mission Blocked', { description: serverMessage || 'Registration/Login failed.' });
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
              {isLogin ? 'Sign In' : (showOTP ? 'Activate Account' : 'Initialize Uplink')}
            </Button>
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
