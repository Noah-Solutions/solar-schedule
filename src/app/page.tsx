import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">EGT Service</h1>
      <p className="mt-4 text-lg text-gray-600 max-w-md">
        Solar service management — request maintenance, track jobs, and manage
        your account.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/request"
          className="rounded bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700"
        >
          Request Service
        </Link>
        <Link
          href="/login"
          className="rounded border border-gray-300 px-6 py-3 font-medium hover:bg-gray-50"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
