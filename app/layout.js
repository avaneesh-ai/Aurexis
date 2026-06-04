import "./globals.css";

export const metadata = {
  title: "Aurexis",
  description: "Aurexis AI workspace powered by Ollama",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/apple-icon.svg"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5b3df5"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const raw = localStorage.getItem('aurexis:store');
                const theme = raw ? JSON.parse(raw)?.settings?.theme : 'light';
                document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
              } catch {
                document.documentElement.dataset.theme = 'light';
              }
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
