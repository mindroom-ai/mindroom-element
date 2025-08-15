/*
Copyright 2025 MindRoom

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { type CollapsibleBlockConfig } from "../components/views/elements/CollapsibleBlock";

/**
 * Registry of collapsible block configurations.
 * Add new block types here to automatically support them in messages.
 */
export const COLLAPSIBLE_BLOCK_CONFIGS: Record<string, CollapsibleBlockConfig> = {
    // AI thinking/reasoning blocks
    think: {
        tag: "think",
        icon: "🤔",
        label: "AI Thinking Process",
        expandedHint: "(click to hide)",
        collapsedHint: "(click to show)",
        className: "mx_CollapsibleBlock--thinking",
        defaultExpanded: false,
    },
    
    // Tool/function calls
    tool: {
        tag: "tool",
        icon: "🔧",
        label: "Tool Calls",
        expandedHint: "(hide details)",
        collapsedHint: "(show details)",
        className: "mx_CollapsibleBlock--tool",
        defaultExpanded: false,
    },
    
    // Debug information
    debug: {
        tag: "debug",
        icon: "🐛",
        label: "Debug Information",
        expandedHint: "(hide debug)",
        collapsedHint: "(show debug)",
        className: "mx_CollapsibleBlock--debug",
        defaultExpanded: false,
    },
    
    // System/internal processing
    system: {
        tag: "system",
        icon: "⚙️",
        label: "System Processing",
        expandedHint: "(hide system info)",
        collapsedHint: "(show system info)",
        className: "mx_CollapsibleBlock--system",
        defaultExpanded: false,
    },
    
    // Planning/strategy
    plan: {
        tag: "plan",
        icon: "📋",
        label: "Planning & Strategy",
        expandedHint: "(hide plan)",
        collapsedHint: "(show plan)",
        className: "mx_CollapsibleBlock--plan",
        defaultExpanded: false,
    },
    
    // Analysis/evaluation
    analysis: {
        tag: "analysis",
        icon: "📊",
        label: "Analysis & Evaluation",
        expandedHint: "(hide analysis)",
        collapsedHint: "(show analysis)",
        className: "mx_CollapsibleBlock--analysis",
        defaultExpanded: false,
    },
    
    // Research/sources
    research: {
        tag: "research",
        icon: "🔍",
        label: "Research & Sources",
        expandedHint: "(hide sources)",
        collapsedHint: "(show sources)",
        className: "mx_CollapsibleBlock--research",
        defaultExpanded: false,
    },
    
    // Code generation details
    code: {
        tag: "code",
        icon: "💻",
        label: "Code Generation",
        expandedHint: "(hide code details)",
        collapsedHint: "(show code details)",
        className: "mx_CollapsibleBlock--code",
        defaultExpanded: false,
    },
    
    // Validation/testing results
    validation: {
        tag: "validation",
        icon: "✅",
        label: "Validation Results",
        expandedHint: "(hide validation)",
        collapsedHint: "(show validation)",
        className: "mx_CollapsibleBlock--validation",
        defaultExpanded: false,
    },
};

/**
 * Get all supported tag names for the renderer
 */
export function getSupportedTags(): string[] {
    return Object.keys(COLLAPSIBLE_BLOCK_CONFIGS);
}

/**
 * Get configuration for a specific tag
 */
export function getBlockConfig(tag: string): CollapsibleBlockConfig | undefined {
    return COLLAPSIBLE_BLOCK_CONFIGS[tag];
}

/**
 * Check if a tag is supported
 */
export function isTagSupported(tag: string): boolean {
    return tag in COLLAPSIBLE_BLOCK_CONFIGS;
}

/**
 * Add a new block type configuration at runtime
 * Useful for plugins or dynamic configuration
 */
export function registerBlockType(config: CollapsibleBlockConfig): void {
    COLLAPSIBLE_BLOCK_CONFIGS[config.tag] = config;
}

/**
 * Remove a block type configuration
 */
export function unregisterBlockType(tag: string): void {
    delete COLLAPSIBLE_BLOCK_CONFIGS[tag];
}