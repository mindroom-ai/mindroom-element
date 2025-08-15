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

    constructor(opts: any) {
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