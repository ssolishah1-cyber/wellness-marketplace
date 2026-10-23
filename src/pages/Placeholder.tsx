import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";

// Stand-in for the nutrition app's existing screens.
export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="max-w-sm text-sm text-slate-600">This screen belongs to your existing nutrition app. This project only adds the Market module.</p>
      <Link to="/market" className="btn-primary"><ShoppingBag className="h-4 w-4" /> Open the Market</Link>
    </div>
  );
}
