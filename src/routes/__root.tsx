import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="airo-gradient-text text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          This destination doesn't exist
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for has wandered off the map.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full airo-gradient px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Airo" },
      {
        name: "description",
        content:
          "Airo is a premium AI travel concierge. Plan flights, hotels and attractions with silent intelligence and export a branded itinerary PDF.",
      },
      { name: "author", content: "Airo" },
      { property: "og:title", content: "Airo" },
      {
        property: "og:description",
        content:
          "A silent AI engine that orchestrates your entire journey — flights, hotels, attractions — with authentic imagery and live pricing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Airo" },
      { name: "description", content: "Airo crafts personalized travel itineraries using AI, presenting real photos and live pricing." },
      { property: "og:description", content: "Airo crafts personalized travel itineraries using AI, presenting real photos and live pricing." },
      { name: "twitter:description", content: "Airo crafts personalized travel itineraries using AI, presenting real photos and live pricing." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/OhIe9aL7MnhBsUtkrIc7duF6va13/social-images/social-1779442216500-ChatGPT_Image_May_22,_2026,_12_29_36_PM.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/OhIe9aL7MnhBsUtkrIc7duF6va13/social-images/social-1779442216500-ChatGPT_Image_May_22,_2026,_12_29_36_PM.webp" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <I18nProvider>
      <AuthProvider>
        <a href="#main-content" className="airo-skip-link">
          Skip to content
        </a>
        <Outlet />
        <Toaster position="top-center" />
      </AuthProvider>
    </I18nProvider>
  );
}
