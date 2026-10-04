import NewRequestForm from "@/app/new-request/_components/NewRequestForm";

export default function NewRequest() {
    return (
        <div className="flex w-full h-full flex-col items-center py-16 overflow-y-auto">
            <p className="text-2xl font-bold pb-10">New request</p>
            <NewRequestForm/>
        </div>
    );
}