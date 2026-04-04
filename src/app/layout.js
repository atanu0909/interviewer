import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "AI Mock Interviewer — Practice Your Tech Interviews",
  description: "Upload your resume, choose a target IT role, and practice with a live AI interviewer. Get instant feedback on your answers with smart voice recognition optimized for Indian English.",
  keywords: "AI interviewer, mock interview, tech interview, resume analysis, voice interview, Indian English",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
