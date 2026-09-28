export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{children}</h3>
      {action}
    </div>
  );
}
