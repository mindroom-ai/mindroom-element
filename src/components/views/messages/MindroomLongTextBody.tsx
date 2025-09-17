/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useMemo } from "react";
import { MsgType, type IContent } from "matrix-js-sdk/src/matrix";

import TextualBody from "./TextualBody";
import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";
import {
    stripMindroomMarker,
    useMindroomLongText,
} from "../../../utils/mindroomLongText";
import { type IBodyProps } from "./IBodyProps";

const asTextContent = (content?: IContent): string => {
    if (!content) return "";
    return typeof content.body === "string" ? content.body : "";
};

const WITHOUT_FILENAME_KEYS: Array<keyof IContent> = ["filename", "url"];

const removeFileMetadata = (content: IContent): IContent => {
    const clone: IContent = { ...content };
    for (const key of WITHOUT_FILENAME_KEYS) {
        if (key in clone) {
            delete clone[key];
        }
    }
    return clone;
};

const buildPreviewContent = (
    mxEvent: IBodyProps["mxEvent"],
    descriptor: IBodyProps["mindroomLongText"],
): IContent => {
    const original = mxEvent.getContent<IContent>();
    const previewBody = descriptor?.previewBody ?? stripMindroomMarker(asTextContent(original));

    const preview: IContent = removeFileMetadata({
        ...original,
        msgtype: MsgType.Text,
        body: previewBody,
    });

    if (descriptor?.previewFormattedBody) {
        preview.format = descriptor.format ?? original.format;
        preview.formatted_body = descriptor.previewFormattedBody;
    } else {
        delete preview.format;
        delete preview.formatted_body;
    }

    return preview;
};

const buildLoadedContent = (
    preview: IContent,
    descriptor: IBodyProps["mindroomLongText"],
    text?: string,
): IContent => {
    if (!descriptor || !text) return preview;

    const content: IContent = {
        ...preview,
        body: text,
    };

    const mimetype = descriptor.info?.mimetype?.toLowerCase() ?? "";
    const treatAsHtml = descriptor.format === "org.matrix.custom.html" || mimetype.includes("html");

    if (treatAsHtml) {
        content.format = "org.matrix.custom.html";
        content.formatted_body = text;
    } else {
        delete content.format;
        delete content.formatted_body;
    }

    return content;
};

const MindroomLongTextBody: React.FC<IBodyProps> = (props) => {
    const descriptor = props.mindroomLongText;
    const client = useMatrixClientContext();
    const state = useMindroomLongText(descriptor, client);

    const previewContent = useMemo(
        () => buildPreviewContent(props.mxEvent, descriptor),
        [props.mxEvent, descriptor],
    );
    const renderedContent = useMemo(
        () => buildLoadedContent(previewContent, descriptor, state.text),
        [previewContent, descriptor, state.text],
    );

    return (
        <TextualBody
            {...props}
            renderedContent={renderedContent}
            mindroomStatus={state.status}
            mindroomError={state.error}
            onMindroomRetry={state.retry}
        />
    );
};

export default MindroomLongTextBody;
