import React from 'react';
import { AuthCard } from '../components/AuthCard';

export function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-background overflow-hidden">
      {/* Sleek Modern Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

      {/* Abstract mesh accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] opacity-60 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] opacity-50 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <AuthCard />
      </div>
    </div>
  );
}
