import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "공공조달관리사 CBT 모의고사 | Procure",
  description: "공공조달관리사 필기시험 150제 모의고사 & CBT 학습 시스템. 과목별 모의시험, 오답노트, 상세 해설 제공",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme="light">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      </head>
      <body>{children}</body>
    </html>
  );
}
