import Link from "next/link";

type Props = {
  title: string;
  description: string;
  href?: string;
  action?: string;
};

export function PageUnavailable({ title, description, href = "/", action = "첫 화면으로" }: Props) {
  return <main className="unavailable-page">
    <p className="unavailable-code">404</p>
    <h1>{title}</h1>
    <p>{description}</p>
    <Link href={href}>{action}</Link>
  </main>;
}
