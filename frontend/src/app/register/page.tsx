"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Badge } from "@/components/atoms/Badge";
import { ShieldCheck, AlertCircle, KeyRound, Mail, ArrowRight, Clipboard, CheckCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
const ROLE_SELECT_LABEL = "Select System Role";

export default function RegisterPage() {
  const router = useRouter();

  // Registration step state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Viewer");
  const [tenantId, setTenantId] = useState("");
  
  // Setup flow state
  const [step, setStep] = useState<"register" | "mfa_setup" | "recovery_codes">("register");
  const [otpSecret, setOtpSecret] = useState("");
  const [otpUri, setOtpUri] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  
  // General UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authService.register({
        email,
        password,
        role,
        tenant_id: tenantId || undefined,
      });
      setOtpSecret(res.otp_secret);
      setOtpUri(res.otp_uri);
      setStep("mfa_setup");
    } catch (err: any) {
      setError(err.message || "Failed to register account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authService.mfaEnable({
        email,
        code: mfaCode,
      });
      setRecoveryCodes(res.recovery_codes);
      setStep("recovery_codes");
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    const text = recoveryCodes.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            Create compliance workspace account
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

        {/* Step Rendering */}
        <AnimatePresence mode="wait">
          {step === "register" && (
            <motion.form
              key="register-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleRegisterSubmit}
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

              <Input
                label="Security Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
              />

              <div className="space-y-1">
                <label
                  htmlFor="role-select"
                  className="text-[13px] font-semibold text-slate-700 dark:text-slate-300"
                >{ROLE_SELECT_LABEL}</label>
                <select
                  id="role-select"
                  name="role"
                  title="Select System Role"
                  aria-label="Select System Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-900 dark:text-slate-100"
                >
                  <option value="Viewer">Viewer (Read-Only)</option>
                  <option value="GRC Analyst">GRC Analyst (Write & Assess)</option>
                  <option value="Administrator">Administrator (Full Control)</option>
                </select>
              </div>

              <Input
                label="Join Existing Tenant ID (Optional)"
                placeholder="Leave blank to generate a new workspace"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              />

              <Button
                type="submit"
                className="w-full justify-center h-11"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Register & Setup MFA
              </Button>

              <div className="text-center pt-2">
                <span className="text-body-sm text-slate-500 dark:text-slate-400">
                  Already have an account?{" "}
                </span>
                <Link
                  href="/login"
                  className="text-body-sm font-semibold text-primary hover:underline dark:text-slate-300"
                >
                  Log in
                </Link>
              </div>
            </motion.form>
          )}

          {step === "mfa_setup" && (
            <motion.form
              key="mfa-setup-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleMfaVerifySubmit}
              className="space-y-4"
            >
              <div className="text-left p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <p className="text-body-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-600" />
                  Authenticator App Configuration
                </p>
                <p className="text-body-xs text-slate-600 dark:text-slate-400">
                  Scan the provisioning URI inside your authenticator app (such as Google Authenticator or 1Password) or copy the manual code:
                </p>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2.5 font-mono text-center select-all tracking-wider text-body-md font-bold text-primary dark:text-emerald-400">
                  {otpSecret}
                </div>
                <p className="text-[10px] text-slate-400 break-all select-all font-mono">
                  {otpUri}
                </p>
              </div>

              <Input
                label="6-Digit Verification Code"
                type="text"
                maxLength={6}
                placeholder="e.g. 123456"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                className="text-center font-mono tracking-widest text-headline-sm"
              />

              <Button
                type="submit"
                className="w-full justify-center h-11"
                isLoading={isLoading}
                rightIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Verify & Activate Account
              </Button>
            </motion.form>
          )}

          {step === "recovery_codes" && (
            <motion.div
              key="recovery-codes-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl space-y-2 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <p className="text-body-sm font-bold text-emerald-800 dark:text-emerald-300">
                  Security Configuration Complete!
                </p>
                <p className="text-body-xs text-slate-600 dark:text-slate-400">
                  MFA has been successfully verified. Please copy and store these 5 emergency recovery backup codes in a secure location. Each code can be used exactly once to log in if you lose access to your authenticator app.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 font-mono text-center text-body-sm space-y-1.5">
                {recoveryCodes.map((code) => (
                  <div key={code} className="text-slate-800 dark:text-slate-200 tracking-widest font-bold">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 justify-center"
                  onClick={copyToClipboard}
                  leftIcon={copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Clipboard className="w-4 h-4" />}
                >
                  {copied ? "Copied!" : "Copy Codes"}
                </Button>
                <Link href="/login" className="flex-1">
                  <Button type="button" className="w-full justify-center">
                    Proceed to Login
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
