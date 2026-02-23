/*
Copyright 2026 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { EventType, MatrixEvent, MsgType } from "matrix-js-sdk/src/matrix";

import {
    MINDROOM_AI_RUN_KEY,
    formatMindroomAiRunTooltip,
    getMindroomAiRunMetadataFromContent,
    getMindroomAiRunTooltip,
} from "../../../src/utils/mindroomAiRun";

describe("mindroomAiRun", () => {
    it("formats compact tooltip text", () => {
        const tooltip = formatMindroomAiRunTooltip({
            version: 1,
            status: "completed",
            model: {
                provider: "openai",
                id: "gpt-4.1-mini",
            },
            usage: {
                input_tokens: 800,
                output_tokens: 120,
                total_tokens: 920,
            },
            context: {
                input_tokens: 800,
                window_tokens: 2000,
            },
            tools: {
                count: 2,
            },
        });

        expect(tooltip).toBe("openai / gpt-4.1-mini • 920 tok (800 in, 120 out) • ctx 40% • 2 tools");
    });

    it("includes non-completed status in tooltip", () => {
        const tooltip = formatMindroomAiRunTooltip({
            version: 1,
            status: "cached",
            usage: {
                total_tokens: 10,
            },
        });

        expect(tooltip).toBe("10 tok • cached");
    });

    it("parses metadata from m.new_content for edited events", () => {
        const event = new MatrixEvent({
            type: EventType.RoomMessage,
            event_id: "$event",
            room_id: "!room:server",
            sender: "@alice:server",
            content: {
                msgtype: MsgType.Text,
                body: "* edited",
                "m.relates_to": {
                    rel_type: "m.replace",
                    event_id: "$original",
                },
                "m.new_content": {
                    msgtype: MsgType.Text,
                    body: "edited",
                    [MINDROOM_AI_RUN_KEY]: {
                        version: 1,
                        usage: { total_tokens: 10 },
                    },
                },
            },
        });

        expect(getMindroomAiRunTooltip(event)).toBe("10 tok");
    });

    it("ignores unsupported metadata versions", () => {
        const metadata = getMindroomAiRunMetadataFromContent({
            [MINDROOM_AI_RUN_KEY]: {
                version: 99,
                usage: { total_tokens: 10 },
            },
        });

        expect(metadata).toBeUndefined();
    });

    it("accepts integer-like numeric strings in metadata", () => {
        const event = new MatrixEvent({
            type: EventType.RoomMessage,
            event_id: "$event2",
            room_id: "!room:server",
            sender: "@alice:server",
            content: {
                msgtype: MsgType.Text,
                body: "hello",
                [MINDROOM_AI_RUN_KEY]: {
                    version: 1,
                    usage: {
                        input_tokens: "800",
                        output_tokens: "120.0",
                        total_tokens: "920",
                    },
                    context: {
                        input_tokens: "800",
                        window_tokens: "2000",
                    },
                    tools: {
                        count: "2",
                    },
                },
            },
        });

        expect(getMindroomAiRunTooltip(event)).toBe("920 tok (800 in, 120 out) • ctx 40% • 2 tools");
    });
});
