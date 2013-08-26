module KA {
    'use strict';

    export class Settings {
        static isInDesigner = Windows.ApplicationModel.DesignMode.designModeEnabled;
        static newDataCheckDelay = 3;
    }
}