/*
Copyright 2025 MindRoom

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ReactNode, useState, useCallback } from "react";
import ChevronDownIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-down";

interface IProps {
    children: ReactNode;
}

/**
 * Component to render AI thinking blocks as collapsible sections.
 * Used to hide verbose AI reasoning while maintaining transparency.
 */
const ThinkingBlock: React.FC<IProps> = ({ children }) => {
    const [expanded, setExpanded] = useState(false);
    
    const toggleExpanded = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setExpanded(!expanded);
    }, [expanded]);

    return (
        <div className="mx_ThinkingBlock">
            <button 
                className="mx_ThinkingBlock_header"
                onClick={toggleExpanded}
                aria-expanded={expanded}
                aria-label={expanded ? "Collapse thinking" : "Expand thinking"}
            >
                <ChevronDownIcon 
                    className={`mx_ThinkingBlock_chevron ${expanded ? 'mx_ThinkingBlock_chevron--expanded' : ''}`}
                    width="16"
                    height="16"
                />
                <span className="mx_ThinkingBlock_label">
                    🤔 AI Thinking Process
                </span>
                <span className="mx_ThinkingBlock_hint">
                    {expanded ? "(click to hide)" : "(click to show)"}
                </span>
            </button>
            {expanded && (
                <div className="mx_ThinkingBlock_content">
                    {children}
                </div>
            )}
        </div>
    );
};

export default ThinkingBlock;