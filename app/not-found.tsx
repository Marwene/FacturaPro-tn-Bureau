import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion />
          </EmptyMedia>
          <EmptyTitle className="text-lg">Page introuvable</EmptyTitle>
          <EmptyDescription>
            La page que vous recherchez n&apos;existe pas ou a été déplacée.
            Vérifiez l&apos;adresse ou revenez à l&apos;accueil.
          </EmptyDescription>
        </EmptyHeader>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </Empty>
    </div>
  );
}
