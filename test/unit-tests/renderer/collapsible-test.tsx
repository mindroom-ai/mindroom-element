/*
Copyright 2026 MindRoom

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { fireEvent, render, screen } from "jest-matrix-react";

import { applyReplacerOnString, collapsibleRenderer, combineRenderers } from "../../../src/renderer";

const renderPlainText = (input: string): ReturnType<typeof render> => {
    const replacer = combineRenderers(collapsibleRenderer)({ isHtml: false });
    return render(<>{applyReplacerOnString(input, replacer)}</>);
};

describe("collapsible renderer", () => {
    it("renders markdown-style tool calls as collapsible tool blocks", () => {
        const message = [
            "Before tool call",
            "",
            "🔧 **Tool Call:** `save_file(file_name=sudoku_solver.py,",
            "contents=print('ok'))`",
            "✅ **`save_file` result:**",
            "save_file(...) completed in 0.0015s.",
            "",
            "After tool call",
        ].join("\n");

        const { container } = renderPlainText(message);

        expect(screen.getByRole("button", { name: "Expand Tool Calls" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Expand Validation Results" })).toBeInTheDocument();
        expect(container).toHaveTextContent("Before tool call");
        expect(container).toHaveTextContent("After tool call");
        expect(container).not.toHaveTextContent("save_file(file_name=sudoku_solver.py,");
        expect(container).not.toHaveTextContent("save_file(...) completed in 0.0015s.");

        fireEvent.click(screen.getByRole("button", { name: "Expand Tool Calls" }));
        fireEvent.click(screen.getByRole("button", { name: "Expand Validation Results" }));

        expect(container).toHaveTextContent("save_file(file_name=sudoku_solver.py,");
        expect(container).toHaveTextContent("contents=print('ok'))");
        expect(container).toHaveTextContent("save_file(...) completed in 0.0015s.");
    });

    it("does not convert regular inline code spans into tool blocks", () => {
        renderPlainText("Use `save_file(file_name=sudoku_solver.py)` when needed.");

        expect(screen.queryByRole("button", { name: "Expand Tool Calls" })).not.toBeInTheDocument();
    });
});
