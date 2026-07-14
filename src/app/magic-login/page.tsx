import { MagicLoginClient } from "@/app/magic-login/MagicLoginClient"

export default async function MagicLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  return <MagicLoginClient token={params.token ?? null} />
}
