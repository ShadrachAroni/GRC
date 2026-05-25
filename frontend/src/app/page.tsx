"use client";

import React, { useState } from "react";
import { PageLayout } from "@/components/templates/PageLayout";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { Input } from "@/components/atoms/Input";
import { Checkbox } from "@/components/atoms/Checkbox";
import {
  Shield,
  Send,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  Terminal,
} from "lucide-react";

export default function Home() {
  const [clickCount, setClickCount] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputError, setInputError] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsError, setTermsError] = useState("");

  const triggerLoader = () => {
    setButtonLoading(true);
    setTimeout(() => {
      setButtonLoading(false);
      setClickCount((c) => c + 1);
    }, 2000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!inputText) {
      setInputError("This field is required.");
      valid = false;
    } else {
      setInputError("");
    }

    if (!termsChecked) {
      setTermsError("You must accept the terms.");
      valid = false;
    } else {
      setTermsError("");
    }

    if (valid) {
      alert("Form submitted successfully!");
    }
  };

  const breadcrumbs = [
    { label: "Design System", href: "/" },
    { label: "Component Showcase" },
  ];

  return (
    <PageLayout breadcrumbs={breadcrumbs} title="Design System & Styleguide">
      <div className="space-y-12">
        {/* Intro */}
        <section className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-headline-sm font-bold mb-2 text-primary dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-success-emerald" />
            SecureBank GRC Design System
          </h2>
          <p className="text-body-md text-secondary dark:text-slate-400">
            Welcome to the component styleguide for the SecureBank Governance, Risk, and Compliance system.
            This showcase displays the custom elements implemented in Phase 02, including responsive grid rules, semantic color contrast compliance, and full keyboard/screen-reader accessibility.
          </p>
        </section>

        {/* Core Colors & Tokens */}
        <section className="space-y-6">
          <h3 className="text-headline-sm font-bold text-primary dark:text-slate-100 border-b border-surface-border dark:border-slate-800 pb-2">
            1. Core Color System
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 shadow-sm text-left">
              <div className="w-full h-12 rounded bg-[#0F172A] border border-slate-200 dark:border-slate-700 mb-2" />
              <p className="text-body-sm font-bold text-primary dark:text-slate-200">Primary (Navy)</p>
              <code className="text-data-mono text-secondary dark:text-slate-400">#0F172A</code>
            </div>
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 shadow-sm text-left">
              <div className="w-full h-12 rounded bg-[#334155] border border-slate-200 dark:border-slate-700 mb-2" />
              <p className="text-body-sm font-bold text-primary dark:text-slate-200">Secondary (Slate)</p>
              <code className="text-data-mono text-secondary dark:text-slate-400">#334155</code>
            </div>
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 shadow-sm text-left">
              <div className="w-full h-12 rounded bg-[#059669] mb-2" />
              <p className="text-body-sm font-bold text-primary dark:text-slate-200">Success</p>
              <code className="text-data-mono text-secondary dark:text-slate-400">#059669</code>
            </div>
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 shadow-sm text-left">
              <div className="w-full h-12 rounded bg-[#D97706] mb-2" />
              <p className="text-body-sm font-bold text-primary dark:text-slate-200">Warning</p>
              <code className="text-data-mono text-secondary dark:text-slate-400">#D97706</code>
            </div>
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 shadow-sm text-left">
              <div className="w-full h-12 rounded bg-[#E11D48] mb-2" />
              <p className="text-body-sm font-bold text-primary dark:text-slate-200">Danger</p>
              <code className="text-data-mono text-secondary dark:text-slate-400">#E11D48</code>
            </div>
          </div>
        </section>

        {/* Buttons Section */}
        <section className="space-y-6">
          <h3 className="text-headline-sm font-bold text-primary dark:text-slate-100 border-b border-surface-border dark:border-slate-800 pb-2">
            2. Button Atoms
          </h3>
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-6">
            {/* Variants */}
            <div>
              <h4 className="text-body-sm font-semibold text-secondary dark:text-slate-400 mb-3 uppercase tracking-wider">Variants</h4>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="tertiary">Tertiary Button</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h4 className="text-body-sm font-semibold text-secondary dark:text-slate-400 mb-3 uppercase tracking-wider">Sizes</h4>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="sm">Small (sm)</Button>
                <Button size="md">Medium (md)</Button>
                <Button size="lg">Large (lg)</Button>
              </div>
            </div>

            {/* States & Icons */}
            <div>
              <h4 className="text-body-sm font-semibold text-secondary dark:text-slate-400 mb-3 uppercase tracking-wider">Interactive States & Icons</h4>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => setClickCount((c) => c + 1)}>
                  Interactive Click Count: {clickCount}
                </Button>
                <Button isLoading={buttonLoading} onClick={triggerLoader}>
                  {buttonLoading ? "Loading..." : "Trigger 2s Loader"}
                </Button>
                <Button leftIcon={<Send className="w-4 h-4" />}>
                  With Left Icon
                </Button>
                <Button rightIcon={<Trash2 className="w-4 h-4" />} variant="secondary">
                  Delete Action
                </Button>
                <Button disabled>Disabled State</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Badges Section */}
        <section className="space-y-6">
          <h3 className="text-headline-sm font-bold text-primary dark:text-slate-100 border-b border-surface-border dark:border-slate-800 pb-2">
            3. Badge Atoms
          </h3>
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-6">
            {/* Semantic Badges */}
            <div>
              <h4 className="text-body-sm font-semibold text-secondary dark:text-slate-400 mb-3 uppercase tracking-wider">
                Semantic Status (WCAG 2.1 AA compliant background tinting)
              </h4>
              <div className="flex flex-wrap gap-3">
                <Badge variant="success">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Success Passed
                </Badge>
                <Badge variant="warning">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Warning Pending
                </Badge>
                <Badge variant="danger">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Danger Failed
                </Badge>
                <Badge variant="info">
                  <Info className="w-3.5 h-3.5" />
                  Info Standard
                </Badge>
              </div>
            </div>

            {/* Risk Severities */}
            <div>
              <h4 className="text-body-sm font-semibold text-secondary dark:text-slate-400 mb-3 uppercase tracking-wider">
                Risk Severities
              </h4>
              <div className="flex flex-wrap gap-3">
                <Badge variant="critical">Critical Severity</Badge>
                <Badge variant="high">High Severity</Badge>
                <Badge variant="medium">Medium Severity</Badge>
                <Badge variant="low">Low Severity</Badge>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h4 className="text-body-sm font-semibold text-secondary dark:text-slate-400 mb-3 uppercase tracking-wider">
                Badge Sizes
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <Badge size="sm" variant="success">small success</Badge>
                <Badge size="md" variant="success">medium success</Badge>
                <Badge size="sm" variant="critical">small critical</Badge>
                <Badge size="md" variant="critical">medium critical</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Form Inputs & Checkbox Showcase */}
        <section className="space-y-6">
          <h3 className="text-headline-sm font-bold text-primary dark:text-slate-100 border-b border-surface-border dark:border-slate-800 pb-2">
            4. Form Atoms (Input & Checkbox)
          </h3>
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <form onSubmit={handleFormSubmit} className="max-w-md space-y-6">
              <h4 className="text-body-md font-semibold text-primary dark:text-slate-200">Interactive Form Demo</h4>
              
              <Input
                label="Compliance Asset Name"
                placeholder="e.g. Core Database Server"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (e.target.value) setInputError("");
                }}
                error={inputError}
                helperText="Enter the official unique identifier for the compliance asset."
              />

              <Checkbox
                label="I accept that this asset falls under SOX compliance standards."
                checked={termsChecked}
                onChange={(e) => {
                  setTermsChecked(e.target.checked);
                  if (e.target.checked) setTermsError("");
                }}
                error={termsError}
              />

              <div className="flex items-center gap-4">
                <Button type="submit">Submit Form</Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setInputText("");
                    setInputError("");
                    setTermsChecked(false);
                    setTermsError("");
                  }}
                >
                  Reset States
                </Button>
              </div>
            </form>

            <hr className="my-6 border-surface-border dark:border-slate-800" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Static Input Showcase */}
              <div className="space-y-4">
                <h5 className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">Input States</h5>
                <Input label="Default Empty State" placeholder="Enter text..." />
                <Input label="Disabled Input" placeholder="Cannot edit" disabled value="Locked Information" />
                <Input label="Validation Error Example" placeholder="Invalid entry" error="Format must be in IP CIDR notation (e.g., 10.0.0.0/24)" />
              </div>

              {/* Static Checkbox Showcase */}
              <div className="space-y-4">
                <h5 className="text-body-sm font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">Checkbox States</h5>
                <Checkbox label="Default Unchecked State" />
                <Checkbox label="Default Checked State" defaultChecked />
                <Checkbox label="Disabled Unchecked State" disabled />
                <Checkbox label="Disabled Checked State" disabled defaultChecked />
                <Checkbox label="Error Checkbox Example" error="Approval validation required to continue." />
              </div>
            </div>
          </div>
        </section>

        {/* Tabular Numerical Data (Font Monospace Check) */}
        <section className="space-y-6">
          <h3 className="text-headline-sm font-bold text-primary dark:text-slate-100 border-b border-surface-border dark:border-slate-800 pb-2">
            5. Data Density & Typography Monospace
          </h3>
          <div className="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-surface-border dark:border-slate-800 flex items-center justify-between">
              <span className="text-body-sm font-semibold text-secondary dark:text-slate-300">
                Sample Compliance Metrics (Tabular Number Alignment Check)
              </span>
              <Badge variant="info">
                <Terminal className="w-3.5 h-3.5" />
                JetBrains Mono
              </Badge>
            </div>
            <div className="overflow-x-auto table-scroll">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-surface-border dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-label-caps text-secondary dark:text-slate-400">
                    <th className="py-2.5 px-4">Control ID</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Failure Rate</th>
                    <th className="py-2.5 px-4 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border dark:divide-slate-800 text-body-sm text-primary dark:text-slate-200">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-4 font-mono font-medium text-data-mono">AC-01</td>
                    <td className="py-2 px-4">Access Control Policy Review</td>
                    <td className="py-2 px-4">
                      <Badge size="sm" variant="success">compliant</Badge>
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-data-mono">00.00%</td>
                    <td className="py-2 px-4 text-right font-mono text-data-mono">100 / 100</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-4 font-mono font-medium text-data-mono">SI-03</td>
                    <td className="py-2 px-4">Malicious Code Protection</td>
                    <td className="py-2 px-4">
                      <Badge size="sm" variant="warning">warning</Badge>
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-data-mono">14.28%</td>
                    <td className="py-2 px-4 text-right font-mono text-data-mono">85 / 100</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-4 font-mono font-medium text-data-mono">CM-08</td>
                    <td className="py-2 px-4">Information System Component Inventory</td>
                    <td className="py-2 px-4">
                      <Badge size="sm" variant="danger">non-compliant</Badge>
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-data-mono">48.95%</td>
                    <td className="py-2 px-4 text-right font-mono text-data-mono">51 / 100</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
