export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-44 rounded-[2rem] bg-white/70" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-3xl bg-white/70" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-52 rounded-3xl bg-white/70" />
        ))}
      </div>
    </div>
  );
}
