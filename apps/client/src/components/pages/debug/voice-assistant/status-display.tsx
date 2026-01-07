interface StatusDisplayProps {
  status?: string;
  recognizedText?: string;
}

export function StatusDisplay({ status, recognizedText }: StatusDisplayProps) {
  return (
    <>
      {status && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {status}
        </div>
      )}

      {recognizedText && (
        <div className="rounded-lg border bg-muted p-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Recognized Text:
          </div>
          <div className="mt-1 text-sm">{recognizedText}</div>
        </div>
      )}
    </>
  );
}
