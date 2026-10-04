import NewRequestForm from "@/app/new-request/_components/NewRequestForm";

export default function NewRequest() {
    return (
        <div className="flex w-full min-h-screen flex-col items-center py-32 px-32">
            <p className="text-2xl font-bold pb-10">New request</p>
            <NewRequestForm/>
        </div>
    );
}