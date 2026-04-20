// React hook that wraps the on-device WebLLM agent.
// Manages: WebGPU detection, lazy model loading, progress tracking, and request fan-out.

import * as React from "react";
import {
  DEFAULT_LOCAL_MODEL,
  generateLocalSuggestions,
  getLocalEngine,
  isWebGPUAvailable,
  type GenerateInput,
  type LoadProgress,
  type LocalAgentOption,
} from "@/lib/local-agent";

export type LocalAgentStatus =
  | "idle"
  | "unsupported"
  | "loading"
  | "ready"
  | "error";

export function useLocalAgent(modelId: string = DEFAULT_LOCAL_MODEL) {
  const [status, setStatus] = React.useState<LocalAgentStatus>("idle");
  const [progress, setProgress] = React.useState<LoadProgress>({
    text: "",
    progress: 0,
  });
  const [error, setError] = React.useState<string | null>(null);
  const enginePromiseRef = React.useRef<ReturnType<typeof getLocalEngine> | null>(
    null,
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isWebGPUAvailable()) {
      setStatus("unsupported");
    }
  }, []);

  const load = React.useCallback(async () => {
    if (!isWebGPUAvailable()) {
      setStatus("unsupported");
      return;
    }
    if (status === "ready" || status === "loading") return;
    setStatus("loading");
    setError(null);
    try {
      enginePromiseRef.current = getLocalEngine(modelId, (p) => setProgress(p));
      await enginePromiseRef.current;
      setStatus("ready");
    } catch (e) {
      console.error("Local agent load failed:", e);
      setError(e instanceof Error ? e.message : "Failed to load model");
      setStatus("error");
    }
  }, [modelId, status]);

  const generate = React.useCallback(
    async (input: GenerateInput): Promise<LocalAgentOption[]> => {
      if (!enginePromiseRef.current) {
        await load();
      }
      const engine = await enginePromiseRef.current!;
      return generateLocalSuggestions(engine, input);
    },
    [load],
  );

  return {
    status,
    progress,
    error,
    load,
    generate,
    isReady: status === "ready",
    isLoading: status === "loading",
    isUnsupported: status === "unsupported",
  };
}
