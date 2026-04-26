"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">
          MTG Commander Tracker
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {verified === "true" && (
            <div className="bg-success-bg text-success px-4 py-2 rounded text-sm">
              Email verified! You can now sign in.
            </div>
          )}
          {verified === "already" && (
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded text-sm">
              Email already verified. Sign in below.
            </div>
          )}
          {error && (
            <div className="bg-danger-bg text-danger px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-text-primary"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-text-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white py-2 rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-text-tertiary hover:text-accent">
              Forgot password?
            </Link>
          </div>
        </form>
        <p className="text-center text-sm text-text-tertiary mt-4">
          No account?{" "}
          <Link href="/sign-up-here" className="text-accent hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
