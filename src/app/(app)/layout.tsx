import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-helpers";
import NavBar from "@/components/NavBar";
import VerifyBanner from "@/components/VerifyBanner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <NavBar />
      <VerifyBanner />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </>
  );
}
