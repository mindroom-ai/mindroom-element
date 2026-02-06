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

    it("captures multiline legacy tool results into a single validation block", () => {
        const message = [
            "✅ **`run_shell_command` result:**",
            "{",
            '  "status": "ok",',
            '  "output": "line1"',
            "}",
            "",
            "After result",
        ].join("\n");

        const { container } = renderPlainText(message);
        const validationButton = screen.getByRole("button", { name: "Expand Validation Results" });

        expect(container).toHaveTextContent("After result");
        expect(container).not.toHaveTextContent('"status": "ok"');

        fireEvent.click(validationButton);

        expect(container).toHaveTextContent('"status": "ok"');
        expect(container).toHaveTextContent('"output": "line1"');
    });

    it("handles backticks inside legacy tool-call arguments", () => {
        const message = "🔧 **Tool Call:** `run_shell_command(command=echo `pwd`)`";
        const { container } = renderPlainText(message);

        fireEvent.click(screen.getByRole("button", { name: "Expand Tool Calls" }));

        expect(container).toHaveTextContent("run_shell_command(command=echo `pwd`)");
    });

    it("handles multiple consecutive legacy tool calls", () => {
        const message = [
            "🔧 **Tool Call:** `save_file(file_name=a.py)`",
            "✅ **`save_file` result:**",
            "ok",
            "",
            "🔧 **Tool Call:** `run_shell_command(args=['python3', 'a.py'])`",
            "✅ **`run_shell_command` result:**",
            "done",
        ].join("\n");

        const { container } = renderPlainText(message);

        expect(screen.getAllByRole("button", { name: "Expand Tool Calls" })).toHaveLength(2);
        expect(screen.getAllByRole("button", { name: "Expand Validation Results" })).toHaveLength(2);

        const toolButtons = screen.getAllByRole("button", { name: "Expand Tool Calls" });
        const resultButtons = screen.getAllByRole("button", { name: "Expand Validation Results" });
        fireEvent.click(toolButtons[0]);
        fireEvent.click(toolButtons[1]);
        fireEvent.click(resultButtons[0]);
        fireEvent.click(resultButtons[1]);

        expect(container).toHaveTextContent("save_file(file_name=a.py)");
        expect(container).toHaveTextContent("run_shell_command(args=['python3', 'a.py'])");
        expect(container).toHaveTextContent("ok");
        expect(container).toHaveTextContent("done");
    });

    it("renders native tool tags as collapsible blocks without markdown normalization", () => {
        const { container } = renderPlainText("<tool>save_file(file_name=a.py)</tool>");

        fireEvent.click(screen.getByRole("button", { name: "Expand Tool Calls" }));

        expect(container).toHaveTextContent("save_file(file_name=a.py)");
    });

    it("decodes HTML entities inside tool blocks in plain-text rendering", () => {
        const { container } = renderPlainText("<tool>save_file(contents=a &amp; b)</tool>");

        fireEvent.click(screen.getByRole("button", { name: "Expand Tool Calls" }));

        expect(container).toHaveTextContent("save_file(contents=a & b)");
    });
});
