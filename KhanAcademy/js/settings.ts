/// <reference path="../scripts/typings/winrt.d.ts" />

module KA {
    'use strict';

    export class Settings {
        static isInDesigner = Windows.ApplicationModel.DesignMode.designModeEnabled;
        static newDataCheckDelay = 3;
        static registrationLink = 'http://www.khanacademy.org/signup';
    }
}