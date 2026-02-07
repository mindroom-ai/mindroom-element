/*
Copyright 2025 MindRoom

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { type TimelineRenderingType } from "./contexts/RoomContext";
import { CommandCategories, type RunResult } from "./slash-commands/interface";
import { reject } from "./slash-commands/utils";

interface MindRoomCommandOpts {
    command: string;
    aliases?: string[];
    args?: string;
    description: string;
    category?: string;
    hideCompletionAfterSpace?: boolean;
    renderingTypes?: TimelineRenderingType[];
}

// MindRoom Command class for autocomplete only (sent as regular messages)
export class MindRoomCommand {
    public readonly command: string;
    public readonly aliases: string[];
    public readonly args?: string;
    public readonly description: string;
    public readonly category: string;
    public readonly hideCompletionAfterSpace: boolean;
    public readonly renderingTypes?: TimelineRenderingType[];

    public constructor(opts: MindRoomCommandOpts) {
        this.command = opts.command;
        this.aliases = opts.aliases || [];
        this.args = opts.args || "";
        this.description = opts.description;
        this.category = opts.category || CommandCategories.other;
        this.hideCompletionAfterSpace = opts.hideCompletionAfterSpace || false;
        this.renderingTypes = opts.renderingTypes;
    }

    public getCommand(): string {
        return `!${this.command}`;
    }

    public getCommandWithArgs(): string {
        return this.getCommand() + " " + this.args;
    }

    public getUsage(): string {
        return this.getCommandWithArgs();
    }

    public run(_matrixClient: MatrixClient, _roomId: string, _threadId: string | null, _args?: string): RunResult {
        return reject(new Error("MindRoom commands are autocomplete-only"));
    }

    public isEnabled(_cli: MatrixClient | null, _roomId: string | null): boolean {
        return true;
    }
}

// MindRoom commands for autocomplete suggestions
// When selected, these are inserted as text and sent as regular messages for the bot
const createMindRoomCommand = (cmd: string, args: string, desc: string): MindRoomCommand => {
    return new MindRoomCommand({
        command: cmd,
        args: args,
        description: desc,
        category: "mindroom",
    });
};

export const MindRoomCommands = [
    createMindRoomCommand("invite", "<agent>", "Invite an agent to this thread"),
    createMindRoomCommand("uninvite", "<agent>", "Remove an agent from this thread"),
    createMindRoomCommand("list_invites", "", "List all invited agents in current thread"),
    createMindRoomCommand("widget", "[url]", "Add MindRoom configuration widget to the room"),
    createMindRoomCommand("help", "[topic]", "Get help on available commands"),
    createMindRoomCommand("link", "[thread-id]", "Link another thread's context (planned)"),
    createMindRoomCommand("agents", "", "List available agents (planned)"),
    createMindRoomCommand("context", "", "Show token usage (planned)"),
    createMindRoomCommand("tag", "[name]", "Tag thread for memory sharing (planned)"),
    createMindRoomCommand("branch", "", "Fork the conversation (planned)"),
    createMindRoomCommand("schedule", "", "Manage agent automation (planned)"),
];
