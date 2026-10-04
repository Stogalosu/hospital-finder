'use client';

import {Card, CardContent} from "@/components/ui/card";
import {BaseMap} from "@/components/base-map";
import {useState} from "react";
import NewRequestForm from "@/app/new-request/_components/NewRequestForm";
import {Button} from "@/components/ui/button";

export default function Home() {
    const [newRequestForm, setNewRequestForm] = useState(false);

    return (
      <div className="flex w-full min-h-full flex-col items-center py-32 px-[10%] gap-16 overflow-y-auto">
          <Card className="max-w-[60%] p-12 self-start">
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
          {newRequestForm ? (
              <>
                  <p className="text-2xl font-bold pt-4">New request</p>
                  <NewRequestForm/>
              </>
          ) : <BaseMap className="aspect-square min-w-[70%] max-w-200 self-center"/>
          }
          <Button className="p-4 w-35 self-center" onClick={() => setNewRequestForm(!newRequestForm)}>
              {newRequestForm ? "Cancel request" : "New request"}
          </Button>

      </div>
    );
}
