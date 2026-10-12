import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/app/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/components/app/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Home Expense Tracker", template: "%s · Home Expense Tracker" },
  description: "Simple household expense tracking: balance, budgets, records and exports.",
  applicationName: "Home Expense Tracker",
  appleWebApp: { capable: true, title: "Expenses", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#14161c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            {children}
            <ServiceWorkerRegister />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
