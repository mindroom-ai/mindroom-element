/*
Copyright 2026 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { type IContent } from "matrix-js-sdk/src/matrix";

import { __testing__ } from "../../../src/utils/mindroomLongText";
import { MINDROOM_AI_RUN_KEY } from "../../../src/utils/mindroomAiRun";

describe("mindroomLongText", () => {
    it("preserves AI run metadata when normalizing replacement sidecar content", () => {
        const aiRunPayload = {
            version: 1,
            usage: { total_tokens: 1234 },
        };

        const normalized = __testing__.normalizeHydratedMindroomContent({
            body: "preview body",
            [MINDROOM_AI_RUN_KEY]: aiRunPayload,
            "m.new_content": {
                msgtype: "m.text",
                body: "hydrated body",
            },
        } as IContent);

        expect(normalized[MINDROOM_AI_RUN_KEY]).toEqual(aiRunPayload);
    });
});
