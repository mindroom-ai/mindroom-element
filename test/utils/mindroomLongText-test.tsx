/*
Copyright 2025 MindRoom

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { type MatrixClient, MatrixEvent, type Room } from "matrix-js-sdk/src/matrix";
import { act, fireEvent, render, screen, waitFor } from "jest-matrix-react";

import MindroomLongTextBody from "../../src/components/views/messages/MindroomLongTextBody";
import MatrixClientContext from "../../src/contexts/MatrixClientContext";
import type { MindroomLongTextDescriptor } from "../../src/utils/mindroomLongText";
import { getMindroomLongTextDescriptor, __testing__ as mindroomTestUtils } from "../../src/utils/mindroomLongText";
import RoomContext, { type RoomContextType, TimelineRenderingType } from "../../src/contexts/RoomContext";

jest.mock("../../src/customisations/Media", () => ({
    mediaFromContent: jest.fn(),
}));

jest.mock("../../src/utils/DecryptFile", () => ({
    decryptFile: jest.fn(),
}));

const { mediaFromContent } = jest.requireMock("../../src/customisations/Media");
const { decryptFile } = jest.requireMock("../../src/utils/DecryptFile");

const matrixClientStub = {
    mxcUrlToHttp: jest.fn(),
    getRoom: jest.fn().mockReturnValue(undefined),
    getUserId: jest.fn().mockReturnValue("@tester:example.org"),
} as unknown as MatrixClient;

const roomContextStub = {} as Room;
const baseRoomContext = {
    room: roomContextStub,
    roomViewStore: {} as RoomContextType["roomViewStore"],
    canReact: true,
    canSendMessages: true,
    timelineRenderingType: TimelineRenderingType.Room,
} as unknown as RoomContextType;

const LONG_TEXT_META = {
    version: 2,
    encoding: "matrix_event_content_json",
    original_event_size: 123456,
    preview_size: 54000,
    is_complete_content: true,
} as const;

const ENCRYPTED_FILE = {
    url: "mxc://server/encrypted-sidecar",
    key: {
        alg: "A256CTR",
        ext: true,
        k: "key",
        key_ops: ["encrypt", "decrypt"],
        kty: "oct",
    },
    iv: "iv",
    hashes: { sha256: "hash" },
    v: "v2",
} as const;

const renderWithContexts = (descriptor: MindroomLongTextDescriptor, event: MatrixEvent): ReturnType<typeof render> => {
    const props = {
        mxEvent: event,
        highlights: undefined,
        highlightLink: undefined,
        showUrlPreview: false,
        forExport: false,
        maxImageHeight: undefined,
        replacingEventId: undefined,
        editState: undefined,
        permalinkCreator: undefined,
        mediaEventHelper: undefined,
        getRelationsForEvent: undefined,
        isSeeingThroughMessageHiddenForModeration: false,
        inhibitInteraction: false,
        mindroomLongText: descriptor,
    } as const;

    return render(
        <MatrixClientContext.Provider value={matrixClientStub}>
            <RoomContext.Provider value={baseRoomContext}>
                <MindroomLongTextBody {...(props as any)} />
            </RoomContext.Provider>
        </MatrixClientContext.Provider>,
    );
};

const createLongTextFileContent = (overrides: Partial<Record<string, unknown>> = {}, isEncrypted = false): any => {
    const base = {
        "msgtype": "m.file",
        "body": "Message preview\n\n[Message continues in attached file]",
        "filename": "message-content.json",
        "info": {
            mimetype: "application/json",
            size: 123,
        },
        "io.mindroom.long_text": LONG_TEXT_META,
        ...overrides,
    };

    if (isEncrypted) {
        return {
            ...base,
            file: ENCRYPTED_FILE,
            url: undefined,
        };
    }

    return {
        ...base,
        url: overrides.url ?? "mxc://server/unencrypted-sidecar",
    };
};

const createEvent = (content: Record<string, unknown>): MatrixEvent =>
    new MatrixEvent({
        type: "m.room.message",
        event_id: `$${Math.random().toString(36).slice(2)}`,
        content,
        origin_server_ts: Date.now(),
        sender: "@alice:example.org",
    });

const createLongTextEvent = (overrides: Partial<Record<string, unknown>> = {}, encrypted = false): MatrixEvent => {
    return createEvent(createLongTextFileContent(overrides, encrypted));
};

const createEditLongTextEvent = (overrides: Partial<Record<string, unknown>> = {}): MatrixEvent => {
    return createEvent({
        "msgtype": "m.text",
        "body": "* Message preview\n\n[Message continues in attached file]",
        "m.new_content": createLongTextFileContent({
            url: "mxc://server/edit-sidecar",
            ...overrides,
        }),
        "m.relates_to": {
            rel_type: "m.replace",
            event_id: "$original",
        },
    });
};

beforeEach(() => {
    jest.clearAllMocks();
    mindroomTestUtils.resetCache();
});

test("hydrates full content from v2 unencrypted JSON sidecar", async () => {
    const event = createLongTextEvent({ url: "mxc://server/file1" });
    const descriptor = getMindroomLongTextDescriptor(event)!;

    (mediaFromContent as jest.Mock).mockReturnValue({
        downloadSource: jest.fn().mockResolvedValue({
            ok: true,
            text: async () => JSON.stringify({ msgtype: "m.text", body: "Full unencrypted message" }),
        }),
    });

    renderWithContexts(descriptor, event);

    expect(screen.getByText("Message preview")).toBeInTheDocument();

    await waitFor(() => {
        expect(screen.getByText("Full unencrypted message")).toBeInTheDocument();
    });
});

test("hydrates full content from v2 encrypted JSON sidecar", async () => {
    const event = createLongTextEvent({}, true);
    const descriptor = getMindroomLongTextDescriptor(event)!;

    (decryptFile as jest.Mock).mockResolvedValue(
        new Blob([JSON.stringify({ msgtype: "m.text", body: "Secret contents" })], { type: "application/json" }),
    );

    renderWithContexts(descriptor, event);

    await waitFor(() => {
        expect(screen.getByText("Secret contents")).toBeInTheDocument();
    });
});

test("hydrates formatted_body and tool trace metadata from sidecar JSON", async () => {
    const event = createLongTextEvent({ url: "mxc://server/tools" });
    const descriptor = getMindroomLongTextDescriptor(event)!;

    const sidecar = {
        "msgtype": "m.text",
        "body": "Tool call",
        "format": "org.matrix.custom.html",
        "formatted_body": "<p>🔧 <code>search_web</code> [1]</p>",
        "io.mindroom.tool_trace": {
            version: 2,
            events: [
                {
                    type: "tool_call_completed",
                    tool_name: "search_web",
                    result_preview: "Found docs",
                },
            ],
        },
    };

    (mediaFromContent as jest.Mock).mockReturnValue({
        downloadSource: jest.fn().mockResolvedValue({
            ok: true,
            text: async () => JSON.stringify(sidecar),
        }),
    });

    const { container } = renderWithContexts(descriptor, event);

    await waitFor(() => {
        expect(screen.getByRole("button", { name: /Expand Tool #1: search_web/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Expand Tool #1: search_web/ }));

    expect(container).toHaveTextContent("search_web");
    expect(container).toHaveTextContent("Found docs");
});

test("falls back to preview when JSON sidecar parse fails", async () => {
    const event = createLongTextEvent({ url: "mxc://server/bad-json" });
    const descriptor = getMindroomLongTextDescriptor(event)!;

    (mediaFromContent as jest.Mock).mockReturnValue({
        downloadSource: jest.fn().mockResolvedValue({
            ok: true,
            text: async () => "not-json",
        }),
    });

    renderWithContexts(descriptor, event);

    await waitFor(() => {
        expect(screen.getByText("Unable to load full message.")).toBeInTheDocument();
    });

    expect(screen.getByText("Message preview")).toBeInTheDocument();
});

test("falls back on decrypt failure and retry loads hydrated content", async () => {
    const event = createLongTextEvent({ file: ENCRYPTED_FILE }, true);
    const descriptor = getMindroomLongTextDescriptor(event)!;

    (decryptFile as jest.Mock).mockRejectedValueOnce(new Error("decrypt error")).mockResolvedValueOnce(
        new Blob([JSON.stringify({ msgtype: "m.text", body: "Recovered after retry" })], {
            type: "application/json",
        }),
    );

    renderWithContexts(descriptor, event);

    await waitFor(() => {
        expect(screen.getByText("Unable to load full message.")).toBeInTheDocument();
    });

    expect(screen.getByText("Message preview")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
        expect(screen.getByText("Recovered after retry")).toBeInTheDocument();
    });
});

test("caches hydrated content by MXC URI", async () => {
    const event = createLongTextEvent({ url: "mxc://server/cache" });
    const descriptor = getMindroomLongTextDescriptor(event)!;

    const downloadSource = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ msgtype: "m.text", body: "Cached payload" }),
    });

    (mediaFromContent as jest.Mock).mockReturnValue({ downloadSource });

    renderWithContexts(descriptor, event);

    await waitFor(() => {
        expect(screen.getByText("Cached payload")).toBeInTheDocument();
    });

    (mediaFromContent as jest.Mock).mockClear();

    renderWithContexts(descriptor, event);

    await waitFor(() => {
        expect(screen.getAllByText("Cached payload").length).toBeGreaterThan(1);
    });

    expect(mediaFromContent).not.toHaveBeenCalled();
});

test("normalizes edit payload sidecar m.new_content and preserves parent trace", async () => {
    const event = createEditLongTextEvent({ url: "mxc://server/edit" });
    const descriptor = getMindroomLongTextDescriptor(event)!;

    const sidecar = {
        "msgtype": "m.text",
        "body": "* fallback edit body",
        "m.mentions": { user_ids: ["@bob:example.org"] },
        "io.mindroom.tool_trace": {
            version: 2,
            events: [
                {
                    type: "tool_call_completed",
                    tool_name: "search_web",
                    result_preview: "Done",
                },
            ],
        },
        "m.new_content": {
            msgtype: "m.text",
            body: "Edited full body",
            format: "org.matrix.custom.html",
            formatted_body: "<p>🔧 <code>search_web</code> [1]</p><p>Finished</p>",
        },
    };

    (mediaFromContent as jest.Mock).mockReturnValue({
        downloadSource: jest.fn().mockResolvedValue({
            ok: true,
            text: async () => JSON.stringify(sidecar),
        }),
    });

    const { container } = renderWithContexts(descriptor, event);

    await waitFor(() => {
        expect(screen.getByRole("button", { name: /Expand Tool #1: search_web/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Expand Tool #1: search_web/ }));

    expect(container).toHaveTextContent("search_web");
    expect(container).toHaveTextContent("Done");
});

test("shows spinner while loading sidecar", async () => {
    const event = createLongTextEvent({ url: "mxc://server/pending" });
    const descriptor = getMindroomLongTextDescriptor(event)!;

    let resolve!: () => void;
    const deferred = new Promise<{ ok: true; text: () => Promise<string> }>((res) => {
        resolve = () =>
            res({
                ok: true,
                text: async () => JSON.stringify({ msgtype: "m.text", body: "Resolved payload" }),
            });
    });

    (mediaFromContent as jest.Mock).mockReturnValue({
        downloadSource: jest.fn().mockImplementation(() => deferred),
    });

    renderWithContexts(descriptor, event);

    expect(screen.getByText("Message preview")).toBeInTheDocument();
    expect(screen.queryByText("Resolved payload")).not.toBeInTheDocument();

    await act(async () => {
        resolve();
    });

    await waitFor(() => {
        expect(screen.getByText("Resolved payload")).toBeInTheDocument();
    });
});
