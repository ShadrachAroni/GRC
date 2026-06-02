"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  ClipboardList,
  Settings,
  Search,
  Sun,
  Moon,
  Bell,
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Breadcrumbs, BreadcrumbItem } from "@/components/molecules/Breadcrumbs";
import { getVariants, slideVerticalVariants } from "@/utils/motion";
import { useAuthStore } from "@/context/AuthStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsService, Notification } from "@/services/notifications";
import { useNotification } from "@/context/NotificationContext";
import { X } from "lucide-react";

export interface PageLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  title?: string;
}

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Controls", href: "/controls", icon: ShieldCheck },
  { label: "Risks", href: "/risks", icon: AlertTriangle },
  { label: "Incidents", href: "/incidents", icon: AlertOctagon },
  { label: "Audits", href: "/audits", icon: ClipboardList },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  breadcrumbs,
  title,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showToast } = useNotification();

  const { data: notifications = [], isLoading: isNotifLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => notificationsService.getNotifications(),
    refetchInterval: 15000, // Poll every 15s
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to mark notification as read", "error");
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showToast("All notifications marked as read", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to mark all as read", "error");
    }
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const criticalNotifs = notifications.filter((n) => n.severity === "Critical" && !n.is_read);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Initialize theme and prefers-reduced-motion
  useEffect(() => {
    // Theme initialization
    const storedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (storedTheme === "dark" || (!storedTheme && systemPrefersDark)) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }

    // Prefers-reduced-motion check
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setShouldReduceMotion(motionQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setShouldReduceMotion(e.matches);
    };
    motionQuery.addEventListener("change", handleMotionChange);

    const handleThemeEvent = () => {
      const currentStored = localStorage.getItem("theme") as "light" | "dark" | null;
      if (currentStored) {
        setTheme(currentStored);
      }
    };
    window.addEventListener("theme-change", handleThemeEvent);

    return () => {
      motionQuery.removeEventListener("change", handleMotionChange);
      window.removeEventListener("theme-change", handleThemeEvent);
    };
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      window.dispatchEvent(new Event("theme-change"));
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      window.dispatchEvent(new Event("theme-change"));
    }
  };

  const motionVariants = getVariants(slideVerticalVariants, shouldReduceMotion);

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 transition-colors duration-200">
      {/* Sidebar - Desktop (260px) & Tablet (collapsed icon-only, 72px) */}
      <aside className="fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-surface-border dark:border-slate-800 transition-all duration-200 z-30 hidden md:flex flex-col w-[72px] lg:w-[260px]">
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-4 lg:px-6 border-b border-surface-border dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded bg-primary dark:bg-slate-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-white dark:text-slate-950" />
            </div>
            <span className="font-bold text-headline-sm text-primary dark:text-slate-100 whitespace-nowrap hidden lg:block">
              SecureBank GRC
            </span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label} // Tooltips on hover for tablet mode
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-body-md font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-slate-100 dark:bg-slate-800 text-primary dark:text-slate-100"
                    : "text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform duration-150", !isActive && "group-hover:scale-105")} />
                <span className="hidden lg:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Layout Slot */}
      <div className="flex flex-col min-h-screen md:pl-[72px] lg:pl-[260px] pb-16 md:pb-0 transition-all duration-200">
        {/* Topbar Header */}
        <header className="h-16 border-b border-surface-border dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
          {/* Topbar Search */}
          <div className="relative w-64 max-w-xs hidden sm:block">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search assets, risks..."
              className="w-full pl-9 pr-3 py-1.5 h-9 bg-slate-50 dark:bg-slate-800 border border-surface-border dark:border-slate-700 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            {/* Dark Mode Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2 rounded-md border border-surface-border dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-secondary dark:text-slate-300 transition-colors duration-150"
              aria-label="Toggle Dark Mode"
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </motion.button>

            {/* Notifications */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 rounded-md border border-surface-border dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-secondary dark:text-slate-300 transition-colors duration-150 relative"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-rose opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-danger-rose"></span>
                  </span>
                )}
              </motion.button>

              <AnimatePresence>
                {isNotifOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsNotifOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded shadow-xl z-40 overflow-hidden flex flex-col origin-top-right"
                    >
                      <div className="px-4 py-2 border-b border-surface-border dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                        <span className="font-semibold text-body-sm text-primary dark:text-slate-200">Notifications ({unreadCount})</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllReadMutation.mutate()}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-surface-border dark:divide-slate-800">
                        {isNotifLoading ? (
                          <div className="p-4 text-center text-body-sm text-slate-400">Loading...</div>
                        ) : notifications.length === 0 ? (
                          <div className="p-4 text-center text-body-sm text-slate-400">No notifications</div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={cn(
                                "p-3 text-left transition-colors relative flex items-start gap-2 text-body-sm",
                                notif.is_read ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800/40"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                    notif.severity === "Critical" ? "bg-danger-rose" :
                                    notif.severity === "High" ? "bg-warning-amber" :
                                    notif.severity === "Medium" ? "bg-blue-500" : "bg-slate-400"
                                  )} />
                                  <h4 className="font-semibold text-body-sm text-primary dark:text-slate-200 truncate">
                                    {notif.title}
                                  </h4>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 whitespace-pre-wrap">
                                  {notif.message}
                                </p>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 block">
                                  {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {!notif.is_read && (
                                <button
                                  onClick={() => markReadMutation.mutate(notif.id)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mt-0.5"
                                  title="Mark as read"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar & Logout */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-surface-border dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-primary dark:text-slate-200">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden lg:block text-left mr-2">
                <p className="text-body-sm font-semibold leading-tight text-primary dark:text-slate-200 truncate max-w-[150px]" title={user?.email || "User"}>
                  {user?.email || "User"}
                </p>
                <p className="text-[11px] text-secondary dark:text-slate-400 leading-none capitalize">
                  {user?.role || "Viewer"}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500 hover:text-rose-600 transition-colors"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </header>

        {/* Top Critical Alerts Banner */}
        {criticalNotifs.length > 0 && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/30 px-4 py-3 text-danger-rose dark:text-rose-400 flex items-center justify-between text-body-sm font-medium">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 flex-shrink-0 animate-pulse" />
              <span>
                <strong>System Security Alert:</strong> {criticalNotifs[0].message}
              </span>
            </div>
            <button
              onClick={() => markReadMutation.mutate(criticalNotifs[0].id)}
              className="text-[11px] underline font-bold uppercase hover:opacity-80 transition-opacity ml-4 flex-shrink-0"
            >
              Acknowledge
            </button>
          </div>
        )}

        {/* Content Wrapper */}
        <main className="flex-1 p-4 md:p-6 max-w-max-content-width w-full mx-auto">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs items={breadcrumbs} className="mb-4" />
          )}

          {/* Page Title */}
          {title && (
            <h1 className="text-headline-md font-bold text-primary dark:text-slate-100 mb-6 tracking-tight">
              {title}
            </h1>
          )}

          {/* Animate Page View with reduced-motion support */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={motionVariants}
            className="w-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Bottom Nav Bar - Mobile only (< 768px) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-surface-border dark:border-slate-800 flex items-center justify-around px-2 z-30 md:hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-14 h-12 rounded-md transition-all duration-150 gap-0.5",
                isActive
                  ? "text-primary dark:text-slate-100"
                  : "text-secondary dark:text-slate-400 hover:text-primary dark:hover:text-slate-200"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

PageLayout.displayName = "PageLayout";
