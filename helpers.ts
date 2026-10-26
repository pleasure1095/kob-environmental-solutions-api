import { Request } from "express";
var jwt = require('jsonwebtoken');

export const getBaseDirPath = () => {
    return __dirname;
}

export const isStaticImg = (mimeType: string) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    for (const type of validTypes) {
        if (mimeType === type) {
            return true;
        }
    }

    return false;
}

export const isVideo = (mimeType: string) => {
    const validTypes = ['video/mp4'];

    for (const type of validTypes) {
        if (mimeType === type) {
            return true;
        }
    }

    return false;
}


/**
 * extracts the authorization token from the header of the passed request
 * @param req 
 * @returns 
 */
export const extractAuthToken = (req: Request) => {
    let token = req.headers?.authorization?.startsWith('Bearer') ? req.headers?.authorization : null;

    if (!token) {
        return null;
    }

    return token.split(' ')[1];
}

export const decodeJWTToken = (token: string) => {
    return jwt.verify(token, process.env.JWT_KEY);
}

export const days2MillSecs = (days: number) => {
    return days * 86400 * 1000;
}

export const millSecs2Days = (millSecs: number) => {
    return millSecs / (86400 * 1000)
}

export const generateRandomStr = (chars = '0123456789', strLength = 5) => {

    const string_length = strLength
    let randomstring = '';
    let charCount = 0;
    let numCount = 0;

    for (let i = 0; i < string_length; i++) {
        // If random bit is 0, there are less than 3 digits already saved, and there are not already 5 characters saved, generate a numeric value. 
        if ((Math.floor(Math.random() * 2) == 0) && numCount < 3 || charCount >= 5) {
            let rnum = Math.floor(Math.random() * 10);
            randomstring += rnum;
            numCount += 1;
        } else {
            // If any of the above criteria fail, go ahead and generate an alpha character from the chars string
            let rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum, rnum + 1);
            charCount += 1;
        }
    }

    return randomstring;
}

export const startWithUpperCase = (word: string) => {
    let modelWord = word.toLowerCase();
    let newWord = '';

    for (let i = 0; i < modelWord.length; i++) {
        newWord += i === 0 ? modelWord[i].toUpperCase() : modelWord[i];
    }

    return newWord;
}

export const properlizeWords = (words: string) => {
    let strArray = words.split(' ');
    let newWords = strArray.length > 0 ? startWithUpperCase(strArray[0]) : '';

    for (let i = 1; i < strArray.length; i++) {
        newWords += ` ${startWithUpperCase(strArray[i])}`
    }

    return newWords;
}

export const generateRandStr = (strLength = 8) => {
    const chars = "1234567890";
    const string_length = strLength;
    let randomstring = '';
    let charCount = 0;
    let numCount = 0;

    for (let i = 0; i < string_length; i++) {
        // If random bit is 0, there are less than 3 digits already saved, and there are not already 5 characters saved, generate a numeric value. 
        if ((Math.floor(Math.random() * 2) == 0) && numCount < 3 || charCount >= 5) {
            let rnum = Math.floor(Math.random() * 10);
            randomstring += rnum;
            numCount += 1;
        } else {
            // If any of the above criteria fail, go ahead and generate an alpha character from the chars string
            let rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum, rnum + 1);
            charCount += 1;
        }
    }

    return randomstring;
}


export const arrayContainsValue = (array: string[], value: string) => {
    for (const element of array) {
        if (element === value) {
            return true;
        }
    }

    return false;
}

export const csvToArray = (str: string) => {
    return str.split(',');
}

export const valuesMatchSomeOptions = (values: any[], options: any[]) => {
    for (const value of values) {
        for (const option of options) {
            if (value === option) {
                return true;
            }
        }
    }

    return false;
}

export const camelCase2Words = (camel: string) => {

    if (camel.length === 0) {
        return camel;
    }

    if (camel[0] !== camel[0].toLowerCase()) {
        return camel;
    }

    let words = '';

    for (let i = 0; i < camel.length; i++) {
        words += (camel[i].toLowerCase() === camel[i]) ? `${camel[i]}` : ` ${camel[i]}`;
    }

    return words;
}

export const generateRandPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    const string_length = 8;
    let randomstring = '';
    let charCount = 0;
    let numCount = 0;

    for (let i = 0; i < string_length; i++) {
        // If random bit is 0, there are less than 3 digits already saved, and there are not already 5 characters saved, generate a numeric value. 
        if ((Math.floor(Math.random() * 2) == 0) && numCount < 3 || charCount >= 5) {
            let rnum = Math.floor(Math.random() * 10);
            randomstring += rnum;
            numCount += 1;
        } else {
            // If any of the above criteria fail, go ahead and generate an alpha character from the chars string
            let rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum, rnum + 1);
            charCount += 1;
        }
    }

    return randomstring;
}

/**
 * Converts a rate from price per month to price per day.
 * 
 * @param ratePerMonth - The rate in price per month.
 * @returns The rate in price per day.
 */
export function convertRateToDaily(ratePerMonth: number): number {
    const daysInMonth = 30;
    const ratePerDay = ratePerMonth / daysInMonth;
    return ratePerDay;
}