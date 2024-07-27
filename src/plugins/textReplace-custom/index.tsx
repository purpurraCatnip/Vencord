/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { DataStore } from "@api/index";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React, Select, Switch, TextInput, useState } from "@webpack/common";

const STRING_RULES_KEY = "TextReplace_rulesString";
const REGEX_RULES_KEY = "TextReplace_rulesRegex";

type Rule = Record<"find" | "function" | "replace" | "onlyIfIncludes" | "enabled", string>;

interface TextReplaceProps {
    title: string;
    rulesArray: Rule[];
    rulesKey: string;
    update: () => void;
}

const makeEmptyRule: () => Rule = () => ({
    find: "",
    function: "",
    replace: "",
    onlyIfIncludes: "",
    enabled: "false"
});
const makeEmptyRuleArray = () => [makeEmptyRule()];

let stringRules = makeEmptyRuleArray();
let regexRules = makeEmptyRuleArray();

const settings = definePluginSettings({
    replace: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            const update = useForceUpdater();
            return (
                <>
                    <TextReplace
                        title="Using String"
                        rulesArray={stringRules}
                        rulesKey={STRING_RULES_KEY}
                        update={update}
                    />
                    <TextReplace
                        title="Using Regex"
                        rulesArray={regexRules}
                        rulesKey={REGEX_RULES_KEY}
                        update={update}
                    />
                    <TextReplaceTesting />
                </>
            );
        }
    },
});

function stringToRegex(str: string) {
    const match = str.match(/^(\/)?(.+?)(?:\/([gimsuy]*))?$/); // Regex to match regex
    return match
        ? new RegExp(
            match[2], // Pattern
            match[3]
                ?.split("") // Remove duplicate flags
                .filter((char, pos, flagArr) => flagArr.indexOf(char) === pos)
                .join("")
            ?? "g"
        )
        : new RegExp(str); // Not a regex, return string
}

function renderFindError(find: string) {
    try {
        stringToRegex(find);
        return null;
    } catch (e) {
        return (
            <span style={{ color: "var(--text-danger)" }}>
                {String(e)}
            </span>
        );
    }
}

function Input({ initialValue, onChange, placeholder }: {
    placeholder: string;
    initialValue: string;
    onChange(value: string): void;
}) {
    const [value, setValue] = useState(initialValue);
    return (
        <TextInput
            placeholder={placeholder}
            value={value}
            onChange={setValue}
            spellCheck={false}
            onBlur={() => value !== initialValue && onChange(value)}
        />
    );
}

