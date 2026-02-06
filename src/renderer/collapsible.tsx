/*
Copyright 2025 MindRoom

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { decode } from "html-entities";
import { domToReact, type DOMNode } from "html-react-parser";

import { type RendererMap } from "./utils.tsx";
import CollapsibleBlock from "../components/views/elements/CollapsibleBlock.tsx";
import { getSupportedTags, getBlockConfig } from "./collapsibleBlocks.ts";

const TOOL_CALL_MARKER = "🔧 **Tool Call:** `";
const TOOL_RESULT_PREFIX = "✅ **`";
const TOOL_RESULT_SUFFIX = "` result:**";

const isLineBreakOrEnd = (text: string, index: number): boolean => {
    if (index >= text.length) return true;
    return text[index] === "\n" || text[index] === "\r";
};

const findNextToolMarker = (text: string, from: number): { index: number; kind: "call" | "result" } | null => {
    const nextCall = text.indexOf(TOOL_CALL_MARKER, from);
    const nextResult = text.indexOf(TOOL_RESULT_PREFIX, from);

    if (nextCall === -1 && nextResult === -1) return null;
    if (nextCall === -1) return { index: nextResult, kind: "result" };
    if (nextResult === -1) return { index: nextCall, kind: "call" };
    return nextCall < nextResult ? { index: nextCall, kind: "call" } : { index: nextResult, kind: "result" };
};

const findToolCallClosingBacktick = (text: string, contentStart: number, searchLimit: number): number => {
    let cursor = contentStart;
    while (cursor < searchLimit) {
        const backtick = text.indexOf("`", cursor);
        if (backtick === -1 || backtick >= searchLimit) {
            return -1;
        }
        // Inline backticks in arguments are common; treat a trailing backtick at line end as the actual delimiter.
        if (isLineBreakOrEnd(text, backtick + 1)) {
            return backtick;
        }
        cursor = backtick + 1;
    }
    return -1;
};

const readResultBody = (text: string, start: number): { body: string; end: number } => {
    let cursor = start;

    if (text.startsWith("\r\n", cursor)) {
        cursor += 2;
    } else if (text[cursor] === "\n") {
        cursor += 1;
    }

    const bodyStart = cursor;
    let bodyEnd = bodyStart;

    while (bodyEnd < text.length) {
        const lineEnd = text.indexOf("\n", bodyEnd);
        const nextBreak = lineEnd === -1 ? text.length : lineEnd;
        const line = text.slice(bodyEnd, nextBreak).replace(/\r$/, "");

        if (!line.trim()) {
            break;
        }
        if (line.startsWith(TOOL_CALL_MARKER) || line.startsWith(TOOL_RESULT_PREFIX)) {
            break;
        }
        bodyEnd = lineEnd === -1 ? text.length : lineEnd + 1;
    }

    return {
        body: text.slice(bodyStart, bodyEnd).trim(),
        end: bodyEnd,
    };
};

const normalizeMarkdownCollapsibleBlocks = (text: string): string => {
    if (!text.includes(TOOL_CALL_MARKER.slice(0, -1)) && !text.includes(TOOL_RESULT_PREFIX)) {
        return text;
    }

    let output = "";
    let cursor = 0;

    while (cursor < text.length) {
        const nextMarker = findNextToolMarker(text, cursor);
        if (!nextMarker) {
            output += text.slice(cursor);
            break;
        }

        output += text.slice(cursor, nextMarker.index);

        if (nextMarker.kind === "call") {
            const contentStart = nextMarker.index + TOOL_CALL_MARKER.length;
            const nextBoundary = findNextToolMarker(text, contentStart)?.index ?? text.length;
            const closingBacktick = findToolCallClosingBacktick(text, contentStart, nextBoundary);

            if (closingBacktick === -1) {
                output += text.slice(nextMarker.index, contentStart);
                cursor = contentStart;
                continue;
            }

            const toolCall = text.slice(contentStart, closingBacktick).trim();
            output += `<tool>${toolCall}</tool>`;
            cursor = closingBacktick + 1;
            continue;
        }

        const toolNameStart = nextMarker.index + TOOL_RESULT_PREFIX.length;
        const toolNameEnd = text.indexOf(TOOL_RESULT_SUFFIX, toolNameStart);
        if (toolNameEnd === -1) {
            output += text[nextMarker.index];
            cursor = nextMarker.index + 1;
            continue;
        }

        const toolName = text.slice(toolNameStart, toolNameEnd).trim();
        const afterHeader = toolNameEnd + TOOL_RESULT_SUFFIX.length;
        const { body, end } = readResultBody(text, afterHeader);
        const summary = body || "Completed";
        output += `<validation>${toolName}\n${summary}</validation>`;
        cursor = end;
    }

    return output;
};

/**
 * Creates a renderer for collapsible blocks.
 * Handles all registered block types from collapsibleBlocks.ts
 */
export function createCollapsibleRenderer(): RendererMap {
    const renderer: RendererMap = {};

    // Add handlers for all HTML elements matching our supported tags
    getSupportedTags().forEach((tag) => {
        renderer[tag as keyof HTMLElementTagNameMap] = (node) => {
            const config = getBlockConfig(tag);
            if (config) {
                return <CollapsibleBlock config={config}>{domToReact(node.children as DOMNode[])}</CollapsibleBlock>;
            }
            return undefined;
        };
    });

    // Handle plain text messages that contain our supported tags
    renderer[Node.TEXT_NODE] = (node) => {
        const text = normalizeMarkdownCollapsibleBlocks(node.data);

        // Build regex pattern for all supported tags
        const tags = getSupportedTags().join("|");
        const pattern = new RegExp(`<(${tags})>([\\s\\S]*?)<\\/\\1>`, "g");

        if (!pattern.test(text)) {
            return undefined; // Let other renderers handle this
        }

        // Reset the regex for actual matching
        pattern.lastIndex = 0;

        const parts: (string | JSX.Element)[] = [];
        let lastIndex = 0;
        let match;
        let key = 0;

        while ((match = pattern.exec(text)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }

            // Get the tag type and content
            const tagName = match[1];
            const content = match[2];
            const config = getBlockConfig(tagName);

            if (config) {
                const decodedContent = decode(content);
                parts.push(
                    <CollapsibleBlock key={`${tagName}-${key++}`} config={config}>
                        {decodedContent}
                    </CollapsibleBlock>,
                );
            } else {
                // If config not found, render as plain text
                parts.push(match[0]);
            }

            lastIndex = match.index + match[0].length;
        }

        // Add any remaining text after the last match
        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }

        // If we only have one part and it's a string, return undefined to let other renderers handle it
        if (parts.length === 1 && typeof parts[0] === "string") {
            return undefined;
        }

        return <>{parts}</>;
    };

    return renderer;
}

/**
 * Default instance of the collapsible renderer
 */
export const collapsibleRenderer = createCollapsibleRenderer();
