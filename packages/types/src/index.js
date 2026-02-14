"use strict";
// Core Domain Entities for RangeClick
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsMessageType = exports.LedgerEntryType = exports.BetStatus = exports.RoundStatus = exports.TimeFrame = exports.Instrument = void 0;
var Instrument;
(function (Instrument) {
    Instrument["BTC"] = "BTC";
    Instrument["ETH"] = "ETH";
})(Instrument || (exports.Instrument = Instrument = {}));
var TimeFrame;
(function (TimeFrame) {
    TimeFrame[TimeFrame["TF_30S"] = 30] = "TF_30S";
    TimeFrame[TimeFrame["TF_60S"] = 60] = "TF_60S";
})(TimeFrame || (exports.TimeFrame = TimeFrame = {}));
var RoundStatus;
(function (RoundStatus) {
    RoundStatus["OPEN"] = "OPEN";
    RoundStatus["CUTOFF"] = "CUTOFF";
    RoundStatus["SETTLING"] = "SETTLING";
    RoundStatus["SETTLED"] = "SETTLED";
    RoundStatus["REFUNDED"] = "REFUNDED";
})(RoundStatus || (exports.RoundStatus = RoundStatus = {}));
var BetStatus;
(function (BetStatus) {
    BetStatus["PLACED"] = "PLACED";
    BetStatus["WON"] = "WON";
    BetStatus["LOST"] = "LOST";
    BetStatus["REFUNDED"] = "REFUNDED";
})(BetStatus || (exports.BetStatus = BetStatus = {}));
var LedgerEntryType;
(function (LedgerEntryType) {
    LedgerEntryType["DEPOSIT"] = "DEPOSIT";
    LedgerEntryType["WITHDRAWAL"] = "WITHDRAWAL";
    LedgerEntryType["BET_PLACED"] = "BET_PLACED";
    LedgerEntryType["BET_WIN"] = "BET_WIN";
    LedgerEntryType["REFUND"] = "REFUND";
})(LedgerEntryType || (exports.LedgerEntryType = LedgerEntryType = {}));
// WebSocket Message Types
var WsMessageType;
(function (WsMessageType) {
    WsMessageType["PRICE_TICK"] = "PRICE_TICK";
    WsMessageType["ROUND_STATE"] = "ROUND_STATE";
    WsMessageType["GRID_UPDATE"] = "GRID_UPDATE";
    WsMessageType["BET_ACK"] = "BET_ACK";
    WsMessageType["SETTLEMENT"] = "SETTLEMENT";
    WsMessageType["WALLET_UPDATE"] = "WALLET_UPDATE";
    WsMessageType["ERROR"] = "ERROR";
})(WsMessageType || (exports.WsMessageType = WsMessageType = {}));
