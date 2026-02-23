/*
Copyright 2025 MindRoom

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { domToReact, type DOMNode, Element as DomElement, Text as DomText } from "html-react-parser";

import { type RendererMap } from "./utils.tsx";
import CollapsibleBlock from "../components/views/elements/CollapsibleBlock.tsx";
import { getSupportedTags, getBlockConfig, TOOL_REF_BLOCK_CONFIG } from "./collapsibleBlocks.ts";

type MindroomToolRefParseResult = {
    toolName: string;
    index: number;
    pending: boolean;
};

type MindroomToolTraceEvent = {
    type?: unknown;
    tool_name?: unknown;
    args_preview?: unknown;
    result_preview?: unknown;
};

type MindroomToolEntryData = {
    index: number;
    command: string;
    pending: boolean;
    result?: string;
};

type ToolRefElementPrefix = {
    html: string;
    trailingChildren: DOMNode[];
};

type ToolRefMatchBoundary = {
    html: string;
    childIndex: number;
    textSplitIndex: number | undefined;
};

const MINDROOM_TOOL_REF_HTML_REG_G = /🔧 <code>([^<]+)<\/code> \[(\d+)\]( ⏳)?/g;

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return !!value && typeof value === "object" && !Array.isArray(value);
};

const asTraceText = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const parseMindroomToolRefHtml = (html: string): MindroomToolRefParseResult | undefined => {
    const normalized = html.trim();
    MINDROOM_TOOL_REF_HTML_REG_G.lastIndex = 0;

    const match = MINDROOM_TOOL_REF_HTML_REG_G.exec(normalized);
    if (!match || match[0] !== normalized) return undefined;

    const toolName = match[1]?.trim();
    const index = Number(match[2]);
    if (!toolName || !Number.isInteger(index) || index < 1) return undefined;

    return {
        toolName,
        index,
        pending: Boolean(match[3]),
    };
};

const getMindroomToolTraceEvents = (content: unknown): MindroomToolTraceEvent[] | undefined => {
    if (!isRecord(content)) return undefined;

    const trace = content["io.mindroom.tool_trace"];
    if (!isRecord(trace) || trace.version !== 2 || !Array.isArray(trace.events)) {
        return undefined;
    }

    const events = trace.events.filter((event): event is MindroomToolTraceEvent => isRecord(event));
    return events.length > 0 ? events : undefined;
};

const getMindroomToolTraceEventByIndex = (
    content: unknown,
    oneBasedIndex: number,
): MindroomToolTraceEvent | undefined => {
    if (!Number.isInteger(oneBasedIndex) || oneBasedIndex < 1) return undefined;
    const events = getMindroomToolTraceEvents(content);
    return events?.[oneBasedIndex - 1];
};

const buildToolRefRenderData = (
    toolRef: MindroomToolRefParseResult,
    eventRaw?: MindroomToolTraceEvent,
): MindroomToolEntryData => {
    const traceType = asTraceText(eventRaw?.type);
    const traceToolName = asTraceText(eventRaw?.tool_name) ?? toolRef.toolName;
    const argsPreview = asTraceText(eventRaw?.args_preview);
    const resultPreview = asTraceText(eventRaw?.result_preview);

    const command = argsPreview ? `${traceToolName}(${argsPreview})` : traceToolName;
    const pending = toolRef.pending || traceType === "tool_call_started";

    return {
        index: toolRef.index,
        command,
        pending,
        result: pending ? undefined : resultPreview,
    };
};

function ToolEntry({ data }: { data: MindroomToolEntryData }): React.JSX.Element {
    const title = `Tool #${data.index}: ${data.command}`;

    if (data.pending) {
        return (
            <div className="mx_ToolEntry">
                <span className="mx_ToolEntry_call">{title}</span>
                <span className="mx_ToolEntry_pending"> ⏳</span>
            </div>
        );
    }

    if (!data.result) {
        return (
            <div className="mx_ToolEntry">
                <span className="mx_ToolEntry_call">{title}</span>
                <span className="mx_ToolEntry_done"> ✓</span>
            </div>
        );
    }

    const isMultiline = data.result.includes("\n");
    const isLong = data.result.length > 80;

    if (!isMultiline && !isLong) {
        return (
            <div className="mx_ToolEntry">
                <span className="mx_ToolEntry_call">{title}</span>
                <span className="mx_ToolEntry_separator"> → </span>
                <span className="mx_ToolEntry_result">{data.result}</span>
            </div>
        );
    }

    return (
        <div className="mx_ToolEntry">
            <div className="mx_ToolEntry_call">{title}</div>
            <pre className="mx_ToolEntry_result mx_ToolEntry_result--block">{data.result}</pre>
        </div>
    );
}

const extractTextFromChildren = (nodes: DOMNode[]): string => {
    let text = "";

    for (const node of nodes) {
        if (node instanceof DomText) {
            text += node.data;
        } else if (node instanceof DomElement) {
            text += extractTextFromChildren(node.childNodes as DOMNode[]);
        }
    }

    return text;
};

const getToolRefPrefixFromElement = (element: DomElement): ToolRefElementPrefix | undefined => {
    if (!["p", "div", "li"].includes(element.name)) return undefined;

    let html = "";
    let bestMatch: ToolRefMatchBoundary | undefined;

    const buildPrefixResult = (match: ToolRefMatchBoundary): ToolRefElementPrefix => {
        const matchedChild = element.childNodes[match.childIndex];
        const trailingText =
            matchedChild instanceof DomText && match.textSplitIndex !== undefined
                ? matchedChild.data.slice(match.textSplitIndex)
                : "";

        const trailingChildren: DOMNode[] = [
            ...(trailingText ? [new DomText(trailingText)] : []),
            ...(element.childNodes.slice(match.childIndex + 1) as DOMNode[]),
        ];

        return {
            html: match.html,
            trailingChildren,
        };
    };

    for (let childIndex = 0; childIndex < element.childNodes.length; childIndex += 1) {
        const child = element.childNodes[childIndex];

        if (child instanceof DomText) {
            for (let splitIndex = 0; splitIndex <= child.data.length; splitIndex += 1) {
                const candidate = `${html}${child.data.slice(0, splitIndex)}`;
                if (!parseMindroomToolRefHtml(candidate)) continue;

                bestMatch = {
                    html: candidate,
                    childIndex,
                    textSplitIndex: splitIndex,
                };
            }

            html += child.data;
            continue;
        }

        if (child instanceof DomElement && child.name === "code") {
            html += `<code>${extractTextFromChildren(child.childNodes as DOMNode[])}</code>`;

            if (parseMindroomToolRefHtml(html)) {
                bestMatch = {
                    html,
                    childIndex,
                    textSplitIndex: undefined,
                };
            }

            continue;
        }

        if (child instanceof DomElement && child.name === "span") {
            html += extractTextFromChildren(child.childNodes as DOMNode[]);

            if (parseMindroomToolRefHtml(html)) {
                bestMatch = {
                    html,
                    childIndex,
                    textSplitIndex: undefined,
                };
            }

            continue;
        }

        if (bestMatch) return buildPrefixResult(bestMatch);
        return undefined;
    }

    if (!bestMatch) return undefined;
    return buildPrefixResult(bestMatch);
};

const renderToolRefElement = (
    node: DomElement,
    parameters: Parameters<NonNullable<RendererMap[keyof HTMLElementTagNameMap]>>[1],
    consumedNodes: WeakSet<object>,
): React.JSX.Element | undefined => {
    if (consumedNodes.has(node as unknown as object)) {
        return <></>;
    }

    type ToolRefItem = {
        data: MindroomToolEntryData;
        trailingElement?: DomElement;
    };

    const buildItem = (element: DomElement): ToolRefItem | undefined => {
        const prefix = getToolRefPrefixFromElement(element);
        if (!prefix) return undefined;

        const ref = parseMindroomToolRefHtml(prefix.html);
        if (!ref) return undefined;

        const traceEvent = getMindroomToolTraceEventByIndex(parameters.content, ref.index);
        const data = buildToolRefRenderData(ref, traceEvent);
        const trailingElement =
            prefix.trailingChildren.length > 0
                ? new DomElement(element.name, { ...element.attribs }, prefix.trailingChildren)
                : undefined;

        return { data, trailingElement };
    };

    const items: ToolRefItem[] = [];
    const firstItem = buildItem(node);
    if (!firstItem) return undefined;
    items.push(firstItem);

    // Group consecutive tool markers to keep the compact "N tool calls" UX.
    if (!firstItem.trailingElement) {
        let sibling = (node as unknown as { next?: DOMNode }).next;
        while (sibling) {
            if (sibling instanceof DomText && !sibling.data.trim()) {
                consumedNodes.add(sibling as unknown as object);
                sibling = (sibling as unknown as { next?: DOMNode }).next;
                continue;
            }

            if (!(sibling instanceof DomElement)) break;

            const item = buildItem(sibling);
            if (!item) break;

            consumedNodes.add(sibling as unknown as object);
            items.push(item);

            if (item.trailingElement) break;
            sibling = (sibling as unknown as { next?: DOMNode }).next;
        }
    }

    const buildSingleLabel = (entry: MindroomToolEntryData): string => {
        const base = `Tool #${entry.index}: ${entry.command}`;
        if (entry.pending) return `${base} ⏳`;
        if (!entry.result) return base;
        const singleLine = !entry.result.includes("\n");
        if (!singleLine) return base;
        const shortResult = entry.result.length <= 48 ? entry.result : `${entry.result.slice(0, 47)}…`;
        return `${base} → ${shortResult}`;
    };

    const toolBlock = (
        <CollapsibleBlock
            config={TOOL_REF_BLOCK_CONFIG}
            labelOverride={items.length === 1 ? buildSingleLabel(items[0].data) : `${items.length} tool calls`}
        >
            {items.map((item, index) => (
                <ToolEntry key={index} data={item.data} />
            ))}
        </CollapsibleBlock>
    );

    const trailing = items.at(-1)?.trailingElement;
    if (!trailing) {
        return toolBlock;
    }

    return (
        <>
            {toolBlock}
            {domToReact([trailing], { replace: parameters.replace })}
        </>
    );
};

/**
 * Creates a renderer for collapsible blocks.
 * Handles all registered block types from collapsibleBlocks.ts
 */
