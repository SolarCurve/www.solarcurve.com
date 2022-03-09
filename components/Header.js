import Link from 'next/link';
import Image from 'next/image';

export default function Header({ name }) {
  return (
    <header className="pt-20 pb-12">
      <a href="https://howrare.is/roguesharks/2500/" target="_blank" rel="noreferrer"><Image className="rounded-3xl" alt="Rogue Sharks #2500" src="https://media.howrare.is/images/roguesharks/cd883e64cf9199227a7567dd17a402a5.jpg" width={200}/></a>
      <p className="text-2xl dark:text-white text-center">
        <Link href="/">
          <a>{name}</a>
        </Link>
      </p>
    </header>
  );
}
