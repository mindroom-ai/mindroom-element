/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { useCallback, useEffect, useState } from "react";
import { type IContent, type MatrixClient, type MatrixEvent } from "matrix-js-sdk/src/matrix";

import type { EncryptedFile, FileInfo } from "matrix-js-sdk/src/types";
import { mediaFromContent } from "../customisations/Media";
import { decryptFile } from "./DecryptFile";

export const MINDROOM_LONG_TEXT_KEY = "io.mindroom.long_text";
const MINDROOM_LONG_TEXT_V2_ENCODING = "matrix_event_content_json";

export interface MindroomLongTextMetadata {
    version: number;
    encoding: string;
    original_event_size: number;
    preview_size: number;
    is_complete_content: boolean;
}

export interface MindroomLongTextDescriptor {
    eventId: string;
    mxcUri: string;
    isEncrypted: boolean;
    file?: EncryptedFile;
    info?: FileInfo;
    previewBody: string;
    previewFormattedBody?: string;
    metadata: MindroomLongTextMetadata;
    isReplacement: boolean;
}

export type MindroomLongTextStatus = "idle" | "loading" | "loaded" | "error";

interface CacheEntry {
    status: MindroomLongTextStatus;
    content?: IContent;
    error?: Error;
    listeners: Set<() => void>;
    promise?: Promise<void>;
}

const mindroomCache = new Map<string, CacheEntry>();

const markerRegex = /(?:\r?\n){2}\[Message continues in attached file\]$/u;

export function stripMindroomMarker(body: string | undefined): string {
    if (!body) return "";
    return body.replace(markerRegex, "").trimEnd();
}

const stripMarkerFromHtml = (html?: string): string | undefined => {
    if (!html) return undefined;
    return html.replace("[Message continues in attached file]", "");
};

const isObject = (value: unknown): value is Record<string, unknown> => {
    return !!value && typeof value === "object" && !Array.isArray(value);
};

const isMindroomPayload = (
    content?: IContent,
): content is IContent & {
    url?: string;
    file?: EncryptedFile;
    info?: FileInfo;
    body?: string;
    formatted_body?: string;
    format?: string;
    [MINDROOM_LONG_TEXT_KEY]: MindroomLongTextMetadata;
} => {
    if (!content || !isObject(content)) return false;

    const payload = content[MINDROOM_LONG_TEXT_KEY];
    if (!isObject(payload)) return false;

    return payload.version === 2 && payload.encoding === MINDROOM_LONG_TEXT_V2_ENCODING;
};

const descriptorFromContent = (
    content: IContent | undefined,
    eventId: string,
    isReplacement: boolean,
): MindroomLongTextDescriptor | null => {
    if (!isMindroomPayload(content)) return null;

    const file = content.file;
    const info = content.info;
    const url = content.url ?? file?.url;
    if (!url) return null;

    const previewBody = stripMindroomMarker(typeof content.body === "string" ? content.body : "");
    const previewFormatted = stripMarkerFromHtml(
        typeof content.formatted_body === "string" ? content.formatted_body : undefined,
    );

    return {
        eventId,
        mxcUri: url,
        isEncrypted: !!file,
        file,
        info,
        previewBody,
        previewFormattedBody: previewFormatted,
        metadata: content[MINDROOM_LONG_TEXT_KEY],
        isReplacement,
    };
};

const normalizeHydratedMindroomContent = (hydratedContent: IContent): IContent => {
    if (!isObject(hydratedContent["m.new_content"])) return hydratedContent;

    const newContent = hydratedContent["m.new_content"] as IContent;
    const looksLikeMessageContent =
        typeof newContent.msgtype === "string" ||
        typeof newContent.body === "string" ||
        typeof newContent.formatted_body === "string";

    if (!looksLikeMessageContent) return hydratedContent;

    const normalizedContent: IContent = { ...newContent };

    if (
        normalizedContent["io.mindroom.tool_trace"] === undefined &&
        hydratedContent["io.mindroom.tool_trace"] !== undefined
    ) {
        normalizedContent["io.mindroom.tool_trace"] = hydratedContent["io.mindroom.tool_trace"];
    }

    if (normalizedContent["m.mentions"] === undefined && hydratedContent["m.mentions"] !== undefined) {
        normalizedContent["m.mentions"] = hydratedContent["m.mentions"];
    }

    if (
        normalizedContent["com.mindroom.skip_mentions"] === undefined &&
        hydratedContent["com.mindroom.skip_mentions"] !== undefined
    ) {
        normalizedContent["com.mindroom.skip_mentions"] = hydratedContent["com.mindroom.skip_mentions"];
    }

    if (typeof normalizedContent.body !== "string" && typeof hydratedContent.body === "string") {
        normalizedContent.body = hydratedContent.body;
    }

    if (typeof normalizedContent.formatted_body !== "string" && typeof hydratedContent.formatted_body === "string") {
        normalizedContent.formatted_body = hydratedContent.formatted_body;
    }

    if (typeof normalizedContent.msgtype !== "string" && typeof hydratedContent.msgtype === "string") {
        normalizedContent.msgtype = hydratedContent.msgtype;
    }

    return normalizedContent;
};

