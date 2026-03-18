import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Page not found</h2>
      <p>
        <Link href="/" style={{ color: "#7c3aed" }}>
          Go back to Strudel AI
        </Link>
      </p>
    </div>
  );
}
