export default function Mockups() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mockup Studio</h1>
      <div className="rounded-lg border bg-card overflow-hidden" style={{ minHeight: 700 }}>
        <iframe
          src="https://mockups.myglovebrand.com/"
          className="w-full h-full min-h-[700px] border-0"
          title="Mockup Studio"
        />
      </div>
    </div>
  );
}
