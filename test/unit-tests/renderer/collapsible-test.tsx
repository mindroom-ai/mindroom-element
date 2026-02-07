/*
Copyright 2026 MindRoom

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { fireEvent, render, screen } from "jest-matrix-react";
import parse from "html-react-parser";

import { applyReplacerOnString, collapsibleRenderer, combineRenderers } from "../../../src/renderer";

const renderPlainText = (input: string): ReturnType<typeof render> => {
    const replacer = combineRenderers(collapsibleRenderer)({ isHtml: false });
    return render(<>{applyReplacerOnString(input, replacer)}</>);
};

const renderHtml = (html: string): ReturnType<typeof render> => {
    const replacer = combineRenderers(collapsibleRenderer)({ isHtml: true });
    return render(<>{parse(html, { replace: replacer })}</>);
};

describe("collapsible renderer", () => {
    describe("plain-text path", () => {
        it("renders <tool>call\\nresult</tool> with call and result when expanded", () => {
            const message = "<tool>save_file(file=a.py)\nok</tool>";
            const { container } = renderPlainText(message);

            expect(screen.getByRole("button", { name: "Expand Tool Call" })).toBeInTheDocument();
            expect(container).not.toHaveTextContent("save_file(file=a.py)");

            fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

            expect(container).toHaveTextContent("save_file(file=a.py)");
            expect(container).toHaveTextContent("→");
            expect(container).toHaveTextContent("ok");
        });

        it("renders <tool>call</tool> (no newline) with pending indicator", () => {
            const { container } = renderPlainText("<tool>save_file(file=a.py)</tool>");

            fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

            expect(container).toHaveTextContent("save_file(file=a.py)");
            expect(container).toHaveTextContent("⏳");
        });

        it("renders <tool>call\\n</tool> (empty result) with done indicator", () => {
            const { container } = renderPlainText("<tool>save_file(file=a.py)\n</tool>");

            fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

            expect(container).toHaveTextContent("save_file(file=a.py)");
            expect(container).toHaveTextContent("✓");
            expect(container).not.toHaveTextContent("⏳");
        });

        it("merges consecutive <tool> blocks into single collapsible with count label", () => {
            const message = "<tool>save_file(file=a.py)\nok</tool><tool>run_shell(cmd=pwd)\n/app</tool>";
            renderPlainText(message);

            expect(screen.getByRole("button", { name: "Expand 2 tool calls" })).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Expand Tool Call" })).not.toBeInTheDocument();
        });

        it("merges tool blocks separated by whitespace (backend-style \\n\\n)", () => {
            const message = "<tool>save_file(file=a.py)\nok</tool>\n\n<tool>run_shell(cmd=pwd)\n/app</tool>";
            renderPlainText(message);

            expect(screen.getByRole("button", { name: "Expand 2 tool calls" })).toBeInTheDocument();
        });

        it("uses 'Tool Call' label for a single <tool> block", () => {
            renderPlainText("<tool>save_file(file=a.py)\nok</tool>");
            expect(screen.getByRole("button", { name: "Expand Tool Call" })).toBeInTheDocument();
        });

        it("decodes HTML entities inside tool blocks", () => {
            const { container } = renderPlainText("<tool>save_file(contents=a &amp; b)\nok</tool>");

            fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

            expect(container).toHaveTextContent("save_file(contents=a & b)");
        });

        it("renders long multiline results below the call, not inline", () => {
            const message = "<tool>run_shell(cmd=test)\nline1\nline2\nline3</tool>";
            const { container } = renderPlainText(message);

            fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

            expect(container).toHaveTextContent("run_shell(cmd=test)");
            expect(container).toHaveTextContent("line1");
            expect(container).not.toHaveTextContent("→");
        });

        it("renders long single-line results below the call", () => {
            const longResult = "x".repeat(100);
            const { container } = renderPlainText(`<tool>run_shell(cmd=test)\n${longResult}</tool>`);

            fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

            expect(container).toHaveTextContent(longResult);
            expect(container).not.toHaveTextContent("→");
        });

        it("preserves text before and after tool blocks", () => {
            const { container } = renderPlainText("Before <tool>call\nresult</tool> After");

            expect(container).toHaveTextContent("Before");
            expect(container).toHaveTextContent("After");
        });
    });

    describe("HTML path", () => {
        it("renders a single <tool> block with Tool Call label", () => {
            // Backend produces <tool> as block-level (no <p> wrapping, no <br>)
            renderHtml("<tool>save_file(file=a.py)\nok</tool>");

            expect(screen.getByRole("button", { name: "Expand Tool Call" })).toBeInTheDocument();
        });

        it("merges consecutive tool blocks via <tool-group> from backend", () => {
            // Backend groups consecutive blocks into <tool-group>
            const html = [
                "<tool-group>",
                "<tool>save_file(file=a.py)\nok</tool>",
                "<tool>run_shell(cmd=pwd)\n/app</tool>",
                "</tool-group>",
            ].join("\n");
            renderHtml(html);

            expect(screen.getByRole("button", { name: "Expand 2 tool calls" })).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Expand Tool Call" })).not.toBeInTheDocument();
        });

        it("renders call and result correctly in HTML path", () => {
            const { container } = renderHtml("<tool>save_file(file=a.py)\nok</tool>");

            fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

            expect(container).toHaveTextContent("save_file(file=a.py)");
            expect(container).toHaveTextContent("ok");
        });

        it("does not merge tool blocks separated by non-tool content", () => {
            // Backend does not group these (text between them)
            const html =
                "<tool>save_file(file=a.py)\nok</tool>\n<p>Some text</p>\n<tool>run_shell(cmd=pwd)\n/app</tool>";
            renderHtml(html);

            expect(screen.getAllByRole("button", { name: "Expand Tool Call" })).toHaveLength(2);
        });

        it("preserves non-tool content around tool blocks", () => {
            const html = "<p>Hello</p>\n<tool>call\nresult</tool>\n<p>World</p>";
            const { container } = renderHtml(html);

            expect(container).toHaveTextContent("Hello");
            expect(container).toHaveTextContent("World");
            expect(screen.getByRole("button", { name: "Expand Tool Call" })).toBeInTheDocument();
        });

        it("renders backend contract HTML (two completed tools grouped)", () => {
            // This HTML must match what the backend's test_tool_lifecycle_produces_expected_html
            // asserts. If this test breaks, the backend contract test in
            // tests/test_tool_events.py must be updated in sync.
            const html = [
                "<tool-group>",
                "<tool>save_file(file=a.py)\nok</tool>",
                "\n\n",
                "<tool>run_shell(cmd=pwd)\n/app</tool>",
                "</tool-group>",
            ].join("");

            const { container } = renderHtml(html);

            // Grouped into a single collapsible
            expect(screen.getByRole("button", { name: "Expand 2 tool calls" })).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Expand Tool Call" })).not.toBeInTheDocument();

            // Expand and verify both tool entries render correctly
            fireEvent.click(screen.getByRole("button", { name: "Expand 2 tool calls" }));

            expect(container).toHaveTextContent("save_file(file=a.py)");
            expect(container).toHaveTextContent("ok");
            expect(container).toHaveTextContent("run_shell(cmd=pwd)");
            expect(container).toHaveTextContent("/app");
        });
    });
});
