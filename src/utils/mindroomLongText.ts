/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { useCallback, useEffect, useState } from "react";
import { type MatrixClient, type MatrixEvent, type IContent } from "matrix-js-sdk/src/matrix";
import type { EncryptedFile, FileInfo } from "matrix-js-sdk/src/types";

import { mediaFromContent } from "../customisations/Media";
import { decryptFile } from "./DecryptFile";

export const MINDROOM_LONG_TEXT_KEY = "io.mindroom.long_text";
export const MINDROOM_CONTINUATION_MARKER = "\n\n[Message continues in attached file]";

export interface MindroomLongTextMetadata {
    version: number;
    original_size: number;
    preview_size: number;
    is_complete_text: boolean;
}

export interface MindroomLongTextDescriptor {
    eventId: string;
    mxcUri: string;
    isEncrypted: boolean;
    file?: EncryptedFile;
    info?: FileInfo;
    previewBody: string;
    previewFormattedBody?: string;
    originalBody?: string;
    format?: string;
    metadata: MindroomLongTextMetadata;
    isReplacement: boolean;
}

export type MindroomLongTextStatus = "idle" | "loading" | "loaded" | "error";

interface CacheEntry {
    status: MindroomLongTextStatus;
    text?: string;
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

const isMindroomPayload = (content?: IContent): content is IContent & {
    url?: string;
    file?: EncryptedFile;
    info?: FileInfo;
    body?: string;
    formatted_body?: string;
    format?: string;
    [MINDROOM_LONG_TEXT_KEY]: MindroomLongTextMetadata;
} => {
    if (!content) return false;
    const payload = content[MINDROOM_LONG_TEXT_KEY];
    return !!payload && typeof payload === "object";
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
    const previewFormatted = stripMarkerFromHtml(typeof content.formatted_body === "string" ? content.formatted_body : undefined);

    return {
        eventId,
        mxcUri: url,
        isEncrypted: !!file,
        file,
        info,
        previewBody,
        previewFormattedBody: previewFormatted,
        originalBody: typeof content.body === "string" ? content.body : undefined,
        format: typeof content.format === "string" ? content.format : undefined,
        metadata: content[MINDROOM_LONG_TEXT_KEY],
        isReplacement,
    };
};

export const getMindroomLongTextDescriptor = (event: MatrixEvent): MindroomLongTextDescriptor | null => {
    const eventId = event.getId();
    const direct = descriptorFromContent(event.getContent(), eventId, event.replacingEvent() !== null);
    if (direct) return direct;

    const wire = event.getWireContent();
    const replacementContent = (wire?.["m.new_content"] ?? event.getOriginalContent()?.["m.new_content"]) as IContent | undefined;
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

const fetchMindroomText = async (
    descriptor: MindroomLongTextDescriptor,
    client: MatrixClient,
): Promise<string> => {
    if (descriptor.isEncrypted) {
        const blob = await decryptFile(descriptor.file, descriptor.info);
        return await blob.text();
    }

    const media = mediaFromContent({ url: descriptor.mxcUri }, client);
    const response = await media.downloadSource();
    return await response.text();
};

const startFetch = (
    entry: CacheEntry,
    descriptor: MindroomLongTextDescriptor,
    client: MatrixClient,
): void => {
    if (entry.status === "loading" && entry.promise) return;

    entry.status = "loading";
    entry.error = undefined;
    notify(entry);

    entry.promise = fetchMindroomText(descriptor, client)
        .then((text) => {
            entry.status = "loaded";
            entry.text = text;
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
    text?: string;
    error?: Error;
    retry: () => void;
}

export const useMindroomLongText = (
    descriptor: MindroomLongTextDescriptor | undefined,
    client: MatrixClient | null | undefined,
): MindroomLongTextHookResult => {
    const [version, setVersion] = useState(0);

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
    }, [descriptor?.mxcUri, client, descriptor]);

    const entry = descriptor ? getCacheEntry(descriptor.mxcUri) : undefined;

    const retry = useCallback(() => {
        if (!descriptor || !client) return;
        const target = getCacheEntry(descriptor.mxcUri);
        target.status = "idle";
        target.text = undefined;
        target.error = undefined;
        target.promise = undefined;
        notify(target);
        startFetch(target, descriptor, client);
    }, [descriptor, client, version]);

    return {
        status: entry?.status ?? "idle",
        text: entry?.text,
        error: entry?.error,
        retry,
    };
};

export const __testing__ = {
    resetCache(): void {
        mindroomCache.clear();
    },
};
