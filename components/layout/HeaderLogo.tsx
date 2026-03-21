import Image from "next/image";
import Link from "next/link";
type Props = { lang: string; title: string };

export function HeaderLogo({ lang, title }: Props) {
  return (
    <Link href={`/${lang}`} className="flex items-center gap-2 grow">
      <Image src="/icons/icon-mark.svg" alt="" width={40} height={26.66} priority />
      <h1 className="text-heading font-semibold tracking-tight text-2xl bg-linear-to-r from-[#00e400] via-[#ff7e00] to-[#7e0023] bg-clip-text text-transparent">
        {title}
      </h1>
    </Link>
  );
}
