import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';

export default function Header({ name }) {
  return (
    <header className="pt-20 pb-12">
      <div className="w-14 h-14 rounded-full block mx-auto mb-4">
        <Link href="/" passHref><Image className="rounded-3xl" alt="Rogue Sharks #2500" src="https://media.howrare.is/images/degenapes/2fe48606a6d7b9f413c6d5b8f12b0965.jpg" width={256} height={256} /></Link></div>
      <p className="text-2xl dark:text-white text-center">
        <Link href="/" passHref>
          <a>{name}</a>
        </Link>
      </p>
      <Script async src="https://www.googletagmanager.com/gtag/js?id=G-KB13YN06XE"></Script>
      <Script id="ga">
        {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-KB13YN06XE');`}
      </Script>
    </header>
  );
}
