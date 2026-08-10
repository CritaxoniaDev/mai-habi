import { useState } from 'react';
import { Button, Toaster } from '@mai-habi/ui';
import { Plus } from 'lucide-react';
import { NewProjectDialog } from '../components/dashboard/NewProjectDialog';

/** Dashboard header actions. The list beside it is a separate island. */
export default function DashboardActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Import
      </Button>
      <Button variant="default" onClick={() => setOpen(true)}>
        <Plus /> New project
      </Button>

      <NewProjectDialog open={open} onOpenChange={setOpen} />
      <Toaster />
    </div>
  );
}
