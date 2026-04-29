export function StatRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#1a1a1a] py-3 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-zinc-100">
        {value}
      </span>
    </div>
  );
}
