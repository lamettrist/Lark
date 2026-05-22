export interface HandleToolsResponse {
  return?: boolean;
  output?: any;
  programPauseIntent?: boolean;
  programInstructions?: string;
}

export interface OutputMetrics {
  totalTokens: number;
  inputTokens: number;
  cost: number;
}
