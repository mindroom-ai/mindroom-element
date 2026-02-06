/*
Copyright 2026 MindRoom

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { fireEvent, render, screen } from "jest-matrix-react";
import parse from "html-react-parser";

import {
    applyReplacerOnString,
    collapsibleRenderer,
    combineRenderers,
    preprocessHtmlToolBlocks,
} from "../../../src/renderer";

const renderPlainText = (input: string): ReturnType<typeof render> => {
    const replacer = combineRenderers(collapsibleRenderer)({ isHtml: false });
    return render(<>{applyReplacerOnString(input, replacer)}</>);
};

const renderHtml = (html: string): ReturnType<typeof render> => {
    const replacer = combineRenderers(collapsibleRenderer)({ isHtml: true });
    const processed = preprocessHtmlToolBlocks(html);
    return render(<>{parse(processed, { replace: replacer })}</>);
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
            const message =
                "<tool>save_file(file=a.py)\nok</tool>\n\n<tool>run_shell(cmd=pwd)\n/app</tool>";
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
            const html = "<p><tool>save_file(file=a.py)<br />\nok</tool></p>";
            renderHtml(html);

            expect(screen.getByRole("button", { name: "Expand Tool Call" })).toBeInTheDocument();
        });

        it("merges consecutive <p><tool> blocks via preprocessor", () => {
            // This is what markdown_to_html produces for consecutive tool blocks
            const html = [
                "<p><tool>save_file(file=a.py)<br />\nok</tool></p>",
                "<p><tool>run_shell(cmd=pwd)<br />\n/app</tool></p>",
            ].join("\n");
            renderHtml(html);

            expect(screen.getByRole("button", { name: "Expand 2 tool calls" })).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Expand Tool Call" })).not.toBeInTheDocument();
        });

        it("renders call and result correctly in HTML path", () => {
            const html = "<p><tool>save_file(file=a.py)<br />\nok</tool></p>";
            const { container } = renderHtml(html);

            fireEvent.click(screen.getByRole("button", { name: "Expand Tool Call" }));

            expect(container).toHaveTextContent("save_file(file=a.py)");
            expect(container).toHaveTextContent("ok");
        });

        it("does not merge tool blocks separated by non-tool content", () => {
            const html = [
                "<p><tool>save_file(file=a.py)<br />\nok</tool></p>",
                "<p>Some text between tools</p>",
                "<p><tool>run_shell(cmd=pwd)<br />\n/app</tool></p>",
            ].join("\n");
            renderHtml(html);

            // Should be two separate Tool Call blocks, not merged
            expect(screen.getAllByRole("button", { name: "Expand Tool Call" })).toHaveLength(2);
        });

        it("preserves non-tool content around tool blocks", () => {
            const html = "<p>Hello</p>\n<p><tool>call<br />\nresult</tool></p>\n<p>World</p>";
            const { container } = renderHtml(html);

            expect(container).toHaveTextContent("Hello");
            expect(container).toHaveTextContent("World");
            expect(screen.getByRole("button", { name: "Expand Tool Call" })).toBeInTheDocument();
        });
    });

    describe("preprocessHtmlToolBlocks", () => {
        it("unwraps <tool> from <p> and groups consecutive blocks", () => {
            const html = "<p><tool>a</tool></p>\n<p><tool>b</tool></p>";
            const result = preprocessHtmlToolBlocks(html);
            expect(result).toContain("<tool-group>");
            expect(result).toContain("<tool>a</tool>");
            expect(result).toContain("<tool>b</tool>");
        });

        it("does not group non-consecutive tool blocks", () => {
            const html = "<p><tool>a</tool></p>\n<p>text</p>\n<p><tool>b</tool></p>";
            const result = preprocessHtmlToolBlocks(html);
            expect(result).not.toContain("<tool-group>");
        });

        it("passes through HTML without tool blocks unchanged", () => {
            const html = "<p>Hello world</p>";
            expect(preprocessHtmlToolBlocks(html)).toBe(html);
        });

        it("leaves a single tool block unwrapped (no tool-group)", () => {
            const html = "<p><tool>a</tool></p>";
            const result = preprocessHtmlToolBlocks(html);
            expect(result).not.toContain("<tool-group>");
            expect(result).toBe("<tool>a</tool>");
        });
    });
});
