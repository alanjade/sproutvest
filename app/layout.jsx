import { Toaster } from "react-hot-toast";
import ConditionalHeader from "./components/ConditionalHeader";
import ConditionalFooter from "./components/ConditionalFooter";
import { AuthProvider } from "../context/AuthContext";
import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&family=Great+Vibes&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <ConditionalHeader />
          {children}
          <ConditionalFooter />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}