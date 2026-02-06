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

/**
 * Renders a single tool call entry with call/result parsing.
 *
 * Protocol:
 * - Pending (streaming): `<tool>call</tool>` — no `\n` inside
 * - Completed with result: `<tool>call\nresult</tool>` — `\n` separates call from result
 * - Completed without result: `<tool>call\n</tool>` — `\n` present, empty result
 */
function ToolEntry({ content }: { content: string }): React.JSX.Element {
    const newlineIndex = content.indexOf("\n");

    // No newline → pending (still streaming)
    if (newlineIndex === -1) {
        return (
            <div className="mx_ToolEntry">
                <span className="mx_ToolEntry_call">{content}</span>
                <span className="mx_ToolEntry_pending"> ⏳</span>
            </div>
        );
    }

    const call = content.slice(0, newlineIndex);
    const result = content.slice(newlineIndex + 1).trim();

    // Newline present but empty result → completed with no output
    if (!result) {
        return (
            <div className="mx_ToolEntry">
                <span className="mx_ToolEntry_call">{call}</span>
                <span className="mx_ToolEntry_done"> ✓</span>
            </div>
        );
    }

    const isMultiline = result.includes("\n");
    const isLong = result.length > 80;

    // Short single-line result → inline
    if (!isMultiline && !isLong) {
        return (
            <div className="mx_ToolEntry">
                <span className="mx_ToolEntry_call">{call}</span>
                <span className="mx_ToolEntry_separator"> → </span>
                <span className="mx_ToolEntry_result">{result}</span>
            </div>
        );
    }

    // Long or multiline result → block display
    return (
        <div className="mx_ToolEntry">
            <div className="mx_ToolEntry_call">{call}</div>
            <pre className="mx_ToolEntry_result mx_ToolEntry_result--block">{result}</pre>
        </div>
    );
}

/**
 * Wrap consecutive bare ToolEntry elements into CollapsibleBlock(s).
 * Single tool → "Tool Call" label; groups → "N tool calls".
 */
function wrapToolEntries(parts: (string | React.JSX.Element)[]): (string | React.JSX.Element)[] {
    const toolConfig = getBlockConfig("tool");
    if (!toolConfig) return parts;

    const merged: (string | React.JSX.Element)[] = [];
    let toolGroup: React.JSX.Element[] = [];

    const flushGroup = (): void => {
        if (toolGroup.length === 0) return;
        const label = toolGroup.length === 1 ? "Tool Call" : `${toolGroup.length} tool calls`;
        merged.push(
            <CollapsibleBlock key={`tool-${merged.length}`} config={toolConfig} labelOverride={label}>
                {toolGroup}
            </CollapsibleBlock>,
        );
        toolGroup = [];
    };

    for (const part of parts) {
        if (React.isValidElement(part) && part.type === ToolEntry) {
            toolGroup.push(part);
        } else {
            flushGroup();
            merged.push(part);
        }
    }

    flushGroup();
    return merged;
}

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
            if (!config) return undefined;

            if (tag === "tool") {
                // Extract text content from children for ToolEntry parsing
                const textContent = node.children
                    .map((child: DOMNode) => ("data" in child ? child.data : ""))
                    .join("");
                const decoded = decode(textContent);
                return (
                    <CollapsibleBlock config={config} labelOverride="Tool Call">
                        <ToolEntry content={decoded} />
                    </CollapsibleBlock>
                );
            }

            return <CollapsibleBlock config={config}>{domToReact(node.children as DOMNode[])}</CollapsibleBlock>;
        };
    });

    // Handle plain text messages that contain our supported tags
    renderer[Node.TEXT_NODE] = (node) => {
        const text = node.data;

        // Build regex pattern for all supported tags
        const tags = getSupportedTags().join("|");
        const pattern = new RegExp(`<(${tags})>([\\s\\S]*?)<\\/\\1>`, "g");

        if (!pattern.test(text)) {
            return undefined; // Let other renderers handle this
        }

        // Reset the regex for actual matching
        pattern.lastIndex = 0;

        const parts: (string | React.JSX.Element)[] = [];
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

                if (tagName === "tool") {
                    // Push bare ToolEntry — wrapToolEntries will group and wrap in CollapsibleBlock
                    parts.push(<ToolEntry key={`tool-${key++}`} content={decodedContent} />);
                } else {
                    parts.push(
                        <CollapsibleBlock key={`${tagName}-${key++}`} config={config}>
                            {decodedContent}
                        </CollapsibleBlock>,
                    );
                }
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

        // Wrap consecutive bare ToolEntry elements into CollapsibleBlock(s)
        const merged = wrapToolEntries(parts);

        return <>{merged}</>;
    };

    return renderer;
}

/**
 * Default instance of the collapsible renderer
 */
export const collapsibleRenderer = createCollapsibleRenderer();
