import type { ReactNode } from "react";
import "./styles.css";

export const metadata = { title: "Acme Shop · Oakstack starter" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
