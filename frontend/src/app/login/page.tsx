"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/context/AuthStore";
import { authService } from "@/services/auth";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { ShieldCheck, AlertCircle, KeyRound, Mail, ArrowRight, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const setMfaPending = useAuthStore((state) => state.setMfaPending);
  const tempToken = useAuthStore((state) => state.tempToken);
  const mfaRequired = useAuthStore((state) => state.mfaRequired);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authService.login({ email, password });
      if (res.mfa_required) {
        setMfaPending(res.temp_token);
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authService.loginVerify({
        temp_token: tempToken!,
        code: mfaCode,
      });
      setCredentials(
        { email: res.email, tenant_id: res.tenant_id, role: res.role },
        res.access_token,
        res.refresh_token
      );
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Invalid MFA code.");
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
            SecureBank GRC Sentinel
          </h2>
          <p className="text-body-sm text-slate-500 dark:text-slate-400">
            Governance, Risk, and Compliance Portal
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

        {/* Animated Form Steps */}
        <AnimatePresence mode="wait">
          {!mfaRequired ? (
            <motion.form
              key="step-credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleCredentialsSubmit}
              className="space-y-4"
            >
              <Input
                label="Corporate Email Address"
                type="email"
                placeholder="you@securebank.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
              />

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                    Security Password
                  </label>
                  <Link
                    href="/password-reset"
                    className="text-[11px] font-medium text-primary hover:underline dark:text-slate-400"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
                />
              </div>

              <Button
                type="submit"
                className="w-full justify-center h-11"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue authentication
              </Button>

              <div className="text-center pt-2">
                <span className="text-body-sm text-slate-500 dark:text-slate-400">
                  New to GRC Sentinel?{" "}
                </span>
                <Link
                  href="/register"
                  className="text-body-sm font-semibold text-primary hover:underline dark:text-slate-300"
                >
                  Create workspace
                </Link>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="step-mfa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleMfaSubmit}
              className="space-y-4"
            >
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="text-body-sm font-bold text-slate-800 dark:text-slate-200">
                  {isRecovery ? "Enter Recovery Code" : "Multi-Factor Authentication"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isRecovery 
                    ? "Enter one of your 10-character backup recovery codes."
                    : "Enter the 6-digit code generated by your authenticator app."}
                </p>
              </div>

              <Input
                label={isRecovery ? "Recovery Backup Code" : "6-Digit TOTP Verification Code"}
                type="text"
                maxLength={isRecovery ? 10 : 6}
                placeholder={isRecovery ? "e.g. A1B2C3D4E5" : "e.g. 123456"}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.toUpperCase())}
                required
                className="text-center tracking-[0.2em] font-mono text-headline-sm"
              />

              <Button
                type="submit"
                className="w-full justify-center h-11"
                isLoading={isLoading}
                rightIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Verify & Login
              </Button>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecovery(!isRecovery);
                    setMfaCode("");
                    setError(null);
                  }}
                  className="text-body-sm font-semibold text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {isRecovery ? "Use Authenticator App" : "Use Recovery Code Backup"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // Cancel MFA step and go back
                    window.location.reload();
                  }}
                  className="text-body-sm font-semibold text-rose-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
