// adapted from populateModels.js in neohabitat

const replacements = [
    [/UP/g, '"|"'],
    [/DOWN/g, '"}"'],
    [/LEFT/g, '"~"'],
    [/RIGHT/g, '"\u007f"'],
    [/SPACE/g, '" "'],
    [/WEST/g, '0'],
    [/SOUTH/g, '1'],
    [/EAST/g, '2'],
    [/NORTH/g, '3']
];

const joinReplacements = {
    UP: '|',
    DOWN: '}',
    LEFT: '~',
    RIGHT: '\u007f',
    SPACE: ' ',
    WEST: '0',
    SOUTH: '1',
    EAST: '2',
    NORTH: '3'
};

const replacementJoinRegex = /((([A-Z]+\s?\+\s?)+)([A-Z]+\s?)+)/;
const stringJoinRegex = /(("([^"]|\\")*"\s*\+\s*)+"([^"]|\\")*")/g;

function templateStringJoins(data) {
    if (data.search(/\+/) != -1) {
        return data.replace(/(\n)/g, '').replace(stringJoinRegex,
        function(origText, offset, string) {
            var replacementText = [];
            var splitText = origText.split('+');
            for (var textLineId in splitText) {
            var trimTextLine = splitText[textLineId].trim();
            var quotesRemoved = trimTextLine.replace(/(^")|("$)/g, '');
            replacementText.push(quotesRemoved);
            }
            return '"{0}"'.format(replacementText.join(''));
        }
        );
    }
    return data;
}

function templateConstantJoins(data) {
    return data.replace(replacementJoinRegex, function(origText, offset, string) {
        var replacementText = [];
        var splitText = origText.split('+');
        for (var habConstId in splitText) {
        var trimHabConst = splitText[habConstId].trim();
        if (trimHabConst in joinReplacements) {
            replacementText.push(joinReplacements[trimHabConst]);
        }
        }
        return '"{0}"'.format(replacementText.join(''));
    });
}

function templateHabitatObject(data) {
    var templated = templateConstantJoins(data);
    for (var replacementId in replacements) {
        var replacement = replacements[replacementId];
        var regex = replacement[0];
        var replacementText = replacement[1];
        templated = templated.replace(regex, replacementText);
    }
    return templateStringJoins(templated);
}

export function parseHabitatObject(data) {
    return JSON.parse(templateHabitatObject(data))
}

export function colorsFromOrientation(orientation) {
    const colorVal = (orientation & 0x78) >> 3
    if (orientation & 0x80) {
        return { wildcard: colorVal }
    } else {
        return { pattern: colorVal }
    }
}
