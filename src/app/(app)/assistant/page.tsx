'use client';

import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function AssistantPage() {
  return (
    <>
      <PageHeader
        title="AI Assistant Removed"
        description="This feature has been removed from the application."
      />
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 text-destructive">
            <AlertTriangle className="h-8 w-8" />
            <p>
              The AI Assistant functionality has been disabled and all associated code has been removed.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
