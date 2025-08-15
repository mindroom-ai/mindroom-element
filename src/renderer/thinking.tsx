/*
Copyright 2025 MindRoom

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { domToReact, type DOMNode, Element, Text } from "html-react-parser";

import { type RendererMap } from "./utils.tsx";
import ThinkingBlock from "../components/views/elements/ThinkingBlock.tsx";

/**
 * Replaces <think> tags with a ThinkingBlock component.
 * Also handles text nodes that contain think tags in plain text messages.
 */
export const thinkingRenderer: RendererMap = {
    // Handle HTML formatted messages with actual <think> tags
    // The tag name will be "think" after our sanitization allows it
    ["think" as keyof HTMLElementTagNameMap]: (node) => {
        return <ThinkingBlock>{domToReact(node.children as DOMNode[])}</ThinkingBlock>;
    },
    
    // Handle plain text messages that contain <think>...</think> patterns
    [Node.TEXT_NODE]: (node) => {
        const text = node.data;
        // Match <think> tags in plain text, including multiline content
        const thinkPattern = /<think>([\s\S]*?)<\/think>/g;
        
        if (!thinkPattern.test(text)) {
            return undefined; // Let other renderers handle this
        }
        
        // Reset the regex for actual matching
        thinkPattern.lastIndex = 0;
        
        const parts: (string | JSX.Element)[] = [];
        let lastIndex = 0;
        let match;
        let key = 0;
        
        while ((match = thinkPattern.exec(text)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }
            
            // Add the thinking block
            const thinkingContent = match[1];
            parts.push(
                <ThinkingBlock key={`think-${key++}`}>
                    {thinkingContent}
                </ThinkingBlock>
            );
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add any remaining text after the last match
        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }
        
        // If we only have one part and it's a string, return undefined to let other renderers handle it
        if (parts.length === 1 && typeof parts[0] === 'string') {
            return undefined;
        }
        
        return <>{parts}</>;
    },
};