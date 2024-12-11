export const metadata = {
  title: 'Chessicle',
  description: 'A simple chess game in Next.js with SSE, logging, and scoring.',
};

export default function RootLayout({ children }) {
  console.log("[layout.js] Rendering RootLayout...");
  return (
    <html lang="en">
      <body>
        <main style={{ padding: '20px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
