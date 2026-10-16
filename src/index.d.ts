export interface CaseOptions {
  /** Split "h264" into "h" and "264". Default false. */
  splitDigits?: boolean;
  /** Keep acronyms (HTTP) as they are in camel, pascal and title case. */
  keepAcronyms?: boolean;
}

export type Style = "camel" | "pascal" | "snake" | "kebab" | "constant" | "dot" | "title" | "sentence";

export function words(text: string, options?: Pick<CaseOptions, "splitDigits">): string[];
export function camelCase(text: string, options?: CaseOptions): string;
export function pascalCase(text: string, options?: CaseOptions): string;
export function snakeCase(text: string, options?: CaseOptions): string;
export function kebabCase(text: string, options?: CaseOptions): string;
export function constantCase(text: string, options?: CaseOptions): string;
export function dotCase(text: string, options?: CaseOptions): string;
export function titleCase(text: string, options?: CaseOptions): string;
export function sentenceCase(text: string, options?: CaseOptions): string;
export function convert(text: string, style: Style, options?: CaseOptions): string;
export function detect(text: string): "lower" | "upper" | "snake" | "constant" | "kebab" | "dot" | "camel" | "pascal" | null;
export function convertKeys<T = unknown>(value: unknown, style: Style, options?: CaseOptions & { deep?: boolean; except?: readonly string[] }): T;
