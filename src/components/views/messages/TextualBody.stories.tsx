/*
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
*/

import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";

import TextualBody from "./TextualBody";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import RoomContext, { TimelineRenderingType } from "../../../contexts/RoomContext";
import type { IContent } from "matrix-js-sdk/src/matrix";

const matrixClientStub = {
    getRoom: () => undefined,
    getUserId: () => "@storybook:example.org",
    mxcUrlToHttp: () => null,
} as any;

const roomContextValue = {
    ...(RoomContext._currentValue as any),
    canReact: true,
    canSendMessages: true,
    timelineRenderingType: TimelineRenderingType.Room,
};

const StoryWrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <MatrixClientContext.Provider value={matrixClientStub}>
        <RoomContext.Provider value={roomContextValue}>{children}</RoomContext.Provider>
    </MatrixClientContext.Provider>
);

const createEvent = (body: string): MatrixEvent =>
    new MatrixEvent({
        type: "m.room.message",
        event_id: `$story_${body}`,
        content: {
            msgtype: "m.text",
            body,
        },
        origin_server_ts: Date.now(),
        sender: "@storybook:example.org",
    });

const previewContent: IContent = {
    msgtype: "m.text",
    body: "This message is still loading…",
};

const fullContent: IContent = {
    msgtype: "m.text",
    body: "This message resolved successfully with the complete payload.",
};

const meta: Meta<typeof TextualBody> = {
    title: "Messages/Mindroom Long Text",
    component: TextualBody,
    decorators: [
        (Story) => (
            <StoryWrapper>
                <div style={{ maxWidth: 520 }}>
                    <Story />
                </div>
            </StoryWrapper>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof TextualBody>;

export const LoadingLight: Story = {
    render: () => (
        <TextualBody
            mxEvent={createEvent(previewContent.body)}
            renderedContent={previewContent}
            mindroomStatus="loading"
        />
    ),
    parameters: {
        theme: "light",
    },
};

export const LoadingDark: Story = {
    render: () => (
        <TextualBody
            mxEvent={createEvent(previewContent.body)}
            renderedContent={previewContent}
            mindroomStatus="loading"
        />
    ),
    parameters: {
        theme: "dark",
    },
};

export const ErrorLight: Story = {
    render: () => (
        <TextualBody
            mxEvent={createEvent(previewContent.body)}
            renderedContent={previewContent}
            mindroomStatus="error"
            mindroomError={new Error("Network timeout")}
            onMindroomRetry={() => undefined}
        />
    ),
    parameters: {
        theme: "light",
    },
};

export const ErrorDark: Story = {
    render: () => (
        <TextualBody
            mxEvent={createEvent(previewContent.body)}
            renderedContent={previewContent}
            mindroomStatus="error"
            mindroomError={new Error("Network timeout")}
            onMindroomRetry={() => undefined}
        />
    ),
    parameters: {
        theme: "dark",
    },
};

export const LoadedLight: Story = {
    render: () => (
        <TextualBody mxEvent={createEvent(fullContent.body)} renderedContent={fullContent} />
    ),
    parameters: {
        theme: "light",
    },
};

export const LoadedDark: Story = {
    render: () => (
        <TextualBody mxEvent={createEvent(fullContent.body)} renderedContent={fullContent} />
    ),
    parameters: {
        theme: "dark",
    },
};
