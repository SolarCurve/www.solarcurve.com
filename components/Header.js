import Link from 'next/link';
import Image from 'next/image';

export default function Header({ name }) {
  return (
    <header className="pt-20 pb-12">
      <div className="w-14 h-14 rounded-full block mx-auto mb-4">
        <Link href="/"><Image className="rounded-3xl" alt="Rogue Sharks #2500" src="https://media.howrare.is/images/roguesharks/cd883e64cf9199227a7567dd17a402a5.jpg" width={256} height={256} /></Link></div>
      <p className="text-2xl dark:text-white text-center">
        <Link href="/">
          <a>{name}</a>
        </Link>
      </p>
    </header>
  );
}
