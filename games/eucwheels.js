/* CHASER EUC WHEELS - SEPARATE TOOL FILE
Adds a Wheels button next to Games and opens an EUC info board.
*/
(function () {
"use strict";

const EUC_DB = {
    "InMotion": [
        {
            model: "E20",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "E25",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "P6",
            topSpeed: "93 mph",
            battery: "4,200 Wh",
            voltage: "235 V",
            wheelSize: "20 inch",
            maxCharging: "Up to 20A",
            weight: "112 lb",
            imageUrl: "",
            sourceNote: "Alien Rides lists 14A fast charging; user noted P6 can handle up to 20A."
        },
        {
            model: "V8",
            topSpeed: "Approx. 19 mph",
            battery: "Approx. 480 Wh",
            voltage: "84 V",
            wheelSize: "16 inch",
            maxCharging: "Verify",
            weight: "Approx. 31 lb",
            imageUrl: ""
        },
        {
            model: "V9",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "V10",
            topSpeed: "Approx. 25 mph",
            battery: "Approx. 650 Wh",
            voltage: "84 V",
            wheelSize: "16 inch",
            maxCharging: "Verify",
            weight: "Approx. 45 lb",
            imageUrl: ""
        },
        {
            model: "V10F",
            topSpeed: "Approx. 25 mph",
            battery: "Approx. 960 Wh",
            voltage: "84 V",
            wheelSize: "16 inch",
            maxCharging: "Verify",
            weight: "Approx. 45 lb",
            imageUrl: ""
        },
        {
            model: "V11",
            topSpeed: "Approx. 31 mph",
            battery: "Approx. 1,500 Wh",
            voltage: "84 V",
            wheelSize: "18 inch",
            maxCharging: "Verify",
            weight: "Approx. 59 lb",
            imageUrl: ""
        },
        {
            model: "V11Y",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "18 inch",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "V12",
            topSpeed: "Approx. 37-43 mph",
            battery: "Approx. 1,750 Wh",
            voltage: "100 V",
            wheelSize: "16 inch",
            maxCharging: "Verify",
            weight: "Approx. 64 lb",
            imageUrl: ""
        },
        {
            model: "V12S",
            topSpeed: "43.5 mph",
            battery: "1,440 Wh",
            voltage: "84 V",
            wheelSize: "16 inch",
            maxCharging: "10A / 84V charger",
            weight: "77 lb",
            imageUrl: ""
        },
        {
            model: "V13 Challenger",
            topSpeed: "Approx. 56 mph",
            battery: "Approx. 3,024 Wh",
            voltage: "126 V",
            wheelSize: "22 inch",
            maxCharging: "Verify",
            weight: "Approx. 110 lb",
            imageUrl: ""
        },
        {
            model: "V14 Adventure 50S",
            topSpeed: "43 mph",
            battery: "2,400 Wh",
            voltage: "134 V",
            wheelSize: "16 inch",
            maxCharging: "Verify",
            weight: "86 lb",
            imageUrl: ""
        }
    ],

    "KingSong": [
        {
            model: "16X",
            topSpeed: "Approx. 31 mph",
            battery: "Approx. 1,554 Wh",
            voltage: "84 V",
            wheelSize: "16 inch",
            maxCharging: "Verify",
            weight: "Approx. 54 lb",
            imageUrl: ""
        },
        {
            model: "F22 Pro",
            topSpeed: "55+ mph GPS / 65 mph unverified",
            battery: "3,108 Wh",
            voltage: "176 V",
            wheelSize: "18 inch",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: "",
            sourceNote: "Alien Rides lists 65 mph as unverified and says they hit 55+ mph GPS verified."
        },
        {
            model: "S18",
            topSpeed: "Approx. 31 mph",
            battery: "Approx. 1,110 Wh",
            voltage: "84 V",
            wheelSize: "18 inch",
            maxCharging: "Verify",
            weight: "Approx. 55 lb",
            imageUrl: ""
        },
        {
            model: "S19",
            topSpeed: "Approx. 37 mph",
            battery: "Approx. 1,776 Wh",
            voltage: "126 V",
            wheelSize: "18 inch",
            maxCharging: "Verify",
            weight: "Approx. 68 lb",
            imageUrl: ""
        },
        {
            model: "S19 Pro",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "S22",
            topSpeed: "Approx. 43 mph",
            battery: "Approx. 2,220 Wh",
            voltage: "126 V",
            wheelSize: "20 inch",
            maxCharging: "Verify",
            weight: "Approx. 77 lb",
            imageUrl: ""
        },
        {
            model: "S22 Pro",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "126 V",
            wheelSize: "20 inch",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        }
    ],

    "Begode": [
        {
            model: "A5",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "Blitz",
            topSpeed: "Approx. 55 mph",
            battery: "Approx. 2,400 Wh",
            voltage: "134 V",
            wheelSize: "20 inch",
            maxCharging: "Verify",
            weight: "Approx. 79 lb",
            imageUrl: ""
        },
        {
            model: "ET Max",
            topSpeed: "112 mph no-load",
            battery: "3,000 Wh",
            voltage: "168 V",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: "",
            sourceNote: "Alien Rides lists no-load speed, not confirmed riding top speed."
        },
        {
            model: "EX30",
            topSpeed: "Approx. 55 mph",
            battery: "Approx. 3,600 Wh",
            voltage: "134 V",
            wheelSize: "20 inch",
            maxCharging: "Verify",
            weight: "Approx. 101 lb",
            imageUrl: ""
        },
        {
            model: "Extreme",
            topSpeed: "50 mph",
            battery: "2,400 Wh",
            voltage: "134.4 V peak",
            wheelSize: "16 inch",
            maxCharging: "5A stock charger",
            weight: "77 lb",
            imageUrl: ""
        },
        {
            model: "Extreme Ibex",
            topSpeed: "50 mph",
            battery: "2,400 Wh",
            voltage: "134.4 V peak",
            wheelSize: "16 inch",
            maxCharging: "5A stock charger",
            weight: "77 lb",
            imageUrl: ""
        },
        {
            model: "Falcon",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "14 inch",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "Future",
            topSpeed: "14 mph cruise / up to 27 mph",
            battery: "375 Wh",
            voltage: "42 V",
            wheelSize: "15 inch",
            maxCharging: "1.5A charger",
            weight: "37 lb",
            imageUrl: ""
        },
        {
            model: "Master",
            topSpeed: "Approx. 50 mph",
            battery: "Approx. 2,400 Wh",
            voltage: "134 V",
            wheelSize: "20 inch",
            maxCharging: "Verify",
            weight: "Approx. 88 lb",
            imageUrl: ""
        },
        {
            model: "Master Pro",
            topSpeed: "Verify",
            battery: "Approx. 4,800 Wh",
            voltage: "134 V",
            wheelSize: "22 inch",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "Master V4 50S",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "Mten4",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "11 inch",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "Mten5",
            topSpeed: "25+ mph",
            battery: "750 Wh",
            voltage: "84 V",
            wheelSize: "11 inch",
            maxCharging: "1.5A charger",
            weight: "41 lb",
            imageUrl: ""
        },
        {
            model: "Panther",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "Race",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "T4",
            topSpeed: "Approx. 37 mph",
            battery: "Approx. 1,800 Wh",
            voltage: "100 V",
            wheelSize: "16 inch",
            maxCharging: "Verify",
            weight: "Approx. 66 lb",
            imageUrl: ""
        },
        {
            model: "T4 Pro",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "16 inch",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "X-Way",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        }
    ],

    "Extreme Bull": [
        {
            model: "Commander",
            topSpeed: "Approx. 45 mph",
            battery: "Approx. 3,600 Wh",
            voltage: "100 V",
            wheelSize: "20 inch",
            maxCharging: "Verify",
            weight: "Approx. 80+ lb",
            imageUrl: ""
        },
        {
            model: "Commander GT",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "Commander GT Pro",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "Commander Mini",
            topSpeed: "Approx. 45 mph",
            battery: "Approx. 2,400 Wh",
            voltage: "134 V",
            wheelSize: "16 inch",
            maxCharging: "Verify",
            weight: "Approx. 88 lb",
            imageUrl: ""
        },
        {
            model: "Commander Pro",
            topSpeed: "50+ mph cruising",
            battery: "3,600 Wh",
            voltage: "134.4 V peak",
            wheelSize: "20 inch",
            maxCharging: "3A stock charger",
            weight: "95 lb",
            imageUrl: ""
        },
        {
            model: "Griffin",
            topSpeed: "Est. 56.7 mph",
            battery: "2,700 Wh",
            voltage: "151 V",
            wheelSize: "18 inch",
            maxCharging: "5A stock / 20A support verify",
            weight: "92.6 lb",
            imageUrl: ""
        },
        {
            model: "K6",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "Rocket 168V Mini",
            topSpeed: "70 mph mode / 79 mph free-spin",
            battery: "1,500 Wh",
            voltage: "168 V",
            wheelSize: "15 inch",
            maxCharging: "Verify",
            weight: "61.7 lb",
            imageUrl: ""
        }
    ],

    "LeaperKim / Veteran": [
        {
            model: "Lynx",
            topSpeed: "Approx. 56 mph",
            battery: "Approx. 2,700 Wh",
            voltage: "151 V",
            wheelSize: "20 inch",
            maxCharging: "Verify",
            weight: "Approx. 88 lb",
            imageUrl: ""
        },
        {
            model: "Patton",
            topSpeed: "Approx. 50 mph",
            battery: "Approx. 2,220 Wh",
            voltage: "126 V",
            wheelSize: "18 inch",
            maxCharging: "Verify",
            weight: "Approx. 89 lb",
            imageUrl: ""
        },
        {
            model: "Sherman",
            topSpeed: "Approx. 45 mph",
            battery: "Approx. 3,200 Wh",
            voltage: "100 V",
            wheelSize: "20 inch",
            maxCharging: "Verify",
            weight: "Approx. 77 lb",
            imageUrl: ""
        },
        {
            model: "Sherman L",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "20 inch",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "Sherman S",
            topSpeed: "Approx. 45 mph",
            battery: "Approx. 3,600 Wh",
            voltage: "100 V",
            wheelSize: "20 inch",
            maxCharging: "Verify",
            weight: "Approx. 97 lb",
            imageUrl: ""
        }
    ],

    "Nosfet": [
        {
            model: "Apex",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        },
        {
            model: "Apex Lite",
            topSpeed: "Verify",
            battery: "Verify",
            voltage: "Verify",
            wheelSize: "Verify",
            maxCharging: "Verify",
            weight: "Verify",
            imageUrl: ""
        }
    ]
};

let selectedMaker = "";
let selectedModelName = "";
let openMenu = "";

function byId(id) {
    return document.getElementById(id);
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getManufacturers() {
    return Object.keys(EUC_DB).sort();
}

function getModelsForManufacturer(manufacturer) {
    return (EUC_DB[manufacturer] || []).slice().sort(function (a, b) {
        return a.model.localeCompare(b.model);
    });
}

function installGlobalStyle() {
    if (byId("chaserEucWheelsGlobalStyle")) return;

    const style = document.createElement("style");
    style.id = "chaserEucWheelsGlobalStyle";
    style.innerHTML = [
       "#wheelsTriggerBtn{width:auto!important;height:34px!important;padding:0 10px!important;border-radius:999px!important;background:#ffd700!important;color:#1e4620!important;border:2px solid #ffffff!important;font-size:13px!important;font-weight:900!important;font-family:Arial,sans-serif!important;text-transform:uppercase!important;box-sizing:border-box!important;}",

        "#wheelsTriggerBtn:active{transform:scale(.94);}"
    ].join("");

    document.head.appendChild(style);
}

function buildBoardStyle() {
    return [
        "<style>",
            ".euc-tool-wrap{width:100%;height:100%;min-height:100%;box-sizing:border-box;color:#e2f0d9;font-family:Arial,sans-serif;padding:5px 10px 82px;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;text-align:center;}",
            ".euc-subtitle{color:#e2f0d9;font-size:16px;font-weight:900;margin:0 auto 12px;max-width:520px;line-height:1.25;text-shadow:0 2px 5px rgba(0,0,0,.6);}",

            ".euc-select-row{display:grid;grid-template-columns:1fr;gap:9px;width:100%;max-width:540px;margin:0 auto 12px;position:relative;z-index:20;}",
            ".euc-menu-wrap{position:relative;width:100%;}",
            ".euc-fake-select{width:100%;height:54px;border-radius:16px;border:3px solid #ffd700;background:linear-gradient(180deg,#fff8b8,#e2f0d9);color:#1e4620;font-size:20px;font-weight:900;text-align:left;padding:0 48px 0 18px;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,.35);position:relative;}",
            ".euc-fake-select:disabled{opacity:.55;background:#cfcfcf;border-color:#777;color:#333;}",
            ".euc-fake-select .euc-arrow{position:absolute;right:17px;top:50%;transform:translateY(-50%);font-size:19px;color:#1e4620;}",
            ".euc-fake-select.open .euc-arrow{transform:translateY(-50%) rotate(180deg);}",

            ".euc-option-panel{display:none;position:absolute;left:0;right:0;top:60px;background:#0b2410;border:3px solid #ffd700;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,.6);overflow:hidden;max-height:235px;overflow-y:auto;z-index:50;}",
            ".euc-option-panel.open{display:block;}",
            ".euc-option{width:100%;border:0;border-bottom:1px solid rgba(255,215,0,.25);background:#123d18;color:#e2f0d9;text-align:left;font-size:18px;font-weight:900;padding:13px 16px;box-sizing:border-box;}",
            ".euc-option:last-child{border-bottom:0;}",
            ".euc-option:active{background:#ffd700;color:#1e4620;}",
            ".euc-option.selected{background:#e2f0d9;color:#1e4620;}",

            ".euc-card{width:100%;max-width:560px;margin:0 auto;background:#123d18;border:3px solid #e2f0d9;border-radius:18px;box-shadow:0 8px 22px rgba(0,0,0,.45);overflow:hidden;box-sizing:border-box;}",
            ".euc-card-head{padding:10px 12px 8px;background:#0b2410;border-bottom:2px solid #ffd700;}",
            ".euc-model-name{color:#ffd700;font-size:31px;font-weight:900;margin:0;line-height:1.05;text-shadow:0 3px 8px rgba(0,0,0,.7);}",
            ".euc-maker-name{color:#e2f0d9;font-size:15px;font-weight:900;margin-top:4px;opacity:.9;}",

            ".euc-stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:10px;background:#123d18;box-sizing:border-box;}",
            ".euc-stat-card{background:#e2f0d9;color:#1e4620;border-radius:12px;padding:9px 7px;box-sizing:border-box;min-height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid rgba(255,215,0,.75);box-shadow:0 2px 7px rgba(0,0,0,.25);}",
            ".euc-stat-label{font-size:12px;font-weight:900;text-transform:uppercase;color:#2d6a30;margin-bottom:4px;letter-spacing:.4px;}",
            ".euc-stat-value{font-size:15px;font-weight:900;line-height:1.15;}",

            ".euc-image-area{height:170px;background:#061707;display:flex;align-items:center;justify-content:center;overflow:hidden;border-top:2px solid rgba(255,215,0,.7);}",
            ".euc-image-area img{width:100%;height:100%;object-fit:contain;background:#061707;}",
            ".euc-placeholder-image{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ffd700;background:radial-gradient(circle at center,#1e4620,#061707);}",
            ".euc-wheel-icon{font-size:58px;line-height:1;color:#e2f0d9;text-shadow:0 4px 12px rgba(0,0,0,.7);}",
            ".euc-placeholder-title{font-size:21px;font-weight:900;margin-top:5px;}",
            ".euc-placeholder-note{font-size:13px;color:#e2f0d9;margin-top:4px;font-weight:900;opacity:.85;}",

            ".euc-note{font-size:11px;color:#e2f0d9;opacity:.78;line-height:1.25;padding:9px 10px 12px;background:#0b2410;}",
            ".euc-source-note{font-size:10px;color:#ffd700;opacity:.88;line-height:1.2;padding:0 10px 8px;background:#0b2410;font-weight:800;}",
            ".euc-empty{margin:28px auto;color:#ffd700;font-weight:900;font-size:19px;line-height:1.3;max-width:420px;text-shadow:0 2px 6px rgba(0,0,0,.65);}",

            "@media(max-width:420px){",
                ".euc-tool-wrap{padding:5px 8px 86px;}",
                ".euc-subtitle{font-size:15px;margin-bottom:10px;}",
                ".euc-fake-select{height:50px;font-size:18px;border-radius:15px;padding-left:15px;}",
                ".euc-option-panel{top:56px;max-height:210px;}",
                ".euc-option{font-size:17px;padding:12px 14px;}",
                ".euc-model-name{font-size:29px;}",
                ".euc-image-area{height:145px;}",
                ".euc-stats-grid{gap:6px;padding:8px;}",
                ".euc-stat-card{min-height:58px;padding:8px 5px;}",
                ".euc-stat-label{font-size:11px;}",
                ".euc-stat-value{font-size:13px;}",
                ".euc-wheel-icon{font-size:50px;}",
            "}",
        "</style>"
    ].join("");
}

function placeholderImageText(modelName) {
    return (
        "<div class=\"euc-placeholder-image\">" +
            "<div class=\"euc-wheel-icon\">◉</div>" +
            "<div class=\"euc-placeholder-title\">" + escapeHtml(modelName || "EUC") + "</div>" +
            "<div class=\"euc-placeholder-note\">Image URL can be added later</div>" +
        "</div>"
    );
}

function statCard(label, value) {
    return (
        "<div class=\"euc-stat-card\">" +
            "<div class=\"euc-stat-label\">" + escapeHtml(label) + "</div>" +
            "<div class=\"euc-stat-value\">" + escapeHtml(value || "Verify") + "</div>" +
        "</div>"
    );
}

function buildMenu(type, label, disabled, open, optionsHtml) {
    return (
        "<div class=\"euc-menu-wrap\">" +
            "<button id=\"euc" + type + "Trigger\" class=\"euc-fake-select " + (open ? "open" : "") + "\" type=\"button\" " + (disabled ? "disabled" : "") + ">" +
                "<span>" + escapeHtml(label) + "</span>" +
                "<span class=\"euc-arrow\">▼</span>" +
            "</button>" +
            "<div id=\"euc" + type + "Panel\" class=\"euc-option-panel " + (open ? "open" : "") + "\">" +
                optionsHtml +
            "</div>" +
        "</div>"
    );
}

function renderEucTool() {
    const canvas = byId("gameCanvasContainer");
    if (!canvas) return;

    const makers = getManufacturers();
    const models = selectedMaker ? getModelsForManufacturer(selectedMaker) : [];
    const selectedModel = models.find(function (item) {
        return item.model === selectedModelName;
    }) || null;

    const makerOptions = makers.map(function (maker, index) {
        return (
            "<button class=\"euc-option " + (maker === selectedMaker ? "selected" : "") + "\" type=\"button\" data-maker-index=\"" + index + "\">" +
                escapeHtml(maker) +
            "</button>"
        );
    }).join("");

    const modelOptions = models.map(function (item, index) {
        return (
            "<button class=\"euc-option " + (item.model === selectedModelName ? "selected" : "") + "\" type=\"button\" data-model-index=\"" + index + "\">" +
                escapeHtml(item.model) +
            "</button>"
        );
    }).join("");

    let cardHtml = "<div class=\"euc-empty\">Choose a manufacturer, then choose a model to see the main wheel specs.</div>";

    if (selectedMaker && !selectedModel) {
        cardHtml = "<div class=\"euc-empty\">Now choose a model.</div>";
    }

    if (selectedModel) {
        const imgHtml = selectedModel.imageUrl
            ? "<img src=\"" + escapeHtml(selectedModel.imageUrl) + "\" alt=\"" + escapeHtml(selectedModel.model) + "\">"
            : placeholderImageText(selectedModel.model);

        const sourceNote = selectedModel.sourceNote
            ? "<div class=\"euc-source-note\">" + escapeHtml(selectedModel.sourceNote) + "</div>"
            : "";

        cardHtml = [
            "<div class=\"euc-card\">",
                "<div class=\"euc-card-head\">",
                    "<h2 class=\"euc-model-name\">", escapeHtml(selectedModel.model), "</h2>",
                    "<div class=\"euc-maker-name\">", escapeHtml(selectedMaker), "</div>",
                "</div>",

                "<div class=\"euc-stats-grid\">",
                    statCard("Top Speed", selectedModel.topSpeed),
                    statCard("Battery", selectedModel.battery),
                    statCard("Voltage", selectedModel.voltage),
                    statCard("Wheel Size", selectedModel.wheelSize),
                    statCard("Max Charging", selectedModel.maxCharging),
                    statCard("Weight", selectedModel.weight),
                "</div>",

                "<div class=\"euc-image-area\">", imgHtml, "</div>",
                "<div class=\"euc-note\">Specs can vary by firmware, battery pack, tire, rider weight, and source. Use this as a quick reference and verify important numbers before buying or riding.</div>",
                sourceNote,
            "</div>"
        ].join("");
    }

    canvas.innerHTML = [
        buildBoardStyle(),
        "<div class=\"euc-tool-wrap\">",
            "<div class=\"euc-subtitle\">Electric unicycle quick specs: speed, battery, voltage, wheel size, max charging, and weight.</div>",
            "<div class=\"euc-select-row\">",
                buildMenu("Maker", selectedMaker || "Choose Manufacturer", false, openMenu === "maker", makerOptions),
                buildMenu("Model", selectedModelName || "Choose Model", !selectedMaker, openMenu === "model", modelOptions),
            "</div>",
            cardHtml,
        "</div>"
    ].join("");

    wireMenuEvents(makers, models);
}

function wireMenuEvents(makers, models) {
    const makerTrigger = byId("eucMakerTrigger");
    const modelTrigger = byId("eucModelTrigger");

    if (makerTrigger) {
        makerTrigger.addEventListener("click", function () {
            openMenu = openMenu === "maker" ? "" : "maker";
            renderEucTool();
        });
    }

    if (modelTrigger) {
        modelTrigger.addEventListener("click", function () {
            if (!selectedMaker) return;
            openMenu = openMenu === "model" ? "" : "model";
            renderEucTool();
        });
    }

    document.querySelectorAll("[data-maker-index]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const index = Number(this.getAttribute("data-maker-index"));
            selectedMaker = makers[index] || "";
            selectedModelName = "";
            openMenu = "";
            renderEucTool();
        });
    });

    document.querySelectorAll("[data-model-index]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const index = Number(this.getAttribute("data-model-index"));
            selectedModelName = models[index] ? models[index].model : "";
            openMenu = "";
            renderEucTool();
        });
    });
}

