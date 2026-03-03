import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relax and Find the Key",
  description: "An arcade-style game where players identify candidate keys of relational database schemas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
