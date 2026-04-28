import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
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
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema),
    defaultValues: { email: '', password: '', username: '' },
  });

  const { login } = useAuth();

  const onSubmit = async (data) => {
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await api.post(endpoint, data);

      login(res.data.user);

      toast.success(isLogin ? 'Welcome back' : 'Account created', {
        description: 'Successfully signed into Gossip.',
      });
      navigate('/dashboard');
    } catch (error) {
      const serverMessage = error.response?.data?.message;
      const status = error.response?.status;
      const networkError = error.message;

      toast.error(`Authentication Failed ${status ? `(${status})` : ''}`, {
        description: serverMessage || (status === 401 ? 'Invalid credentials.' : `Network or Server Error: ${networkError}`),
      });
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
        <CardHeader className="text-center pb-6 pt-8">
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
              {!isLogin && (
                <motion.div
                  key="username"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
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
                </motion.div>
              )}
            </AnimatePresence>

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

            <Button
              type="submit"
              className="w-full !mt-8 transition-all hover:scale-[1.02]"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
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
                form.reset();
              }}
              className="text-primary font-medium hover:text-primary/80 transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
