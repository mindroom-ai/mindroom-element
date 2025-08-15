/*
Copyright 2025 MindRoom

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { domToReact, type DOMNode, Element, Text } from "html-react-parser";

import { type RendererMap } from "./utils.tsx";
import CollapsibleBlock from "../components/views/elements/CollapsibleBlock.tsx";
import { getSupportedTags, getBlockConfig, isTagSupported } from "./collapsibleBlocks.ts";

/**
 * Creates a renderer for collapsible blocks.
 * Handles all registered block types from collapsibleBlocks.ts
 */
export function createCollapsibleRenderer(): RendererMap {
    const renderer: RendererMap = {};
    
    // Add handlers for all HTML elements matching our supported tags
    getSupportedTags().forEach(tag => {
        renderer[tag as keyof HTMLElementTagNameMap] = (node) => {
            const config = getBlockConfig(tag);
            if (config) {
                return (
                    <CollapsibleBlock config={config}>
                        {domToReact(node.children as DOMNode[])}
                    </CollapsibleBlock>
                );
            }
            return undefined;
        };
    });
    
    // Handle plain text messages that contain our supported tags
    renderer[Node.TEXT_NODE] = (node) => {
        const text = node.data;
        
        // Build regex pattern for all supported tags
        const tags = getSupportedTags().join('|');
        const pattern = new RegExp(`<(${tags})>([\\s\\S]*?)<\\/\\1>`, 'g');
        
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
                parts.push(
                    <CollapsibleBlock key={`${tagName}-${key++}`} config={config}>
                        {content}
                    </CollapsibleBlock>
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
        if (parts.length === 1 && typeof parts[0] === 'string') {
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