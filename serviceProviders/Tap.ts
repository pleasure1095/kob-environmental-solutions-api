import axios from "axios";

// const tap = require('api')('@tappayments/v1.0#cu0hmhloy2ectd');

// tap.auth(process.env.TAP_SECRET_KEY);

export const tryCreateCharge = async (obj: any) => {

    const endpoint = 'https://api.tap.company/v2/charges/';

    return (await axios.post(endpoint, obj, {
        headers: {
            'Authorization': `Bearer ${process.env.TAP_SECRET_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })).data;
}

export const tryRetrieveCharge = async (charge_id: string) => {
    const endpoint = `https://api.tap.company/v2/charges/${charge_id}`;

    return (await axios.get(endpoint, {
        headers: {
            'Authorization': `Bearer ${process.env.TAP_SECRET_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })).data;
}