function TextReplace({ title, rulesArray, rulesKey, update }: TextReplaceProps) {
    const isRegexRules = title === "Using Regex";

    async function onClickRemove(index: number) {
        if (index === rulesArray.length - 1) return;
        rulesArray.splice(index, 1);

        await DataStore.set(rulesKey, rulesArray);
        update();
    }

    async function onChange(e: string, index: number, key: string) {
        if (index === rulesArray.length - 1)
            rulesArray.push(makeEmptyRule());

        rulesArray[index][key] = e;

        if (rulesArray[index].find === "" && rulesArray[index].replace === "" && rulesArray[index].onlyIfIncludes === "" && index !== rulesArray.length - 1)
            rulesArray.splice(index, 1);

        await DataStore.set(rulesKey, rulesArray);
        update();
    }
    async function onSwitchUpdate(val: boolean, index: number) {
        if (index === rulesArray.length - 1)
            rulesArray.push(makeEmptyRule());

        if (val)
            rulesArray[index].enabled = "true";
        else if (!val)
            rulesArray[index].enabled = "false";

        await DataStore.set(rulesKey, rulesArray);
        update();
    }
    async function functionSelected(val: string, index: number) {
        if (index === rulesArray.length - 1)
            rulesArray.push(makeEmptyRule());
        console.log("Here's your selected value: " + val);
        // Attempting to have the ability to use pre-determined functions. This should hopefully be better than full on user input parsing, but it isn't the best method.
        if (val === "upper") {
            console.log("Changing from " + rulesArray[index].function + " to upper(). . .");
            rulesArray[index].function = "upper()";
        }
        else if (val === "lower") {
            console.log("Changing from " + rulesArray[index].function + " to lower(). . .");
            rulesArray[index].function = "lower()";
        }
        else if (val === "rand") {
            console.log("Changing from " + rulesArray[index].function + " to random(). . .");
            rulesArray[index].function = "random()";
        }
        else if (val === "reset") {
            console.log("Changing from " + rulesArray[index].function + " to reset. . .");
            rulesArray[index].function = "";
        }
        console.log("And here is your new rule function: " + rulesArray[index].function);
        await DataStore.set(rulesKey, rulesArray);
        update();
    }
    function isSelect(val: boolean, index: number) {
        if (rulesArray[index].function !== "") {
            val = true;
        }
        return val;
    }

    return (
        <>
            <Forms.FormTitle tag="h4">{title}</Forms.FormTitle>
            <Flex flexDirection="column" style={{ gap: "0.5em" }}>
                {
                    rulesArray.map((rule, index) =>
                        <React.Fragment key={`${rule.find}-${index}`}>
                            <Flex flexDirection="row" style={{ gap: "0.5em" }}>
                                <Flex flexDirection="row" style={{ flexGrow: 0, gap: "1em" }}>
                                    <Input
                                        placeholder="Find"
                                        initialValue={rule.find}
                                        onChange={e => onChange(e, index, "find")}
                                    />
                                    <Select // This adds in a function dropdown! Unfortunately only works with one function at a time :(
                                        placeholder="Choose a function..."
                                        options={[
                                            { label: "No Function", value: "reset" },
                                            { label: "Random Function (input a list like: a, b, c)", value: "rand" },
                                            { label: "Lowercase Function", value: "lower" },
                                            { label: "Uppercase Function", value: "upper" }
                                        ]}
                                        select={opt => functionSelected(opt, index)}
                                        isSelected={val => rulesArray[index].function === val}
                                        serialize={val => val}
                                    />
                                    <Input
                                        placeholder="Replace"
                                        initialValue={rule.replace}
                                        onChange={e => onChange(e, index, "replace")}
                                    />
                                    <Input
                                        placeholder="Only if includes"
                                        initialValue={rule.onlyIfIncludes}
                                        onChange={e => onChange(e, index, "onlyIfIncludes")}
                                    />
                                </Flex>
                                <Switch // This adds in an enable / disable button!!! No need to delete a rule! :)
                                    value={rule.enabled === "true"}
                                    onChange={val => onSwitchUpdate(val, index)}
                                    style={{
                                        ...(index === rulesArray.length - 1
                                            ? {
                                                visibility: "hidden",
                                                pointerEvents: "none"
                                            }
                                            : {}
                                        )
                                    }}
                                />
                                <Button
                                    size={Button.Sizes.MIN}
                                    onClick={() => onClickRemove(index)}
                                    style={{
                                        background: "none",
                                        color: "var(--status-danger)",
                                        ...(index === rulesArray.length - 1
                                            ? {
                                                visibility: "hidden",
                                                pointerEvents: "none"
                                            }
                                            : {}
                                        )
                                    }}
                                >
                                    <DeleteIcon />
                                </Button>
                            </Flex>
                            {isRegexRules && renderFindError(rule.find)}
                        </React.Fragment>
                    )
                }
            </Flex>
        </>
    );
}

function TextReplaceTesting() {
    const [value, setValue] = useState("");
    return (
        <>
            <Forms.FormTitle tag="h4">Test Rules</Forms.FormTitle>
            <TextInput placeholder="Type a message" onChange={setValue} />
            <TextInput placeholder="Message with rules applied" editable={false} value={applyRules(value)} />
        </>
    );
}

