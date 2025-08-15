/*
Copyright 2025 MindRoom

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ReactNode, useState, useCallback } from "react";
import ChevronDownIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-down";

export interface CollapsibleBlockConfig {
    /** The tag name to match (e.g., "think", "tool", "debug") */
    tag: string;
    /** The icon to display (emoji or component) */
    icon: string | ReactNode;
    /** The label text to display */
    label: string;
    /** Optional hint text for expanded/collapsed states */
    expandedHint?: string;
    collapsedHint?: string;
    /** Optional CSS class for custom styling */
    className?: string;
    /** Whether to start expanded by default */
    defaultExpanded?: boolean;
}

interface IProps {
    children: ReactNode;
    config: CollapsibleBlockConfig;
}

/**
 * Generic collapsible block component for various types of content.
 * Can be used for AI thinking, tool calls, debug info, etc.
 */
const CollapsibleBlock: React.FC<IProps> = ({ children, config }) => {
    const [expanded, setExpanded] = useState(config.defaultExpanded || false);
    
    const toggleExpanded = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setExpanded(!expanded);
    }, [expanded]);

    const expandedHint = config.expandedHint || "(click to hide)";
    const collapsedHint = config.collapsedHint || "(click to show)";
    const className = `mx_CollapsibleBlock ${config.className || ''} mx_CollapsibleBlock--${config.tag}`;

    return (
        <div className={className}>
            <button 
                className="mx_CollapsibleBlock_header"
                onClick={toggleExpanded}
                aria-expanded={expanded}
                aria-label={expanded ? `Collapse ${config.label}` : `Expand ${config.label}`}
            >
                <ChevronDownIcon 
                    className={`mx_CollapsibleBlock_chevron ${expanded ? 'mx_CollapsibleBlock_chevron--expanded' : ''}`}
                    width="16"
                    height="16"
                />
                <span className="mx_CollapsibleBlock_icon">
                    {config.icon}
                </span>
                <span className="mx_CollapsibleBlock_label">
                    {config.label}
                </span>
                <span className="mx_CollapsibleBlock_hint">
                    {expanded ? expandedHint : collapsedHint}
                </span>
            </button>
            {expanded && (
                <div className="mx_CollapsibleBlock_content">
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleBlock;