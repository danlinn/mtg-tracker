"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    // If there's an invite token, sign in and accept it
    if (inviteToken) {
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        setError("Account created but sign-in failed. Try logging in.");
        setLoading(false);
      } else {
        // Accept the invite
        window.location.href = `/api/invites/accept?token=${inviteToken}`;
      }
      return;
    }

    // No invite — sign in and show pending message
    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (signInRes?.error) {
      setSuccess(true);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold mb-4">Account Created!</h1>
          <p className="text-text-tertiary">
            Your account is pending admin approval. You&apos;ll receive an email once approved.
          </p>
          <Link href="/login" className="text-accent hover:underline mt-4 inline-block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">Create Account</h1>
        {inviteToken && (
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded text-sm mb-4">
            You&apos;ve been invited to a playgroup! Register to join.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-danger-bg text-danger px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Display Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-text-primary"
            />
          </div>
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
              minLength={6}
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
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>
        <p className="text-center text-sm text-text-tertiary mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
