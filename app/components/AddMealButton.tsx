"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";

export default function AddMealButton({ date }: { date: string }) {
  const router = useRouter();

  return (
    <div className="px-4 py-3">
      <Button
        variant="primary"
        size="lg"
        leadingIcon={<Icon icon={Plus} size={18} />}
        onClick={() => router.push(`/day/${date}/add`)}
        className="w-full"
      >
        Agregar comida
      </Button>
    </div>
  );
}
