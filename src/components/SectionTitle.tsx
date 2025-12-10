interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-1 bg-gradient-to-b from-[#0052FF] to-[#7C3AED] rounded-full"></div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
      </div>
      {subtitle && (
        <p className="text-sm text-muted-foreground ml-4">{subtitle}</p>
      )}
    </div>
  );
}

