/*
Copyright 2026 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { type MatrixEvent } from "matrix-js-sdk/src/matrix";

export const MINDROOM_AI_RUN_KEY = "io.mindroom.ai_run";
const MINDROOM_AI_RUN_VERSION = 1;

export interface MindroomAiRunMetadata {
    version: number;
    status?: string;
    model?: {
        config?: string;
        id?: string;
        provider?: string;
    };
    usage?: {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
    };
    context?: {
        input_tokens?: number;
        window_tokens?: number;
    };
    tools?: {
        count?: number;
    };
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return !!value && typeof value === "object" && !Array.isArray(value);
};

const asNonNegativeInt = (value: unknown): number | undefined => {
    if (typeof value === "number") {
        if (!Number.isInteger(value) || value < 0) return undefined;
        return value;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return undefined;
        return parsed;
    }

    return undefined;
};

const asText = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const parseMetadata = (value: unknown): MindroomAiRunMetadata | undefined => {
    if (!isRecord(value)) return undefined;

    const version = asNonNegativeInt(value.version);
    if (version !== MINDROOM_AI_RUN_VERSION) return undefined;

    return {
        version,
        status: asText(value.status),
        model: isRecord(value.model)
            ? {
                  config: asText(value.model.config),
                  id: asText(value.model.id),
                  provider: asText(value.model.provider),
              }
            : undefined,
        usage: isRecord(value.usage)
            ? {
                  input_tokens: asNonNegativeInt(value.usage.input_tokens),
                  output_tokens: asNonNegativeInt(value.usage.output_tokens),
                  total_tokens: asNonNegativeInt(value.usage.total_tokens),
              }
            : undefined,
        context: isRecord(value.context)
            ? {
                  input_tokens: asNonNegativeInt(value.context.input_tokens),
                  window_tokens: asNonNegativeInt(value.context.window_tokens),
              }
            : undefined,
        tools: isRecord(value.tools)
            ? {
                  count: asNonNegativeInt(value.tools.count),
              }
            : undefined,
    };
};

const getFromNewContent = (content: unknown): MindroomAiRunMetadata | undefined => {
    if (!isRecord(content)) return undefined;
    return getMindroomAiRunMetadataFromContent(content["m.new_content"]);
};

const formatModelSummary = (metadata: MindroomAiRunMetadata): string | undefined => {
    const provider = metadata.model?.provider;
    const model = metadata.model?.id ?? metadata.model?.config;
    if (provider && model) return `${provider} / ${model}`;
    return provider ?? model;
};

const formatUsageSummary = (metadata: MindroomAiRunMetadata): string | undefined => {
    const inputTokens = metadata.usage?.input_tokens;
    const outputTokens = metadata.usage?.output_tokens;
    const totalTokens =
        metadata.usage?.total_tokens ??
        (typeof inputTokens === "number" && typeof outputTokens === "number" ? inputTokens + outputTokens : undefined);

    if (typeof totalTokens === "number" && (typeof inputTokens === "number" || typeof outputTokens === "number")) {
        const details: string[] = [];
        if (typeof inputTokens === "number") details.push(`${inputTokens} in`);
        if (typeof outputTokens === "number") details.push(`${outputTokens} out`);
        return `${totalTokens} tok (${details.join(", ")})`;
    }

    if (typeof totalTokens === "number") {
        return `${totalTokens} tok`;
    }

    if (typeof inputTokens === "number" || typeof outputTokens === "number") {
        const details: string[] = [];
        if (typeof inputTokens === "number") details.push(`${inputTokens} in`);
        if (typeof outputTokens === "number") details.push(`${outputTokens} out`);
        return details.join(", ");
    }

    return undefined;
};

const formatContextSummary = (metadata: MindroomAiRunMetadata): string | undefined => {
    const inputTokens = metadata.context?.input_tokens;
    const windowTokens = metadata.context?.window_tokens;
    if (typeof inputTokens !== "number" || typeof windowTokens !== "number" || windowTokens <= 0) {
        return undefined;
    }

    const utilizationPct = Math.round((inputTokens / windowTokens) * 100);
    if (!Number.isFinite(utilizationPct)) return undefined;

    return `ctx ${utilizationPct}%`;
};

const formatToolsSummary = (metadata: MindroomAiRunMetadata): string | undefined => {
    const count = metadata.tools?.count;
    if (typeof count !== "number") return undefined;
    return `${count} tool${count === 1 ? "" : "s"}`;
};

const formatStatusSummary = (metadata: MindroomAiRunMetadata): string | undefined => {
    const status = metadata.status?.toLowerCase();
    if (!status || status === "completed") return undefined;
    return status;
};

export const getMindroomAiRunMetadataFromContent = (content: unknown): MindroomAiRunMetadata | undefined => {
    if (!isRecord(content)) return undefined;
    return parseMetadata(content[MINDROOM_AI_RUN_KEY]);
};

export const getMindroomAiRunMetadata = (mxEvent: MatrixEvent): MindroomAiRunMetadata | undefined => {
    const content = mxEvent.getContent();
    const contentMetadata = getMindroomAiRunMetadataFromContent(content);
    if (contentMetadata) return contentMetadata;

    const nestedContentMetadata = getFromNewContent(content);
    if (nestedContentMetadata) return nestedContentMetadata;

    const replacingEvent = mxEvent.replacingEvent();
    if (replacingEvent) {
        const replacingMetadata = getMindroomAiRunMetadataFromContent(replacingEvent.getContent());
        if (replacingMetadata) return replacingMetadata;

        const nestedReplacingMetadata = getFromNewContent(replacingEvent.getContent());
        if (nestedReplacingMetadata) return nestedReplacingMetadata;
    }

    const wireMetadata = getFromNewContent(mxEvent.getWireContent());
    if (wireMetadata) return wireMetadata;

    return getFromNewContent(mxEvent.getOriginalContent());
};

export const formatMindroomAiRunTooltip = (metadata: MindroomAiRunMetadata): string | undefined => {
    const parts = [
        formatModelSummary(metadata),
        formatUsageSummary(metadata),
        formatContextSummary(metadata),
        formatToolsSummary(metadata),
        formatStatusSummary(metadata),
    ].filter((part): part is string => !!part);

    return parts.join(" • ") || undefined;
};

export const getMindroomAiRunTooltip = (mxEvent: MatrixEvent): string | undefined => {
    const metadata = getMindroomAiRunMetadata(mxEvent);
    if (!metadata) return undefined;
    return formatMindroomAiRunTooltip(metadata);
};
