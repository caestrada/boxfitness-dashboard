"use client";

import { Check, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/providers/theme-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const themeOptions = [
  {
    value: "light",
    title: "Light mode",
    description:
      "Soft grayscale surfaces with quieter contrast and brighter working areas.",
    icon: Sun,
  },
  {
    value: "dark",
    title: "Dark mode",
    description:
      "Deeper surfaces and lower overall luminance for late or low-light sessions.",
    icon: Moon,
  },
] as const;

export function ThemePreferenceCard() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader>
        <CardTitle className="text-2xl">Appearance</CardTitle>
        <CardDescription className="max-w-2xl leading-7">
          Choose how Box Fitness should render in this browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          {themeOptions.map(({ value, title, description, icon: Icon }) => {
            const isActive = theme === value;

            return (
              <button
                key={value}
                className={cn(
                  "app-subpanel flex items-start gap-4 p-5 text-left transition-[background-color,border-color,box-shadow]",
                  isActive &&
                    "border-primary/30 bg-primary/10 shadow-[0_20px_50px_-32px_rgba(255,107,44,0.35)] dark:shadow-[0_24px_60px_-36px_rgba(255,107,44,0.3)]",
                )}
                onClick={() => setTheme(value)}
                type="button"
              >
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground",
                    isActive && "bg-primary text-primary-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      {title}
                    </p>
                    {isActive ? (
                      <Check className="size-4 text-primary" />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
