/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { textContent } from "domutils";

import { type RendererMap } from "./utils.tsx";
import CodeBlock from "../components/views/messages/CodeBlock.tsx";
import CollapsibleBlock, { type CollapsibleBlockConfig } from "../components/views/elements/CollapsibleBlock.tsx";

const CODE_BLOCK_CONFIG: CollapsibleBlockConfig = {
    tag: "code",
    icon: "💻",
    label: "Code Generation",
    expandedHint: "(hide code details)",
    collapsedHint: "(show code details)",
    className: "mx_CollapsibleBlock--code",
    defaultExpanded: false,
};

/**
 * Replaces `pre` elements with a CodeBlock component
 */
export const codeBlockRenderer: RendererMap = {
    pre: (pre) => {
        const text = textContent(pre);
        const isMultiline = text.trimEnd().includes("\n");
        const block = <CodeBlock preNode={pre} showCollapseToggle={!isMultiline} />;
        if (!isMultiline) return block;

        return <CollapsibleBlock config={CODE_BLOCK_CONFIG}>{block}</CollapsibleBlock>;
    },
};
