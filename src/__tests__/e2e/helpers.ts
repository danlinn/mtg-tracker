import pg from "pg";

const { Client } = pg;

export async function cleanDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  await client.query('DELETE FROM "GamePlayer"');
  await client.query('DELETE FROM "Game"');
  await client.query('DELETE FROM "Deck"');
  await client.query('DELETE FROM "User"');
  await client.end();
}

const BASE_URL = "http://localhost:3000";

function extractCookies(res: Response): string[] {
  return res.headers.getSetCookie?.() ?? [];
}

function cookieHeader(cookies: string[]): string {
  // Extract key=value from each Set-Cookie header
  return cookies
    .map((c) => c.split(";")[0])
    .join("; ");
}

export async function apiRequest(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    cookie?: string;
  } = {}
) {
  const { method = "GET", body, cookie } = options;
  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  if (cookie) headers["Cookie"] = cookie;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  return res;
}

export async function registerUser(
  name: string,
  email: string,
  password: string
) {
  const res = await apiRequest("/api/register", {
    method: "POST",
    body: { name, email, password },
  });
  return res.json();
}

export async function loginAndGetCookie(
  email: string,
  password: string
): Promise<string> {
  // Step 1: Get CSRF token + cookies from the SAME request
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, {
    redirect: "manual",
  });
  const csrfCookies = extractCookies(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  // Step 2: Sign in with credentials, passing CSRF cookies
  const signInRes = await fetch(
    `${BASE_URL}/api/auth/callback/credentials`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieHeader(csrfCookies),
      },
      body: new URLSearchParams({
        csrfToken,
        email,
        password,
      }),
      redirect: "manual",
    }
  );

  // Step 3: Combine all cookies (CSRF + session)
  const sessionCookies = extractCookies(signInRes);
  const allCookies = [...csrfCookies, ...sessionCookies];
  return cookieHeader(allCookies);
}
