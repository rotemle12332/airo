import * as React from "react";
import { ImagePlus, Send, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import type { Stage } from "./StageProgress";

export type AiroDrawerSubmit = {
  text: string;
  imageDataUrl?: string;
};

export function AiroDrawer({
  stage,
  open,
  onOpenChange,
  onSubmit,
  thinking,
  trigger,
}: {
  stage: Stage;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (input: AiroDrawerSubmit) => void;
  thinking: boolean;
  trigger: React.ReactNode;
}) {
  const { t } = useI18n();
  const [text, setText] = React.useState("");
  const [imageDataUrl, setImageDataUrl] = React.useState<string | undefined>();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const placeholder =
    stage === "hotels"
      ? t("drawer.placeholder.hotel")
      : stage === "attractions"
        ? t("drawer.placeholder.attraction")
        : t("drawer.placeholder");

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!text.trim() && !imageDataUrl) return;
    onSubmit({ text: text.trim(), imageDataUrl });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="rounded-t-[32px] border-border/50">
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader className="text-start">
            <DrawerTitle className="text-xl font-semibold">
              {t("drawer.title")}
            </DrawerTitle>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-8">
            {/* Image drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) onFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              className="relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-border bg-surface p-4 transition-colors hover:border-primary/40"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
              {imageDataUrl ? (
                <div className="relative h-32 w-full overflow-hidden rounded-2xl">
                  <img
                    src={imageDataUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageDataUrl(undefined);
                    }}
                    className="absolute end-2 top-2 rounded-full bg-black/60 p-1 text-white backdrop-blur-md"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-card">
                    <ImagePlus className="h-4 w-4" />
                  </span>
                  <span>{t("drawer.dropImage")}</span>
                </div>
              )}
            </div>

            {/* Text input */}
            <div className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 ps-5">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
              <Button
                type="button"
                onClick={submit}
                disabled={thinking || (!text.trim() && !imageDataUrl)}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full airo-gradient text-primary-foreground hover:opacity-95"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {thinking && (
              <div className="overflow-hidden rounded-full bg-muted">
                <div className="airo-thinking h-1 w-full" />
                <div className="px-4 py-2 text-center text-xs text-muted-foreground">
                  {t("drawer.thinking")}…
                </div>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
