"use client";

import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MaintenancePage({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Construction className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>
            This section is being migrated to the new Sales Portal. Check back
            soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button href="/dashboard" variant="outline">
            Back to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
