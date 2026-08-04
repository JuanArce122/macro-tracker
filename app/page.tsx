import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserTodayById } from "@/lib/user-date-server";

// Dinámica (usa auth()): el redirect se resuelve por request, no en el build.
// El "hoy" se calcula en la zona del usuario (no en UTC del servidor).
export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");
  const today = await getUserTodayById(Number(session.user.id));
  redirect(`/day/${today}`);
}
