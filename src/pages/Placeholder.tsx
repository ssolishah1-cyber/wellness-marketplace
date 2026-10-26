import { Link } from "react-router-dom";
import { Home } from "lucide-react";

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-ink-2">That page doesn't exist. It may have moved.</p>
      <Link to="/" className="btn-primary"><Home className="h-4 w-4" /> Go to Home</Link>
    </div>
  );
}
