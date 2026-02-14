"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
// Use SQLite for local dev without a DB server
const config = {
    client: 'sqlite3',
    connection: {
        filename: process.env.DATABASE_URL || path_1.default.join(__dirname, '..', 'dev.sqlite3')
    },
    useNullAsDefault: true,
    migrations: {
        directory: path_1.default.join(__dirname, 'migrations'),
        extension: 'ts'
    }
};
exports.default = config;
