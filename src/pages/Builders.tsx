import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function Builders() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Blank Glove Builder</h1>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="font-semibold">How it works</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Click <strong>Open Blank Glove Builder</strong> below</li>
          <li>Design your custom glove</li>
          <li>Copy your recipe link</li>
          <li>Come back here and place your order</li>
        </ol>

        <Button asChild size="lg" className="w-full mt-4">
          <a href="https://www.myglovebuilder.com/" target="_blank" rel="noopener noreferrer">
            Open Blank Glove Builder <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