export function createCollapsibleRenderer(): RendererMap {
    const renderer: RendererMap = {};
    const consumedNodes = new WeakSet<object>();

    // Add handlers for all block tags from collapsibleBlocks.ts
    getSupportedTags().forEach((tag) => {
        renderer[tag as keyof HTMLElementTagNameMap] = (node, parameters) => {
            const config = getBlockConfig(tag);
            if (!config) return undefined;

            return (
                <CollapsibleBlock config={config}>
                    {domToReact(node.childNodes as DOMNode[], { replace: parameters.replace })}
                </CollapsibleBlock>
            );
        };
    });

    // Tool-ref v2 markers are embedded in regular block elements.
    const blockElements: Array<keyof HTMLElementTagNameMap> = ["p", "div", "li"];
    blockElements.forEach((tag) => {
        renderer[tag] = (node, parameters) => {
            return renderToolRefElement(node, parameters, consumedNodes);
        };
    });

    // Handle plain text messages that contain our supported tags.
    renderer[Node.TEXT_NODE] = (node) => {
        const text = node.data;

        const tags = getSupportedTags().join("|");
        const pattern = new RegExp(`<(${tags})>([\\s\\S]*?)<\\/\\1>`, "g");

        if (!pattern.test(text)) {
            return undefined;
        }

        pattern.lastIndex = 0;

        const parts: (string | React.JSX.Element)[] = [];
        let lastIndex = 0;
        let match;
        let key = 0;

        while ((match = pattern.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }

            const tagName = match[1];
            const content = match[2];
            const config = getBlockConfig(tagName);

            if (config) {
                parts.push(
                    <CollapsibleBlock key={`${tagName}-${key++}`} config={config}>
                        {content}
                    </CollapsibleBlock>,
                );
            } else {
                parts.push(match[0]);
            }

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }

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
export const collapsibleRenderer: RendererMap = createCollapsibleRenderer();
