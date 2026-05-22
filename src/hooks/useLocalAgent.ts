// In-browser deterministic agent — always ready, zero downloads.
import * as React from "react";
import {
  generateLocalSuggestions,
  type GenerateInput,
  type LocalAgentOption,
} from "@/lib/local-agent";

export type LocalAgentStatus = "ready";

export function useLocalAgent(_modelId?: string) {
  const generate = React.useCallback(
    async (input: GenerateInput): Promise<LocalAgentOption[]> => {
      return generateLocalSuggestions(null, input);
    },
    [],
  );

  return {
    status: "ready" as const,
    progress: { text: "", progress: 1 },
    error: null as string | null,
    load: async () => {},
    generate,
    isReady: true,
    isLoading: false,
    isUnsupported: false,
  };
}