export const getMindroomLongTextDescriptor = (event: MatrixEvent): MindroomLongTextDescriptor | null => {
    const eventId = event.getId();
    if (!eventId) return null;

    const direct = descriptorFromContent(event.getContent(), eventId, event.replacingEvent() !== null);
    if (direct) return direct;

    const wire = event.getWireContent();
    const replacementContent = (wire?.["m.new_content"] ?? event.getOriginalContent()?.["m.new_content"]) as
        | IContent
        | undefined;

    if (replacementContent) {
        const descriptor = descriptorFromContent(replacementContent, eventId, true);
        if (descriptor) return descriptor;
    }

    return null;
};

const getCacheEntry = (mxcUri: string): CacheEntry => {
    let entry = mindroomCache.get(mxcUri);
    if (!entry) {
        entry = {
            status: "idle",
            listeners: new Set(),
        };
        mindroomCache.set(mxcUri, entry);
    }
    return entry;
};

const notify = (entry: CacheEntry): void => {
    for (const listener of entry.listeners) {
        listener();
    }
};

const parseHydratedContent = (jsonText: string): IContent => {
    const parsed = JSON.parse(jsonText);
    if (!isObject(parsed)) {
        throw new Error("MindRoom long-text sidecar is not a JSON object");
    }
    return normalizeHydratedMindroomContent(parsed as IContent);
};

const fetchMindroomContent = async (
    descriptor: MindroomLongTextDescriptor,
    client: MatrixClient,
): Promise<IContent> => {
    let sidecarText: string;

    if (descriptor.isEncrypted) {
        const blob = await decryptFile(descriptor.file, descriptor.info);
        sidecarText = await blob.text();
    } else {
        const media = mediaFromContent({ url: descriptor.mxcUri }, client);
        const response = await media.downloadSource();
        sidecarText = await response.text();
    }

    return parseHydratedContent(sidecarText);
};

const startFetch = (entry: CacheEntry, descriptor: MindroomLongTextDescriptor, client: MatrixClient): void => {
    if (entry.status === "loading" && entry.promise) return;

    entry.status = "loading";
    entry.error = undefined;
    notify(entry);

    entry.promise = fetchMindroomContent(descriptor, client)
        .then((content) => {
            entry.status = "loaded";
            entry.content = content;
        })
        .catch((error) => {
            entry.status = "error";
            entry.error = error instanceof Error ? error : new Error(String(error));
        })
        .finally(() => {
            entry.promise = undefined;
            notify(entry);
        });
};

export interface MindroomLongTextHookResult {
    status: MindroomLongTextStatus;
    content?: IContent;
    error?: Error;
    retry: () => void;
}

export const useMindroomLongText = (
    descriptor: MindroomLongTextDescriptor | undefined,
    client: MatrixClient | null | undefined,
): MindroomLongTextHookResult => {
    const [, setVersion] = useState(0);

    useEffect(() => {
        if (!descriptor || !client) return undefined;

        const entry = getCacheEntry(descriptor.mxcUri);
        const listener = (): void => {
            setVersion((v) => v + 1);
        };
        entry.listeners.add(listener);

        if (entry.status === "idle") {
            startFetch(entry, descriptor, client);
        } else {
            listener();
        }

        return () => {
            entry.listeners.delete(listener);
        };
    }, [descriptor, client]);

    const entry = descriptor ? getCacheEntry(descriptor.mxcUri) : undefined;

    const retry = useCallback(() => {
        if (!descriptor || !client) return;
        const target = getCacheEntry(descriptor.mxcUri);
        target.status = "idle";
        target.content = undefined;
        target.error = undefined;
        target.promise = undefined;
        notify(target);
        startFetch(target, descriptor, client);
    }, [descriptor, client]);

    return {
        status: entry?.status ?? "idle",
        content: entry?.content,
        error: entry?.error,
        retry,
    };
};

export const __testing__ = {
    resetCache(): void {
        mindroomCache.clear();
    },
};
