
import { JoinHandler } from '@/components/join-handler';

// This page now acts as a router for invite links.
// It's a server component that passes searchParams to a client component.
export default function JoinGroupPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const inviteCode = typeof searchParams.code === 'string' ? searchParams.code : null;

  return <JoinHandler inviteCode={inviteCode} />;
}
