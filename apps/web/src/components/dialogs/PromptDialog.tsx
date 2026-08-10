import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
} from '@mai-habi/ui';
import { useUi } from '../../state/ui';

/**
 * A single labelled, validated prompt.
 *
 * `window.prompt` cannot be themed, carries no label or help text, and gives no
 * way to explain what is wrong with an entry — so it is not used anywhere.
 */
export function PromptDialog() {
  const prompt = useUi((state) => state.prompt);
  const close = useUi((state) => state.closePrompt);

  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(prompt?.initialValue ?? '');
    setError(null);
  }, [prompt]);

  if (!prompt) return null;

  const submit = () => {
    const message = prompt.validate?.(value) ?? null;
    if (message) {
      setError(message);
      return;
    }

    prompt.onSubmit(value.trim());
    close();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{prompt.title}</DialogTitle>
        </DialogHeader>

        <Field id="prompt-value" label={prompt.label} hint={prompt.hint} error={error}>
          {(field) => (
            <Input
              {...field}
              autoFocus
              value={value}
              placeholder={prompt.placeholder}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
            />
          )}
        </Field>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="default" onClick={submit}>
            {prompt.confirmLabel ?? 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
