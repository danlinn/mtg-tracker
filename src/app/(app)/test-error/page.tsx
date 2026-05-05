"use client";

export default function TestErrorPage() {
  return (
    <div className="max-w-md mx-auto py-10 space-y-4">
      <h1 className="text-2xl font-bold">Error Test Page</h1>
      <button
        onClick={() => { throw new Error("Test error for Autotix"); }}
        className="btn-primary bg-accent text-accent-text px-4 py-2 rounded-lg font-medium"
      >
        Throw Error
      </button>
    </div>
  );
}
