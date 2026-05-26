"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/auth";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { ShieldCheck, AlertCircle, KeyRound, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

function PasswordResetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // Flow step based on query param token presence
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const redirectUri = `${window.location.origin}/password-reset`;
      const res = await authService.passwordResetRequest({
        email,
        redirect_uri: redirectUri,
      });
      setSuccessMessage(res.message || "If the email address is registered, a password reset link has been sent.");
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await authService.passwordResetConfirm({
        token,
        new_password: newPassword,
      });
      setSuccessMessage("Password has been reset successfully. You can now log in.");
    } catch (err: any) {
      setError(err.message || "Invalid or expired token.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-8 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary dark:bg-slate-100 mb-2">
            <ShieldCheck className="w-7 h-7 text-white dark:text-slate-950" />
          </div>
          <h2 className="text-headline-md font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            GRC Sentinel
          </h2>
          <p className="text-body-sm text-slate-500 dark:text-slate-400">
            Password Recovery Service
          </p>
        </div>

        {/* Error Callout */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
              <p className="text-body-sm text-rose-800 dark:text-rose-300 font-medium">
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success States */}
        {successMessage ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center py-4"
          >
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-body-sm font-medium text-slate-700 dark:text-slate-300">
                {successMessage}
              </p>
            </div>
            <Link href="/login" className="block">
              <Button className="w-full justify-center">
                Back to Login
              </Button>
            </Link>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {!token ? (
              <motion.form
                key="request-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleRequestSubmit}
                className="space-y-4"
              >
                <div className="text-left p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-body-xs text-slate-600 dark:text-slate-400">
                  Enter your email address and we will send you a secure link to reset your security credentials.
                </div>

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@securebank.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                />

                <Button
                  type="submit"
                  className="w-full justify-center h-11"
                  isLoading={isLoading}
                >
                  Send Recovery Link
                </Button>

                <Link
                  href="/login"
                  className="text-body-sm font-semibold text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-1.5 justify-center pt-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </motion.form>
            ) : (
              <motion.form
                key="confirm-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleConfirmSubmit}
                className="space-y-4"
              >
                <div className="text-left p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-body-xs text-slate-600 dark:text-slate-400">
                  Please enter and confirm your new security password.
                </div>

                <Input
                  label="New Password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
                />

                <Button
                  type="submit"
                  className="w-full justify-center h-11"
                  isLoading={isLoading}
                >
                  Set New Password
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default function PasswordResetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        Loading...
      </div>
    }>
      <PasswordResetContent />
    </Suspense>
  );
}
