import {Card, CardContent} from "@/components/ui/card";
import {BaseMap} from "@/components/base-map";

export default function Home() {
    return (
      <div className="flex w-full min-h-full flex-col py-32 px-32 gap-16 overflow-y-auto">
          <Card className="max-w-[60%] p-12 ">
              <CardContent>
                  <p className="text-7xl font-bold underline">Hospital finder</p>
                  <p className="text-2xl pt-4 pb-8">Your health, our path</p>
              </CardContent>
          </Card>
          <Card className="max-w-[60%] p-12 self-end">
              <CardContent>
                  <p className="text-lg pt-4 pb-8"></p>
              </CardContent>
          </Card>
          <BaseMap className="aspect-square min-w-[70%] max-w-200"/>
      </div>
    );
}
