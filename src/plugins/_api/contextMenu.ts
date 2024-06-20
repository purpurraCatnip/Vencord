/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { filters, waitFor, waitForSubscriptions } from "@webpack";

/**
 * The last var name which the ContextMenu module was WebpackRequire'd and assigned to
 */
let lastVarName = "";

/**
 * The key exporting the ContextMenu module "Menu"
 */
let exportKey: PropertyKey = "";

/**
 * The id of the module exporting the ContextMenu module "Menu"
 */
let modId: PropertyKey = "";

let mangledCallback: (...args: any[]) => any;
waitFor(filters.byCode("Menu API only allows Items and groups of Items as children."), mangledCallback = (_, modInfo) => {
    exportKey = modInfo.exportKey;
    modId = modInfo.id;

    waitForSubscriptions.delete(nonMangledCallback);
});

let nonMangledCallback: (...args: any[]) => any;
waitFor(filters.byProps("Menu", "MenuItem"), nonMangledCallback = (_, modInfo) => {
    exportKey = "Menu";
    modId = modInfo.id;

    waitForSubscriptions.delete(mangledCallback);
});

export default definePlugin({
    name: "ContextMenuAPI",
    description: "API for adding/removing items to/from context menus.",
    authors: [Devs.Nuckyz, Devs.Ven, Devs.Kyuuhachi],
    required: true,

    patches: [
        {
            find: "♫ (つ｡◕‿‿◕｡)つ ♪",
            replacement: {
                match: /(?=let{navId:)(?<=function \i\((\i)\).+?)/,
                replace: "$1=Vencord.Api.ContextMenu._usePatchContextMenu($1);"
            }
        },
        {
            find: "navId:",
            all: true,
            noWarn: true,
            replacement: [
                {
                    get match() {
                        return RegExp(`${String(modId)}(?<=(\\i)=.+?)`);
                    },
                    replace: (id, varName) => {
                        lastVarName = varName;
                        return id;
                    }
                },
                {
                    get match() {
                        return RegExp(`${String(exportKey)},{(?<=${lastVarName}\\.${String(exportKey)},{)`, "g");
                    },
                    replace: "$&contextMenuAPIArguments:typeof arguments!=='undefined'?arguments:[],"
                }
            ]
        }
    ]
});
