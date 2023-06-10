import '@/styles/base.css';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import NoSSR from 'react-no-ssr';


const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <main className={inter.variable}>
          <NoSSR>
              <Component {...pageProps} />
          </NoSSR>
      </main>
    </>
  );
}

export default MyApp;
