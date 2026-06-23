/* CHASER EUC WHEELS - SEPARATE TOOL FILE
Adds a Wheels button next to Games and opens an EUC info board.
*/
(function () {
"use strict";

const EUC_DB = {
    "InMotion": [
        {
            model: "V10",
            topSpeed: "Approx. 25 mph",
            battery: "Approx. 650 Wh",
            voltage: "84 V",
            wheelSize: "16 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 45 lb",
            imageUrl: ""
        },
        {
            model: "V10F",
            topSpeed: "Approx. 25 mph",
            battery: "Approx. 960 Wh",
            voltage: "84 V",
            wheelSize: "16 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 45 lb",
            imageUrl: ""
        },
        {
            model: "V11",
            topSpeed: "Approx. 31 mph",
            battery: "Approx. 1500 Wh",
            voltage: "84 V",
            wheelSize: "18 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 59 lb",
            imageUrl: ""
        },
        {
            model: "V12",
            topSpeed: "Approx. 37-43 mph",
            battery: "Approx. 1750 Wh",
            voltage: "100 V",
            wheelSize: "16 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 64 lb",
            imageUrl: ""
        },
        {
            model: "V13 Challenger",
            topSpeed: "Approx. 56 mph",
            battery: "Approx. 3024 Wh",
            voltage: "126 V",
            wheelSize: "22 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 110 lb",
            imageUrl: ""
        },
        {
            model: "V14 Adventure",
            topSpeed: "Approx. 43 mph",
            battery: "Approx. 2400 Wh",
            voltage: "134 V",
            wheelSize: "16 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 86 lb",
            imageUrl: ""
        }
    ],

    "KingSong": [
        {
            model: "16X",
            topSpeed: "Approx. 31 mph",
            battery: "Approx. 1554 Wh",
            voltage: "84 V",
            wheelSize: "16 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 54 lb",
            imageUrl: ""
        },
        {
            model: "S18",
            topSpeed: "Approx. 31 mph",
            battery: "Approx. 1110 Wh",
            voltage: "84 V",
            wheelSize: "18 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 55 lb",
            imageUrl: ""
        },
        {
            model: "S19",
            topSpeed: "Approx. 37 mph",
            battery: "Approx. 1776 Wh",
            voltage: "126 V",
            wheelSize: "18 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 68 lb",
            imageUrl: ""
        },
        {
            model: "S22",
            topSpeed: "Approx. 43 mph",
            battery: "Approx. 2220 Wh",
            voltage: "126 V",
            wheelSize: "20 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 77 lb",
            imageUrl: ""
        }
    ],

    "Begode": [
        {
            model: "T4",
            topSpeed: "Approx. 37 mph",
            battery: "Approx. 1800 Wh",
            voltage: "100 V",
            wheelSize: "16 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 66 lb",
            imageUrl: ""
        },
        {
            model: "Master",
            topSpeed: "Approx. 50 mph",
            battery: "Approx. 2400 Wh",
            voltage: "134 V",
            wheelSize: "20 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 88 lb",
            imageUrl: ""
        },
        {
            model: "EX30",
            topSpeed: "Approx. 55 mph",
            battery: "Approx. 3600 Wh",
            voltage: "134 V",
            wheelSize: "20 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 101 lb",
            imageUrl: ""
        },
        {
            model: "Extreme",
            topSpeed: "Approx. 50 mph",
            battery: "Approx. 2400 Wh",
            voltage: "134 V",
            wheelSize: "18 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 91 lb",
            imageUrl: ""
        },
        {
            model: "Blitz",
            topSpeed: "Approx. 55 mph",
            battery: "Approx. 2400 Wh",
            voltage: "134 V",
            wheelSize: "20 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 79 lb",
            imageUrl: ""
        }
    ],

    "LeaperKim / Veteran": [
        {
            model: "Sherman",
            topSpeed: "Approx. 45 mph",
            battery: "Approx. 3200 Wh",
            voltage: "100 V",
            wheelSize: "20 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 77 lb",
            imageUrl: ""
        },
        {
            model: "Sherman S",
            topSpeed: "Approx. 45 mph",
            battery: "Approx. 3600 Wh",
            voltage: "100 V",
            wheelSize: "20 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 97 lb",
            imageUrl: ""
        },
        {
            model: "Patton",
            topSpeed: "Approx. 50 mph",
            battery: "Approx. 2220 Wh",
            voltage: "126 V",
            wheelSize: "18 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 89 lb",
            imageUrl: ""
        },
        {
            model: "Lynx",
            topSpeed: "Approx. 56 mph",
            battery: "Approx. 2700 Wh",
            voltage: "151 V",
            wheelSize: "20 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 88 lb",
            imageUrl: ""
        }
    ],

    "Extreme Bull": [
        {
            model: "Commander",
            topSpeed: "Approx. 45 mph",
            battery: "Approx. 3600 Wh",
            voltage: "100 V",
            wheelSize: "20 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 80+ lb",
            imageUrl: ""
        },
        {
            model: "Commander Pro",
            topSpeed: "Approx. 55 mph",
            battery: "Approx. 3600 Wh",
            voltage: "134 V",
            wheelSize: "20 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 104 lb",
            imageUrl: ""
        },
        {
            model: "Commander Mini",
            topSpeed: "Approx. 45 mph",
            battery: "Approx. 2400 Wh",
            voltage: "134 V",
            wheelSize: "16 inch",
            maxCharging: "Verify charger limit",
            weight: "Approx. 88 lb",
            imageUrl: ""
        }
    ]
};

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
    return EUC_DB[manufacturer] || [];
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

function buildStyle() {
    return [
        "<style>",
            "#wheelsTriggerBtn{width:auto!important;height:34px!important;padding:0 14px!important;border-radius:999px!important;background:#ffffff!important;color:#1e4620!important;border:2px solid #ffd700!important;font-size:14px!important;font-weight:900!important;font-family:Arial,sans-serif!important;text-transform:uppercase!important;}",
            "#wheelsTriggerBtn:active{transform:scale(.94);}",

            ".euc-tool-wrap{width:100%;height:100%;min-height:100%;box-sizing:border-box;color:#e2f0d9;font-family:Arial,sans-serif;padding:10px 10px 78px;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;text-align:center;}",
            ".euc-title{color:#ffd700;font-size:34px;font-weight:900;margin:4px 0 8px;text-shadow:0 3px 8px rgba(0,0,0,.75);letter-spacing:.5px;}",
            ".euc-subtitle{color:#e2f0d9;font-size:13px;font-weight:800;margin:0 auto 12px;opacity:.9;max-width:420px;line-height:1.25;}",

            ".euc-select-row{display:grid;grid-template-columns:1fr;gap:9px;width:100%;max-width:520px;margin:0 auto 12px;}",
            ".euc-select-box{width:100%;padding:11px 12px;border-radius:12px;border:2px solid #ffd700;background:#e2f0d9;color:#1e4620;font-size:16px;font-weight:900;box-sizing:border-box;outline:none;}",
            ".euc-select-box:disabled{opacity:.55;border-color:#777;background:#cfcfcf;}",

            ".euc-card{width:100%;max-width:560px;margin:0 auto;background:#123d18;border:3px solid #e2f0d9;border-radius:18px;box-shadow:0 8px 22px rgba(0,0,0,.45);overflow:hidden;box-sizing:border-box;}",
            ".euc-card-head{padding:12px 12px 8px;background:#0b2410;border-bottom:2px solid #ffd700;}",
            ".euc-model-name{color:#ffd700;font-size:25px;font-weight:900;margin:0;line-height:1.1;}",
            ".euc-maker-name{color:#e2f0d9;font-size:13px;font-weight:900;margin-top:4px;opacity:.9;}",

            ".euc-image-area{height:190px;background:#061707;display:flex;align-items:center;justify-content:center;overflow:hidden;}",
            ".euc-image-area img{width:100%;height:100%;object-fit:contain;background:#061707;}",
            ".euc-placeholder-image{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ffd700;background:radial-gradient(circle at center,#1e4620,#061707);}",
            ".euc-wheel-icon{font-size:72px;line-height:1;color:#e2f0d9;text-shadow:0 4px 12px rgba(0,0,0,.7);}",
            ".euc-placeholder-title{font-size:20px;font-weight:900;margin-top:4px;}",
            ".euc-placeholder-note{font-size:12px;color:#e2f0d9;margin-top:4px;font-weight:800;opacity:.85;}",

            ".euc-stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:10px;background:#123d18;box-sizing:border-box;}",
            ".euc-stat-card{background:#e2f0d9;color:#1e4620;border-radius:12px;padding:9px 7px;box-sizing:border-box;min-height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid rgba(255,215,0,.55);}",
            ".euc-stat-label{font-size:12px;font-weight:900;text-transform:uppercase;color:#2d6a30;margin-bottom:4px;}",
            ".euc-stat-value{font-size:15px;font-weight:900;line-height:1.15;}",

            ".euc-note{font-size:11px;color:#e2f0d9;opacity:.78;line-height:1.25;padding:0 10px 12px;}",
            ".euc-empty{margin:30px auto;color:#ffd700;font-weight:900;font-size:18px;line-height:1.3;max-width:420px;}",

            "@media(max-width:420px){",
                ".euc-tool-wrap{padding:8px 8px 86px;}",
                ".euc-title{font-size:30px;margin-top:0;}",
                ".euc-subtitle{font-size:12px;margin-bottom:9px;}",
                ".euc-select-box{font-size:15px;padding:10px;}",
                ".euc-image-area{height:165px;}",
                ".euc-stats-grid{gap:6px;padding:8px;}",
                ".euc-stat-card{min-height:58px;padding:8px 5px;}",
                ".euc-stat-label{font-size:11px;}",
                ".euc-stat-value{font-size:13px;}",
            "}",
        "</style>"
    ].join("");
}

function renderEucTool(selectedMaker, selectedModelName) {
    const canvas = byId("gameCanvasContainer");
    if (!canvas) return;

    const makers = getManufacturers();
    const models = selectedMaker ? getModelsForManufacturer(selectedMaker) : [];
    const selectedModel = models.find(function (item) {
        return item.model === selectedModelName;
    }) || null;

    const makerOptions = [
        "<option value=\"\">Choose Manufacturer</option>"
    ].concat(makers.map(function (maker) {
        return "<option value=\"" + escapeHtml(maker) + "\" " + (maker === selectedMaker ? "selected" : "") + ">" + escapeHtml(maker) + "</option>";
    })).join("");

    const modelOptions = [
        "<option value=\"\">Choose Model</option>"
    ].concat(models.map(function (item) {
        return "<option value=\"" + escapeHtml(item.model) + "\" " + (item.model === selectedModelName ? "selected" : "") + ">" + escapeHtml(item.model) + "</option>";
    })).join("");

    let cardHtml = "<div class=\"euc-empty\">Pick a manufacturer, then pick a model to see its main specs.</div>";

    if (selectedModel) {
        const imgHtml = selectedModel.imageUrl
            ? "<img src=\"" + escapeHtml(selectedModel.imageUrl) + "\" alt=\"" + escapeHtml(selectedModel.model) + "\">"
            : placeholderImageText(selectedModel.model);

        cardHtml = [
            "<div class=\"euc-card\">",
                "<div class=\"euc-card-head\">",
                    "<h2 class=\"euc-model-name\">", escapeHtml(selectedModel.model), "</h2>",
                    "<div class=\"euc-maker-name\">", escapeHtml(selectedMaker), "</div>",
                "</div>",
                "<div class=\"euc-image-area\">", imgHtml, "</div>",
                "<div class=\"euc-stats-grid\">",
                    statCard("Top Speed", selectedModel.topSpeed),
                    statCard("Battery", selectedModel.battery),
                    statCard("Voltage", selectedModel.voltage),
                    statCard("Wheel Size", selectedModel.wheelSize),
                    statCard("Max Charging", selectedModel.maxCharging),
                    statCard("Weight", selectedModel.weight),
                "</div>",
                "<div class=\"euc-note\">Specs can vary by firmware, battery pack, tire, rider weight, and source. Use this as a quick reference and verify before buying or riding hard.</div>",
            "</div>"
        ].join("");
    }

    canvas.innerHTML = [
        buildStyle(),
        "<div class=\"euc-tool-wrap\">",
            "<div class=\"euc-title\">EUCs</div>",
            "<div class=\"euc-subtitle\">Electric unicycle quick specs: speed, battery, voltage, wheel size, max charging, and weight.</div>",
            "<div class=\"euc-select-row\">",
                "<select id=\"eucMakerSelect\" class=\"euc-select-box\">", makerOptions, "</select>",
                "<select id=\"eucModelSelect\" class=\"euc-select-box\" ", selectedMaker ? "" : "disabled", ">", modelOptions, "</select>",
            "</div>",
            cardHtml,
        "</div>"
    ].join("");

    const makerSelect = byId("eucMakerSelect");
    const modelSelect = byId("eucModelSelect");

    if (makerSelect) {
        makerSelect.addEventListener("change", function () {
            renderEucTool(this.value, "");
        });
    }

    if (modelSelect) {
        modelSelect.addEventListener("change", function () {
            renderEucTool(selectedMaker, this.value);
        });
    }
}

function openEucWheelsTool() {
    const stage = byId("activeGameStage");
    const canvas = byId("gameCanvasContainer");
    const roomDisplay = byId("roomDisplayCode");
    const headerBtns = byId("headerActionButtonsContainer");
    const chatHeader = byId("chatHeader");
    const gameHub = byId("gameHubOverlay");

    if (!stage || !canvas) return;

    window.chaserGame = window.chaserGame || {};
    window.chaserGame.activeGame = "EUCs";
    window.chaserGame.activeGameName = "EUCs";

    if (gameHub) gameHub.classList.remove("open");
    if (stage) stage.classList.add("open");
    if (stage) stage.classList.remove("game-board-hidden");
    if (roomDisplay) roomDisplay.innerText = "🛞 EUCs";
    if (headerBtns) headerBtns.style.display = "none";
    if (chatHeader) chatHeader.classList.add("game-active-mode");

    renderEucTool("", "");
}

function installWheelsButton() {
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
