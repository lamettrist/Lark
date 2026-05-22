import { estimateTokenCount } from "tokenx";

/*
    Helpful utilities and functions for the evolution class
*/
export class EvoMath {
    public static calculateTokens(content: string) {
        return estimateTokenCount(content);
    }
}