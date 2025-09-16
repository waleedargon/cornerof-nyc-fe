
import { Header } from "@/components/header";

export default function FindPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Find Matches" backHref="/home" />
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold">Find Matches</h1>
          <p className="text-muted-foreground mt-2">
            This feature is coming soon!
          </p>
        </div>
      </div>
    </div>
  );
}