function openEucWheelsTool() {
    const stage = byId("activeGameStage");
    const canvas = byId("gameCanvasContainer");
    const roomDisplay = byId("roomDisplayCode");
    const headerBtns = byId("headerActionButtonsContainer");
    const chatHeader = byId("chatHeader");
    const gameHub = byId("gameHubOverlay");
    const youtubeStage = byId("youtubeStageWrapper");
    const ytFrame = byId("ytPlayerFrame");

    if (!stage || !canvas) return;

    if (window.cleanupRunningGameEngine) {
        window.cleanupRunningGameEngine();
    }

    if (gameHub) gameHub.classList.remove("open");
    if (youtubeStage) youtubeStage.classList.remove("active");
    if (ytFrame) ytFrame.src = "about:blank";

    window.chaserGame = window.chaserGame || {};
    window.chaserGame.activeGame = "EUCs";
    window.chaserGame.activeGameName = "EUCs";

    stage.classList.add("open");
    stage.classList.remove("game-board-hidden");

    if (roomDisplay) roomDisplay.innerText = "🛞 EUCs";
    if (headerBtns) headerBtns.style.display = "none";
    if (chatHeader) chatHeader.classList.add("game-active-mode");

    openMenu = "";
    renderEucTool();
}

function installWheelsButton() {
    installGlobalStyle();

    const gamesBtn = byId("chatGamesTriggerBtn");
    const headerRow = byId("headerActionButtonsContainer");

    if (!gamesBtn || !headerRow) return;
    if (byId("wheelsTriggerBtn")) return;

    const btn = document.createElement("button");
    btn.id = "wheelsTriggerBtn";
    btn.className = "round-btn";
    btn.type = "button";
    btn.innerText = "Wheels";
    btn.addEventListener("click", openEucWheelsTool);

    gamesBtn.insertAdjacentElement("afterend", btn);
}

window.openEucWheelsTool = openEucWheelsTool;
window.initEucWheelsTool = openEucWheelsTool;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installWheelsButton);
} else {
    installWheelsButton();
}

})();
