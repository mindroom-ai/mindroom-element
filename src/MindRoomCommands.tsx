/*
Copyright 2026 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

/*
MindRoom-specific commands for Element Web
*/

import { CommandCategories } from "./slash-commands/interface";

// MindRoom Command class for autocomplete only (sent as regular messages)
export class MindRoomCommand {
    public readonly command: string;
    public readonly aliases: string[];
    public readonly args?: string;
    public readonly description: string;
    public readonly category: string;
    public readonly hideCompletionAfterSpace: boolean;

    public constructor(opts: any) {
        this.command = opts.command;
        this.aliases = opts.aliases || [];
        this.args = opts.args || "";
        this.description = opts.description;
        this.category = opts.category || CommandCategories.other;
        this.hideCompletionAfterSpace = opts.hideCompletionAfterSpace || false;
    }

    public getCommand(): string {
        return `!${this.command}`;
    }

    public isEnabled(cli: any): boolean {
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
    createMindRoomCommand("help", "[topic]", "Get help"),
    createMindRoomCommand("schedule", "<task>", "Schedule a task"),
    createMindRoomCommand("list_schedules", "", "List scheduled tasks"),
    createMindRoomCommand("cancel_schedule", "<id|all>", "Cancel a scheduled task"),
    createMindRoomCommand("widget", "[url]", "Add configuration widget"),
    createMindRoomCommand("config", "<operation>", "Manage configuration"),
    createMindRoomCommand("hi", "", "Show welcome message"),
    createMindRoomCommand("skill", "<name> [args]", "Run a skill by name"),
];
