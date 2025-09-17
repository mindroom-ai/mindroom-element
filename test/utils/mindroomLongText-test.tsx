/*
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
*/

import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import type { MatrixClient } from "matrix-js-sdk/src/matrix";

import MindroomLongTextBody from "../../src/components/views/messages/MindroomLongTextBody";
import MatrixClientContext from "../../src/contexts/MatrixClientContext";
import { getMindroomLongTextDescriptor, __testing__ as mindroomTestUtils } from "../../src/utils/mindroomLongText";
import type { MindroomLongTextDescriptor } from "../../src/utils/mindroomLongText";
import { TimelineRenderingType } from "../../src/contexts/RoomContext";
import RoomContext from "../../src/contexts/RoomContext";

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

const baseRoomContext = {
    ...(RoomContext._currentValue as any),
    canReact: true,
    canSendMessages: true,
    timelineRenderingType: TimelineRenderingType.Room,
};

const renderWithContexts = (
    descriptor: MindroomLongTextDescriptor,
    event: MatrixEvent,
): ReturnType<typeof render> => {
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

const createEvent = (overrides: Partial<Record<string, unknown>> = {}, isEncrypted = false): MatrixEvent => {
    const content: any = {
        msgtype: "m.file",
        body: "Message preview\n\n[Message continues in attached file]",
        filename: "message.txt",
        info: {
            mimetype: isEncrypted ? "text/plain" : "text/plain",
            size: 123,
        },
        "io.mindroom.long_text": {
            version: 1,
            original_size: 123456,
            preview_size: 54000,
            is_complete_text: true,
        },
        ...overrides,
    };

    if (isEncrypted) {
        content.file = {
            url: "mxc://server/encrypted",
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
        };
        delete content.url;
    } else {
        content.url = overrides.url ?? "mxc://server/unencrypted";
    }

    return new MatrixEvent({
        type: "m.room.message",
        event_id: `$${Math.random().toString(36).slice(2)}`,
        content,
        origin_server_ts: Date.now(),
        sender: "@alice:example.org",
    });
};

beforeEach(() => {
    jest.clearAllMocks();
    mindroomTestUtils.resetCache();
});

test("renders full text for unencrypted Mindroom message", async () => {
    const event = createEvent({ url: "mxc://server/file1" }, false);
    const descriptor = getMindroomLongTextDescriptor(event)!;

    (mediaFromContent as jest.Mock).mockReturnValue({
        downloadSource: jest.fn().mockResolvedValue({
            ok: true,
            text: async () => "Full unencrypted message",
        }),
    });

    renderWithContexts(descriptor, event);

    expect(screen.getByText("Message preview")).toBeInTheDocument();

    await waitFor(() => {
        expect(screen.getByText("Full unencrypted message")).toBeInTheDocument();
    });
});

test("decrypts encrypted Mindroom message", async () => {
    const event = createEvent({}, true);
    const descriptor = getMindroomLongTextDescriptor(event)!;

    (decryptFile as jest.Mock).mockResolvedValue(new Blob(["Secret contents"], { type: "text/plain" }));

    renderWithContexts(descriptor, event);

    await waitFor(() => {
        expect(screen.getByText("Secret contents")).toBeInTheDocument();
    });
});

test("updates when replacement supplies new MXC", async () => {
    const firstEvent = createEvent({ url: "mxc://server/fileA" }, false);
    const secondEvent = createEvent({ url: "mxc://server/fileB" }, false);

    (mediaFromContent as jest.Mock)
        .mockReturnValueOnce({
            downloadSource: jest.fn().mockResolvedValue({
                ok: true,
                text: async () => "First payload",
            }),
        })
        .mockReturnValueOnce({
            downloadSource: jest.fn().mockResolvedValue({
                ok: true,
                text: async () => "Updated payload",
            }),
        });

    const { rerender } = renderWithContexts(getMindroomLongTextDescriptor(firstEvent)!, firstEvent);

    await waitFor(() => {
        expect(screen.getByText("First payload")).toBeInTheDocument();
    });

    rerender(
        <MatrixClientContext.Provider value={matrixClientStub}>
            <RoomContext.Provider value={baseRoomContext}>
                <MindroomLongTextBody
                    mxEvent={secondEvent}
                    mindroomLongText={getMindroomLongTextDescriptor(secondEvent)!}
                />
            </RoomContext.Provider>
        </MatrixClientContext.Provider>,
    );

    await waitFor(() => {
        expect(screen.getByText("Updated payload")).toBeInTheDocument();
    });
});

test("shows retry UI when download fails", async () => {
    const event = createEvent({ url: "mxc://server/failure" }, false);
    const descriptor = getMindroomLongTextDescriptor(event)!;

    (mediaFromContent as jest.Mock).mockReturnValue({
        downloadSource: jest.fn().mockRejectedValue(new Error("network error")),
    });

    renderWithContexts(descriptor, event);

    await waitFor(() => {
        expect(screen.getByText("Unable to load full message.")).toBeInTheDocument();
    });

    expect(screen.getByText("Message preview")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
});

test("caches fetched text by MXC URI", async () => {
    const event = createEvent({ url: "mxc://server/cache" }, false);
    const descriptor = getMindroomLongTextDescriptor(event)!;

    const downloadSource = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => "Cached payload",
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

test("shows spinner while loading", async () => {
    const event = createEvent({ url: "mxc://server/pending" }, false);
    const descriptor = getMindroomLongTextDescriptor(event)!;

    let resolve!: () => void;
    const deferred = new Promise<{ ok: true; text: () => Promise<string> }>((res) => {
        resolve = () =>
            res({
                ok: true,
                text: async () => "Resolved payload",
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
