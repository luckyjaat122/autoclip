import { getCurrentUser, toSafeUser } from "@/lib/auth";
import { AppExperience } from "@/components/app/AppExperience";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  return <AppExperience user={user ? toSafeUser(user) : null} />;
}
