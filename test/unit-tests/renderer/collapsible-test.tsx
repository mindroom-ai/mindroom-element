/*
Copyright 2026 MindRoom

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { fireEvent, render, screen } from "jest-matrix-react";
import parse from "html-react-parser";

import { applyReplacerOnString, collapsibleRenderer, combineRenderers } from "../../../src/renderer";

const renderPlainText = (input: string, content: Record<string, unknown> = {}): ReturnType<typeof render> => {
    const replacer = combineRenderers(collapsibleRenderer)({ isHtml: false, content });
    return render(<>{applyReplacerOnString(input, replacer)}</>);
};

const renderHtml = (html: string, content: Record<string, unknown> = {}): ReturnType<typeof render> => {
    const replacer = combineRenderers(collapsibleRenderer)({ isHtml: true, content });
    return render(<>{parse(html, { replace: replacer })}</>);
};

describe("collapsible renderer", () => {
    it("renders pending v2 HTML marker as a pending tool block", () => {
        const { container } = renderHtml("<p>🔧 <code>search_web</code> [1] ⏳</p>");

        expect(screen.getByRole("button", { name: /Expand Tool #1: search_web ⏳/ })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /Expand Tool #1: search_web ⏳/ }));

        expect(container).toHaveTextContent("Tool #1: search_web");
        expect(container).toHaveTextContent("⏳");
    });

    it("renders completed v2 HTML marker as a completed tool block", () => {
        const { container } = renderHtml("<p>🔧 <code>search_web</code> [1]</p>");

        fireEvent.click(screen.getByRole("button", { name: /Expand Tool #1: search_web/ }));

        expect(container).toHaveTextContent("Tool #1: search_web");
        expect(container).toHaveTextContent("✓");
        expect(container).not.toHaveTextContent("⏳");
    });

    it("maps marker index [N] to tool trace events[N-1]", () => {
        const { container } = renderHtml("<p>🔧 <code>placeholder_name</code> [2]</p>", {
            "io.mindroom.tool_trace": {
                version: 2,
                events: [
                    { type: "tool_call_completed", tool_name: "first_tool" },
                    {
                        type: "tool_call_completed",
                        tool_name: "second_tool",
                        args_preview: "query=matrix",
                        result_preview: "found",
                    },
                ],
            },
        });

        fireEvent.click(screen.getByRole("button", { name: /Expand Tool #2: second_tool\(query=matrix\) → found/ }));

        expect(container).toHaveTextContent("Tool #2: second_tool(query=matrix)");
        expect(container).toHaveTextContent("found");
        expect(container).not.toHaveTextContent("placeholder_name");
    });

    it("maps multiple markers to the correct trace event slots", () => {
        const html = [
            "<p>🔧 <code>one</code> [1]</p>",
            "<p>🔧 <code>two</code> [2]</p>",
            "<p>🔧 <code>three</code> [3]</p>",
        ].join("");

        const { container } = renderHtml(html, {
            "io.mindroom.tool_trace": {
                version: 2,
                events: [
                    { type: "tool_call_completed", tool_name: "alpha", result_preview: "A" },
                    { type: "tool_call_started", tool_name: "beta" },
                    { type: "tool_call_completed", tool_name: "gamma", result_preview: "C" },
                ],
            },
        });

        const expandButton = screen.getByRole("button", { name: "Expand 3 tool calls" });
        fireEvent.click(expandButton);

        expect(container).toHaveTextContent("Tool #1: alpha");
        expect(container).toHaveTextContent("A");
        expect(container).toHaveTextContent("Tool #2: beta");
        expect(container).toHaveTextContent("⏳");
        expect(container).toHaveTextContent("Tool #3: gamma");
        expect(container).toHaveTextContent("C");
    });

    it("preserves trailing content after a marker in the same block", () => {
        const { container } = renderHtml("<p>🔧 <code>tool3</code> [3]<br/>Done</p>", {
            "io.mindroom.tool_trace": {
                version: 2,
                events: [{}, {}, { type: "tool_call_completed", tool_name: "tool3" }],
            },
        });

        expect(screen.getByText("Done")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /Expand Tool #3: tool3/ }));

        expect(container).toHaveTextContent("Tool #3: tool3");
        expect(container).toHaveTextContent("Done");
    });

    it("does not render a tool block when there is no marker", () => {
        renderHtml("<p>No tool marker here</p>");

        expect(screen.queryByRole("button", { name: /Expand Tool/ })).not.toBeInTheDocument();
    });

    it("no longer interprets legacy <tool> and <tool-group> as tool blocks", () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        const { container } = renderHtml("<tool-group><tool>legacy call</tool></tool-group>");

        expect(screen.queryByRole("button", { name: /Expand Tool/ })).not.toBeInTheDocument();
        expect(container).toHaveTextContent("legacy call");
        errorSpy.mockRestore();
    });

    it("still supports non-tool collapsible tags in plain-text path", () => {
        const { container } = renderPlainText("Before <think>Reasoning</think> After");

        expect(screen.getByRole("button", { name: "Expand AI Thinking Process" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Expand AI Thinking Process" }));

        expect(container).toHaveTextContent("Reasoning");
        expect(container).toHaveTextContent("Before");
        expect(container).toHaveTextContent("After");
    });
});
