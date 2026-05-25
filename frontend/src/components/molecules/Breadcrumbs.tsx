import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/utils/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  className,
  items,
  showHome = true,
  ...props
}) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-body-sm text-secondary dark:text-slate-400 select-none", className)}
      {...props}
    >
      <ol className="inline-flex items-center space-x-1.5 md:space-x-2">
        {showHome && (
          <li className="inline-flex items-center">
            <Link
              href="/"
              className="inline-flex items-center text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-150"
            >
              <Home className="w-3.5 h-3.5 mr-1" />
              <span className="sr-only">Home</span>
            </Link>
          </li>
        )}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="inline-flex items-center">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 mr-1.5 md:mr-2 flex-shrink-0" />
              {isLast || !item.href ? (
                <span
                  aria-current="page"
                  className="font-semibold text-primary dark:text-slate-200"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-150"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

Breadcrumbs.displayName = "Breadcrumbs";