function applyRules(content: string): string {
    if (content.length === 0)
        return content;

    if (stringRules) {
        for (const rule of stringRules) {
            if (rule.enabled === "false") continue; // If the rule is not enabled, it skips it :)
            if (!rule.find) continue;
            if (rule.onlyIfIncludes && !content.includes(rule.onlyIfIncludes)) continue;

            content = ` ${content} `.replaceAll(rule.find, rule.replace.replaceAll("\\n", "\n")).replace(/^\s|\s$/g, "");
        }
    }

    if (regexRules) {
        for (const rule of regexRules) {
            if (content[0] === "/" && content[1] === "t") {
                content = content.substring(2);
                break;
            }
            if (rule.enabled === "false") continue; // If the rule is not enabled, it skips it :)
            if (!rule.find) continue;
            if (rule.onlyIfIncludes && !content.includes(rule.onlyIfIncludes)) continue;

            try {
                const regex = stringToRegex(rule.find);
                let temp = rule.replace;// .replaceAll("\\n", "\n")
                console.log("Here is the text you are going to be replaced with: " + temp);
                switch (rule.function) {
                    default:
                        temp = temp;
                        break;
                    case ("upper()"):
                        const upperContent = content.split(regex);
                        console.log(upperContent);
                        let temp2 = "";
                        for (let i = 1; i < upperContent.length + 1; i++) {
                            if (i + 2 >= upperContent.length) {
                                temp2 = temp2.concat(upperContent[-1]);
                                break;
                            }
                            temp2 = temp2.concat(upperContent[i + 2].toUpperCase());
                        }
                        content = temp2;
                        continue;
                    case ("lower()"):
                        temp = temp.toLowerCase();
                        break;
                    case ("random()"):
                        // Splits up the replace field into an array which it then randomly selects to replace according to the regex used. Uses ';' to denote splitting of options.
                        const options: Array<String> = rule.replace.split(";");
                        const randContent = content.split(regex);
                        // let newContent = "";
                        /* let hold = 0;
                        for(let i = 0; i < content.length; i++){
                            if(content[i].match(regex)){
                                let rand:number = Math.floor(Math.random() * (options.length - 1));
                                let temp3 = content.substring(hold, i)
                                newContent = newContent.concat(temp3 + options[rand]);
                                hold = i+1;
                            }
                        }
                        //console.log("This is the hell that is split content: " + splitContent);
                        */
                        let newContent = "";
                        for (let i = 0; i < randContent.length; i++) {
                            const rand: number = Math.floor(Math.random() * (options.length - 1));
                            // console.log("This is the random number chosen: " + rand + "\nAnd this is the random Option chosen: " + options[rand]);

                            // console.log("Here's the new content word for word: " + newContent);
                            newContent = newContent.concat(randContent[i] + options[rand]);
                        }
                        // console.log("Here is the new content: " + newContent);
                        content = newContent;
                        continue;
                }
                content = content.replace(regex, temp);
            } catch (e) {
                new Logger("TextReplace").error(`Invalid regex: ${rule.find}`);
            }
        }
    }

    content = content.trim();
    return content;
}

const TEXT_REPLACE_RULES_CHANNEL_ID = "1102784112584040479";

export default definePlugin({
    name: "TextReplace-Custom",
    description: "Replace text in your messages. You can find pre-made rules in the #textreplace-rules channel in Vencord's Server",
    authors: [Devs.AutumnVN, Devs.TheKodeToad],
    dependencies: ["MessageEventsAPI"],

    settings,

    async start() {
        stringRules = await DataStore.get(STRING_RULES_KEY) ?? makeEmptyRuleArray();
        regexRules = await DataStore.get(REGEX_RULES_KEY) ?? makeEmptyRuleArray();

        this.preSend = addPreSendListener((channelId, msg) => {
            // Channel used for sharing rules, applying rules here would be messy
            if (channelId === TEXT_REPLACE_RULES_CHANNEL_ID) return;
            msg.content = applyRules(msg.content);
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
