import { Button } from "@/components/ui/button";

export default function Home() {
  return (
      <div className="flex w-full min-h-screen flex-col py-32 px-32">
        <p className="text-7xl font-bold underline">Hospital finder</p>
        <p className="text-2xl pt-4 pb-8">Your health, our path</p>
        <Button className="w-30 p-4">New request</Button>
      </div>
  );
}
