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
    it("renders <tool>call\\nresult</tool> with call and result when expanded", () => {
        const message = "<tool>save_file(file=a.py)\nok</tool>";
        const { container } = renderPlainText(message);

        // Collapsed — content hidden
        expect(screen.getByRole("button", { name: "Expand Tool Call" })).toBeInTheDocument();
        expect(container).not.toHaveTextContent("save_file(file=a.py)");

        // Expand
        fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

        expect(container).toHaveTextContent("save_file(file=a.py)");
        expect(container).toHaveTextContent("→");
        expect(container).toHaveTextContent("ok");
    });

    it("renders <tool>call</tool> (no newline) with pending indicator", () => {
        const message = "<tool>save_file(file=a.py)</tool>";
        const { container } = renderPlainText(message);

        fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

        expect(container).toHaveTextContent("save_file(file=a.py)");
        expect(container).toHaveTextContent("⏳");
    });

    it("renders <tool>call\\n</tool> (empty result) with done indicator", () => {
        const message = "<tool>save_file(file=a.py)\n</tool>";
        const { container } = renderPlainText(message);

        fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

        expect(container).toHaveTextContent("save_file(file=a.py)");
        expect(container).toHaveTextContent("✓");
        expect(container).not.toHaveTextContent("⏳");
    });

    it("merges consecutive <tool> blocks into single collapsible with count label", () => {
        const message = [
            "<tool>save_file(file=a.py)\nok</tool>",
            "<tool>run_shell(cmd=python a.py)\ndone</tool>",
        ].join("");

        renderPlainText(message);

        // Should merge into one block with "2 tool calls" label
        expect(screen.getByRole("button", { name: "Expand 2 tool calls" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Expand Tool Call" })).not.toBeInTheDocument();
    });

    it("uses 'Tool Call' label for a single <tool> block", () => {
        renderPlainText("<tool>save_file(file=a.py)\nok</tool>");

        expect(screen.getByRole("button", { name: "Expand Tool Call" })).toBeInTheDocument();
    });

    it("decodes HTML entities inside tool blocks in plain-text rendering", () => {
        const { container } = renderPlainText("<tool>save_file(contents=a &amp; b)\nok</tool>");

        fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

        expect(container).toHaveTextContent("save_file(contents=a & b)");
    });

    it("renders long multiline results below the call, not inline", () => {
        const longResult = "line1\nline2\nline3";
        const message = `<tool>run_shell(cmd=test)\n${longResult}</tool>`;
        const { container } = renderPlainText(message);

        fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

        expect(container).toHaveTextContent("run_shell(cmd=test)");
        expect(container).toHaveTextContent("line1");
        expect(container).toHaveTextContent("line2");
        expect(container).toHaveTextContent("line3");
        // Should NOT show inline arrow for multiline
        expect(container).not.toHaveTextContent("→");
    });

    it("renders long single-line results below the call", () => {
        const longResult = "x".repeat(100);
        const message = `<tool>run_shell(cmd=test)\n${longResult}</tool>`;
        const { container } = renderPlainText(message);

        fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

        expect(container).toHaveTextContent("run_shell(cmd=test)");
        expect(container).toHaveTextContent(longResult);
        // Should NOT show inline arrow for long results
        expect(container).not.toHaveTextContent("→");
    });

    it("preserves text before and after tool blocks", () => {
        const message = "Before <tool>call\nresult</tool> After";
        const { container } = renderPlainText(message);

        expect(container).toHaveTextContent("Before");
        expect(container).toHaveTextContent("After");
    });
});
